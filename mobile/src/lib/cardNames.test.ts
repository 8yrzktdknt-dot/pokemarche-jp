/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardName, setSpeciesNames, speciesName } from './cardNames.ts';
import type { Card } from './types.ts';

setSpeciesNames({
  langs: ['fr', 'de', 'es', 'it', 'ja', 'ko', 'zh-tw', 'zh-cn'],
  names: {
    Charizard: ['Dracaufeu', 'Glurak', 'Charizard', 'Charizard', 'リザードン', '리자몽', '噴火龍', '喷火龙'],
    Vulpix: ['Goupix', 'Vulpix', 'Vulpix', 'Vulpix', 'ロコン', '식스테일', '六尾', '六尾'],
  },
});

test('nom d\'espèce dans la langue : Méga, forme régionale, X/Y, suffixe', () => {
  assert.equal(speciesName('Charizard ex', 'ja'), 'リザードンex');
  assert.equal(speciesName('Mega Charizard X ex', 'ja'), 'メガリザードンXex');
  assert.equal(speciesName('Mega Charizard X ex', 'de'), 'Mega-Glurak X-ex');
  assert.equal(speciesName('Alolan Vulpix', 'fr'), "Goupix d'Alola");
  assert.equal(speciesName('Charizard VMAX', 'zh-tw'), '噴火龍VMAX');
  // Dresseur ou objet : pas de traduction partielle.
  assert.equal(speciesName("Lillie's Clefairy ex", 'ja'), undefined);
  assert.equal(speciesName('Charizard', 'pt'), undefined);
});

test('nom de la carte : sa langue, sinon l\'anglais, sinon le nom d\'origine', () => {
  const base = { game: 'pokemon' as const, number: '1', prices: [] };
  const en: Card = { ...base, id: 'a', lang: 'en', name: 'Charizard ex', nameFr: 'Dracaufeu-ex', names: { de: 'Glurak-ex' } };
  assert.equal(cardName(en, 'en'), 'Charizard ex');
  assert.equal(cardName(en, 'fr'), 'Dracaufeu-ex');
  assert.equal(cardName(en, 'de'), 'Glurak-ex');
  assert.equal(cardName(en, 'ja'), 'リザードンex');
  assert.equal(cardName(en, 'pt'), 'Charizard ex');
  const item: Card = { ...base, id: 'b', lang: 'ja', name: 'おいしいおむすび', nameEn: 'Tasty Rice Ball', names: { 'zh-tw': '美味飯糰' } };
  assert.equal(cardName(item, 'zh-tw'), '美味飯糰');
  assert.equal(cardName(item, 'ko'), 'Tasty Rice Ball');
  const unknown: Card = { ...base, id: 'c', lang: 'zh-cn', name: '某道具' };
  assert.equal(cardName(unknown, 'fr'), '某道具');
});
