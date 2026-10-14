// Test hors ligne de la traduction (table d'espèces réduite).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as names from './names.mjs';

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
