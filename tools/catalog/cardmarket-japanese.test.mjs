import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completeIntlPrices, matchProducts, pickExpansion, priceOf } from './cardmarket-japanese.mjs';

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

test('completeIntlPrices : 30th Celebration et Collection Classique dans la même extension Cardmarket', () => {
  const g = (idProduct, avg7) => ({ idProduct, avg7 });
  const files = {
    products: [
      { idProduct: 10, idExpansion: 6601, name: 'Pikachu ex [Pika-Pika Parade | Thunderbolt]' },
      { idProduct: 11, idExpansion: 6601, name: 'Uxie [Set Up]' },
      { idProduct: 20, idExpansion: 6601, name: 'Pikachu ex [Pika-Pika Parade | Thunderbolt]' },
      { idProduct: 30, idExpansion: 6601, name: 'Uxie Lv.55 [Set Up | Psychic Restore]' },
      { idProduct: 31, idExpansion: 6601, name: 'Darkrai & Cresselia LEGEND [Top]' },
      { idProduct: 32, idExpansion: 6601, name: 'Darkrai & Cresselia LEGEND [Lost Crisis | Moonlight]' },
      { idProduct: 40, idExpansion: 6602, name: 'Uxie [Set Up]' },
    ],
    prices: new Map([g(10, 1), g(11, 0.1), g(20, 50), g(30, 6), g(31, 18), g(32, 16), g(40, 9)].map((x) => [x.idProduct, x])),
  };
  const main = [
    { id: 'a', localId: '053', nameEn: 'Pikachu ex', cmPath: '30th-Celebration/Pikachu-ex-V1-30C053' },
    { id: 'b', localId: '060', nameEn: 'Uxie', cmPath: '30th-Celebration/Uxie-30C060' },
    { id: 'c', localId: '149', nameEn: 'Pikachu ex', cmPath: '30th-Celebration/Pikachu-ex-V2-30C149' },
  ];
  const classic = [
    { id: 'd', localId: '010', nameEn: 'Uxie', cmPath: '30th-Celebration/Uxie-Lv55-30CLA-43' },
    { id: 'e', localId: '019', nameEn: 'Darkrai & Cresselia LEGEND (Top)', cmPath: '30th-Celebration/Darkrai-Cresselia-LEGEND-30CTM-99' },
    { id: 'f', localId: '020', nameEn: 'Darkrai & Cresselia LEGEND (Bottom)', cmPath: '30th-Celebration/Darkrai-Cresselia-LEGEND-30CTM-100' },
  ];
  assert.equal(completeIntlPrices([{ setId: '30th', cards: main }, { setId: '30th-c', cards: classic }], files), 6);
  assert.deepEqual([...main, ...classic].map((c) => c.cm.id), [10, 11, 20, 30, 31, 32]);
  assert.equal(classic[0].cm.avg7, 6);
  assert.equal(main[0].cm.f, 1);
});
