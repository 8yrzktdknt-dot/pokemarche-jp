import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyDetails, attrsOf, cardmarketOf, tcgplayerOf } from './build-pokemon-details.mjs';

test('prix Cardmarket : champs normaux, sinon holo', () => {
  assert.deepEqual(cardmarketOf({ idProduct: 1, avg7: 2, avg1: 1, avg30: 3, avg: 2.8, trend: 2.5, low: 0.5 }), { id: 1, avg7: 2, avg30: 3, avg: 2.8 });
  assert.deepEqual(cardmarketOf({ idProduct: 9, avg7: null, 'avg7-holo': 4, avg30: 0, 'avg30-holo': 5 }), { id: 9, avg7: 4, avg30: 5 });
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

test('lien Cardmarket : la carte elle-même, pas une réimpression', async () => {
  const { parseCardmarketPaths, pickCardmarketPath } = await import('./cardmarket-links.mjs');
  const html = `<a href="https://www.cardmarket.com/en/Pokemon/Products/Singles/Mega-Evolution/Bulbasaur-V1-MEG001?utm_source=limitlesstcg">
    <a href="https://www.cardmarket.com/en/Pokemon/Products/Singles/Mega-Evolution/Bulbasaur-V2-MEG133?utm_source=limitlesstcg">`;
  const paths = parseCardmarketPaths(html);
  assert.deepEqual(paths, ['Mega-Evolution/Bulbasaur-V1-MEG001', 'Mega-Evolution/Bulbasaur-V2-MEG133']);
  assert.equal(pickCardmarketPath(paths, 'MEG', '1', false), 'Mega-Evolution/Bulbasaur-V1-MEG001');
  assert.equal(pickCardmarketPath(paths, 'MEG', '133', false), 'Mega-Evolution/Bulbasaur-V2-MEG133');
  // Page Base Set qui ne pointe que vers une réimpression : pas de lien.
  assert.equal(pickCardmarketPath(['30th-Celebration/Charizard-30CBS-4'], 'BS', '4', false), undefined);
  assert.equal(pickCardmarketPath(['Base-Set/Charizard-V2-BS4'], 'BS', '4', false), 'Base-Set/Charizard-V2-BS4');
  // Carte japonaise : sa version internationale.
  assert.equal(pickCardmarketPath(['Destined-Rivals/Ethans-Pinsir-DRI001'], 'SV9a', '1', true), 'Destined-Rivals/Ethans-Pinsir-DRI001');
});

test('référence Limitless commune au français et à l\'anglais', async () => {
  const { limitlessRef } = await import('./build-pokemon-details.mjs');
  assert.deepEqual(limitlessRef('fr', 'me01', 'MEG', '001'), { key: 'MEG/1', url: 'https://limitlesstcg.com/cards/MEG/1', code: 'MEG', n: '1', japanese: false });
  assert.equal(limitlessRef('ja', 'M6a', undefined, '001').url, 'https://limitlesstcg.com/cards/jp/M6a/1');
});

test('attributs d\'une page Limitless japonaise', async () => {
  const { parseLimitlessDetails } = await import('./limitless-jp-details.mjs');
  const pokemon = `<p class="card-text-title"> <span class="card-text-name"><a href="/cards/jp/MF/20">ゾロアーク</a></span> - Darkness - 120 HP </p>
    <p class="card-text-type"> Pokémon - Stage 1 - Evolves from <a href="#">ゾロア</a> </p>
    <div class="card-text-section card-text-artist"> Illustrated by <a href="/cards/jp?q=!artist:shiburingaru"> Shiburingaru </a> </div>
    <div class="regulation-mark"> J Regulation Mark • <a>More formats</a></div>`;
  assert.deepEqual(parseLimitlessDetails(pokemon), { type: 'Obscurité', hp: '120', category: 'Pokémon', stage: 'Niveau 1', illustrator: 'Shiburingaru', regulation: 'J' });
  const trainer = `<p class="card-text-title"> <span class="card-text-name"><a>ボスの指令</a></span> </p><p class="card-text-type"> Trainer - Supporter </p>`;
  assert.deepEqual(parseLimitlessDetails(trainer), { category: 'Dresseur · Supporter' });
});

test('Collection Classique : LV.X et moitiés LEGEND', async () => {
  const { applyClassicCollection } = await import('./build-pokemon-details.mjs');
  const { classicKey } = await import('./cardmarket-links.mjs');
  const pages = [
    { key: classicKey('Palkia LV.X'), path: '30th-Celebration/Palkia-LVX-30CGE-106', image: 'https://x/30C_CC12_R_EN_SM.png' },
    { key: classicKey('Darkrai & Cresselia LEGEND'), path: '30th-Celebration/Darkrai-Cresselia-LEGEND-30CTM-99', image: 'https://x/30C_CC16_R_EN_SM.png' },
    { key: classicKey('Darkrai & Cresselia LEGEND'), path: '30th-Celebration/Darkrai-Cresselia-LEGEND-30CTM-100', image: 'https://x/30C_CC17_R_EN_SM.png' },
  ];
  const cards = [
    { localId: '019', name: 'Darkrai & Cresselia LÉGENDE', nameEn: 'Darkrai & Cresselia LEGEND', image: 'https://combined' },
    { localId: '020', name: 'Darkrai & Cresselia LÉGENDE', nameEn: 'Darkrai & Cresselia LEGEND' },
    { localId: '022', name: 'Palkia', nameEn: 'Palkia' },
  ];
  assert.equal(applyClassicCollection(cards, pages, 'fr'), 3);
  assert.equal(cards[0].cmPath, '30th-Celebration/Darkrai-Cresselia-LEGEND-30CTM-99');
  assert.equal(cards[0].name, 'Darkrai & Cresselia LÉGENDE (Haut)');
  assert.equal(cards[0].image, 'https://x/30C_CC16_R_EN_SM.png');
  assert.equal(cards[1].cmPath, '30th-Celebration/Darkrai-Cresselia-LEGEND-30CTM-100');
  assert.equal(cards[1].nameEn, 'Darkrai & Cresselia LEGEND (Bottom)');
  assert.equal(cards[2].cmPath, '30th-Celebration/Palkia-LVX-30CGE-106');
  assert.equal(cards[2].image, 'https://x/30C_CC12_R_EN_SM.png');
  // Sans visuel Limitless : Scrydex au numéro d'origine, jamais au numéro de la collection.
  const gen = [{ localId: '004', name: 'Genesect EX', nameEn: 'Genesect EX', image: 'https://images.scrydex.com/pokemon/me55c-4/large' }];
  applyClassicCollection(gen, [{ key: classicKey('Genesect EX'), path: '30th-Celebration/Genesect-EX-30CPLB-97' }], 'fr');
  assert.equal(gen[0].image, 'https://images.scrydex.com/pokemon/me55c-97/large');
});

test('M6a 136–165 : rareté « None »', async () => {
  const { applyRarityOverrides } = await import('./build-pokemon-details.mjs');
  const cards = [{ localId: '135', rarity: 'FUR' }, { localId: '136', rarity: 'Illustration Rare' }, { localId: '165' }, { localId: '166', rarity: 'MUR' }];
  applyRarityOverrides('M6a', cards);
  assert.deepEqual(cards.map((c) => c.rarity), ['FUR', 'None', 'None', 'MUR']);
});
