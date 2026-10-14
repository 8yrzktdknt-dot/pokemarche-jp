import assert from 'node:assert/strict';
import { test } from 'node:test';
import { numberKey, ptcgCandidates } from './build-pokemon-cards.mjs';

test('identifiants pokemontcg.io', () => {
  const pick = (id, sets) => ptcgCandidates(id).find((x) => sets.includes(x));
  assert.equal(pick('sv03.5', ['sv3pt5']), 'sv3pt5');
  assert.equal(pick('sm7.5', ['sm75']), 'sm75');
  assert.equal(pick('swsh4.5sv', ['swsh45sv']), 'swsh45sv');
  assert.equal(pick('swsh12.5gg', ['swsh12pt5gg']), 'swsh12pt5gg');
  assert.equal(pick('cel25cc', ['cel25c']), 'cel25c');
  assert.equal(pick('me01', ['me1']), 'me1');
  assert.equal(pick('swsh12tg', ['swsh12tg']), 'swsh12tg');
});

test('numéros comparables', () => {
  assert.equal(numberKey('007'), '7');
  assert.equal(numberKey('tg01'), 'TG01');
});

test('codes pokemon.com des extensions', async () => {
  const { pokemonComCodes } = await import('./build-pokemon-cards.mjs');
  assert.ok(pokemonComCodes('me02.5').includes('ME2PT5'));
  assert.ok(pokemonComCodes('sv03.5').includes('SV3PT5'));
  assert.ok(pokemonComCodes('30th').includes('30TH'));
  assert.ok(pokemonComCodes('me01').includes('ME01'));
  assert.ok(pokemonComCodes('swshp').includes('SWSHP'));
});
