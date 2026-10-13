// Pokémon japonais : extensions et cartes depuis Limitless TCG (noms anglais des extensions, dates, logos, images),
// complétées par TCGdex (nombre officiel de cartes) et par la traduction des noms (names.mjs).
import { getJson, getText, pad3, parseShortDate, pool, sleep, sortByRelease, unescapeHtml, writeJson } from './lib.mjs';
import { loadSpeciesNames, translateJa } from './names.mjs';

const SITE = 'https://limitlesstcg.com';

/** Tableau des extensions japonaises : blocs (sous-titres) et lignes. */
export function parseSetList(html) {
  const blocs = [];
  let bloc = null;
  const re = /sub-heading"[^>]*>([^<]+)<|<a href="\/cards\/jp\/([A-Za-z0-9-]+)"><img class="set" alt="[^"]*" src="([^"]+)">\s*([^<]*?)\s*<span class="code annotation">[^<]*<\/span><\/a><\/td>\s*<td><a href="\/cards\/jp\/[^"]+">([^<]+)<\/a><\/td>\s*<td class="md-only"><a href="\/cards\/jp\/[^"]+">(\d+)/g;
  for (const m of html.matchAll(re)) {
    if (m[1]) {
      bloc = { id: unescapeHtml(m[1]).toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: unescapeHtml(m[1]), sets: [] };
      blocs.push(bloc);
      continue;
    }
    if (!bloc) { bloc = { id: 'other', name: 'Other', sets: [] }; blocs.push(bloc); }
    bloc.sets.push({
      id: m[2], code: m[2], name: unescapeHtml(m[4]), logo: m[3], releaseDate: parseShortDate(m[5]), count: Number(m[6]),
    });
  }
  return blocs;
}

/** Vue « liste » d'une extension : numéro, nom, rareté, image. */
export function parseCardList(html, setId) {
  const cards = [];
  let setNameJa;
  for (const row of html.split('<tr data-hover="').slice(1)) {
    const img = row.slice(0, row.indexOf('"'));
    setNameJa ??= row.match(/data-tooltip="([^"]+)"/)?.[1];
    const links = [...row.matchAll(new RegExp(`<a href="/cards/jp/${setId}/([^"]+)">([^<]*)</a>`, 'g'))];
    if (links.length < 2) continue;
    const n = links[0][1];
    const name = unescapeHtml(links[1][2]);
    const tds = [...row.matchAll(/<td class="md-only"><a [^>]*>\s*([^<]+?)\s*<\/a><\/td>/g)];
    cards.push({ n, name, rarity: tds.at(-1)?.[1], image: img.replace(/_XS\.(png|jpg|webp)$/, '_SM.$1') });
  }
  return { cards, setNameJa: setNameJa && unescapeHtml(setNameJa) };
}

const ascii = (s) => /^[\x20-\x7EÀ-ÿ’'.-]+$/.test(s);

export async function buildPokemonJa() {
  await loadSpeciesNames();
  const html = await getText(`${SITE}/cards/jp`);
  if (!html) throw new Error('Limitless : liste des extensions inaccessible');
  const blocs = parseSetList(html);
  console.log(`Limitless JP : ${blocs.length} blocs, ${blocs.reduce((n, b) => n + b.sets.length, 0)} extensions`);

  // Nombre officiel de cartes (dénominateur imprimé « 110/076 ») depuis TCGdex.
  const official = new Map(((await getJson('https://api.tcgdex.net/v2/ja/sets')) ?? []).map((s) => [s.id.toUpperCase(), s.cardCount?.official]));

  let total = 0;
  let translated = 0;
  for (const b of blocs) {
    await pool(b.sets, 3, async (set) => {
      await sleep(150);
      const page = await getText(`${SITE}/cards/jp/${set.id}?display=list`);
      if (!page) return;
      const { cards, setNameJa } = parseCardList(page, set.id);
      // Noms anglais fournis par Limitless (traduction), sinon traduction par les noms d'espèces.
      const en = await getText(`${SITE}/cards/jp/${set.id}?display=list&translate=en`);
      const enNames = new Map(en ? parseCardList(en, set.id).cards.filter((c) => ascii(c.name)).map((c) => [c.n, c.name]) : []);
      set.nameLocal = setNameJa;
      const off = official.get(set.id.toUpperCase());
      const list = cards.map((c) => {
        const t = translateJa(c.name);
        const nameEn = enNames.get(c.n) ?? t?.[0];
        if (nameEn) translated++;
        const num = /^\d+$/.test(c.n) ? pad3(c.n) : c.n;
        return {
          id: `${set.id}-${num}`,
          localId: num,
          number: off ? `${num}/${pad3(off)}` : num,
          name: c.name,
          nameEn,
          nameFr: t?.[1],
          image: c.image,
          rarity: c.rarity,
        };
      });
      set.count = list.length || set.count;
      total += list.length;
      writeJson(`cards/pokemon-ja/${set.id}.json`, list);
    });
  }
  sortByRelease(blocs);
  writeJson('sets/pokemon-ja.json', { built: new Date().toISOString(), source: 'limitlesstcg.com', blocs });
  console.log(`Pokémon JP : ${total} cartes, ${translated} avec nom anglais`);
}
