/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchTrades } from './trades.ts';
import type { Card } from './types.ts';

const card = (id: string, variant?: string, lang = 'fr') => ({ game: 'pokemon', id, lang, name: id, number: '1', prices: [], variant }) as unknown as Card;

test('échanges possibles : ses cartes à échanger que je cherche, et inversement', () => {
  const me = {
    collection: [{ card: card('a'), quantity: 2, trade: true }, { card: card('b'), quantity: 1 }],
    wishlist: [{ card: card('x') }, { card: card('y', 'reverse') }],
  };
  const friend = {
    collection: [{ card: card('x'), quantity: 1, trade: true }, { card: card('y'), quantity: 1, trade: true }, { card: card('y', 'reverse'), quantity: 1 }],
    wishlist: [{ card: card('a') }, { card: card('b') }, { card: card('a', undefined, 'en') }],
  };
  const m = matchTrades(me, friend);
  // y : il propose la normale, je cherche la reverse ; sa reverse n'est pas à échanger.
  assert.deepEqual(m.theyHave.map((e) => e.card.id), ['x']);
  // b : je ne l'échange pas.
  assert.deepEqual(m.youHave.map((e) => e.card.id), ['a']);
});
