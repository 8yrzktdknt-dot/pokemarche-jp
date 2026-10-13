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
