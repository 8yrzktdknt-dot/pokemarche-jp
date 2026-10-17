/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conditionFactor, conditionLabel, copiesOf, patchCopies, unitValue, type ValuedEntry } from './condition.ts';
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

test('détails par exemplaire', () => {
  const e: ValuedEntry = { card, quantity: 2, condition: 'NM', paid: 5, paidCurrency: 'EUR' };
  // Un exemplaire passe en LP : chaque exemplaire garde ses détails.
  const split = patchCopies(e, { condition: 'LP' }, 1);
  assert.equal(split.condition, undefined);
  assert.deepEqual(split.copies, [{ condition: 'NM', paid: 5, paidCurrency: 'EUR' }, { condition: 'LP', paid: 5, paidCurrency: 'EUR' }]);
  assert.equal(unitValue(split, id), 15.5);
  assert.equal(conditionFactor(split), 0.775);
  assert.equal(conditionLabel(split), 'NM, LP');
  // Tous en EX : de nouveau une seule ligne de détails.
  const back = patchCopies(split, { condition: 'EX' });
  assert.equal(back.copies, undefined);
  assert.equal(back.condition, 'EX');
  assert.equal(back.paid, 5);
  // Exemplaire ajouté à une ligne détaillée : sans détails ; exemplaire retiré : le dernier.
  assert.deepEqual(copiesOf({ ...split, quantity: 3 })[2], {});
  assert.equal(conditionLabel({ ...patchCopies({ card, quantity: 3 }, { condition: 'NM' }, 0), quantity: 3 }), 'NM');
});
