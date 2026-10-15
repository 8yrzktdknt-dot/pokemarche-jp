import type { Price } from '../types.ts';

/** Prix Cardmarket d'une carte (EUR) : moyennes des ventes et prix des offres (« trend »). */
export interface CardmarketAverages {
  avg7?: number | null;
  avg30?: number | null;
  avg?: number | null;
  trend?: number | null;
  low?: number | null;
}

/**
 * Prix affiché : moyenne des ventes Cardmarket sur 7 jours, sinon sur 30 jours, sinon de toutes les ventes ;
 * pour une carte jamais vendue, le prix des offres, sinon l'offre la plus basse. L'étiquette dit lequel a servi.
 */
export function cardmarketPrice(cm?: CardmarketAverages | null): Price | undefined {
  for (const key of ['avg7', 'avg30', 'avg', 'trend', 'low'] as const) {
    const value = cm?.[key];
    if (value) return { source: 'cardmarket', label: key === 'trend' ? 'cm.offers' : key === 'low' ? 'cm.lowest' : `cm.${key}`, value, currency: 'EUR' };
  }
  return undefined;
}
