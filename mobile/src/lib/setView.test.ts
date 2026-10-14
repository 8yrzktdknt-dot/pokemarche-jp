import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Card } from './types.ts';
import { DEFAULT_SET_VIEW, setView } from './setView.ts';
import { collectionKey } from './variants.ts';

const mk = (id: string, name: string, illus: string, variants?: [string, number][]): Card => ({
  game: 'pokemon', id, lang: 'fr', name, number: id, prices: [],
  attributes: [{ key: 'illustrator', value: illus }],
  variants: variants?.map(([key, price]) => ({ key, price })),
});
const cards = [
  mk('001', 'Bulbizarre', 'Zed', [['normal', 0.1], ['reverse', 0.5], ['pokeball', 2]]),
  mk('002', 'Herbizarre', 'Ann', [['normal', 0.3]]),
  mk('003', 'Florizarre', 'Max', [['holo', 5]]),
];
const owned = new Map([['pokemon:fr:001#reverse', 2], ['pokemon:fr:003#holo', 1]]);
const qty = (c: Card) => owned.get(collectionKey(c)) ?? 0;
const ids = (o: Partial<typeof DEFAULT_SET_VIEW>) => setView(cards, { ...DEFAULT_SET_VIEW, ...o }, qty, (c) => c.name).map((t) => t.key);

test('empilé : une case par carte, quantité toutes variantes', () => {
  const v = setView(cards, DEFAULT_SET_VIEW, qty, (c) => c.name);
  assert.deepEqual(v.map((t) => [t.key, t.quantity]), [['001', 2], ['002', 0], ['003', 1]]);
});

test('séparé : une case par variante, avec son prix', () => {
  const v = setView(cards, { ...DEFAULT_SET_VIEW, split: true }, qty, (c) => c.name);
  assert.deepEqual(v.map((t) => [t.key, t.card.prices[0]?.value, t.quantity]), [
    ['001#normal', 0.1, 0], ['001#reverse', 0.5, 2], ['001#pokeball', 2, 0], ['002#normal', 0.3, 0], ['003#holo', 5, 1],
  ]);
});

test('tri, ordre, état et recherche', () => {
  assert.deepEqual(ids({ sort: 'name' }), ['001', '003', '002']);
  assert.deepEqual(ids({ sort: 'illustrator' }), ['002', '003', '001']);
  assert.deepEqual(ids({ sort: 'price', desc: true }), ['003', '002', '001']);
  assert.deepEqual(ids({ desc: true }), ['003', '002', '001']);
  assert.deepEqual(ids({ sort: 'quantity', desc: true }), ['001', '003', '002']);
  assert.deepEqual(ids({ state: 'owned' }), ['001', '003']);
  assert.deepEqual(ids({ state: 'missing', split: true }), ['001#normal', '001#pokeball', '002#normal']);
  assert.deepEqual(ids({ query: 'HERBI' }), ['002']);
  assert.deepEqual(ids({ query: '003' }), ['003']);
});
