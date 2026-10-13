import type { Card } from './types.ts';

/**
 * Liste parcourue depuis la fiche carte (cartes d'une extension, collection, résultats de recherche) :
 * enregistrée au moment où l'on ouvre une carte, pour passer à la précédente ou à la suivante.
 */
let current: Card[] = [];

export function setBrowseList(cards: Card[]): void {
  current = cards;
}

const same = (a: Card, b: { game: string; id: string; lang: string }) => a.game === b.game && a.id === b.id && a.lang === b.lang;

export function neighbors(card: { game: string; id: string; lang: string }): { prev?: Card; next?: Card; index: number; total: number } {
  const i = current.findIndex((c) => same(c, card));
  if (i < 0) return { index: -1, total: 0 };
  return { prev: current[i - 1], next: current[i + 1], index: i, total: current.length };
}
