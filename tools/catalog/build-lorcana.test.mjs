import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attrsOf, printedNumber, rarityId, setOf, smallImage, variantsOf } from './build-lorcana.mjs';

test('Lorcana : variantes normale / foil selon les finitions', () => {
  assert.deepEqual(variantsOf({ foilTypes: ['None', 'Silver'] }, 7), [{ k: 'normal', id: 7 }, { k: 'foil', id: 7 }]);
  assert.deepEqual(variantsOf({ foilTypes: ['Lava'] }, 8), [{ k: 'foil', id: 8 }]);
  assert.deepEqual(variantsOf({ foilTypes: ['None'] }), [{ k: 'normal' }]);
});

test('Lorcana : numéro, extension, rareté, attributs, visuel', () => {
  assert.equal(printedNumber({ fullIdentifier: '1/204 • FR • 1', number: 1 }), '1/204');
  assert.equal(printedNumber({ fullIdentifier: '1 TFC • EN • 1/P1', number: 1 }), '1/P1');
  assert.equal(setOf({ setCode: '1', promoGrouping: 'P1' }), 'P1');
  assert.equal(setOf({ setCode: 'Q2' }), 'Q2');
  assert.equal(rarityId('Super Rare'), 'super_rare');
  assert.deepEqual(attrsOf({ artistsText: 'A', cost: 4, strength: 3, willpower: 4, lore: 2, story: 'Frozen' }), { illustrator: 'A', cost: '4', strength: '3', willpower: '4', lore: '2', story: 'Frozen' });
  assert.equal(smallImage('https://api.lorcana.ravensburger.com/images/fr/set1/1_x.jpg'), 'https://wsrv.nl/?url=api.lorcana.ravensburger.com%2Fimages%2Ffr%2Fset1%2F1_x.jpg&w=360&output=webp');
});
