import { rarityAbbr } from './catalog/pokemonNames.ts';
import type { Card, CardLang, GameId } from './types.ts';

export interface Entry {
  card: Card;
  quantity: number;
  addedAt: number;
}

export type Money = Partial<Record<'EUR' | 'USD' | 'JPY', number>>;

export interface GameStats {
  game: GameId;
  count: number;
  unique: number;
  value: Money;
}

export interface CollectionStats {
  count: number;
  unique: number;
  value: Money;
  /** Exemplaires sans prix connu (ajoutés depuis une liste, ou carte sans cote). */
  unpriced: number;
  games: GameStats[];
  langs: { lang: CardLang; count: number }[];
  rarities: { rarity: string; count: number }[];
  top: { card: Card; unit: number; currency: string; quantity: number }[];
  recent: Entry[];
}

const add = (m: Money, cur: keyof Money, v: number) => { m[cur] = (m[cur] ?? 0) + v; };

/** Statistiques de la collection. Les prix de devises différentes ne sont jamais additionnés entre eux. */
export function collectionStats(entries: Entry[], games: GameId[] = ['pokemon', 'onepiece', 'riftbound']): CollectionStats {
  const value: Money = {};
  const perGame = new Map<GameId, GameStats>(games.map((g) => [g, { game: g, count: 0, unique: 0, value: {} }]));
  const langs = new Map<CardLang, number>();
  const rarities = new Map<string, number>();
  const top: CollectionStats['top'] = [];
  let count = 0;
  let unpriced = 0;

  for (const e of entries) {
    count += e.quantity;
    const g = perGame.get(e.card.game) ?? { game: e.card.game, count: 0, unique: 0, value: {} };
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
      add(value, p.currency, p.value * e.quantity);
      add(g.value, p.currency, p.value * e.quantity);
      top.push({ card: e.card, unit: p.value, currency: p.currency, quantity: e.quantity });
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
    // Classement par prix unitaire, en euros d'abord (devise principale de l'app).
    top: top.sort((a, b) => (a.currency === b.currency ? b.unit - a.unit : a.currency === 'EUR' ? -1 : 1)).slice(0, 5),
    recent: [...entries].sort((a, b) => b.addedAt - a.addedAt).slice(0, 5),
  };
}
