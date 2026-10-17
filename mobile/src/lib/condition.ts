import type { Card } from './types.ts';

/**
 * État des cartes (échelle Cardmarket) et cartes gradées. La cote Cardmarket correspond à une carte en bon état
 * (Near Mint) : les autres états en sont une estimation. Aucune source ne publie la cote des cartes gradées :
 * l'utilisateur indique alors sa propre valeur.
 */
export const CONDITIONS = ['MT', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO'] as const;
export type Condition = (typeof CONDITIONS)[number];
export const CONDITION_NAMES: Record<Condition, string> = {
  MT: 'Mint', NM: 'Near Mint', EX: 'Excellent', GD: 'Good', LP: 'Light Played', PL: 'Played', PO: 'Poor',
};
/** Part de la cote retenue selon l'état (estimation). */
export const CONDITION_FACTOR: Record<Condition, number> = { MT: 1, NM: 1, EX: 0.85, GD: 0.7, LP: 0.55, PL: 0.4, PO: 0.25 };
export const GRADERS = ['PSA', 'BGS', 'CGC', 'PCA', 'SGC', 'ACE'] as const;

export interface Graded { by: string; grade: string }

export interface ValuedEntry {
  card: Card;
  quantity: number;
  condition?: Condition;
  graded?: Graded;
  /** Valeur estimée à l'unité saisie par l'utilisateur (cartes gradées) et sa devise. */
  value?: number;
  valueCurrency?: string;
}

/** Coefficient appliqué à la cote : 1 pour une carte gradée ou sans état indiqué. */
export const conditionFactor = (e: ValuedEntry) => (e.graded || !e.condition ? 1 : CONDITION_FACTOR[e.condition] ?? 1);

/** Valeur unitaire retenue (devise choisie) : valeur saisie, sinon cote × coefficient d'état ; undefined sans cote. */
export function unitValue(e: ValuedEntry, toCurrency: (v: number, from: string) => number): number | undefined {
  if (e.value !== undefined && e.valueCurrency) return toCurrency(e.value, e.valueCurrency);
  const p = e.card.prices[0];
  return p ? toCurrency(p.value, p.currency) * conditionFactor(e) : undefined;
}

/** « PSA 10 », « NM ». */
export const conditionLabel = (e: ValuedEntry) => (e.graded ? `${e.graded.by} ${e.graded.grade}` : e.condition ?? undefined);
