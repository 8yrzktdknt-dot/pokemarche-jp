/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionStats, type Entry } from './stats.ts';
import type { Card } from './types.ts';

const card = (p: Partial<Card>): Card => ({ game: 'pokemon', id: Math.random().toString(), lang: 'ja', name: 'X', number: '1', prices: [], ...p });
const eur = (v: number) => [{ source: 'cardmarket' as const, label: 'Tendance', value: v, currency: 'EUR' as const }];
const usd = (v: number) => [{ source: 'tcgplayer' as const, label: 'Market', value: v, currency: 'USD' as const }];

const entries: Entry[] = [
  { card: card({ name: 'Pikachu ex', rarity: 'Special illustration rare', prices: eur(100) }), quantity: 2, addedAt: 3 },
  { card: card({ name: 'Rondoudou', rarity: 'Common' }), quantity: 4, addedAt: 1 },
  { card: card({ game: 'onepiece', lang: 'en', name: 'Luffy', rarity: 'SEC', prices: usd(250) }), quantity: 1, addedAt: 2 },
];

test('totaux, exemplaires et cartes uniques', () => {
  const s = collectionStats(entries);
  assert.equal(s.count, 7);
  assert.equal(s.unique, 3);
  assert.equal(s.unpriced, 4);
});

test('valeurs converties dans une seule devise puis additionnées', () => {
  // 1 € = 1,25 $
  const s = collectionStats(entries, (v, from) => (from === 'USD' ? v / 1.25 : v));
  assert.equal(s.value, 400);
  assert.equal(s.games.find((g) => g.game === 'pokemon')?.value, 200);
  assert.equal(s.games.find((g) => g.game === 'onepiece')?.value, 200);
  assert.equal(s.games.find((g) => g.game === 'riftbound')?.count, 0);
});

test('raretés abrégées, langues, top et récents', () => {
  const s = collectionStats(entries);
  assert.deepEqual(s.rarities.map((r) => r.rarity), ['C', 'SAR', 'SEC']);
  assert.deepEqual(s.langs, [{ lang: 'ja', count: 6 }, { lang: 'en', count: 1 }]);
  assert.equal(s.top[0].card.name, 'Luffy');
  assert.deepEqual(s.recent.map((e) => e.card.name), ['Pikachu ex', 'Luffy', 'Rondoudou']);
});

test('tranches de prix et extensions de la collection', () => {
  const s = collectionStats([
    { card: card({ setId: 'M6', prices: eur(0.5) }), quantity: 3, addedAt: 1 },
    { card: card({ setId: 'M6', prices: eur(30) }), quantity: 1, addedAt: 2 },
    { card: card({ setId: 'M5', prices: eur(150) }), quantity: 1, addedAt: 3 },
  ]);
  assert.deepEqual(s.buckets.map((b) => b.count), [3, 0, 0, 1, 0, 1]);
  assert.deepEqual(s.sets.map((x) => [x.setId, x.unique, x.copies]), [['M6', 2, 4], ['M5', 1, 1]]);
});
