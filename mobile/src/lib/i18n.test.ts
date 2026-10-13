/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translate } from './i18n.ts';

test('variables et pluriel', () => {
  assert.equal(translate('fr', 'common.cards', { n: 1 }), '1 carte');
  assert.equal(translate('fr', 'common.cards', { n: 3 }), '3 cartes');
  assert.equal(translate('en', 'common.cards', { n: 3 }), '3 cards');
  assert.equal(translate('en', 'scan.added', { name: 'Pikachu' }), 'Pikachu added — next card!');
});
