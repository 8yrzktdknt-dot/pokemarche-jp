import type { Price } from '../types.ts';

/** Moyennes des ventes Cardmarket d'une carte (EUR). */
export interface CardmarketAverages {
  avg7?: number | null;
  avg30?: number | null;
  avg?: number | null;
}

/** Prix affiché : uniquement la moyenne des ventes Cardmarket des 7 derniers jours (aucun prix sinon). */
export function cardmarketPrice(cm?: CardmarketAverages | null): Price | undefined {
  const value = cm?.avg7;
  return value ? { source: 'cardmarket', label: 'cm.avg7', value, currency: 'EUR' } : undefined;
}
