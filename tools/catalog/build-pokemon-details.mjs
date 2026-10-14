// Détails des cartes Pokémon publiés avec le catalogue (étape « pokemon-details », chaque jour) :
// n° produit Cardmarket et TCGplayer, variantes (normale, reverse, Poké Ball…), attributs (illustrateur,
// n° Pokédex, type, PV, stade, catégorie, marque de régulation) : fiche TCGdex de chaque carte, dans sa langue.
// Prix : uniquement les fichiers publics Cardmarket (moyenne des ventes sur 7 jours), jamais ceux de TCGdex.
// Les cartes japonaises sont retrouvées par extension et numéro dans le catalogue japonais de TCGdex.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { cardmarketPaths, classicCollectionPaths, classicKey } from './cardmarket-links.mjs';
import { INTL_EXPANSIONS, completeIntlPrices, completeJapanesePrices, loadCardmarketFiles } from './cardmarket-japanese.mjs';
import { limitlessJapaneseDetails } from './limitless-jp-details.mjs';
import { matchWizardSet, officialCardId, parseOfficialAttrs, wizardCards, wizardJapaneseSets } from './official-jp.mjs';
import { CATALOG, getJson, getText, pool, writeJson } from './lib.mjs';
import { ALL_HOLO, applyCardmarketPrices, fixJapaneseBall, forceHolo, japaneseBase, mergeVariants, variantsOf } from './variants.mjs';

const API = 'https://api.tcgdex.net/v2';
const enc = encodeURIComponent;

/** Prix Cardmarket d'une fiche TCGdex ; les cartes uniquement holo n'ont que les champs « -holo ». */
export function cardmarketOf(cm) {
  if (!cm) return undefined;
  const pick = (k) => cm[k] || cm[`${k}-holo`] || undefined;
  const out = { id: cm.idProduct || undefined, avg7: pick('avg7'), avg30: pick('avg30'), avg: pick('avg') };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return Object.keys(out).length ? out : undefined;
}

/** Prix « Market » TCGplayer (USD) de la variante la plus courante, et n° produit. */
export function tcgplayerOf(tp) {
  if (!tp || typeof tp !== 'object') return {};
  const order = ['normal', 'holofoil', 'reverse-holofoil', '1st-edition-holofoil', 'unlimited-holofoil', '1st-edition'];
  const variants = Object.entries(tp).filter(([, v]) => v && typeof v === 'object');
  variants.sort(([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  const market = variants.find(([, v]) => v.marketPrice)?.[1]?.marketPrice;
  const id = variants.find(([, v]) => v.productId)?.[1]?.productId;
  return { market, id };
}

// Libellés japonais de TCGdex → français (l'app est en français ; le reste est gardé tel quel).
const JA_TYPES = { 草: 'Plante', 炎: 'Feu', 水: 'Eau', 雷: 'Électrique', 超: 'Psy', 闘: 'Combat', 悪: 'Obscurité', 鋼: 'Métal', ドラゴン: 'Dragon', 無色: 'Incolore', フェアリー: 'Fée' };
const JA_STAGES = { たね: 'De base', '1進化': 'Niveau 1', '2進化': 'Niveau 2', 'V進化': 'VMAX', VMAX: 'VMAX', VSTAR: 'VSTAR', メガ: 'Méga', BREAK: 'TURBO', レベルアップ: 'Niveau X' };
const JA_CATEGORIES = { ポケモン: 'Pokémon', トレーナーズ: 'Dresseur', エネルギー: 'Énergie', グッズ: 'Objet', サポート: 'Supporter', スタジアム: 'Stade', ポケモンのどうぐ: 'Outil Pokémon' };
const ja = (map, v) => (v ? map[v] ?? v : v);

/** Attributs d'une fiche TCGdex (clés de l'app). */
export function attrsOf(d, lang) {
  const tr = lang === 'ja';
  const types = d.types?.map((t) => (tr ? ja(JA_TYPES, t) : t)).join(' / ') || (tr ? ja(JA_TYPES, d.energyType) : d.energyType);
  const category = tr ? ja(JA_CATEGORIES, d.category) : d.category;
  const trainer = tr ? ja(JA_CATEGORIES, d.trainerType) : d.trainerType;
  const out = {
    illustrator: d.illustrator,
    dex: d.dexId?.length ? d.dexId.join(', ') : undefined,
    type: types,
    hp: d.hp ? String(d.hp) : undefined,
    stage: tr ? ja(JA_STAGES, d.stage) : d.stage,
    category: trainer ? `${category} · ${trainer}` : category,
    regulation: d.regulationMark,
  };
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];
  return out;
}

/** Applique une fiche TCGdex à une carte du catalogue (garde ce que TCGdex n'a pas). */
export function applyDetails(c, d, lang) {
  const attrs = { ...(c.attrs ?? {}), ...attrsOf(d, lang) };
  if (Object.keys(attrs).length) c.attrs = attrs;
  // N° produit Cardmarket seulement : les prix viennent des fichiers Cardmarket (applyCardmarketPrices).
  // Variantes TCGdex, complétées par celles déjà relevées (motifs PokemonWizard des cartes japonaises).
  const merged = mergeVariants(variantsOf(d), c.v);
  const v = lang === 'ja' ? fixJapaneseBall(merged) : merged;
  if (v.length) c.v = v; else delete c.v;
  const id = d.pricing?.cardmarket?.idProduct || v[0]?.id;
  if (id) c.cm = { id }; else delete c.cm;
  const tp = tcgplayerOf(d.pricing?.tcgplayer);
  if (tp.id) c.tcgplayer = tp.id;
  delete c.price; // aucun prix de TCGdex
  if (!c.rarity && d.rarity) c.rarity = d.rarity;
}

const nameKey = (n) => (n ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const numKey = (n) => (/^\d+$/.test(n) ? String(Number(n)) : String(n).toUpperCase());

/** Fiches TCGdex des cartes japonaises : extension TCGdex de même code, carte de même numéro. */
async function japaneseIds(files) {
  const sets = (await getJson(`${API}/ja/sets`)) ?? [];
  const byCode = new Map(sets.map((s) => [s.id.toLowerCase(), s.id]));
  const out = new Map();
  await pool(files, 6, async (f) => {
    const setId = f.replace(/\.json$/, '');
    const tid = byCode.get(setId.toLowerCase());
    if (!tid) return;
    const full = await getJson(`${API}/ja/sets/${enc(tid)}`);
    const byNum = new Map((full?.cards ?? []).map((c) => [numKey(c.localId), c.id]));
    out.set(setId, byNum);
  });
  return out;
}

/** Carte → page Limitless où lire son lien Cardmarket (clé commune au français et à l'anglais). */
export function limitlessRef(lang, setId, code, localId) {
  const n = /^\d+$/.test(localId) ? String(Number(localId)) : localId;
  if (lang === 'ja') return { key: `jp/${setId}/${n}`, url: `https://limitlesstcg.com/cards/jp/${encodeURIComponent(setId)}/${encodeURIComponent(n)}`, code: setId, n, japanese: true };
  if (!code) return null;
  return { key: `${code}/${n}`, url: `https://limitlesstcg.com/cards/${encodeURIComponent(code)}/${encodeURIComponent(n)}`, code, n, japanese: false };
}

function setCodes(lang) {
  const f = join(CATALOG, 'sets', `pokemon-${lang}.json`);
  if (!existsSync(f)) return new Map();
  return new Map(JSON.parse(readFileSync(f, 'utf8')).blocs.flatMap((b) => b.sets).map((x) => [x.id, x.code]));
}

/**
 * Cartes japonaises récentes absentes de TCGdex : n° produit et prix du marché TCGplayer (USD) via PokemonWizard.
 * Extension → numéro → { tcgplayer, market }.
 */
async function japaneseWizard() {
  const f = join(CATALOG, 'sets', 'pokemon-ja.json');
  if (!existsSync(f)) return new Map();
  const paths = await wizardJapaneseSets().catch(() => []);
  const out = new Map();
  for (const set of JSON.parse(readFileSync(f, 'utf8')).blocs.flatMap((b) => b.sets)) {
    const path = matchWizardSet(paths, set);
    if (!path) continue;
    const cards = await wizardCards(set.id, path).catch(() => []);
    out.set(set.id, new Map(cards.map((c) => [numKey(c.n), c])));
  }
  console.log(`PokemonWizard : ${paths.length} extensions japonaises, ${out.size} reliées au catalogue`);
  return out;
}

/**
 * Raretés corrigées à la main (extension → plages de numéros sans rareté imprimée, affichées « None »).
 * M6a 136–165 : cartes illustration, sans symbole de rareté sur la carte.
 */
export const NO_RARITY_RANGES = { M6a: [[136, 165]] };

export function applyRarityOverrides(setId, cards) {
  const ranges = NO_RARITY_RANGES[setId];
  if (!ranges) return;
  for (const c of cards) {
    const n = Number(c.localId);
    if (ranges.some(([a, b]) => n >= a && n <= b)) c.rarity = 'None';
  }
}

/** Collection Classique (30th-c) : lien CC de chaque carte ; les deux moitiés LEGEND séparées (Haut/Bas) avec leur visuel. */
export function applyClassicCollection(cards, pages, lang) {
  const left = [...pages];
  const sorted = [...cards].sort((a, b) => Number(a.localId) - Number(b.localId));
  let n = 0;
  for (const c of sorted) {
    const k = classicKey((c.nameEn ?? c.name ?? '').replace(/ \((Top|Bottom|Haut|Bas)\)$/, ''));
    const twins = pages.filter((p) => p.key === k);
    const i = left.findIndex((p) => p.key === k);
    if (i < 0) { delete c.cmPath; continue; }
    const [p] = left.splice(i, 1);
    c.cmPath = p.path; n++;
    if (twins.length > 1) {
      const top = twins.indexOf(p) === 0;
      const base = (c.name ?? '').replace(/ \((Haut|Bas|Top|Bottom)\)$/, '');
      c.name = `${base} (${lang === 'fr' ? (top ? 'Haut' : 'Bas') : top ? 'Top' : 'Bottom'})`;
      if (c.nameEn) c.nameEn = `${c.nameEn.replace(/ \((Top|Bottom)\)$/, '')} (${top ? 'Top' : 'Bottom'})`;
      if (c.nameFr) c.nameFr = `${c.nameFr.replace(/ \((Haut|Bas)\)$/, '')} (${top ? 'Haut' : 'Bas'})`;
    }
    // Visuel : celui de la page Limitless, sinon Scrydex au numéro d'origine (me55c-97 pour Genesect PLB 97 ;
    // me55c-{n° dans la collection} serait une autre carte).
    const num = p.path.match(/-30C[A-Z]+-(\d+)$/)?.[1];
    const image = p.image ?? (num && `https://images.scrydex.com/pokemon/me55c-${num}/large`);
    if (image) c.image = image;
  }
  return n;
}

/** Cartes japonaises sans prix TCGdex : n° produit et moyennes depuis les fichiers publics de Cardmarket. */
/** Fichiers publics Cardmarket (produits, guide des prix), téléchargés une fois par exécution. */
let cmFiles;
const cardmarketFiles = () => (cmFiles ??= loadCardmarketFiles().catch(() => null));

/**
 * Cartes absentes de TCGdex : les trois Mew secrets « RGB » de 30th Celebration (YOSHIROTTEN, d'après les jaquettes
 * Rouge, Vert et Bleu). Visuels anglais Limitless (30C/R, G, B) : ni Limitless ni les sites officiels japonais et
 * taïwanais n'ont les leurs (même illustration). Fiches Cardmarket Mew V1 à V3 (internationales, ou japonaises
 * pour M6a, où les lettres R et G sont déjà prises par les énergies) ; le chinois traditionnel les reprend de M6a.
 */
const RGB_ATTRS = {
  en: { type: 'Psychic', hp: '60', stage: 'Basic', category: 'Pokemon' },
  fr: { type: 'Psy', hp: '60', stage: 'Base', category: 'Pokémon' },
  ja: { type: 'Psy', hp: '60', stage: 'De base', category: 'Pokémon', regulation: 'J' },
};
const RGB_SETS = { '30th': ['en', 'fr'], M6a: ['ja'] };
export function addExtraCards(setId, cards, lang) {
  if (!RGB_SETS[setId]?.includes(lang)) return 0;
  const jp = lang === 'ja';
  let n = 0;
  ['R', 'G', 'B'].forEach((v, i) => {
    const localId = jp ? `${v}RGB` : v;
    const id = `${setId}-${localId}`;
    const card = {
      id, localId, number: `${v}/RGB`, name: jp ? 'ミュウ' : 'Mew', nameEn: 'Mew', nameFr: 'Mew', rarity: 'RGB',
      image: `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_${v}_R_EN_SM.png`,
      cmPath: jp ? `30th-Celebration-JP/Mew-V${i + 1}-m6a${v}RGB` : `30th-Celebration/Mew-V${i + 1}-30C${v}RGB`,
      attrs: { illustrator: 'YOSHIROTTEN', ...RGB_ATTRS[lang] },
      ...(jp ? { nameZh: '夢幻', extra: 1 } : {}),
    };
    const at = cards.findIndex((c) => c.id === id);
    if (at >= 0) cards[at] = { ...card, ...(cards[at].cm ? { cm: cards[at].cm } : {}) };
    else { cards.push(card); n++; }
  });
  return n;
}

/** Extensions internationales sans prix TCGdex (30th Celebration et sa Collection Classique) : fichiers Cardmarket. */
async function completeIntlCardmarket(dir, files) {
  const ids = Object.keys(INTL_EXPANSIONS).filter((id) => files.includes(`${id}.json`));
  if (!ids.length) return;
  const cmf = await cardmarketFiles();
  if (!cmf?.products.length) { console.warn('Fichiers Cardmarket indisponibles'); return; }
  const decks = ids.map((setId) => ({ setId, cards: JSON.parse(readFileSync(join(dir, `${setId}.json`), 'utf8')) }));
  completeIntlPrices(decks, cmf);
  for (const { setId, cards } of decks) writeJson(`cards/${basename(dir)}/${setId}.json`, cards);
  // Nombre de cartes affiché : celles ajoutées hors TCGdex comprises (Mew RGB).
  const setsFile = join(CATALOG, 'sets', `${basename(dir)}.json`);
  if (!existsSync(setsFile)) return;
  const sets = JSON.parse(readFileSync(setsFile, 'utf8'));
  let changed = false;
  for (const b of sets.blocs) for (const x of b.sets) {
    const d = decks.find((y) => y.setId === x.id);
    if (d && x.count !== d.cards.length) { x.count = d.cards.length; changed = true; }
  }
  if (changed) writeJson(`sets/${basename(dir)}.json`, sets);
}

/** Prix de toutes les cartes (et de leurs variantes) depuis le guide des prix Cardmarket du jour. */
async function priceFromCardmarket(dir, files) {
  const cmf = await cardmarketFiles();
  if (!cmf?.prices.size) { console.warn('Guide des prix Cardmarket indisponible'); return; }
  let n = 0;
  for (const f of files) {
    const cards = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    n += applyCardmarketPrices(cards, cmf);
    writeJson(`cards/${basename(dir)}/${f}`, cards);
  }
  console.log(`Prix Cardmarket (moyenne 7 jours) ${basename(dir)} : ${n} cartes`);
}

async function completeJapaneseCardmarket(dir, files) {
  const cmf = await cardmarketFiles();
  if (!cmf?.products.length) { console.warn('Fichiers Cardmarket indisponibles'); return; }
  const expOf = new Map(cmf.products.map((p) => [p.idProduct, p.idExpansion]));
  // Extensions déjà occupées : anglaises (prix des cartes internationales) et japonaises reliées par TCGdex.
  const known = new Set();
  for (const l of ['en', 'fr']) {
    const d = join(CATALOG, 'cards', `pokemon-${l}`);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) for (const c of JSON.parse(readFileSync(join(d, f), 'utf8'))) if (c.cm?.id && expOf.has(c.cm.id)) known.add(expOf.get(c.cm.id));
  }
  const decks = files.map((f) => ({ f, setId: f.replace(/\.json$/, ''), cards: JSON.parse(readFileSync(join(dir, f), 'utf8')) }));
  for (const { cards } of decks) for (const c of cards) if (c.cm?.id && !c.cm.f && expOf.has(c.cm.id)) known.add(expOf.get(c.cm.id));
  const before = decks.map(({ cards }) => JSON.stringify(cards));
  // Stades relevés avant le nettoyage des espaces insécables (« 2&nbsp;進化 »).
  const STAGE_FIX = { '1進化': 'Niveau 1', '2進化': 'Niveau 2' };
  for (const { cards } of decks) for (const c of cards) if (c.attrs?.stage?.includes('&nbsp;')) c.attrs.stage = STAGE_FIX[c.attrs.stage.replace(/&nbsp;/g, '')] ?? c.attrs.stage.replace(/&nbsp;/g, '');
  completeJapanesePrices(decks, cmf, known);
  decks.forEach(({ f, cards }, i) => { if (JSON.stringify(cards) !== before[i]) writeJson(`cards/pokemon-ja/${f}`, cards); });
}

/**
 * Cartes japonaises encore sans attributs (illustrations rares absentes de Limitless) :
 * fiche officielle pokemon-card.com quand son n° est connu (image officielle), sinon la carte de même nom
 * dans l'extension (même Pokémon : type, PV, stade, catégorie, régulation ; l'illustrateur diffère).
 */
async function completeJapaneseFromOfficial(dir, decks) {
  const empty = (c) => !c.attrs?.hp && !c.attrs?.illustrator && !c.attrs?.category;
  const official = new Map();
  const ids = [...new Set(decks.flatMap(({ cards }) => cards.filter(empty).map((c) => c.officialId ?? officialCardId(c.image)).filter(Boolean)))];
  await pool(ids, 4, async (id) => {
    const html = await getText(`https://www.pokemon-card.com/card-search/details.php/card/${id}/regu/all`);
    if (html) official.set(id, parseOfficialAttrs(html));
  });
  let fromOfficial = 0, fromTwin = 0;
  for (const { f, cards } of decks) {
    let changed = false;
    for (const c of cards.filter(empty)) {
      const o = official.get(c.officialId ?? officialCardId(c.image));
      if (o && Object.keys(o).length) { c.attrs = { ...o, ...(c.attrs ?? {}) }; fromOfficial++; changed = true; continue; }
      const same = (n) => n?.replace(/ \((Top|Bottom)\)$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const twin = c.nameEn && cards.find((x) => x !== c && same(x.nameEn) === same(c.nameEn) && !empty(x));
      if (twin) {
        const { illustrator, ...same } = twin.attrs;
        c.attrs = { ...same, ...(c.attrs ?? {}) };
        fromTwin++;
        changed = true;
      }
    }
    if (changed) writeJson(`cards/pokemon-ja/${f}`, cards);
  }
  console.log(`Attributs japonais : ${fromOfficial} cartes par la fiche officielle, ${fromTwin} par la carte de même nom`);
}

/** Cartes japonaises sans attributs TCGdex : attributs lus sur leur page Limitless. */
async function completeJapaneseFromLimitless(dir, files) {
  const decks = files.map((f) => ({ f, cards: JSON.parse(readFileSync(join(dir, f), 'utf8')) }));
  const refs = [];
  for (const { f, cards } of decks) {
    for (const c of cards) {
      if (c.attrs?.illustrator || c.attrs?.hp) continue;
      const r = limitlessRef('ja', f.replace(/\.json$/, ''), undefined, c.localId);
      refs.push(r);
    }
  }
  const details = await limitlessJapaneseDetails(refs);
  let filled = 0;
  for (const { f, cards } of decks) {
    let changed = false;
    for (const c of cards) {
      const d = details.get(limitlessRef('ja', f.replace(/\.json$/, ''), undefined, c.localId).key);
      if (!d || !Object.keys(d).length || c.attrs?.illustrator || c.attrs?.hp) continue;
      c.attrs = { ...d, ...(c.attrs ?? {}) };
      changed = true;
      filled++;
    }
    if (changed) writeJson(`cards/pokemon-ja/${f}`, cards);
  }
  console.log(`Attributs japonais complétés par Limitless : ${filled} cartes`);
  await completeJapaneseFromOfficial(dir, decks);
}

export async function buildPokemonDetails(langs = (process.env.DETAILS_LANGS || 'en,fr,ja').split(',')) {
  // Liens Cardmarket exacts (Limitless), relevés une fois pour toutes les langues.
  const refs = new Map();
  for (const lang of langs) {
    const dir = join(CATALOG, 'cards', `pokemon-${lang}`);
    if (!existsSync(dir)) continue;
    const codes = setCodes(lang);
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const setId = f.replace(/\.json$/, '');
      for (const c of JSON.parse(readFileSync(join(dir, f), 'utf8'))) {
        if (setId === '30th-c') continue;
        const r = limitlessRef(lang, setId, codes.get(setId), c.localId);
        if (r && !refs.has(r.key)) refs.set(r.key, r);
      }
    }
  }
  const paths = await cardmarketPaths([...refs.values()].filter((r) => !r.classic));
  const classic = langs.some((l) => l !== 'ja') ? await classicCollectionPaths().catch(() => []) : [];

  for (const lang of langs) {
    const codes = setCodes(lang);
    const dir = join(CATALOG, 'cards', `pokemon-${lang}`);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    const jaIds = lang === 'ja' ? await japaneseIds(files) : null;
    const wizard = lang === 'ja' ? await japaneseWizard() : new Map();
    const stat = { cards: 0, found: 0, priced: 0, attrs: 0, links: 0 };
    await pool(files, 2, async (f) => {
      const setId = f.replace(/\.json$/, '');
      const cards = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      // Collection Classique : liens à part (le code « 30C » est partagé avec l'extension principale).
      if (setId === '30th-c') stat.links += applyClassicCollection(cards, classic, lang);
      addExtraCards(setId, cards, lang);
      for (const c of cards) {
        if (setId === '30th-c' || c.rarity === 'RGB') continue;
        const r = limitlessRef(lang, setId, codes.get(setId), c.localId);
        const p = r && paths.get(r.key);
        if (p) { c.cmPath = p; stat.links++; } else delete c.cmPath;
      }
      // Variantes relevées à neuf à chaque passage (PokemonWizard puis TCGdex).
      for (const c of cards) delete c.v;
      // TCGplayer (PokemonWizard) : n° produit, et prix du marché quand Cardmarket n'en a pas.
      const wiz = wizard.get(setId);
      if (wiz) {
        for (const c of cards) {
          const w = wiz.get(numKey(c.localId));
          if (!w) continue;
          // Variantes : carte de base, puis les motifs vendus à part (Poké Ball, Master Ball, reverse…).
          c.v = [{ k: japaneseBase(c.rarity ?? w.rarity) }, ...(w.variants ?? []).map((v) => ({ ...v }))];
          if (!w.tcgplayer) continue;
          c.tcgplayer = w.tcgplayer;
          if (!c.rarity && w.rarity) c.rarity = w.rarity;
          if (w.market) c.price = { value: w.market, currency: 'USD', source: 'tcgplayer' };
        }
      }
      applyRarityOverrides(setId, cards);
      const map = jaIds?.get(setId);
      if (jaIds && !map) {
        if (ALL_HOLO.has(setId)) forceHolo(cards);
        stat.cards += cards.length;
        writeJson(`cards/pokemon-${lang}/${f}`, cards);
        return;
      }
      await pool(cards, 8, async (c) => {
        stat.cards++;
        const id = map ? map.get(numKey(c.localId)) : c.id;
        if (!id) return;
        const d = await getJson(`${API}/${lang}/cards/${enc(id)}`);
        if (!d) return;
        stat.found++;
        applyDetails(c, d, lang);
        if (c.cm?.avg7 || c.cm?.avg30 || c.cm?.avg) stat.priced++;
        if (c.attrs?.illustrator || c.attrs?.hp) stat.attrs++;
      });
      applyRarityOverrides(setId, cards);
      if (ALL_HOLO.has(setId)) forceHolo(cards);
      writeJson(`cards/pokemon-${lang}/${f}`, cards);
    });
    if (lang !== 'ja') await completeIntlCardmarket(dir, files);
    if (lang === 'ja') {
      await completeJapaneseFromLimitless(dir, files);
      await completeJapaneseCardmarket(dir, files);
    }
    await priceFromCardmarket(dir, files);
    console.log(`Détails Pokémon ${lang} : ${stat.found}/${stat.cards} fiches TCGdex, ${stat.priced} avec prix Cardmarket, ${stat.attrs} avec attributs, ${stat.links} avec lien Cardmarket exact`);
  }
}
