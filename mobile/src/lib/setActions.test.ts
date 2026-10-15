import { test } from 'node:test';
import assert from 'node:assert/strict';
import { masterCards, missingMaster, setCsv } from './setActions.ts';
import type { Card } from './types.ts';
import { collectionKey } from './variants.ts';

const card = (id: string, p: Partial<Card> = {}): Card => ({ game: 'pokemon', id, lang: 'fr', name: id, number: id, prices: [], ...p });
const cards = [
  card('a', { rarity: 'Commune', variants: [{ key: 'normal', price: 0.1 }, { key: 'reverse', price: 0.5 }] }),
  card('b', { name: 'Pikachu; "ex"', rarity: 'Rare' }),
];

test('Master Set : chaque variante, et ce qui manque', () => {
  assert.deepEqual(masterCards(cards).map((c) => `${c.id}:${c.variant ?? ''}`), ['a:normal', 'a:reverse', 'b:']);
  const owned = new Set([collectionKey({ ...cards[0], variant: 'normal' })]);
  assert.deepEqual(missingMaster(cards, (k) => owned.has(k)).map((c) => `${c.id}:${c.variant ?? ''}`), ['a:reverse', 'b:']);
});

test('CSV : séparateur et virgule décimale selon la langue, guillemets', () => {
  const labels = { number: 'Numéro', name: 'Nom', rarity: 'Rareté', variant: 'Variante', quantity: 'Quantité', price: 'Prix', currency: 'EUR' };
  const csv = setCsv(cards, { lang: 'fr', labels, quantity: (c) => (c.variant === 'reverse' ? 2 : 0), price: (c) => c.prices[0]?.value, name: (c) => c.name });
  const lines = csv.replace('﻿', '').trim().split('\r\n');
  assert.equal(lines[0], 'Numéro;Nom;Rareté;Variante;Quantité;Prix (EUR)');
  assert.equal(lines[2], 'a;a;Commune;Reverse Holo;2;0,5');
  assert.equal(lines[3], 'b;"Pikachu; ""ex""";Rare;;0;');
  assert.match(setCsv(cards, { lang: 'en', labels, quantity: () => 0, price: () => 1.5, name: (c) => c.name }), /,1\.5\r\n/);
});
