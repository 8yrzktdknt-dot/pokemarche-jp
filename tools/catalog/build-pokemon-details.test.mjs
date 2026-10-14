import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyDetails, attrsOf, cardmarketOf, tcgplayerOf } from './build-pokemon-details.mjs';

test('prix Cardmarket : champs normaux, sinon holo', () => {
  assert.deepEqual(cardmarketOf({ idProduct: 1, avg7: 2, avg1: 1, avg30: 3, trend: 2.5, low: 0.5 }), { id: 1, avg7: 2, avg1: 1, avg30: 3, trend: 2.5, low: 0.5 });
  assert.deepEqual(cardmarketOf({ idProduct: 9, avg7: null, 'avg7-holo': 4, trend: 0, 'trend-holo': 5 }), { id: 9, avg7: 4, trend: 5 });
  assert.equal(cardmarketOf(null), undefined);
});

test('TCGplayer : variante normale d\'abord', () => {
  assert.deepEqual(tcgplayerOf({ unit: 'USD', holofoil: { marketPrice: 9, productId: 7 }, normal: { marketPrice: 1, productId: 7 } }), { market: 1, id: 7 });
  assert.deepEqual(tcgplayerOf(null), {});
});

test('attributs japonais traduits', () => {
  const a = attrsOf({ illustrator: 'Ken', hp: 70, types: ['炎'], stage: 'たね', category: 'ポケモン', dexId: [4], regulationMark: 'H' }, 'ja');
  assert.deepEqual(a, { illustrator: 'Ken', dex: '4', type: 'Feu', hp: '70', stage: 'De base', category: 'Pokémon', regulation: 'H' });
  assert.equal(attrsOf({ category: 'トレーナーズ', trainerType: 'サポート' }, 'ja').category, 'Dresseur · Supporter');
});

test('fiche appliquée à la carte du catalogue', () => {
  const c = { id: 'x', rarity: '' };
  applyDetails(c, { rarity: 'Rare', illustrator: 'A', pricing: { cardmarket: { idProduct: 5, avg7: 1.2 }, tcgplayer: { normal: { marketPrice: 2, productId: 8 } } } }, 'fr');
  assert.deepEqual(c, { id: 'x', rarity: 'Rare', attrs: { illustrator: 'A' }, cm: { id: 5, avg7: 1.2 }, tcgplayer: 8, price: { value: 2, currency: 'USD', source: 'tcgplayer' } });
});
