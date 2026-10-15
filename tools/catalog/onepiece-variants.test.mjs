import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyProductIds, groupVersions, indexProducts, matchVersions, pickExpansion, productCode, variantKey } from './onepiece-variants.mjs';

const e = (id, extra = {}) => ({ id, number: id.replace(/_.*$/, ''), name: 'X', image: `${id}.png`, ...extra });

test('clés de variantes', () => {
  assert.equal(variantKey('OP01-120'), 'normal');
  assert.equal(variantKey('OP01-120_p1'), 'parallel');
  assert.equal(variantKey('OP01-120_p2'), 'parallel-2');
  assert.equal(variantKey('OP01-006_r1'), 'reprint');
});

test('versions regroupées par numéro, normale d\'abord', () => {
  const cards = groupVersions([e('OP01-120_p1'), e('OP01-120'), e('OP01-120_p2'), e('OP01-006_p1'), e('OP01-006_r1')]);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].id, 'OP01-120');
  assert.deepEqual(cards[0].v.map((v) => [v.k, v.o]), [['normal', 'OP01-120'], ['parallel', 'OP01-120_p1'], ['parallel-2', 'OP01-120_p2']]);
  assert.equal(cards[1].id, 'OP01-006_r1');
  assert.deepEqual(cards[1].v.map((v) => v.k), ['reprint', 'parallel']);
  assert.equal(cards[0].v[1].img, 'OP01-120_p1.png');
});

test('fiches Cardmarket : extension et versions', () => {
  assert.equal(productCode('Shanks (OP01-120)'), 'OP01-120');
  assert.equal(productCode('Don!! (Nami)'), undefined);
  const products = [
    { idProduct: 690957, name: 'Shanks (OP01-120)', idExpansion: 5229 },
    { idProduct: 690959, name: 'Shanks (OP01-120)', idExpansion: 5229 },
    { idProduct: 690958, name: 'Shanks (OP01-120)', idExpansion: 5229 },
    { idProduct: 690814, name: 'Nami (OP01-016)', idExpansion: 5229 },
    { idProduct: 698921, name: 'Nami (OP01-016)', idExpansion: 5267 },
  ];
  const byExp = indexProducts(products);
  const cards = groupVersions([e('OP01-120'), e('OP01-120_p1'), e('OP01-120_p2'), e('OP01-016')]);
  const exp = pickExpansion(cards, byExp);
  assert.equal(exp, 5229);
  const ids = matchVersions(cards, byExp.get(exp));
  assert.deepEqual([...ids], [['OP01-120', 690957], ['OP01-120_p1', 690958], ['OP01-120_p2', 690959], ['OP01-016', 690814]]);
  applyProductIds(cards, ids);
  assert.equal(cards[0].cm.id, 690957);
  assert.equal(cards[0].v[2].id, 690959);
});
