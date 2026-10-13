import assert from 'node:assert/strict';
import { test } from 'node:test';
import { basicEnergy, parseIntPrint } from './translate-ja.mjs';

test('version internationale citée sur une fiche Limitless japonaise', () => {
  const html = '<table class="card-prints-versions"><tr><th>Int. Prints</th></tr><tr><td><a href="/cards/en/SSP/163" > Surging Sparks <span>#163</span></a></td></tr><tr><th colspan="3">JP. Prints</th></tr><tr><td><a href="/cards/jp/MC/693">x</a></td></tr></table>';
  assert.deepEqual(parseIntPrint(html), { code: 'SSP', n: '163' });
  assert.equal(parseIntPrint('<th>JP. Prints</th>'), null);
});

test('énergies de base', () => {
  assert.deepEqual(basicEnergy('基本水エネルギー'), ['Basic Water Energy', 'Énergie Eau de base']);
  assert.equal(basicEnergy('ハイパーボール'), null);
});
