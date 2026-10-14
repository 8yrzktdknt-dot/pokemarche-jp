/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshCollectionPrices } from './refreshPrices.ts';
import type { Card } from './types.ts';

const eur = (v: number) => [{ source: 'cardmarket' as const, label: 'cm.avg7', value: v, currency: 'EUR' as const }];
const card = (id: string, v: number): Card => ({ game: 'pokemon', id, lang: 'fr', name: id, number: '1', setId: 'S', prices: eur(v) });

test('le prix du jour remplace celui de l\'ajout', async () => {
  const entries = [{ card: card('S-1', 10), quantity: 2, addedAt: 1 }, { card: card('S-2', 5), quantity: 1, addedAt: 2 }];
  let calls = 0;
  const next = await refreshCollectionPrices(entries, async () => { calls++; return [card('S-1', 12), card('S-2', 5)]; });
  assert.equal(calls, 1);
  assert.equal(next?.[0].card.prices[0].value, 12);
  assert.equal(next?.[0].quantity, 2);
  assert.equal(next?.[1], entries[1]);
});

test('rien de changé : null', async () => {
  const entries = [{ card: card('S-1', 10), quantity: 1, addedAt: 1 }];
  assert.equal(await refreshCollectionPrices(entries, async () => [card('S-1', 10)]), null);
  assert.equal(await refreshCollectionPrices(entries, async () => { throw new Error('hors ligne'); }), null);
});
