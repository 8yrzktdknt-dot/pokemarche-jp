import type { Card } from './types.ts';
import { collectionKey } from './variants.ts';
import { copiesOf, copyValue, type ValuedEntry } from './condition.ts';

/**
 * Liste de souhaits : cartes recherchées, avec un prix cible facultatif (dans la devise choisie au moment de le fixer).
 * Une carte est une « bonne affaire » quand sa cote Cardmarket du jour passe sous ce prix.
 */
export interface WishEntry {
  card: Card;
  addedAt: number;
  /** Prix cible et sa devise. */
  target?: number;
  currency?: string;
  /** Dernier jour où une notification a été envoyée pour cette carte (« 2026-10-17 »). */
  notified?: string;
}

type Convert = (v: number, from: string) => number;

export const wishKey = (c: Card) => collectionKey(c);

/** Prix actuel de la carte dans la devise du prix cible (undefined sans cote). */
export function currentIn(e: WishEntry, convert: (v: number, from: string, to: string) => number): number | undefined {
  const p = e.card.prices[0];
  return p && e.currency ? convert(p.value, p.currency, e.currency) : undefined;
}

/** La cote du jour est sous le prix cible. */
export function isDeal(e: WishEntry, convert: (v: number, from: string, to: string) => number): boolean {
  const now = currentIn(e, convert);
  return e.target !== undefined && e.target > 0 && now !== undefined && now <= e.target;
}

/** Bonnes affaires pas encore signalées aujourd'hui. */
export function newDeals(list: WishEntry[], convert: (v: number, from: string, to: string) => number, day: string): WishEntry[] {
  return list.filter((e) => isDeal(e, convert) && e.notified !== day);
}

/** Lecture d'un prix saisi (« 12,50 », « 12.5 € ») ; undefined si vide ou invalide. */
export function parsePrice(text: string): number | undefined {
  const v = Number(text.replace(/[^\d.,]/g, '').replace(',', '.'));
  return text.trim() && Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : undefined;
}

/** Plus-value : valeur actuelle moins prix payé, sur les cartes dont le prix d'achat est connu. */
export interface Gain {
  paid: number;
  value: number;
  delta: number;
  pct: number;
  /** Exemplaires pris en compte. */
  count: number;
}

/** Plus-value d'une ou plusieurs lignes de la collection (exemplaire par exemplaire), dans la devise choisie (null sans prix d'achat ni cote). */
export function gainOf(entries: ValuedEntry[], toCurrency: Convert): Gain | null {
  let paid = 0, value = 0, count = 0;
  for (const e of entries) {
    for (const c of copiesOf(e)) {
      const unit = copyValue(e.card, c, toCurrency);
      if (c.paid === undefined || !c.paidCurrency || unit === undefined) continue;
      paid += toCurrency(c.paid, c.paidCurrency);
      value += unit;
      count++;
    }
  }
  if (!count) return null;
  const delta = value - paid;
  return { paid, value, delta, pct: paid > 0 ? (delta / paid) * 100 : 0, count };
}
