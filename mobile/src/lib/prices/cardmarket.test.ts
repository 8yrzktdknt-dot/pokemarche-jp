/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardmarketPrice } from './cardmarket.ts';

test('7 jours, sinon 30 jours, sinon toutes les ventes, sinon les offres', () => {
  assert.deepEqual(cardmarketPrice({ avg7: 2, avg30: 3, avg: 4 }), { source: 'cardmarket', label: 'cm.avg7', value: 2, currency: 'EUR' });
  assert.equal(cardmarketPrice({ avg7: null, avg30: 3, avg: 4 })?.label, 'cm.avg30');
  assert.equal(cardmarketPrice({ avg7: 0, avg30: 0, avg: 4 })?.label, 'cm.avg');
  assert.deepEqual(cardmarketPrice({ trend: 2500 }), { source: 'cardmarket', label: 'cm.offers', value: 2500, currency: 'EUR' });
  assert.equal(cardmarketPrice({ trend: null, low: 1500 })?.label, 'cm.lowest');
  assert.equal(cardmarketPrice({}), undefined);
  assert.equal(cardmarketPrice(null), undefined);
});
