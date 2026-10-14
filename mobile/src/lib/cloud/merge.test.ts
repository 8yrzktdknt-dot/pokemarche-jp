/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeCollections } from './merge.ts';
import type { Card } from '../types.ts';

const card = (id: string, lang: Card['lang'] = 'fr'): Card => ({ game: 'pokemon', id, lang, name: id, number: '1', prices: [] });

test('union des deux collections, plus grande quantité, date la plus ancienne', () => {
  const local = [{ card: card('A'), quantity: 1, addedAt: 50 }, { card: card('B'), quantity: 2, addedAt: 40 }];
  const remote = [{ card: card('A'), quantity: 3, addedAt: 10 }, { card: card('C'), quantity: 1, addedAt: 30 }, { card: card('A', 'ja'), quantity: 1, addedAt: 20 }];
  const m = mergeCollections(local, remote);
  assert.deepEqual(m.map((e) => `${e.card.lang}:${e.card.id}x${e.quantity}`), ['fr:Bx2', 'fr:Cx1', 'ja:Ax1', 'fr:Ax3']);
  assert.equal(m.find((e) => e.card.id === 'A' && e.card.lang === 'fr')?.addedAt, 10);
});
