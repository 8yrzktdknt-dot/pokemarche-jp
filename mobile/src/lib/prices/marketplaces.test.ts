/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marketLinks, searchTerms } from './marketplaces.ts';
import type { Card } from '../types.ts';

const base: Card = { game: 'pokemon', id: 'sv08-132', lang: 'ja', name: 'ピカチュウex', number: '132/106', prices: [] };

test('un lien par place de marché', () => {
  const ids = marketLinks(base).map((l) => l.id);
  assert.deepEqual(ids, ['cardmarket', 'tcgplayer', 'cardtrader', 'ebay']);
});

test('Pokémon japonais → catégorie pokemon-japan sur TCGplayer', () => {
  const tcg = marketLinks(base).find((l) => l.id === 'tcgplayer')!;
  assert.match(tcg.url, /\/search\/pokemon-japan\//);
});

test('recherche « nom (CODE numéro/total) », nom anglais en priorité', () => {
  const card: Card = { ...base, id: 'M6-110', name: 'メガレックウザex', nameEn: 'Mega Rayquaza ex', number: '110/076', setId: 'M6' };
  assert.equal(searchTerms(card), 'Mega Rayquaza ex (M6 110/076)');
  assert.equal(searchTerms({ ...card, game: 'onepiece', name: 'Monkey.D.Luffy', nameEn: undefined, number: 'OP05-119' }), 'Monkey.D.Luffy (OP05-119)');
  const cm = marketLinks(card, 'fr')[0];
  assert.match(cm.url, /searchString=Mega%20Rayquaza%20ex%20\(M6%20110%2F076\)/);
});

test('One Piece en français sur Cardmarket et eBay.fr', () => {
  const card: Card = { ...base, game: 'onepiece', lang: 'fr', name: 'Monkey.D.Luffy', number: 'OP05-119' };
  const links = marketLinks(card, 'fr');
  assert.match(links[0].url, /cardmarket\.com\/fr\/OnePiece\/Products\/Search\?searchString=Monkey\.D\.Luffy%20\(OP05-119\)/);
  assert.match(links[3].url, /^https:\/\/www\.ebay\.fr\/sch\/i\.html\?_nkw=one%20piece%20card/);
  assert.match(links[3].url, /french/);
});

test('langue de site inconnue → anglais', () => {
  assert.match(marketLinks(base, 'ja')[0].url, /cardmarket\.com\/en\//);
});
