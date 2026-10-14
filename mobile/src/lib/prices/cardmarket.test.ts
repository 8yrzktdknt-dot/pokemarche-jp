/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardmarketPrice } from './cardmarket.ts';

test('uniquement la moyenne des ventes sur 7 jours', () => {
  assert.deepEqual(cardmarketPrice({ avg7: 2, avg30: 3, avg: 4 }), { source: 'cardmarket', label: 'cm.avg7', value: 2, currency: 'EUR' });
  assert.equal(cardmarketPrice({ avg7: null, avg30: 3, avg: 4 }), undefined);
  assert.equal(cardmarketPrice({ avg7: 0, avg30: 0, avg: 4 }), undefined);
  assert.equal(cardmarketPrice({}), undefined);
  assert.equal(cardmarketPrice(null), undefined);
});
