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

test('trous de la suite des n° produit comblés', async () => {
  const { fillGaps } = await import('./cardmarket-japanese.mjs');
  const cards = ['013', '014', '015', '146', '147', '148', '149', '150'].map((n) => ({ id: n, localId: n }));
  const products = [907777, 907778, 907779, 907910, 907911, 907912, 907913, 907914, 907915].map((idProduct) => ({ idProduct }));
  const out = new Map([['013', 907777], ['015', 907779], ['146', 907911], ['150', 907915]]);
  fillGaps(cards, products, out);
  assert.equal(out.get('014'), 907778);
  assert.equal(out.get('147'), 907912);
  assert.equal(out.get('149'), 907914);
  // Écart incohérent : rien.
  const out2 = new Map([['013', 907777], ['015', 907790]]);
  fillGaps(cards, products, out2);
  assert.equal(out2.get('014'), undefined);
});
