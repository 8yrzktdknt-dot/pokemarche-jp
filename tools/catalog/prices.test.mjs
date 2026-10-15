import assert from 'node:assert/strict';
import { test } from 'node:test';
import { guideStamp } from './prices.mjs';

test('date du guide des prix, sinon empreinte du contenu', () => {
  assert.equal(guideStamp({ createdAt: '2026-10-16T02:00:00+0200', priceGuides: [] }), '2026-10-16T02:00:00+0200');
  const a = guideStamp({ priceGuides: [{ idProduct: 1, avg7: 0.5 }] });
  assert.notEqual(a, guideStamp({ priceGuides: [{ idProduct: 1, avg7: 0.6 }] }));
  assert.equal(a, guideStamp({ priceGuides: [{ idProduct: 1, avg7: 0.5 }] }));
});
