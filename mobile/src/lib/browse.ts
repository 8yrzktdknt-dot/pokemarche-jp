import type { Card } from './types.ts';

/**
 * Liste parcourue depuis la fiche carte (cartes d'une extension, collection, résultats de recherche) :
 * enregistrée au moment où l'on ouvre une carte, pour passer à la précédente ou à la suivante.
 */
let current: Card[] = [];

export function setBrowseList(cards: Card[]): void {
  current = cards;
}

/** Carte de la liste : même carte, et même variante quand la liste sépare les variantes (« Séparer »). */
type Key = { game: string; id: string; lang: string; variant?: string };
const same = (a: Card, b: Key) =>
  a.game === b.game && a.id === b.id && a.lang === b.lang && (b.variant === undefined || a.variant === undefined || a.variant === b.variant);

export function neighbors(card: Key): { prev?: Card; next?: Card; index: number; total: number } {
  const i = current.findIndex((c) => same(c, card));
  if (i < 0) return { index: -1, total: 0 };
  return { prev: current[i - 1], next: current[i + 1], index: i, total: current.length };
}

/** Carte telle qu'elle apparaît dans la liste (affichage immédiat en attendant la fiche complète). */
export function browseCard(key: Key): Card | undefined {
  return current.find((c) => same(c, key));
}
