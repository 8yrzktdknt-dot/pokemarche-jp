/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convert, formatMoney } from './currency.ts';

const rates = { EUR: 1, USD: 1.25, JPY: 150 };

test('conversion entre devises', () => {
  assert.equal(convert(10, 'EUR', 'USD', rates), 12.5);
  assert.equal(convert(12.5, 'USD', 'EUR', rates), 10);
  assert.equal(convert(10, 'USD', 'JPY', rates), 1200);
  assert.equal(convert(7, 'EUR', 'EUR', rates), 7);
});

test('format : yen sans décimales', () => {
  assert.match(formatMoney(1200.4, 'JPY'), /1\s?200/);
  assert.doesNotMatch(formatMoney(1200.4, 'JPY'), /,4/);
});
