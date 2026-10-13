/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rarityAbbr, rarityOptions } from './pokemonNames.ts';

test('cartes sans rareté regroupées dans « None », en fin de liste', () => {
  assert.equal(rarityAbbr('Sans Rareté'), 'None');
  assert.equal(rarityAbbr('None'), 'None');
  const opts = rarityOptions(['Commune', 'Sans Rareté', 'Radieux Rare'], 'fr');
  assert.deepEqual(opts.at(-1), { value: 'None', label: 'None - Sans rareté' });
  assert.equal(opts.filter((o) => o.value === 'None').length, 1);
});
