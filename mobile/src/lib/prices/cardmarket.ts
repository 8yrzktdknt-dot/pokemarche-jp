import type { Price } from '../types.ts';

/** Moyennes des ventes Cardmarket d'une carte (EUR). */
export interface CardmarketAverages {
  avg7?: number | null;
  avg30?: number | null;
  avg?: number | null;
}

/**
 * Prix affiché : moyenne des ventes des 7 derniers jours ; sans vente sur 7 jours, moyenne sur 30 jours,
 * puis moyenne de toutes les ventes. L'étiquette dit quelle période a servi.
 */
export function cardmarketPrice(cm?: CardmarketAverages | null): Price | undefined {
  for (const key of ['avg7', 'avg30', 'avg'] as const) {
    const value = cm?.[key];
    if (value) return { source: 'cardmarket', label: `cm.${key}`, value, currency: 'EUR' };
  }
  return undefined;
}
