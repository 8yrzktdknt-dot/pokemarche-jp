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
  /** Toutes les cartes de l'extension. */
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

/** Total imprimé : le plus grand « /N » des numéros (« 151/103 » → 103). */
export function printedTotal(cards: Card[]): number | undefined {
  let n = 0;
  for (const c of cards) {
    const m = c.number.match(/\/\s*(\d+)\s*$/);
    if (m) n = Math.max(n, Number(m[1]));
  }
  return n || undefined;
}

/** Numéro de la carte dans l'extension (« 151/103 » → 151) ; undefined pour « TG01 », « SWSH001 »… */
const numberOf = (c: Card) => {
  const head = c.number.split('/')[0].trim();
  return /^\d+$/.test(head) ? Number(head) : undefined;
};

export const BUCKETS = [0, 1, 5, 20, 50, 100];

/**
 * Statistiques d'une extension pour la collection. `isOwned` dit si une carte est possédée,
 * `toCurrency` convertit chaque prix dans la devise choisie.
 */
export function setStats(
  cards: Card[],
  isOwned: (c: Card) => boolean,
  toCurrency: (v: number, from: string) => number = (v) => v,
): SetStats {
  const printed = printedTotal(cards);
  const base: Progress = { owned: 0, total: 0 };
  const extra: Progress = { owned: 0, total: 0 };
  const rarities = new Map<string, { rarity: string; owned: number; total: number; value: number }>();
  const buckets = BUCKETS.map((min, i) => ({ min, max: BUCKETS[i + 1], count: 0, owned: 0 }));
  const priced: { card: Card; unit: number; owned: boolean }[] = [];
  let value = 0, ownedValue = 0;

  for (const c of cards) {
    const own = isOwned(c);
    const n = numberOf(c);
    const group = printed && (n === undefined || n > printed) ? extra : base;
    group.total++;
    if (own) group.owned++;
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

  const sorted = [...priced].sort((a, b) => b.unit - a.unit);
  const units = priced.map((p) => p.unit).sort((a, b) => a - b);
  const mid = units.length >> 1;
  return {
    base,
    extra,
    master: { owned: base.owned + extra.owned, total: base.total + extra.total },
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
