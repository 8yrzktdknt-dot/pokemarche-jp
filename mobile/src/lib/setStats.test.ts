/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { percent, printedTotal, setStats } from './setStats.ts';
import type { Card } from './types.ts';

const eur = (v: number) => [{ source: 'cardmarket' as const, label: 'cm.avg7', value: v, currency: 'EUR' as const }];
const card = (n: string, p: Partial<Card> = {}): Card => ({ game: 'pokemon', id: `S-${n}`, lang: 'fr', name: n, number: n, prices: [], ...p });

const cards = [
  card('001/003', { rarity: 'Common', prices: eur(0.1) }),
  card('002/003', { rarity: 'Common', prices: eur(0.5) }),
  card('003/003', { rarity: 'Rare', prices: eur(4) }),
  card('004/003', { rarity: 'Special illustration rare', prices: eur(120) }),
  card('005', { rarity: 'Special illustration rare' }),
];

test('total imprimé, set complet, cartes supplémentaires', () => {
  assert.equal(printedTotal(cards), 3);
  const s = setStats(cards, (c) => ['S-001/003', 'S-004/003'].includes(c.id));
  assert.deepEqual(s.base, { owned: 1, total: 3 });
  assert.deepEqual(s.extra, { owned: 1, total: 2 });
  assert.deepEqual(s.master, { owned: 2, total: 5 });
  assert.equal(percent(s.base), 33);
});

test('valeur, cartes les plus chères et manquantes', () => {
  const s = setStats(cards, (c) => c.id === 'S-004/003');
  assert.equal(Math.round(s.value * 10) / 10, 124.6);
  assert.equal(s.ownedValue, 120);
  assert.equal(s.top[0].card.id, 'S-004/003');
  assert.equal(s.topMissing[0].card.id, 'S-003/003');
  assert.equal(s.priced, 4);
  assert.equal(s.median, 2.25);
  assert.deepEqual(s.buckets.map((b) => b.count), [2, 1, 0, 0, 0, 1]);
});

test('sans total imprimé : tout est dans le set complet', () => {
  const s = setStats([card('1'), card('2')], () => false);
  assert.deepEqual(s.base, { owned: 0, total: 2 });
  assert.deepEqual(s.extra, { owned: 0, total: 0 });
});

test('Master Set : toutes les cartes dans toutes leurs variantes', () => {
  const c = (n: string, variants?: string[]): Card => ({ game: 'pokemon', id: n, lang: 'fr', name: n, number: `${n}/2`, prices: [], variants: variants?.map((key) => ({ key })) });
  const cards = [c('1', ['normal', 'reverse', 'pokeball']), c('2', ['holo']), c('3')];
  const owned = new Set(['1#reverse', '2#holo']);
  const s = setStats(cards, (x) => x.id !== '3', (v) => v, (x, k) => owned.has(`${x.id}#${k}`));
  assert.deepEqual(s.master, { owned: 2, total: 5 });
  assert.deepEqual(s.base, { owned: 2, total: 2 });
  assert.deepEqual(s.extra, { owned: 0, total: 1 });
});

test('total imprimé sans « /N » : d\'après les raretés ; un numéro compté une fois', () => {
  const c = (n: string, rarity: string, id = n): Card => ({ game: 'pokemon', id, lang: 'ja', name: n, number: n, rarity, prices: [] });
  const cards = [c('001', 'C'), c('002', 'U'), c('003', 'RR'), c('004', 'AR'), c('005', 'SAR'), c('003', 'RR', '003-tw2')];
  assert.equal(printedTotal(cards), 3);
  const s = setStats(cards, (x) => x.id === '003-tw2');
  assert.deepEqual(s.base, { owned: 1, total: 3 });
  assert.deepEqual(s.extra, { owned: 0, total: 2 });
});
