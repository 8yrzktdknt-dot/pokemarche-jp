/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFilters, hasCriteria, matchesText, sortCards } from './search.ts';
import type { Card, SearchFilters } from './types.ts';

const card = (p: Partial<Card>): Card => ({ game: 'onepiece', id: p.number ?? 'x', lang: 'en', name: 'X', number: '1', prices: [], ...p });
const luffy = card({ name: 'Monkey.D.Luffy', number: 'OP05-119', setId: 'OP05', rarity: 'SEC', facets: { color: ['Red'], category: ['Leader'] }, prices: [{ source: 'tcgplayer', label: 'Market', value: 250, currency: 'USD' }] });
const zoro = card({ name: 'Roronoa Zoro', number: 'OP01-025', setId: 'OP01', rarity: 'SR', facets: { color: ['Green'], category: ['Character'] }, prices: [{ source: 'tcgplayer', label: 'Market', value: 12, currency: 'USD' }] });
const nami = card({ name: 'Nami', number: 'OP01-016', setId: 'OP01', rarity: 'R', facets: { color: ['Blue'], category: ['Character'] } });
const all = [luffy, zoro, nami];
const f = (p: Partial<SearchFilters>): SearchFilters => ({ text: '', facets: {}, sort: 'relevance', ...p });

test('texte : nom sans accents ni casse, ou numéro', () => {
  assert.ok(matchesText(luffy, 'luffy'));
  assert.ok(matchesText(luffy, 'op05'));
  assert.ok(matchesText(card({ name: 'Dracaufeu ex' }), 'DRACAUFEU'));
  assert.ok(!matchesText(zoro, 'luffy'));
});

test('filtres extension, rareté et facette combinés', () => {
  assert.deepEqual(applyFilters(all, f({ setId: 'OP01' })).map((c) => c.name), ['Roronoa Zoro', 'Nami']);
  assert.deepEqual(applyFilters(all, f({ facets: { rarity: 'SEC' } })).map((c) => c.name), ['Monkey.D.Luffy']);
  assert.deepEqual(applyFilters(all, f({ setId: 'OP01', facets: { color: 'Blue' } })).map((c) => c.name), ['Nami']);
});

test('une carte sans détail de facette n\'est pas éliminée', () => {
  assert.equal(applyFilters([card({ name: 'Pikachu' })], f({ facets: { type: 'Électrique' } })).length, 1);
});

test('tri par prix : sans prix en dernier', () => {
  assert.deepEqual(sortCards(all, 'price-desc').map((c) => c.name), ['Monkey.D.Luffy', 'Roronoa Zoro', 'Nami']);
  assert.deepEqual(sortCards(all, 'price-asc').map((c) => c.name), ['Roronoa Zoro', 'Monkey.D.Luffy', 'Nami']);
});

test('tri par numéro puis nom', () => {
  assert.deepEqual(sortCards(all, 'number').map((c) => c.number), ['OP01-016', 'OP01-025', 'OP05-119']);
  assert.deepEqual(sortCards(all, 'name').map((c) => c.name), ['Monkey.D.Luffy', 'Nami', 'Roronoa Zoro']);
});

test('critères minimum pour lancer une recherche', () => {
  assert.ok(!hasCriteria(f({ text: 'a' })));
  assert.ok(hasCriteria(f({ text: 'pi' })));
  assert.ok(hasCriteria(f({ setId: 'sv08' })));
});

test('pertinence : noms commençant par le texte en premier', () => {
  const cards = [card({ name: 'Captain Luffy' }), card({ name: 'Luffy' })];
  assert.deepEqual(sortCards(cards, 'relevance', 'luf').map((c) => c.name), ['Luffy', 'Captain Luffy']);
});
