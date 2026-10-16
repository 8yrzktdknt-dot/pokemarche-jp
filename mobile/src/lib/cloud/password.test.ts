/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passwordChecks, strongPassword } from './password.ts';

test('mot de passe : 8 caractères, majuscule, minuscule, caractère spécial', () => {
  assert.equal(strongPassword('Pikachu!'), true);
  assert.equal(strongPassword('Évoli#25'), true);
  assert.equal(strongPassword('pikachu!'), false);
  assert.equal(strongPassword('PIKACHU!'), false);
  assert.equal(strongPassword('Pikachu25'), false);
  assert.equal(strongPassword('Pika!'), false);
  assert.deepEqual(passwordChecks('abc'), { length: false, upper: false, lower: true, special: false });
});
