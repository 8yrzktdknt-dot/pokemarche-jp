import { test } from 'node:test';
import assert from 'node:assert/strict';
import { championNames, foilAsHolo, fullName, indexProducts, matchProducts, pickExpansion, printRank, smallImage, variantsFor } from './build-riftbound.mjs';
import { applyCardmarketPrices } from './variants.mjs';

const jinx = { name: 'Jinx', subtitle: 'Demolitionist', tags: { tags: ['Jinx', 'Zaun'] }, cardType: { type: [{ id: 'unit' }], superType: [{ id: 'champion' }] } };
const legend = { name: 'Loose Cannon', tags: { tags: ['Jinx'] }, cardType: { type: [{ id: 'legend' }] } };

test('nom complet : sous-titre, et champion des légendes', () => {
  assert.equal(fullName(jinx), 'Jinx, Demolitionist');
  assert.equal(fullName(legend), 'Jinx, Loose Cannon');
  const ko = championNames([{ ...jinx, subtitle: 'Rebel' }, { ...jinx, name: '징크스', subtitle: '폭파광' }]);
  assert.equal(fullName({ ...legend, name: '난폭한 말괄량이' }, ko), '징크스, 난폭한 말괄량이');
  assert.equal(fullName({ name: 'Cleave' }), 'Cleave');
});

test('rang d’impression : normale, alternative, hors série', () => {
  assert.equal(printRank('OGN-030/298'), 0);
  assert.equal(printRank('OGN-030a/298'), 1);
  assert.equal(printRank('RAD-R01a'), 1);
  assert.equal(printRank('OGN-301*/298'), 2);
  assert.equal(printRank('VEN-SP1/006'), 0);
});

test('fiches Cardmarket : ordre d’impression, fiches en trop ignorées', () => {
  const byExp = indexProducts([
    { idProduct: 847504, name: 'Jinx, Loose Cannon', idExpansion: 6286 },
    { idProduct: 847451, name: 'Jinx, Loose Cannon', idExpansion: 6286 },
    { idProduct: 847503, name: 'Jinx, Loose Cannon', idExpansion: 6286 },
    { idProduct: 855680, name: 'Jinx, Loose Cannon', idExpansion: 6322 },
    { idProduct: 907588, name: 'Jinx, Loose Cannon', idExpansion: 6286 },
    { idProduct: 847146, name: 'Jinx, Demolitionist', idExpansion: 6286 },
    { idProduct: 847147, name: 'Jinx, Demolitionist', idExpansion: 6286 },
  ]);
  const cards = [
    { id: 'ogn-301-star-298', full: 'Jinx, Loose Cannon', number: 'OGN-301*/298', localId: '301' },
    { id: 'ogn-301-298', full: 'Jinx, Loose Cannon', number: 'OGN-301/298', localId: '301' },
    { id: 'ogn-251-298', full: 'Jinx, Loose Cannon', number: 'OGN-251/298', localId: '251' },
    { id: 'ogn-030a-298', full: 'Jinx, Demolitionist', number: 'OGN-030a/298', localId: '30' },
    { id: 'ogn-030-298', full: 'Jinx, Demolitionist', number: 'OGN-030/298', localId: '30' },
  ];
  const exp = pickExpansion(new Set(['jinxloosecannon', 'jinxdemolitionist']), byExp, new Set());
  assert.equal(exp, 6286);
  const m = matchProducts(cards, byExp.get(exp));
  assert.deepEqual(m.get('ogn-251-298'), { id: 847451 });
  assert.deepEqual(m.get('ogn-301-298'), { id: 847503 });
  assert.deepEqual(m.get('ogn-301-star-298'), { id: 847504 });
  assert.deepEqual(m.get('ogn-030-298'), { id: 847146 });
  assert.deepEqual(m.get('ogn-030a-298'), { id: 847147 });
});

test('variantes et prix : normale + foil pour les communes, foil seule sinon', () => {
  const guide = new Map([
    [1, foilAsHolo({ idProduct: 1, avg7: 0.05, 'avg7-foil': 0.19 })],
    [2, foilAsHolo({ idProduct: 2, avg7: 44.99, 'avg7-foil': 105.96 })],
  ]);
  const cards = [
    { id: 'c', v: variantsFor('common', { id: 1 }) },
    { id: 's', v: variantsFor('showcase', { id: 2 }) },
  ];
  applyCardmarketPrices(cards, { prices: guide });
  assert.deepEqual(cards[0].v.map((v) => [v.k, v.p]), [['normal', 0.05], ['foil', 0.19]]);
  assert.equal(cards[0].cm.avg7, 0.05);
  assert.deepEqual(cards[1].v.map((v) => [v.k, v.p]), [['foil', 105.96]]);
  assert.equal(cards[1].cm.avg7, 105.96);
  assert.equal(variantsFor('rare', undefined), undefined);
});

test('visuel réduit par le CDN', () => {
  assert.equal(smallImage('https://cmsassets.rgpub.io/a.png?accountingTag=RB'), 'https://cmsassets.rgpub.io/a.png?accountingTag=RB&w=360&fm=webp');
});
