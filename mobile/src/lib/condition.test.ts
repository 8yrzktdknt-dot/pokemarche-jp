/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conditionLabel, unitValue } from './condition.ts';
import type { Card } from './types.ts';

const card = { game: 'pokemon', id: 'x', lang: 'fr', name: 'X', number: '1', prices: [{ source: 'cardmarket', label: 'cm.avg7', value: 20, currency: 'EUR' }] } as Card;
const id = (v: number) => v;

test('valeur selon l’état, valeur saisie pour une carte gradée', () => {
  assert.equal(unitValue({ card, quantity: 1 }, id), 20);
  assert.equal(unitValue({ card, quantity: 1, condition: 'LP' }, id), 11);
  assert.equal(unitValue({ card, quantity: 1, condition: 'LP', graded: { by: 'PSA', grade: '10' } }, id), 20);
  assert.equal(unitValue({ card, quantity: 1, graded: { by: 'PSA', grade: '10' }, value: 150, valueCurrency: 'EUR' }, id), 150);
  assert.equal(unitValue({ card: { ...card, prices: [] }, quantity: 1 }, id), undefined);
  assert.equal(conditionLabel({ card, quantity: 1, graded: { by: 'PSA', grade: '9.5' } }), 'PSA 9.5');
  assert.equal(conditionLabel({ card, quantity: 1, condition: 'EX' }), 'EX');
});
