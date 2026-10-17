import type { Card } from './types.ts';
import { collectionKey } from './variants.ts';

/** Ce qu'il faut d'un profil (le sien ou celui d'un ami) pour trouver les échanges possibles. */
export interface TradeSide {
  collection: { card: Card; quantity: number; trade?: boolean }[];
  wishlist: { card: Card }[];
}

export interface TradeMatch<E> {
  /** Cartes que l'ami propose à l'échange et que l'on recherche. */
  theyHave: E[];
  /** Cartes que l'on propose à l'échange et que l'ami recherche. */
  youHave: E[];
}

/**
 * Échanges possibles avec un ami : ses cartes « à échanger » qui sont dans notre liste de souhaits, et les nôtres qui
 * sont dans la sienne (même carte, même langue, même variante).
 */
export function matchTrades<E extends TradeSide['collection'][number]>(me: { collection: E[]; wishlist: { card: Card }[] }, friend: { collection: E[]; wishlist: { card: Card }[] }): TradeMatch<E> {
  const wanted = (side: { wishlist: { card: Card }[] }) => new Set(side.wishlist.map((w) => collectionKey(w.card)));
  const iWant = wanted(me), theyWant = wanted(friend);
  return {
    theyHave: friend.collection.filter((e) => e.trade && e.quantity > 0 && iWant.has(collectionKey(e.card))),
    youHave: me.collection.filter((e) => e.trade && e.quantity > 0 && theyWant.has(collectionKey(e.card))),
  };
}
