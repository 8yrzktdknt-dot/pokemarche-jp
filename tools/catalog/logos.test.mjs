import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findLogo, parsePokellectorLogos } from './logos.mjs';

test('logos Pokellector et noms différents selon les sources', () => {
  const html = '<img src="https://den-media.pokellector.com/logos/Munikis-Zero.logo.428.png"><img src="https://den-media.pokellector.com/logos/Munikis-Zero.symbol.428.png"><img src="https://den-media.pokellector.com/logos/Storm-Emeralda.logo.437.png">';
  const t = parsePokellectorLogos(html);
  assert.equal(t.size, 2);
  assert.equal(findLogo('Storm Emeralda', [t]), 'https://den-media.pokellector.com/logos/Storm-Emeralda.logo.437.png');
  assert.equal(findLogo('Nihil Zero', [t]), 'https://den-media.pokellector.com/logos/Munikis-Zero.logo.428.png');
  assert.equal(findLogo('Inconnue', [t]), undefined);
});
