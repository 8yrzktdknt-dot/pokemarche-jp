import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCardmarketPrices, japaneseBase, mergeVariants, variantsOf, wizardVariantKey } from './variants.mjs';

test('variantsOf : normale, reverse, Poké Ball, Master Ball, tampon, sous-type', () => {
  const d = { variants_detailed: [
    { type: 'normal', size: 'standard', thirdParty: { cardmarket: 1 } },
    { type: 'reverse', size: 'standard', thirdParty: { cardmarket: 1 } },
    { type: 'reverse', size: 'standard', foil: 'pokeball', thirdParty: { cardmarket: 2 } },
    { type: 'Reverse', size: 'Standard', foil: 'masterball', thirdParty: { cardmarket: 3 } },
    { type: 'reverse', size: 'standard', stamp: ['30th-pokeday'], foil: 'league', thirdParty: { cardmarket: 4 } },
    { type: 'holo', subtype: 'shadowless', size: 'standard', stamp: ['1st-edition'], thirdParty: { cardmarket: 5 } },
    { type: 'holo', subtype: 'unlimited', size: 'standard' },
    { type: 'holo', size: 'jumbo' },
  ] };
  assert.deepEqual(variantsOf(d), [
    { k: 'normal', id: 1 }, { k: 'reverse', id: 1 }, { k: 'pokeball', id: 2 }, { k: 'masterball', id: 3 },
    { k: 'reverse-league|30th-pokeday', id: 4 }, { k: 'holo|shadowless|1st-edition', id: 5 }, { k: 'holo' },
  ]);
});

test('wizardVariantKey et carte japonaise de base', () => {
  assert.equal(wizardVariantKey("Cynthia's Roserade (Poke Ball Pattern)"), 'pokeball');
  assert.equal(wizardVariantKey("Cynthia's Roserade (Energy Symbol Pattern)"), 'reverse-energy');
  assert.equal(wizardVariantKey('Yanmega (Quick Ball Pattern)'), 'quickball');
  assert.equal(wizardVariantKey("Cynthia's Roserade"), undefined);
  assert.equal(japaneseBase('C'), 'normal');
  assert.equal(japaneseBase('RR'), 'holo');
});

test('applyCardmarketPrices : moyenne 7 jours de chaque variante, depuis les fichiers Cardmarket', () => {
  const prices = new Map([
    [1, { idProduct: 1, avg7: 0.03, avg30: 0.04, 'avg7-holo': 0.12 }],
    [2, { idProduct: 2, avg7: 0.28, 'avg7-holo': 0.46 }],
    [3, { idProduct: 3, avg7: null, 'avg7-holo': 1.5 }],
    [9, { idProduct: 9, avg7: null, 'avg7-holo': 0.5 }],
  ]);
  const c = { cm: { id: 1, avg7: 99 }, v: [{ k: 'normal', id: 1 }, { k: 'reverse', id: 1 }, { k: 'pokeball', id: 2 }, { k: 'masterball', id: 3 }] };
  const jp = { cm: { id: 9, f: 1 }, v: [{ k: 'normal' }, { k: 'reverse' }, { k: 'pokeball' }] };
  applyCardmarketPrices([c, jp], { prices });
  assert.deepEqual(c.v.map((v) => v.p), [0.03, 0.12, 0.46, 1.5]);
  assert.deepEqual(c.cm, { id: 1, avg7: 0.03, avg30: 0.04 });
  // Normale sans vente sur 7 jours : pas le prix du reverse.
  assert.equal(jp.cm.avg7, undefined);
  assert.equal(jp.cm.f, 1);
  assert.deepEqual(jp.v.map((v) => v.p), [undefined, 0.5, undefined]);
});

test('variantsOf : motifs traduits (fiches françaises) ; fusion avec PokemonWizard', () => {
  const d = { variants_detailed: [
    { type: 'Normal', size: 'Standard', thirdParty: { cardmarket: 1 } },
    { type: 'Reverse', size: 'Standard', foil: 'Pokéball', thirdParty: { cardmarket: 2 } },
    { type: 'Reverse', size: 'Standard', foil: 'Énergie', thirdParty: { cardmarket: 3 } },
  ] };
  const v = variantsOf(d);
  assert.deepEqual(v.map((x) => x.k), ['normal', 'pokeball', 'reverse-energy']);
  assert.deepEqual(mergeVariants(v, [{ k: 'normal' }, { k: 'masterball' }]).map((x) => x.k), ['normal', 'pokeball', 'reverse-energy', 'masterball']);
});

test('photos des variantes : seulement celles vendues sur une autre fiche TCGplayer', async () => {
  const { ownImages, fixJapaneseBall } = await import('./variants.mjs');
  assert.deepEqual(ownImages([{ k: 'normal', id: 1, tp: 10 }, { k: 'reverse', id: 1, tp: 10 }, { k: 'pokeball', id: 2, tp: 20 }]),
    [{ k: 'normal', id: 1 }, { k: 'reverse', id: 1 }, { k: 'pokeball', id: 2, tp: 20 }]);
  // Japonais : le « reverse » sans motif de TCGdex est la version Poké Ball de PokemonWizard.
  const v = mergeVariants(
    [{ k: 'normal', id: 1 }, { k: 'reverse-energy', id: 2 }, { k: 'reverse', id: 3 }],
    [{ k: 'normal' }, { k: 'reverse-energy', tp: 66 }, { k: 'pokeball', tp: 65 }],
  );
  assert.deepEqual(fixJapaneseBall(v), [{ k: 'normal', id: 1 }, { k: 'reverse-energy', id: 2, tp: 66 }, { k: 'pokeball', tp: 65, id: 3 }]);
});

test('PokemonWizard : motifs et photo (n° produit TCGplayer) par numéro', async () => {
  const { parseWizardVariants } = await import('./official-jp.mjs');
  const html = '\\"tcgplayer_product_id\\":665930,\\"name\\":\\"Cynthia\'s Roserade (Poke Ball Pattern)\\",\\"slug\\":\\"x\\",\\"card_number\\":\\"10\\",'
    + '\\"tcgplayer_product_id\\":665681,\\"name\\":\\"Cynthia\'s Roserade\\",\\"slug\\":\\"y\\",\\"card_number\\":\\"10\\",'
    + '\\"tcgplayer_product_id\\":666096,\\"name\\":\\"Cynthia\'s Roserade (Energy Symbol Pattern)\\",\\"slug\\":\\"z\\",\\"card_number\\":\\"10\\",';
  assert.deepEqual(parseWizardVariants(html).get('10'), [{ k: 'pokeball', tp: 665930 }, { k: 'reverse-energy', tp: 666096 }]);
});

test('30 ans : toutes les cartes holo', async () => {
  const { forceHolo, ALL_HOLO } = await import('./variants.mjs');
  const cards = forceHolo([
    { v: [{ k: 'normal', id: 1, p: 0.3 }] },
    { cm: { id: 2, avg7: 5 } },
    { v: [{ k: 'holo', id: 3 }, { k: 'reverse', id: 3 }] },
  ]);
  assert.deepEqual(cards.map((c) => c.v), [[{ k: 'holo', id: 1, p: 0.3 }], [{ k: 'holo', id: 2, p: 5 }], [{ k: 'holo', id: 3 }, { k: 'reverse', id: 3 }]]);
  assert.ok(ALL_HOLO.has('M6a') && ALL_HOLO.has('30th-c'));
});

test('prix : 7 jours, sinon 30 jours, toutes les ventes, puis offres (cartes jamais vendues)', () => {
  const prices = new Map([
    [1, { idProduct: 1, avg7: null, avg30: 12, avg: 11, trend: 10 }],
    [2, { idProduct: 2, avg7: null, avg30: null, avg: null, trend: 2500, 'trend-holo': null }],
    [3, { idProduct: 3, avg7: null, avg30: null, avg: null, trend: null, low: 1500 }],
  ]);
  const a = { v: [{ k: 'holo', id: 1 }] };
  const b = { v: [{ k: 'holo', id: 2 }] };
  const c = { v: [{ k: 'holo', id: 3 }] };
  applyCardmarketPrices([a, b, c], { prices });
  assert.deepEqual(c.v[0], { k: 'holo', id: 3, p: 1500, t: 'low' });
  assert.deepEqual(a.v[0], { k: 'holo', id: 1, p: 12, t: 'avg30' });
  assert.deepEqual(b.v[0], { k: 'holo', id: 2, p: 2500, t: 'trend' });
  assert.deepEqual(b.cm, { id: 2, trend: 2500 });
});
