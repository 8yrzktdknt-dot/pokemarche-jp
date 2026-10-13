/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marketLinks } from './marketplaces.ts';
import type { Card } from '../types.ts';

const base: Card = { game: 'pokemon', id: 'sv08-132', lang: 'ja', name: 'ピカチュウex', number: '132/106', prices: [] };

test('un lien par place de marché', () => {
  const ids = marketLinks(base).map((l) => l.id);
  assert.deepEqual(ids, ['cardmarket', 'tcgplayer', 'cardtrader', 'ebay']);
});

test('Pokémon japonais → catégorie pokemon-japan sur TCGplayer', () => {
  const tcg = marketLinks(base).find((l) => l.id === 'tcgplayer')!;
  assert.match(tcg.url, /\/search\/pokemon-japan\//);
  assert.match(tcg.url, /q=%E3%83%94.*%20132&/);
});

test('One Piece en français sur Cardmarket et eBay.fr', () => {
  const card: Card = { ...base, game: 'onepiece', lang: 'fr', name: 'Monkey.D.Luffy', number: 'OP05-119' };
  const links = marketLinks(card, 'fr');
  assert.match(links[0].url, /cardmarket\.com\/fr\/OnePiece\/Products\/Search\?searchString=Monkey\.D\.Luffy%20OP05-119/);
  assert.match(links[3].url, /^https:\/\/www\.ebay\.fr\/sch\/i\.html\?_nkw=one%20piece%20card/);
  assert.match(links[3].url, /french/);
});

test('langue de site inconnue → anglais', () => {
  assert.match(marketLinks(base, 'ja')[0].url, /cardmarket\.com\/en\//);
});
