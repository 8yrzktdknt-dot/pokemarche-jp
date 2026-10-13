import { rarityAbbr } from './catalog/pokemonNames.ts';
import type { Card, CardLang, GameId } from './types.ts';

export interface Entry {
  card: Card;
  quantity: number;
  addedAt: number;
}

export interface GameStats {
  game: GameId;
  count: number;
  unique: number;
  /** Valeur dans la devise choisie. */
  value: number;
}

export interface CollectionStats {
  count: number;
  unique: number;
  /** Valeur totale dans la devise choisie. */
  value: number;
  /** Exemplaires sans prix connu (ajoutés depuis une liste, ou carte sans cote). */
  unpriced: number;
  games: GameStats[];
  langs: { lang: CardLang; count: number }[];
  rarities: { rarity: string; count: number }[];
  /** `unit` : prix unitaire dans la devise choisie. */
  top: { card: Card; unit: number; quantity: number }[];
  recent: Entry[];
}

/**
 * Statistiques de la collection. `toCurrency(valeur, devise)` convertit chaque prix dans la devise choisie,
 * ce qui permet d'additionner des cotes en euros et en dollars.
 */
export function collectionStats(
  entries: Entry[],
  toCurrency: (v: number, from: string) => number = (v) => v,
  games: GameId[] = ['pokemon', 'onepiece', 'riftbound'],
): CollectionStats {
  let value = 0;
  const perGame = new Map<GameId, GameStats>(games.map((g) => [g, { game: g, count: 0, unique: 0, value: 0 }]));
  const langs = new Map<CardLang, number>();
  const rarities = new Map<string, number>();
  const top: CollectionStats['top'] = [];
  let count = 0;
  let unpriced = 0;

  for (const e of entries) {
    count += e.quantity;
    const g = perGame.get(e.card.game) ?? { game: e.card.game, count: 0, unique: 0, value: 0 };
    perGame.set(e.card.game, g);
    g.count += e.quantity;
    g.unique += 1;
    langs.set(e.card.lang, (langs.get(e.card.lang) ?? 0) + e.quantity);
    if (e.card.rarity) {
      const r = rarityAbbr(e.card.rarity);
      rarities.set(r, (rarities.get(r) ?? 0) + e.quantity);
    }
    const p = e.card.prices[0];
    if (p) {
      const unit = toCurrency(p.value, p.currency);
      value += unit * e.quantity;
      g.value += unit * e.quantity;
      top.push({ card: e.card, unit, quantity: e.quantity });
    } else {
      unpriced += e.quantity;
    }
  }

  const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count;
  return {
    count,
    unique: entries.length,
    value,
    unpriced,
    games: [...perGame.values()],
    langs: [...langs].map(([lang, n]) => ({ lang, count: n })).sort(byCount),
    rarities: [...rarities].map(([rarity, n]) => ({ rarity, count: n })).sort(byCount).slice(0, 8),
    top: top.sort((a, b) => b.unit - a.unit).slice(0, 5),
    recent: [...entries].sort((a, b) => b.addedAt - a.addedAt).slice(0, 5),
  };
}
