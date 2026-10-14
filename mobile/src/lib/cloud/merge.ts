import type { Card } from '../types.ts';

export interface SyncEntry { card: Card; quantity: number; addedAt: number }

const keyOf = (c: Card) => `${c.game}:${c.lang}:${c.id}`;

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
    out.set(k, { ...prev, quantity: Math.max(prev.quantity, e.quantity), addedAt: Math.min(prev.addedAt, e.addedAt) });
  }
  return [...out.values()].sort((a, b) => b.addedAt - a.addedAt);
}
