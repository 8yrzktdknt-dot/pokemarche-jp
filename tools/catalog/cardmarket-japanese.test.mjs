import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchProducts, pickExpansion, priceOf } from './cardmarket-japanese.mjs';

const exps = new Map([
  [1, { count: 49, names: new Set(['tropius', 'zoroark', 'espeonex', 'umbreonex']), first: '2026-09-11' }],
  [2, { count: 45, names: new Set(['tropius', 'zoroark', 'espeonex', 'umbreonex']), first: '2026-09-01' }],
  [3, { count: 49, names: new Set(['tropius', 'zoroark', 'espeonex', 'umbreonex']), first: '2026-09-12' }],
]);
const cards = Array.from({ length: 49 }, (_, i) => ({ id: `MF-${i}`, localId: String(i), nameEn: ['Tropius', 'Zoroark', 'Espeon ex', 'Umbreon ex'][i % 4] }));

test('extension Cardmarket : taille la plus proche, puis la première créée', () => {
  assert.equal(pickExpansion(cards, exps, new Set([1])), 3);
  assert.equal(pickExpansion(cards, exps, new Set()), 1);
});

test('produits attribués par nom puis par ordre', () => {
  const c = [{ id: 'a', localId: '010', nameEn: 'Exeggcute' }, { id: 'b', localId: '120', nameEn: 'Exeggcute' }, { id: 'c', localId: '002', nameEn: 'Alolan Exeggutor' }];
  const p = [{ idProduct: 50, name: 'Exeggcute [Hypnosis]' }, { idProduct: 40, name: 'Exeggcute [Hypnosis]' }, { idProduct: 41, name: 'Alolan Exeggutor [Scale Up | Mega Drain]' }];
  assert.deepEqual([...matchProducts(c, p)].sort(), [['a', 40], ['b', 50], ['c', 41]]);
});

test('moyennes du guide des prix', () => {
  assert.deepEqual(priceOf({ idProduct: 7, avg7: null, 'avg7-holo': 2, avg30: 3, avg: 0 }), { id: 7, avg7: 2, avg30: 3 });
  assert.equal(priceOf({ idProduct: 7 }), undefined);
});
