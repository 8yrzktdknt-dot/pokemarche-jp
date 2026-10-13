/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameScore, parseScanText } from './parse.ts';

test('One Piece : code standard', () => {
  const h = parseScanText('Monkey.D.Luffy\nLEADER\nOP05-119 SEC');
  assert.equal(h?.game, 'onepiece');
  assert.equal(h?.code, 'OP05-119');
});

test('One Piece : corrige 0P lu à la place de OP', () => {
  assert.equal(parseScanText('0P01-O16')?.code, 'OP01-016');
});

test('One Piece : starter et promo', () => {
  assert.equal(parseScanText('ST10-001')?.code, 'ST10-001');
  assert.equal(parseScanText('P-042')?.code, 'P-042');
});

test('Riftbound : code avec extension connue', () => {
  const h = parseScanText('Jinx, Loose Cannon\nOGN-202/298');
  assert.equal(h?.game, 'riftbound');
  assert.equal(h?.code, 'OGN-202');
  assert.equal(h?.setTotal, 298);
});

test('Pokémon : numéro et code d\'extension anglais', () => {
  const h = parseScanText('Pikachu ex\nHP 200\nSSP EN 238/191');
  assert.equal(h?.game, 'pokemon');
  assert.equal(h?.localId, '238');
  assert.equal(h?.setTotal, 191);
  assert.equal(h?.setCode, 'SSP');
  assert.equal(h?.lang, 'en');
});

test('Pokémon : carte japonaise', () => {
  const h = parseScanText('ピカチュウex\nHP 200\nSV8 132/106 SAR');
  assert.equal(h?.game, 'pokemon');
  assert.equal(h?.code, '132/106');
  assert.equal(h?.lang, 'ja');
});

test('Pokémon : galerie Trainer', () => {
  assert.equal(parseScanText('TG05/TG30')?.code, 'TG05/TG30');
});

test('jeu imposé', () => {
  assert.equal(parseScanText('OP05-119', 'pokemon'), null);
});

test('rien de lisible', () => {
  assert.equal(parseScanText('Attaque Éclair 90'), null);
});

test('nameScore', () => {
  assert.equal(nameScore('Pikachu ex', 'pikachu ex hp 200'), 1);
  assert.equal(nameScore('Dracaufeu', 'PV 330 Dracaufeu ex'), 1);
  assert.equal(nameScore('Monkey D. Luffy', 'nothing'), 0);
});
