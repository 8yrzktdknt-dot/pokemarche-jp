// Pokémon japonais : extensions et cartes depuis Limitless TCG (noms anglais des extensions, dates, logos, images),
// complétées par TCGdex (nombre officiel de cartes) et par la traduction des noms (names.mjs).
import { failures, findLogos, pokellectorLogos, saveLogo, saveLogos, scrydexLogo, scrydexSymbol, serebiiLogoMap } from './logos.mjs';
import { WIZARD_SETS, official30thImages, officialCardId, officialCard, officialRecentCards, samuraiCards, wizardCards } from './official-jp.mjs';
import { getBuffer, getJson, getText, pad3, parseShortDate, pool, sleep, sortByRelease, unescapeHtml, writeJson } from './lib.mjs';
import { loadSpeciesNames, translateJa } from './names.mjs';
import { translateRemaining } from './translate-ja.mjs';

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
      if (WIZARD_SETS[set.id]) added += await completeFromWizard(set, list, off);
      added += await completeFrom30th(set, list, off);
      await splitLegendImages(set, list);
      set.count = list.length || set.count;
      total += list.length;
      writeJson(`cards/pokemon-ja/${set.id}.json`, list);
    });
  }
  // Vrais logos (Serebii, puis Pokellector japonais) ; le petit symbole Limitless reste en secours.
  const tables = await Promise.all([
    serebiiLogoMap().catch(() => new Map()),
    pokellectorLogos('https://jp.pokellector.com').catch(() => new Map()),
  ]);
  const allSets = blocs.flatMap((b) => b.sets);
  // Scrydex d'abord (logos de tous les produits japonais, decks et coffrets compris), puis Serebii et Pokellector.
  const logos = await saveLogos(allSets, 'pokemon-ja', (s) => [scrydexLogo(`${s.id.toLowerCase()}_ja`), ...findLogos(s.name, tables)]);
  // Petit symbole d'extension (pastille « MBG », « M3 »…) affiché dans le coin des tuiles.
  const symbols = await saveLogos(allSets, 'pokemon-ja-symbol', (s) => scrydexSymbol(`${s.id.toLowerCase()}_ja`));
  for (const s of allSets) {
    if (logos.has(s.id)) s.logo = logos.get(s.id);
    s.symbol = symbols.get(s.id) ?? (s.logo?.startsWith('https://s3.limitlesstcg') ? s.logo : s.symbol);
  }
  console.log(`Logos JP : Scrydex + Serebii ${tables[0].size}, Pokellector ${tables[1].size} ; ${logos.size}/${allSets.length} extensions avec un vrai logo`);
  const left = allSets.filter((s) => !logos.has(s.id)).map((s) => `${s.id} (${s.name})`);
  if (left.length) console.log(`Sans vrai logo : ${left.join(', ')}`);
  if (failures.length) console.log(`Logos introuvables au téléchargement (${failures.length}) : ${failures.slice(0, 20).join(', ')}`);
  // Dresseurs, Objets, Stades, Énergies : noms des versions internationales.
  translated += await translateRemaining().catch((e) => { console.warn('Traductions JP :', e.message); return 0; });
  sortByRelease(blocs);
  writeJson('sets/pokemon-ja.json', { built: new Date().toISOString(), source: 'limitlesstcg.com', blocs });
  console.log(`Pokémon JP : ${total} cartes, ${translated} avec nom anglais, ${added} ajoutées depuis pokemon-card.com`);
}

/**
 * Ajoute à `list` les cartes de la base officielle absentes de Limitless (même numéro imprimé = même carte).
 * Seules les extensions où l'officiel a plus de cartes sont examinées (une fiche à lire par carte).
 */
async function completeFromOfficial(set, list, offCards, officialCount) {
  if (!offCards?.length) return 0;
  const have = new Set(list.map((c) => numberKey(c.localId)));
  const listed = offCards.filter((c) => !c.energy);
  // La liste de recherche officielle oublie parfois des fiches (cartes LEGEND, BREAK…) : on lit aussi
  // les identifiants manquants entre le premier et le dernier de l'extension.
  const ids = offCards.map((c) => Number(c.cardID));
  const known = new Set(ids);
  const gaps = [];
  for (let id = Math.min(...ids); id <= Math.max(...ids); id++) if (!known.has(id)) gaps.push({ cardID: String(id) });
  if (listed.length + gaps.length <= list.filter((c) => /^\d+$/.test(c.localId)).length) return 0;

  const todo = [...listed, ...gaps];
  const details = await pool(todo, 4, (c) => officialCard(c.cardID).catch(() => null));
  const unread = todo.filter((_, i) => !details[i]?.n).map((c) => c.cardID);
  if (unread.length) console.warn(`${set.id} : numéro illisible pour les fiches ${unread.join(', ')}`);
  let added = 0;
  todo.forEach((c, i) => {
    const d = details[i];
    if (!d?.n || (d.set && d.set.toUpperCase() !== set.id.toUpperCase())) return;
    const name = d.name ?? c.name;
    const image = c.image ?? d.image;
    const halves = d.numbers ?? [d.n];
    halves.forEach((n, k) => {
      if (have.has(numberKey(n))) return;
      const t = translateJa(name);
      const localId = /^\d+$/.test(n) ? pad3(n) : n;
      const total = officialCount ?? d.total;
      const half = halves.length > 1 ? (k === 0 ? ' (上)' : ' (下)') : '';
      list.push({
        id: `${set.id}-${localId}`,
        localId,
        number: total ? `${localId}/${pad3(total)}` : localId,
        name: `${name}${half}`,
        nameEn: t?.[0] && `${t[0]}${half ? (k === 0 ? ' (Top)' : ' (Bottom)') : ''}`,
        nameFr: t?.[1] && `${t[1]}${half ? (k === 0 ? ' (Haut)' : ' (Bas)') : ''}`,
        image,
        rarity: d.rarity,
      });
      have.add(numberKey(n));
      added++;
    });
  });
  list.sort((a, b) => (Number(a.localId) || 1e4) - (Number(b.localId) || 1e4));
  if (added) console.log(`${set.id} : ${added} cartes ajoutées depuis pokemon-card.com`);
  return added;
}

/**
 * Complète avec PokemonWizard (cartes secrètes pas encore dans la base officielle) et ajoute les raretés manquantes.
 * Le nom japonais est repris d'une carte de l'extension portant le même nom anglais (ex. l'AR 104 = la carte 002).
 */
async function completeFromWizard(set, list, officialCount) {
  const cards = await wizardCards(set.id).catch((e) => { console.warn(`PokemonWizard ${set.id} :`, e.message); return []; });
  const byNumber = new Map(list.map((c) => [numberKey(c.localId), c]));
  let added = 0;
  for (const w of cards) {
    const known = byNumber.get(numberKey(w.n));
    if (known) {
      if (!known.rarity && w.rarity) known.rarity = w.rarity;
      if (w.tcgplayer) known.tcgplayer = w.tcgplayer;
      continue;
    }
    if (!w.nameEn) continue; // motif seul (variante Poké Ball…) d'une carte absente de la liste
    const twin = list.find((c) => c.nameEn && c.nameEn.toLowerCase() === w.nameEn.toLowerCase());
    const localId = /^\d+$/.test(w.n) ? pad3(w.n) : w.n;
    const total = officialCount ?? w.total;
    const card = {
      id: `${set.id}-${localId}`,
      localId,
      number: total ? `${localId}/${pad3(total)}` : localId,
      name: twin?.name ?? w.nameEn,
      nameEn: w.nameEn,
      nameFr: twin?.nameFr,
      image: w.image,
      rarity: w.rarity,
      tcgplayer: w.tcgplayer,
    };
    list.push(card);
    byNumber.set(numberKey(w.n), card);
    added++;
  }
  list.sort((a, b) => (Number(a.localId) || 1e4) - (Number(b.localId) || 1e4));
  console.log(`${set.id} : PokemonWizard ${cards.length} cartes lues, ${added} ajoutées`);
  return added;
}

/** Image haute définition Scrydex d'une carte japonaise : …/pokemon/m6a_ja-104/large. */
export const scrydexImage = (setId, localId) => `https://images.scrydex.com/pokemon/${setId.toLowerCase()}_ja-${Number(localId)}/large`;

/** Rareté des cartes secrètes de M6a (bloc 104-135) : AR, SAR puis FUR. */
const M6A_SECRET = (n) => (n >= 104 && n <= 123 ? 'AR' : n >= 124 && n <= 133 ? 'SAR' : n >= 134 && n <= 135 ? 'FUR' : undefined);

/**
 * M6a : images officielles du site des 30 ans (meilleure qualité) à la place de celles de PokemonWizard,
 * puis les cartes encore absentes ajoutées depuis la liste illustrée de Samurai Sword Tokyo.
 */
async function completeFrom30th(set, list, officialCount) {
  if (set.id !== 'M6a') return 0;
  const [official, samurai] = await Promise.all([
    official30thImages(set.id).catch(() => new Map()),
    samuraiCards(set.id).catch(() => new Map()),
  ]);
  let improved = 0;
  for (const c of list) {
    const img = official.get(c.localId);
    if (img && !/pokemon-card\.com\/assets\/images\/card_images/.test(c.image ?? '')) { c.image = img; improved++; }
    if (!c.rarity && /^\d+$/.test(c.localId)) c.rarity = M6A_SECRET(Number(c.localId));
  }
  // Images en haute définition (Scrydex) à la place de celles de PokemonWizard.
  let hd = 0;
  await pool(list.filter((c) => /pokemonwizard|samuraisword/.test(c.image ?? '') && /^\d+$/.test(c.localId)), 4, async (c) => {
    const url = scrydexImage(set.id, c.localId);
    const r = await fetch(url, { method: 'HEAD' }).catch(() => null);
    if (r?.ok) { c.image = url; hd++; }
  });
  const have = new Set(list.map((c) => numberKey(c.localId)));
  let added = 0;
  for (const [n, w] of samurai) {
    if (have.has(numberKey(n))) continue;
    const twin = list.find((c) => c.nameEn && c.nameEn.toLowerCase() === w.nameEn.toLowerCase());
    // Image en taille d'origine si elle existe, sinon la vignette de la liste.
    const image = official.get(n) ?? ((await getBuffer(w.full).catch(() => null)) ? w.full : w.image);
    const total = officialCount ?? 103;
    list.push({
      id: `${set.id}-${n}`,
      localId: n,
      number: `${n}/${String(total).padStart(3, '0')}`,
      name: twin?.name ?? w.nameEn,
      nameEn: w.nameEn,
      nameFr: twin?.nameFr,
      image,
      rarity: M6A_SECRET(Number(n)),
    });
    have.add(numberKey(n));
    added++;
  }
  list.sort((a, b) => (Number(a.localId) || 1e4) - (Number(b.localId) || 1e4));
  // Cartes ajoutées depuis Samurai Sword : image Scrydex si elle existe.
  await pool(list.filter((c) => /samuraisword/.test(c.image ?? '')), 4, async (c) => {
    const url = scrydexImage(set.id, c.localId);
    const r = await fetch(url, { method: 'HEAD' }).catch(() => null);
    if (r?.ok) { c.image = url; hd++; }
  });
  console.log(`${set.id} : site des 30 ans ${official.size} images (${improved} remplacées), Scrydex ${hd} images HD, Samurai Sword ${samurai.size} cartes lues, ${added} ajoutées`);
  return added;
}

/**
 * Cartes LEGEND (deux moitiés, « 上 » / « 下 ») : le site officiel n'a qu'une image des deux cartes réunies ;
 * chaque moitié prend son propre visuel Scrydex quand il existe (réponse partielle 206 : vraie image,
 * Scrydex renvoie une image générique entière pour une carte inconnue).
 */
async function splitLegendImages(set, list) {
  let split = 0;
  await pool(list.filter((c) => /\/card_images\/legend\//.test(c.image ?? '') && /^\d+$/.test(c.localId)), 4, async (c) => {
    const url = scrydexImage(set.id, c.localId);
    const r = await fetch(url, { headers: { Range: 'bytes=0-0' } }).catch(() => null);
    await r?.arrayBuffer().catch(() => null);
    // N° de la fiche officielle gardé (attributs lus dessus par l'étape des détails).
    if (r?.status === 206) { c.officialId = officialCardId(c.image); c.image = url; split++; }
  });
  if (split) console.log(`${set.id} : ${split} moitiés de cartes LEGEND avec leur propre visuel`);
}

const numberKey = (n) => (/^\d+$/.test(n) ? String(Number(n)) : String(n).toUpperCase());
