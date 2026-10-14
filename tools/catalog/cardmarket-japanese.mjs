// Prix Cardmarket des cartes japonaises absentes de TCGdex, depuis les fichiers publics de Cardmarket :
//  - liste des produits (n° produit, nom anglais « Exeggcute [Hypnosis] », n° d'extension, sans nom d'extension),
//  - guide des prix (moyennes des ventes par n° produit).
// L'extension japonaise de chaque extension du catalogue est celle qui contient ses cartes (noms anglais),
// n'est ni anglaise ni déjà prise par une autre extension japonaise, et a le nombre de cartes le plus proche ;
// à égalité, la première créée (Cardmarket crée l'extension japonaise avant les chinoises, thaï…).
// Les cartes de même nom sont attribuées dans l'ordre des numéros (les n° produit suivent l'ordre de l'extension).
import { getJson } from './lib.mjs';

const PRODUCTS = 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json';
const PRICES = 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json';

/**
 * Extensions dont le choix est confirmé à la main (code du catalogue → n° d'extension Cardmarket).
 * M6a : 6601 anglais/français, 6602 japonais (et coréen, chinois traditionnel), 6603 chinois simplifié, 6604 thaï/indonésien.
 */
export const JA_EXPANSIONS = { M6a: 6602 };

/** Nom comparable : sans les attaques (« Exeggcute [Hypnosis] »), sans « (Top) / (Bottom) » des cartes LEGEND. */
const base = (name) => name.split(' [')[0].replace(/\((top|bottom)\)/gi, '').trim().toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

export async function loadCardmarketFiles() {
  const [p, g] = await Promise.all([getJson(PRODUCTS), getJson(PRICES)]);
  return { products: p?.products ?? [], prices: new Map((g?.priceGuides ?? []).map((x) => [x.idProduct, x])) };
}

/** Choix de l'extension Cardmarket d'une extension japonaise ; undefined si incertain. */
export function pickExpansion(cards, expansions, excluded) {
  const names = new Set(cards.map((c) => c.nameEn && base(c.nameEn)).filter(Boolean));
  if (names.size < 3) return undefined;
  const cand = [];
  for (const [id, e] of expansions) {
    if (excluded.has(id)) continue;
    let hit = 0;
    for (const n of names) if (e.names.has(n)) hit++;
    if (hit / names.size >= 0.85) cand.push({ id, hit, diff: Math.abs(e.count - cards.length), first: e.first ?? '' });
  }
  cand.sort((a, b) => b.hit - a.hit || a.diff - b.diff || a.first.localeCompare(b.first));
  return cand[0]?.id;
}

/** Cartes → n° produit dans une extension : par nom, puis dans l'ordre des numéros et des n° produit. */
export function matchProducts(cards, products) {
  const byName = new Map();
  for (const p of [...products].sort((a, b) => a.idProduct - b.idProduct)) {
    const k = base(p.name);
    byName.set(k, [...(byName.get(k) ?? []), p.idProduct]);
  }
  const out = new Map();
  const groups = new Map();
  for (const c of cards) {
    if (!c.nameEn) continue;
    const k = base(c.nameEn);
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }
  for (const [k, list] of groups) {
    const ids = byName.get(k) ?? [];
    if (!ids.length) continue;
    const sorted = [...list].sort((a, b) => cardOrder(a) - cardOrder(b));
    // Autant de produits que de cartes : un à un ; sinon seulement quand il n'y a qu'une carte et un produit.
    if (ids.length === sorted.length) sorted.forEach((c, i) => out.set(c.id, ids[i]));
    else if (sorted.length === 1 && ids.length === 1) out.set(sorted[0].id, ids[0]);
  }
  fillGaps(cards, products, out);
  return out;
}

/**
 * Cartes restées sans produit (nom différent chez Cardmarket) : les n° produit suivant l'ordre des numéros,
 * une carte entre deux cartes reliées prend le n° produit à la même distance, s'il existe et n'est pas pris.
 */
export function fillGaps(cards, products, out) {
  const exists = new Set(products.map((p) => p.idProduct));
  const used = new Set(out.values());
  const numbered = cards.filter((c) => /^\d+$/.test(c.localId)).sort((a, b) => Number(a.localId) - Number(b.localId));
  for (let i = 0; i < numbered.length; i++) {
    const c = numbered[i];
    if (out.has(c.id)) continue;
    let lo = i - 1;
    while (lo >= 0 && !out.has(numbered[lo].id)) lo--;
    let hi = i + 1;
    while (hi < numbered.length && !out.has(numbered[hi].id)) hi++;
    if (lo < 0 || hi >= numbered.length) continue;
    const [a, b] = [numbered[lo], numbered[hi]];
    const span = Number(b.localId) - Number(a.localId);
    if (out.get(b.id) - out.get(a.id) !== span) continue;
    const id = out.get(a.id) + Number(c.localId) - Number(a.localId);
    if (exists.has(id) && !used.has(id)) { out.set(c.id, id); used.add(id); }
  }
}

const numberOrder = (n) => (/^\d+$/.test(n) ? Number(n) : 10000 + n.charCodeAt(0));
/** Ordre des cartes de même nom : numéro ; cartes à lettres (« RRGB ») après, dans l'ordre V1, V2… de leur fiche Cardmarket. */
const cardOrder = (c) => {
  const v = /^\d+$/.test(c.localId) ? undefined : c.cmPath?.match(/-V(\d+)-/)?.[1];
  return v ? 20000 + Number(v) : numberOrder(c.localId);
};

/** Moyennes des ventes d'un produit (champs « -holo » pour les cartes uniquement holo). */
export function priceOf(g) {
  if (!g) return undefined;
  const pick = (k) => g[k] || g[`${k}-holo`] || undefined;
  const out = { id: g.idProduct, avg7: pick('avg7'), avg30: pick('avg30'), avg: pick('avg') };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out.avg7 || out.avg30 || out.avg ? out : undefined;
}

/**
 * Complète les cartes japonaises sans prix Cardmarket. `decks` : [{ setId, cards }] (modifiés sur place).
 * `known` : n° d'extension déjà occupés (anglaises, japonaises reliées par TCGdex). Renvoie le nombre de cartes complétées.
 */
export function completeJapanesePrices(decks, files, known) {
  const expansions = new Map();
  const productsByExp = new Map();
  for (const p of files.products) {
    const e = expansions.get(p.idExpansion) ?? { count: 0, names: new Set(), first: p.dateAdded };
    e.count++;
    if (p.dateAdded && p.dateAdded > '0000' && (!e.first || e.first <= '0000' || p.dateAdded < e.first)) e.first = p.dateAdded;
    e.names.add(base(p.name));
    expansions.set(p.idExpansion, e);
    productsByExp.set(p.idExpansion, [...(productsByExp.get(p.idExpansion) ?? []), p]);
  }
  const used = new Set(known);
  let filled = 0;
  const report = [];
  for (const { setId, cards } of decks) {
    // Cartes sans prix TCGdex (celles venues de ces fichiers, marquées « f », sont remises à jour chaque jour).
    // Extension vérifiée à la main : toujours ses fiches, même si TCGdex en propose d'autres (autre langue).
    const missing = JA_EXPANSIONS[setId] ? cards : cards.filter((c) => !c.cm || c.cm.f);
    if (!JA_EXPANSIONS[setId] && (!missing.length || missing.length < cards.length * 0.5)) continue;
    const exp = JA_EXPANSIONS[setId] ?? pickExpansion(cards, expansions, used);
    if (!exp) { report.push(`${setId}:?`); continue; }
    used.add(exp);
    const ids = matchProducts(cards, productsByExp.get(exp) ?? []);
    let n = 0;
    for (const c of missing) {
      const id = ids.get(c.id);
      const cm = id ? { ...(priceOf(files.prices.get(id)) ?? { id }), f: 1 } : undefined;
      if (cm) { c.cm = cm; n++; } else if (c.cm?.f) delete c.cm;
    }
    filled += n;
    report.push(`${setId}→${exp}:${n}/${cards.length}`);
  }
  console.log(`Prix Cardmarket japonais (fichiers Cardmarket) : ${filled} cartes ; ${report.join(' ')}`);
  return filled;
}

/**
 * Extensions internationales sans prix TCGdex, reliées à la main à leur extension Cardmarket.
 * 30th Celebration (6601) : l'extension principale et la Collection Classique (CC1…CC30) y sont réunies.
 */
export const INTL_EXPANSIONS = { '30th': 6601, '30th-c': 6601 };

/**
 * Nom comparable d'une fiche (« 30th-Celebration/Uxie-Lv55-30CLA-43 » → « uxielv55 », « Mew-V1-30CRRGB » → « mew »)
 * ou d'un produit (« Uxie Lv.55 [Set Up] »).
 */
const pathKey = (p) => p.split('/').pop().replace(/-30C[A-Z]*-?[A-Z0-9]*$/, '').replace(/-V\d+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const productKey = (name) => name.replace(/\s*\[[^\]]*\]\s*$/, '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Prix Cardmarket des extensions internationales d'INTL_EXPANSIONS. `decks` : [{ setId, cards }] (modifiés sur place),
 * dans l'ordre de l'extension principale puis des sous-ensembles : les cartes de même nom prennent les n° produit dans l'ordre.
 */
export function completeIntlPrices(decks, files) {
  const byExp = new Map();
  for (const { setId, cards } of decks) {
    const exp = INTL_EXPANSIONS[setId];
    if (exp) byExp.set(exp, [...(byExp.get(exp) ?? []), ...cards]);
  }
  let filled = 0;
  for (const [exp, cards] of byExp) {
    const ids = new Map();
    for (const p of files.products.filter((x) => x.idExpansion === exp).sort((a, b) => a.idProduct - b.idProduct)) {
      const k = productKey(p.name);
      ids.set(k, [...(ids.get(k) ?? []), p.idProduct]);
    }
    const groups = new Map();
    for (const c of cards) {
      const k = c.cmPath ? pathKey(c.cmPath) : c.nameEn && productKey(c.nameEn);
      if (k) groups.set(k, [...(groups.get(k) ?? []), c]);
    }
    for (const [k, list] of groups) {
      const found = ids.get(k) ?? [];
      // Un à un, dans l'ordre des n° produit ; produits en trop (ajoutés après coup : éditions spéciales) ignorés.
      // Moins de produits que de cartes : rien (mieux vaut pas de prix qu'un faux).
      if (found.length < list.length) continue;
      list.forEach((c, i) => {
        const cm = priceOf(files.prices.get(found[i]));
        if (cm) { c.cm = { ...cm, f: 1 }; filled++; }
      });
    }
  }
  console.log(`Prix Cardmarket (fichiers Cardmarket, extensions sans prix TCGdex) : ${filled} cartes`);
  return filled;
}
