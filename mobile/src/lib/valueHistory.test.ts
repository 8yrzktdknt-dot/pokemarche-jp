import { test } from 'node:test';
import assert from 'node:assert/strict';
import { change, dayKey, record, series, type ValuePoint } from './valueHistory.ts';

test('un relevé par jour et par devise', () => {
  let h: ValuePoint[] = [];
  h = record(h, { d: '2026-10-01', v: 10, c: 'EUR' });
  h = record(h, { d: '2026-10-01', v: 12, c: 'EUR' });
  h = record(h, { d: '2026-10-01', v: 14, c: 'USD' });
  assert.equal(h.length, 2);
  assert.equal(series(h, 'EUR')[0].v, 12);
});

test('variation sur 7 jours, sinon depuis le premier relevé', () => {
  const h: ValuePoint[] = [
    { d: '2026-10-01', v: 100, c: 'EUR' },
    { d: '2026-10-07', v: 110, c: 'EUR' },
    { d: '2026-10-15', v: 121, c: 'EUR' },
  ];
  const w = change(h, 'EUR', '2026-10-15')!;
  assert.equal(w.since, '2026-10-07');
  assert.equal(w.week, true);
  assert.equal(w.delta, 11);
  assert.equal(Math.round(w.pct!), 10);
  const recent = change(h.slice(1), 'EUR', '2026-10-15')!;
  assert.equal(recent.week, true);
  const young = change([{ d: '2026-10-14', v: 5, c: 'EUR' }, { d: '2026-10-15', v: 6, c: 'EUR' }], 'EUR', '2026-10-15')!;
  assert.equal(young.week, false);
  assert.equal(young.delta, 1);
  assert.equal(change([{ d: '2026-10-15', v: 5, c: 'EUR' }], 'EUR', '2026-10-15'), null);
});

test('jour local', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 30).getTime()), '2026-01-05');
});
