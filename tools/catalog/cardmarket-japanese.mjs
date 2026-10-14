// Prix Cardmarket des cartes japonaises absentes de TCGdex, depuis les fichiers publics de Cardmarket :
//  - liste des produits (n° produit, nom anglais « Exeggcute [Hypnosis] », n° d'extension, sans nom d'extension),
//  - guide des prix (moyennes des ventes par n° produit).
// L'extension japonaise de chaque extension du catalogue est celle qui contient ses cartes (noms anglais),
// n'est ni anglaise ni déjà prise par une autre extension japonaise, et a le nombre de cartes le plus proche.
// Les cartes de même nom sont attribuées dans l'ordre des numéros (les n° produit suivent l'ordre de l'extension).
import { getJson } from './lib.mjs';

const PRODUCTS = 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json';
const PRICES = 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json';

/** Extensions dont le choix est confirmé à la main (code du catalogue → n° d'extension Cardmarket). */
export const JA_EXPANSIONS = {};

const base = (name) => name.split(' [')[0].trim().toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

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
    if (hit / names.size >= 0.85) cand.push({ id, hit, diff: Math.abs(e.count - cards.length) });
  }
  cand.sort((a, b) => b.hit - a.hit || a.diff - b.diff);
  const best = cand[0];
  if (!best) return undefined;
  // Deux candidats équivalents (même couverture, même taille) : on ne devine pas.
  if (cand[1] && cand[1].hit === best.hit && cand[1].diff === best.diff) return undefined;
  return best.id;
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
    const sorted = [...list].sort((a, b) => numberOrder(a.localId) - numberOrder(b.localId));
    // Autant de produits que de cartes : un à un ; sinon seulement quand il n'y a qu'une carte et un produit.
    if (ids.length === sorted.length) sorted.forEach((c, i) => out.set(c.id, ids[i]));
    else if (sorted.length === 1 && ids.length === 1) out.set(sorted[0].id, ids[0]);
  }
  return out;
}

const numberOrder = (n) => (/^\d+$/.test(n) ? Number(n) : 10000 + n.charCodeAt(0));

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
    const e = expansions.get(p.idExpansion) ?? { count: 0, names: new Set() };
    e.count++;
    e.names.add(base(p.name));
    expansions.set(p.idExpansion, e);
    productsByExp.set(p.idExpansion, [...(productsByExp.get(p.idExpansion) ?? []), p]);
  }
  const used = new Set(known);
  let filled = 0;
  const report = [];
  for (const { setId, cards } of decks) {
    // Cartes sans prix TCGdex (celles venues de ces fichiers, marquées « f », sont remises à jour chaque jour).
    const missing = cards.filter((c) => !c.cm || c.cm.f);
    if (!missing.length || missing.length < cards.length * 0.5) continue;
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
