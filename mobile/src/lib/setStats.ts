import { rarityAbbr } from './catalog/pokemonNames.ts';
import type { Card } from './types.ts';

/** Avancement sur un groupe de cartes. */
export interface Progress {
  owned: number;
  total: number;
}

export interface SetStats {
  /** Cartes numérotées jusqu'au total imprimé (« 001/103 » … « 103/103 »). */
  base: Progress;
  /** Master Set : toutes les cartes de l'extension dans toutes leurs variantes (reverse, Poké Ball…). */
  master: Progress;
  /** Cartes au-delà du total imprimé (secrètes, illustrations spéciales…). */
  extra: Progress;
  /** Total imprimé sur les cartes (103 pour « 151/103 »), sinon nombre de cartes. */
  printed: number;
  /** Somme des prix de toutes les cartes (devise choisie) et des cartes possédées. */
  value: number;
  ownedValue: number;
  /** Ce qu'il reste à acheter pour compléter l'extension. */
  missingValue: number;
  priced: number;
  /** Cartes les plus chères, de la plus chère à la moins chère. */
  top: { card: Card; unit: number; owned: boolean }[];
  /** Cartes manquantes les plus chères. */
  topMissing: { card: Card; unit: number }[];
  /** Par rareté, dans l'ordre des numéros (communes d'abord). */
  rarities: { rarity: string; owned: number; total: number; value: number }[];
  /** Nombre de cartes par tranche de prix (bornes dans la devise choisie). */
  buckets: { min: number; max?: number; count: number; owned: number }[];
  median?: number;
}

/**
 * Numéro de la carte dans l'extension (« 151/103 » → 151, Riftbound « OGN-030/298 » → 30) ; undefined pour « TG01 »,
 * « SWSH001 », les illustrations alternatives « OGN-030a/298 » et les signées « OGN-301* / 298 »…
 */
const numberOf = (c: Card) => {
  const head = c.number.split('/')[0].trim();
  const m = c.number.includes('/') ? head.match(/^(?:[A-Za-z]+\d*-)?(\d+)$/) : head.match(/^(\d+)$/);
  return m ? Number(m[1]) : undefined;
};

/**
 * Numéro qui identifie la carte dans l'extension : « 056/103 » → « 056 » ; un numéro sans total numérique reste
 * entier (« R/RGB » ≠ « R », l'énergie de base).
 */
const numberKey = (c: Card) => {
  const n = c.number.trim().toUpperCase();
  return (/\/\s*\d+$/.test(n) ? n.split('/')[0].trim() : n) || c.id;
};

/** Raretés des cartes de l'extension « normale » (les secrètes, AR, SR, SAR, UR…, sont numérotées après). */
const BASE_RARITIES = new Set(['C', 'U', 'R', 'RR', 'RRR', 'ACE']);

/**
 * Total imprimé : le plus grand « /N » des numéros (« 151/103 » → 103). Sans « /N » (cartes japonaises,
 * chinoises simplifiées…) : le plus grand numéro des cartes de rareté normale (communes à triple rares).
 */
export function printedTotal(cards: Card[]): number | undefined {
  let n = 0;
  for (const c of cards) {
    const m = c.number.match(/\/\s*(\d+)\s*$/);
    if (m) n = Math.max(n, Number(m[1]));
  }
  if (n) return n;
  for (const c of cards) {
    const k = numberOf(c);
    if (k !== undefined && c.rarity && BASE_RARITIES.has(rarityAbbr(c.rarity))) n = Math.max(n, k);
  }
  return n || undefined;
}


export const BUCKETS = [0, 1, 5, 20, 50, 100];

/**
 * Statistiques d'une extension pour la collection. `isOwned` dit si une carte est possédée,
 * `toCurrency` convertit chaque prix dans la devise choisie.
 */
export function setStats(
  cards: Card[],
  isOwned: (c: Card) => boolean,
  toCurrency: (v: number, from: string) => number = (v) => v,
  /** Variante possédée (Master Set) ; sans elle, une carte possédée compte pour toutes ses variantes. */
  variantOwned?: (c: Card, key: string) => boolean,
): SetStats {
  const printed = printedTotal(cards);
  const base: Progress = { owned: 0, total: 0 };
  const extra: Progress = { owned: 0, total: 0 };
  const rarities = new Map<string, { rarity: string; owned: number; total: number; value: number }>();
  const buckets = BUCKETS.map((min, i) => ({ min, max: BUCKETS[i + 1], count: 0, owned: 0 }));
  const priced: { card: Card; unit: number; owned: boolean }[] = [];
  let value = 0, ownedValue = 0;
  const master: Progress = { owned: 0, total: 0 };

  // Set complet et cartes secrètes : un numéro compte une fois (réimpressions de même numéro, ex. chinois traditionnel).
  const numbers = new Map<string, { group: Progress; owned: boolean }>();
  // Master Set par numéro : variantes de la carte, ou cartes de même numéro quand la source les liste à part
  // (motifs listés comme cartes sur le site taïwanais) — le plus grand des deux, sans double compte.
  const masterByNumber = new Map<string, { cards: number; variants: number; owned: number }>();
  for (const c of cards) {
    const own = isOwned(c);
    const keys = c.variants?.length ? c.variants.map((v) => v.key) : [undefined];
    const ownedKeys = keys.filter((k) => (k && variantOwned ? variantOwned(c, k) : own)).length;
    const mk = numberKey(c);
    const m = masterByNumber.get(mk) ?? { cards: 0, variants: 0, owned: 0 };
    m.cards++;
    m.variants = Math.max(m.variants, keys.length);
    m.owned += ownedKeys;
    masterByNumber.set(mk, m);
    const n = numberOf(c);
    const group = printed && (n === undefined || n > printed) ? extra : base;
    const key = numberKey(c);
    const seen = numbers.get(key);
    if (!seen) {
      numbers.set(key, { group, owned: own });
      group.total++;
      if (own) group.owned++;
    } else if (own && !seen.owned) {
      seen.owned = true;
      seen.group.owned++;
    }
    const r = rarityAbbr(c.rarity || 'None');
    const rr = rarities.get(r) ?? { rarity: r, owned: 0, total: 0, value: 0 };
    rarities.set(r, rr);
    rr.total++;
    if (own) rr.owned++;
    const p = c.prices[0];
    if (!p) continue;
    const unit = toCurrency(p.value, p.currency);
    priced.push({ card: c, unit, owned: own });
    value += unit;
    rr.value += unit;
    if (own) ownedValue += unit;
    const b = buckets.findLast((x) => unit >= x.min) ?? buckets[0];
    b.count++;
    if (own) b.owned++;
  }

  for (const m of masterByNumber.values()) {
    const total = Math.max(m.cards, m.variants);
    master.total += total;
    master.owned += Math.min(total, m.owned);
  }
  const sorted = [...priced].sort((a, b) => b.unit - a.unit);
  const units = priced.map((p) => p.unit).sort((a, b) => a - b);
  const mid = units.length >> 1;
  return {
    base,
    extra,
    master,
    printed: printed ?? cards.length,
    value,
    ownedValue,
    missingValue: value - ownedValue,
    priced: priced.length,
    top: sorted.slice(0, 10),
    topMissing: sorted.filter((p) => !p.owned).slice(0, 10).map(({ card, unit }) => ({ card, unit })),
    rarities: [...rarities.values()],
    buckets,
    median: units.length ? (units.length % 2 ? units[mid] : (units[mid - 1] + units[mid]) / 2) : undefined,
  };
}

/** Part possédée, en pourcentage entier (0 si le groupe est vide). */
export const percent = (p: Progress) => (p.total ? Math.floor((p.owned / p.total) * 100) : 0);
