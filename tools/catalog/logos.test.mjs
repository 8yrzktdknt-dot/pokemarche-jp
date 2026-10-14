import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findLogo, parsePokellectorLogos } from './logos.mjs';

test('logos Pokellector et noms différents selon les sources', () => {
  const html = '<img src="https://den-media.pokellector.com/logos/Munikis-Zero.logo.428.png"><img src="https://den-media.pokellector.com/logos/Munikis-Zero.symbol.428.png"><img src="https://den-media.pokellector.com/logos/Storm-Emeralda.logo.437.png">';
  const t = parsePokellectorLogos(html);
  assert.equal(new Set(t.values()).size, 2);
  assert.equal(findLogo('Storm Emeralda', [t]), 'https://den-media.pokellector.com/logos/Storm-Emeralda.logo.437.png');
  assert.equal(findLogo('Nihil Zero', [t]), 'https://den-media.pokellector.com/logos/Munikis-Zero.logo.428.png');
  assert.equal(findLogo('Inconnue', [t]), undefined);
});

test('noms officiels et traductions de fans', () => {
  const t = new Map([['astonishingvolttackle', 'a'], ['rebelliousclash', 'b'], ['terastalfestivalex', 'c'], ['fullmetalwall', 'd']]);
  assert.equal(findLogo('Amazing Volt Tackle', [t]), 'a');
  assert.equal(findLogo('Rebel Clash', [t]), 'b');
  assert.equal(findLogo('Terastal Fest ex', [t]), 'c');
  assert.equal(findLogo('Full Metal Force', [t]), 'd');
});

test('mêmes mots dans un autre ordre', () => {
  const t = parsePokellectorLogos('<img src="https://den-media.pokellector.com/logos/Starter-Set-ex-Eevee-ex.logo.400.png">');
  assert.equal(findLogo('ex Starter Set Eevee ex', [t]), 'https://den-media.pokellector.com/logos/Starter-Set-ex-Eevee-ex.logo.400.png');
  assert.equal(findLogo('ex Starter Set Pikachu ex', [t]), undefined);
});
