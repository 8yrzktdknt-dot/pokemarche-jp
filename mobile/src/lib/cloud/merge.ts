import { collectionKey } from '../variants.ts';
import type { Card } from '../types.ts';

export interface SyncEntry { card: Card; quantity: number; addedAt: number; paid?: number; paidCurrency?: string; condition?: string; graded?: unknown; value?: number; valueCurrency?: string; trade?: boolean }

const keyOf = collectionKey;

/**
 * Fusion de la collection de l'appareil avec celle du compte (première connexion sur un appareil) :
 * toutes les cartes des deux côtés, la plus grande quantité quand une carte est des deux côtés
 * (on ne perd jamais un exemplaire), la date d'ajout la plus ancienne, les plus récentes en tête.
 */
export function mergeCollections<E extends SyncEntry>(local: E[], remote: E[]): E[] {
  const out = new Map<string, E>();
  for (const e of [...remote, ...local]) {
    const k = keyOf(e.card);
    const prev = out.get(k);
    if (!prev) { out.set(k, e); continue; }
    // Détails (prix payé, état, gradation…) : ceux qui sont connus, le compte d'abord.
    const extra = Object.fromEntries(Object.entries(e).filter(([key, v]) => v !== undefined && (prev as Record<string, unknown>)[key] === undefined));
    out.set(k, { ...extra, ...prev, quantity: Math.max(prev.quantity, e.quantity), addedAt: Math.min(prev.addedAt, e.addedAt) });
  }
  return [...out.values()].sort((a, b) => b.addedAt - a.addedAt);
}
