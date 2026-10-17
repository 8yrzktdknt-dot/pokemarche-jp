/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numberKey, parseCondition, parseCsv, parseGrade, resolveImport, rowsFromCsv, type ImportDeps } from './importCsv.ts';
import type { Card, SetInfo } from './types.ts';

test('lecture CSV : séparateurs, guillemets, BOM', () => {
  assert.deepEqual(parseCsv('﻿Name;Set\n"Dracaufeu; ex";"Flammes ""Obsidiennes"""\n'), [['Name', 'Set'], ['Dracaufeu; ex', 'Flammes "Obsidiennes"']]);
  assert.deepEqual(parseCsv('a,b\r\n1,2'), [['a', 'b'], ['1', '2']]);
});

test('valeurs reconnues', () => {
  assert.equal(numberKey('004/102'), '4');
  assert.equal(numberKey('OP05-019'), 'op519');
  assert.equal(numberKey('OGN-042/298'), 'ogn42');
  assert.equal(parseCondition('Near Mint'), 'NM');
  assert.equal(parseCondition('Lightly Played'), 'LP');
  assert.equal(parseCondition('EX'), 'EX');
  assert.deepEqual(parseGrade('PSA 10'), { by: 'PSA', grade: '10' });
  assert.equal(parseGrade('Ungraded'), undefined);
});

test('colonnes de différents exports', () => {
  const collectr = 'Portfolio Name,Category,Set,Product Name,Card Number,Rarity,Variance,Grade,Card Condition,Average Cost Paid,Quantity\nMain,Pokemon,Obsidian Flames,Charizard ex,125/197,Double Rare,Holofoil,Ungraded,Near Mint,$12.50,2\n';
  const [r] = rowsFromCsv(collectr, 'EUR')!;
  assert.equal(r.game, 'pokemon');
  assert.equal(r.set, 'Obsidian Flames');
  assert.equal(r.number, '125/197');
  assert.equal(r.quantity, 2);
  assert.equal(r.variant, 'holo');
  assert.deepEqual(r.details, { condition: 'NM', paid: 12.5, paidCurrency: 'USD' });
  const cm = 'idProduct;Count;Name;Expansion;Condition;Language;isFoil\n123;1;Pikachu;Base Set;EX;French;1\n';
  const [c] = rowsFromCsv(cm, 'EUR')!;
  assert.equal(c.cmId, 123);
  assert.equal(c.lang, 'fr');
  assert.equal(c.variant, 'foil');
  assert.equal(rowsFromCsv('foo,bar\n1,2', 'EUR'), null);
});

const set = (id: string, name: string, code = id): SetInfo => ({ id, code, name });
const card = (id: string, number: string, name: string, extra: Partial<Card> = {}) => ({ game: 'pokemon', lang: 'en', id, number, name, prices: [], ...extra }) as Card;
const deps: ImportDeps = {
  langs: (g) => (g === 'pokemon' ? ['fr', 'en'] : ['en']),
  sets: async (g, l) => (g === 'pokemon' ? [set('sv03', l === 'fr' ? 'Flammes Obsidiennes' : 'Obsidian Flames', 'OBF'), set('base1', 'Base Set')] : []),
  setCards: async (_g, id) => (id === 'sv03'
    ? [card('sv03-125', '125/197', 'Charizard ex', { variants: [{ key: 'holo', cardmarket: 7 }, { key: 'reverse', cardmarket: 7 }] }), card('sv03-001', '001/197', 'Oddish')]
    : [card('base1-58', '58/102', 'Pikachu', { variants: [{ key: 'normal', cardmarket: 1 }, { key: '1st-edition', cardmarket: 2 }] })]),
  search: async (_g, text) => (/pikachu/i.test(text) ? [card('base1-58', '58/102', 'Pikachu')] : []),
};

test('lignes retrouvées dans le catalogue', async () => {
  const rows = rowsFromCsv([
    'Name,Set,Set Code,Number,Quantity,Language,Printing',
    'Charizard ex,Obsidian Flames,,125/197,1,English,Reverse Holofoil',
    'Mystère,,OBF,1,1,,',
    'Pikachu,,,,1,,',
    'Inconnu,Nowhere,,1,1,,',
  ].join('\n'), 'EUR')!;
  const r = await resolveImport(rows, { lang: 'fr' }, deps);
  assert.deepEqual(r.found.map((f) => `${f.card.id}${f.card.variant ? `#${f.card.variant}` : ''}:${f.card.lang}`), ['sv03-125#reverse:en', 'sv03-001:en', 'base1-58:en']);
  assert.deepEqual(r.missing.map((m) => m.line), [5]);
  // Export Cardmarket : n° de produit de la variante.
  const cm = rowsFromCsv('idProduct;Count;Name;Expansion\n2;3;Pikachu;Base Set', 'EUR')!;
  const r2 = await resolveImport(cm, { game: 'pokemon', lang: 'en' }, deps);
  assert.equal(r2.found[0].card.variant, '1st-edition');
  assert.equal(r2.found[0].row.quantity, 3);
});
