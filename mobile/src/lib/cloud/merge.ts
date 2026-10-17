import { collectionKey } from '../variants.ts';
import type { Card } from '../types.ts';

export interface SyncEntry { card: Card; quantity: number; addedAt: number; paid?: number; paidCurrency?: string }

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
    // Prix payé : celui qui est connu (le compte d'abord).
    const paid = prev.paid !== undefined ? {} : e.paid !== undefined ? { paid: e.paid, paidCurrency: e.paidCurrency } : {};
    out.set(k, { ...prev, ...paid, quantity: Math.max(prev.quantity, e.quantity), addedAt: Math.min(prev.addedAt, e.addedAt) });
  }
  return [...out.values()].sort((a, b) => b.addedAt - a.addedAt);
}
