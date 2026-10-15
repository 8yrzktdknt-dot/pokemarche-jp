// Test hors ligne de la traduction (table d'espèces réduite).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as names from './names.mjs';
import { manualName } from './names-manual.mjs';

test('traductions japonais → anglais / français', async (t) => {
  const csv = [
    'pokemon_species_id,local_language_id,name,genus',
    '384,11,レックウザ,', '384,9,Rayquaza,', '384,5,Rayquaza,',
    '35,11,ピッピ,', '35,9,Clefairy,', '35,5,Mélofée,',
    '37,11,ロコン,', '37,9,Vulpix,', '37,5,Goupix,',
    '6,11,リザードン,', '6,9,Charizard,', '6,5,Dracaufeu,',
    '114,11,モンジャラ,', '114,9,Tangela,', '114,5,Saquedeneu,',
    '103,11,ナッシー,', '103,9,Exeggutor,', '103,5,Noadkoko,',
    '251,11,セレビィ,', '251,9,Celebi,', '251,5,Celebi,',
    '248,11,バンギラス,', '248,9,Tyranitar,', '248,5,Tyranocif,',
    '169,11,クロバット,', '169,9,Crobat,', '169,5,Nostenfer,',
    '282,11,サーナイト,', '282,9,Gardevoir,', '282,5,Gardevoir,',
    '25,11,ピカチュウ,', '25,9,Pikachu,', '25,5,Pikachu,',
    '644,11,ゼクロム,', '644,9,Zekrom,', '644,5,Zekrom,',
    '491,11,ダークライ,', '491,9,Darkrai,', '491,5,Darkrai,',
    '488,11,クレセリア,', '488,9,Cresselia,', '488,5,Cresselia,',
  ].join('\n');
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, text: async () => csv }));
  await names.loadSpeciesNames();
  assert.deepEqual(names.translateJa('メガレックウザex'), ['Mega Rayquaza ex', 'Méga-Rayquaza-ex']);
  assert.deepEqual(names.translateJa('メガリザードンYex'), ['Mega Charizard Y ex', 'Méga-Dracaufeu Y-ex']);
  assert.deepEqual(names.translateJa('リーリエのピッピex'), ["Lillie's Clefairy ex", 'Mélofée de Lilie-ex']);
  // Formes au nom propre et Pikachu de Sacha.
  assert.deepEqual(names.translateJa('ヒートロトムex'), ['Heat Rotom ex', 'Motisma Chaleur-ex']);
  assert.deepEqual(names.translateJa('オリジンパルキアVSTAR'), ['Origin Forme Palkia VSTAR', 'Palkia Originel VSTAR']);
  assert.deepEqual(names.translateJa('ネクロズマ あかつきのつばさGX'), ['Dawn Wings Necrozma GX', "Necrozma Ailes de l'Aurore GX"]);
  assert.deepEqual(names.translateJa('サトシのピカチュウ'), ["Ash's Pikachu", 'Pikachu de Sacha']);
  assert.deepEqual(names.translateJa('エリカのモンジャラ'), ["Erika's Tangela", "Saquedeneu d'Érika"]);
  assert.deepEqual(names.translateJa('アローラロコン'), ['Alolan Vulpix', "Goupix d'Alola"]);
  assert.equal(names.translateJa('ボスの指令'), null);
});

test('noms spéciaux des cartes M6a (après chargement des espèces)', () => {
  assert.deepEqual(names.translateJa('アローラ ナッシー'), ['Alolan Exeggutor', "Noadkoko d'Alola"]);
  assert.deepEqual(names.translateJa('ひかるセレビィ'), ['Shining Celebi', 'Celebi brillant']);
  assert.deepEqual(names.translateJa('わるいバンギラス'), ['Dark Tyranitar', 'Tyranocif obscur']);
  assert.deepEqual(names.translateJa('クロバットG'), ['Crobat G', 'Nostenfer G']);
  assert.deepEqual(names.translateJa('MサーナイトEX'), ['M Gardevoir EX', 'M-Gardevoir-EX']);
  assert.deepEqual(names.translateJa('ピカチュウ&ゼクロムGX'), ['Pikachu & Zekrom GX', 'Pikachu & Zekrom-GX']);
  assert.deepEqual(names.translateJa('ダークライ＆クレセリアLEGEND (上)'), ['Darkrai & Cresselia LEGEND (Top)', 'Darkrai & Cresselia-LEGEND (Haut)']);
  assert.deepEqual(names.translateJa('カスミ'), ['Misty', 'Ondine']);
});

test('nom anglais et français depuis le nom d\'origine (espèce)', () => {
  const table = { langs: ['fr', 'de', 'es', 'it', 'ja', 'ko', 'zh-tw', 'zh-cn'], names: {
    Charizard: ['Dracaufeu', 'Glurak', 'Charizard', 'Charizard', 'リザードン', '리자몽', '噴火龍', '喷火龙'],
    Vulpix: ['Goupix', 'Vulpix', 'Vulpix', 'Vulpix', 'ロコン', '식스테일', '六尾', '六尾'],
  } };
  assert.deepEqual(names.namesFromLocal('噴火龍VMAX', 'zh-tw', table), ['Charizard VMAX', 'Dracaufeu-VMAX']);
  assert.deepEqual(names.namesFromLocal('超級噴火龍X', 'zh-tw', table), ['Mega Charizard X', 'Méga-Dracaufeu X']);
  assert.deepEqual(names.namesFromLocal('阿羅拉六尾', 'zh-tw', table), ['Alolan Vulpix', "Goupix d'Alola"]);
  assert.deepEqual(names.namesFromLocal("Goupix d'Alola", 'fr', table), ['Alolan Vulpix', "Goupix d'Alola"]);
  assert.equal(names.namesFromLocal('船长 噴火龍', 'zh-tw', table), null);
});

test('table manuelle : promos et Dresseurs asiatiques', () => {
  assert.deepEqual(manualName('ルカリオソウルリンク'), ['Lucario Spirit Link', 'Lien Spirituel Lucario']);
  assert.deepEqual(manualName('ヒロシマのピカチュウ'), ["Hiroshima's Pikachu", 'Pikachu de Hiroshima']);
  assert.deepEqual(manualName('‌寶可夢中心的姐姐')[0], 'Pokémon Center Lady');
  assert.equal(manualName('船长 皮卡丘', (s) => s.replace('长', '長'))[0], 'Captain Pikachu');
  assert.equal(manualName('inconnu'), undefined);
});
