/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gainOf, isDeal, newDeals, parsePrice, type WishEntry } from './wishlist.ts';
import type { Card } from './types.ts';

const card = (value: number, currency = 'EUR'): Card => ({ game: 'pokemon', id: 'x', lang: 'fr', name: 'X', number: '1', prices: [{ source: 'cardmarket', label: 'cm.avg7', value, currency }] }) as Card;
const conv = (v: number, from: string, to: string) => (from === to ? v : from === 'USD' && to === 'EUR' ? v * 0.9 : v / 0.9);

test('bonne affaire : cote sous le prix cible, conversion de devise', () => {
  const e: WishEntry = { card: card(10), addedAt: 0, target: 12, currency: 'EUR' };
  assert.equal(isDeal(e, conv), true);
  assert.equal(isDeal({ ...e, target: 9 }, conv), false);
  assert.equal(isDeal({ ...e, card: card(14, 'USD') }, conv), false);
  assert.equal(isDeal({ ...e, card: card(13, 'USD'), target: 12 }, conv), true);
  assert.equal(isDeal({ ...e, target: undefined }, conv), false);
  assert.equal(newDeals([e, { ...e, notified: '2026-10-17' }], conv, '2026-10-17').length, 1);
});

test('prix saisi', () => {
  assert.equal(parsePrice('12,50'), 12.5);
  assert.equal(parsePrice('3.333 €'), 3.33);
  assert.equal(parsePrice(''), undefined);
  assert.equal(parsePrice('abc'), undefined);
});

test('plus-value : seulement les cartes avec un prix payé', () => {
  const g = gainOf([
    { card: card(15), quantity: 2, paid: 10, paidCurrency: 'EUR' },
    { card: card(100), quantity: 1 },
  ], (v) => v);
  assert.deepEqual(g, { paid: 20, value: 30, delta: 10, pct: 50, count: 2 });
  assert.equal(gainOf([{ card: card(5), quantity: 1 }], (v) => v), null);
  // Prix payé connu pour un seul des exemplaires.
  assert.deepEqual(gainOf([{ card: card(15), quantity: 2, copies: [{ paid: 10, paidCurrency: 'EUR' }, { condition: 'LP' }] }], (v) => v), { paid: 10, value: 15, delta: 5, pct: 50, count: 1 });
});
