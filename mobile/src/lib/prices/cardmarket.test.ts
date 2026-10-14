/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardmarketPrice } from './cardmarket.ts';

test('moyenne 7 jours, sinon 30 jours, sinon toutes les ventes', () => {
  assert.equal(cardmarketPrice({ avg7: 2, avg30: 3, avg: 4 })?.label, 'cm.avg7');
  assert.deepEqual(cardmarketPrice({ avg7: null, avg30: 3, avg: 4 }), { source: 'cardmarket', label: 'cm.avg30', value: 3, currency: 'EUR' });
  assert.equal(cardmarketPrice({ avg7: 0, avg30: 0, avg: 4 })?.label, 'cm.avg');
  assert.equal(cardmarketPrice({}), undefined);
  assert.equal(cardmarketPrice(null), undefined);
});
