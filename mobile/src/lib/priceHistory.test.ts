import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionSeries, dayChange, historyDir, historyKey, pointsOf, type History } from './priceHistory.ts';
import type { Card } from './types.ts';

const card = (p: Partial<Card>): Card => ({ game: 'pokemon', id: 'me05-001', lang: 'fr', name: 'X', number: '1', prices: [{ source: 'cardmarket', label: 'cm.avg7', value: 1, currency: 'EUR' }], ...p });
const h: History = { from: '2026-10-14', p: { 'me05-001': [1, null, 1.2], 'me05-001#reverse': [3, 2.5, 2] } };

test('dossier et clé de l\'historique', () => {
  assert.equal(historyDir('pokemon', 'de'), 'pokemon-en');
  assert.equal(historyDir('pokemon', 'zh-tw'), 'pokemon-zh-tw');
  assert.equal(historyDir('pokemon', 'ko'), undefined);
  const variants = [{ key: 'normal' }, { key: 'reverse' }];
  assert.equal(historyKey(card({ variants, variant: 'normal' })), 'me05-001');
  assert.equal(historyKey(card({ variants, variant: 'reverse' })), 'me05-001#reverse');
});

test('relevés et variation depuis la veille', () => {
  const pts = pointsOf(h, card({}));
  assert.deepEqual(pts, [{ d: '2026-10-14', v: 1 }, { d: '2026-10-16', v: 1.2 }]);
  const c = dayChange(pts)!;
  assert.equal(c.delta, 0.2);
  assert.equal(Math.round(c.pct), 20);
  const r = dayChange(pointsOf(h, card({ variants: [{ key: 'normal' }, { key: 'reverse' }], variant: 'reverse' })))!;
  assert.equal(r.delta, -0.5);
  assert.equal(dayChange([{ d: '2026-10-14', v: 1 }]), null);
});

test('valeur de la collection jour par jour', () => {
  const s = collectionSeries([
    { card: card({}), quantity: 2, points: pointsOf(h, card({})) },
    { card: card({ variants: [{ key: 'normal' }, { key: 'reverse' }], variant: 'reverse' }), quantity: 1, points: pointsOf(h, card({ variants: [{ key: 'normal' }, { key: 'reverse' }], variant: 'reverse' })) },
  ], (v) => v);
  assert.deepEqual(s.map((p) => [p.d, Math.round(p.v * 100) / 100]), [['2026-10-14', 5], ['2026-10-15', 4.5], ['2026-10-16', 4.4]]);
});
