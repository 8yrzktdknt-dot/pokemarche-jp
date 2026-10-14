import type { Card, CardLang, GameId } from './types.ts';

interface Entry { card: Card; quantity: number; addedAt: number }

type Loader = (game: GameId, setId: string, lang: CardLang) => Promise<Card[]>;

/**
 * Remet à jour les prix (et fiches Cardmarket) des cartes de la collection avec ceux du catalogue du jour :
 * une carte ajoutée il y a un mois garde sinon le prix de ce jour-là. Une extension chargée par groupe de cartes.
 * Renvoie null quand rien n'a changé.
 */
export async function refreshCollectionPrices<E extends Entry>(entries: E[], load: Loader): Promise<E[] | null> {
  const groups = new Map<string, { game: GameId; setId: string; lang: CardLang }>();
  for (const e of entries) {
    if (e.card.setId) groups.set(`${e.card.game}|${e.card.lang}|${e.card.setId}`, { game: e.card.game, setId: e.card.setId, lang: e.card.lang });
  }
  const fresh = new Map<string, Card>();
  await Promise.all([...groups.entries()].map(async ([k, g]) => {
    const cards = await load(g.game, g.setId, g.lang).catch(() => [] as Card[]);
    for (const c of cards) fresh.set(`${k}|${c.id}`, c);
  }));
  let changed = false;
  const next = entries.map((e) => {
    const f = fresh.get(`${e.card.game}|${e.card.lang}|${e.card.setId}|${e.card.id}`);
    if (!f) return e;
    const same = JSON.stringify(f.prices) === JSON.stringify(e.card.prices)
      && JSON.stringify(f.marketIds ?? null) === JSON.stringify(e.card.marketIds ?? null);
    if (same) return e;
    changed = true;
    return { ...e, card: { ...e.card, prices: f.prices, marketIds: f.marketIds ?? e.card.marketIds } };
  });
  return changed ? next : null;
}
