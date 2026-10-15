import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Card } from './types.ts';
import { collectionKey, variantLabel, withVariant } from './variants.ts';

const card: Card = {
  game: 'pokemon', id: 'sv08.5-001', lang: 'fr', name: 'Noeunoeuf', number: '001/131', prices: [],
  marketIds: { cardmarket: 1, cardmarketPath: 'Prismatic-Evolutions/Exeggcute-PRE001' },
  variants: [{ key: 'normal', cardmarket: 1, price: 0.03 }, { key: 'reverse', cardmarket: 1, price: 0.12 }, { key: 'pokeball', cardmarket: 2, price: 0.46 }],
};

test('withVariant : prix et fiche Cardmarket de la variante', () => {
  const rev = withVariant(card, 'reverse');
  assert.equal(rev.variant, 'reverse');
  assert.equal(rev.prices[0].value, 0.12);
  assert.equal(rev.marketIds?.cardmarketPath, 'Prismatic-Evolutions/Exeggcute-PRE001');
  const ball = withVariant(card, 'pokeball');
  assert.deepEqual(ball.marketIds, { cardmarket: 2, cardmarketPath: undefined });
  assert.equal(withVariant(card).variant, 'normal');
  assert.equal(withVariant({ ...card, variants: undefined }, 'reverse').prices.length, 0);
});

test('collectionKey : une entrée par variante, la première par défaut', () => {
  assert.equal(collectionKey(card), 'pokemon:fr:sv08.5-001');
  assert.equal(collectionKey(withVariant(card, 'normal')), 'pokemon:fr:sv08.5-001');
  assert.equal(collectionKey(withVariant(card, 'pokeball')), 'pokemon:fr:sv08.5-001#pokeball');
  // Carte ajoutée avant les variantes : c'est la variante de base.
  assert.equal(collectionKey({ ...card, variants: undefined }), collectionKey(withVariant(card, 'normal')));
});

test('variantLabel : libellés traduits, tampons et motifs inconnus', () => {
  assert.equal(variantLabel('reverse', 'fr'), 'Reverse Holo');
  assert.equal(variantLabel('pokeball', 'ja'), 'モンスターボール柄');
  assert.equal(variantLabel('holo|shadowless|1st-edition', 'fr'), 'Holo · Sans ombre · 1re édition');
  assert.equal(variantLabel('reverse-league|30th-pokeday', 'fr'), 'Reverse Holo Ligue · tampon 30th Pokeday');
  assert.equal(variantLabel('reverse-energy', 'fr'), 'Reverse Holo Énergie');
  assert.equal(variantLabel('reverse-quickball', 'fr'), 'Rapide Ball Holo');
  assert.equal(variantLabel('reverse-loveball', 'en'), 'Love Ball Holo');
  assert.equal(variantLabel('normal', 'xx'), 'Normal');
});

test('variantOwnership : les cartes ajoutées avant les variantes comptent pour la variante de base', async () => {
  const { variantOwnership } = await import('./variants.ts');
  const old: Card = { game: 'pokemon', id: 'M6a-001', lang: 'ja', name: 'x', number: '001', prices: [] };
  const now: Card = { ...old, variants: [{ key: 'holo' }] };
  const owned = variantOwnership([{ card: old, quantity: 1 }]);
  assert.equal(owned(now, 'holo'), true);
  assert.equal(owned(card, 'reverse'), false);
});
