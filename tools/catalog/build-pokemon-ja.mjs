// Pokémon japonais : extensions et cartes depuis Limitless TCG (noms anglais des extensions, dates, logos, images),
// complétées par TCGdex (nombre officiel de cartes) et par la traduction des noms (names.mjs).
import { officialNumber, officialRecentCards, serebiiLogos } from './official-jp.mjs';
import { getJson, getText, pad3, parseShortDate, pool, sleep, sortByRelease, unescapeHtml, writeJson } from './lib.mjs';
import { loadSpeciesNames, translateJa } from './names.mjs';

const SITE = 'https://limitlesstcg.com';

/** Tableau des extensions japonaises : blocs (sous-titres) et lignes, lues cellule par cellule (formats variables). */
export function parseSetList(html) {
  const blocs = [];
  let bloc = null;
  for (const row of html.split(/<tr[\s>]/).slice(1)) {
    const head = row.match(/sub-heading"[^>]*>([^<]+)</);
    if (head) {
      bloc = { id: unescapeHtml(head[1]).toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: unescapeHtml(head[1]), sets: [] };
      blocs.push(bloc);
      continue;
    }
    const code = row.match(/href="\/cards\/jp\/([A-Za-z0-9.-]+)"/)?.[1];
    if (!code) continue;
    const logo = row.match(/<img class="set"[^>]*src="([^"]+)"/)?.[1];
    const name = row.match(/<img class="set"[^>]*>\s*([^<]*?)\s*<(?:span|\/a)/)?.[1] ?? code;
    const date = row.match(/>(\d{1,2} \w{3} \d{2})</)?.[1];
    const count = row.match(/md-only"[^>]*>\s*<a[^>]*>\s*(\d+)/)?.[1];
    if (!bloc) { bloc = { id: 'other', name: 'Other', sets: [] }; blocs.push(bloc); }
    bloc.sets.push({ id: code, code, name: unescapeHtml(name) || code, logo, releaseDate: date && parseShortDate(date), count: count ? Number(count) : undefined });
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
  // Base officielle (extensions récentes) pour les cartes que Limitless n'a pas encore (cartes rares notamment).
  const recent = await officialRecentCards().catch((e) => { console.warn('pokemon-card.com :', e.message); return new Map(); });
  let added = 0;

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
      added += await completeFromOfficial(set, list, recent.get(set.id.toUpperCase()), off);
      set.count = list.length || set.count;
      total += list.length;
      writeJson(`cards/pokemon-ja/${set.id}.json`, list);
    });
  }
  // Vrais logos (Serebii) ; le petit symbole Limitless reste en secours.
  const logos = await serebiiLogos(blocs.flatMap((b) => b.sets)).catch((e) => { console.warn('Serebii :', e.message); return new Map(); });
  for (const s of blocs.flatMap((b) => b.sets)) {
    if (logos.has(s.id)) { s.symbol = s.logo; s.logo = logos.get(s.id); }
  }
  sortByRelease(blocs);
  writeJson('sets/pokemon-ja.json', { built: new Date().toISOString(), source: 'limitlesstcg.com', blocs });
  console.log(`Pokémon JP : ${total} cartes, ${translated} avec nom anglais, ${added} ajoutées depuis pokemon-card.com`);
}

/**
 * Ajoute à `list` les cartes de la base officielle absentes de Limitless (même numéro imprimé = même carte).
 * Seules les extensions où l'officiel a plus de cartes sont examinées (une fiche à lire par carte).
 */
async function completeFromOfficial(set, list, offCards, officialCount) {
  const numbered = offCards?.filter((c) => !c.energy) ?? [];
  const have = new Set(list.map((c) => numberKey(c.localId)));
  if (numbered.length <= list.filter((c) => /^\d+$/.test(c.localId)).length) return 0;
  const numbers = await pool(numbered, 4, (c) => officialNumber(c.cardID).catch(() => null));
  let added = 0;
  numbered.forEach((c, i) => {
    const num = numbers[i];
    if (!num || have.has(numberKey(num.n))) return;
    const t = translateJa(c.name);
    const localId = /^\d+$/.test(num.n) ? pad3(num.n) : num.n;
    const total = officialCount ?? num.total;
    list.push({
      id: `${set.id}-${localId}`,
      localId,
      number: total ? `${localId}/${pad3(total)}` : localId,
      name: c.name,
      nameEn: t?.[0],
      nameFr: t?.[1],
      image: c.image,
    });
    have.add(numberKey(num.n));
    added++;
  });
  list.sort((a, b) => (Number(a.localId) || 1e4) - (Number(b.localId) || 1e4));
  if (added) console.log(`${set.id} : ${added} cartes ajoutées depuis pokemon-card.com`);
  return added;
}

const numberKey = (n) => (/^\d+$/.test(n) ? String(Number(n)) : String(n).toUpperCase());
