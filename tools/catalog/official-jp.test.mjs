import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseOfficialNumber, parseSerebiiLogos, setKey } from './official-jp.mjs';

const card = `<div class="subtext Text-fjalla">
                        <img src="/assets/images/card/regulation_logo_1/M6a.gif" class="img-regulation" alt="M6a" />
&nbsp;039&nbsp;/&nbsp;103&nbsp;

                    </div>`;
const energy = `<div class="subtext Text-fjalla">
                        <img src="/assets/images/card/regulation_logo_1/M6a.gif" class="img-regulation" alt="M6a" />

                    </div>
                    <span>&nbsp;</span>  <div class="author">1 / 2</div>`;

test('numéro officiel', () => {
  assert.deepEqual(parseOfficialNumber(card), { n: '039', total: 103 });
  assert.equal(parseOfficialNumber(energy), null);
});

test('logos Serebii', () => {
  const html = '<img src="/card/logo/whiteflare-jp.png" loading="lazy" alt="White Flare - Jp Set Icon" height="40" /><img src="/card/logo/30thcelebrationjapan.png" loading="lazy" alt="30th Celebration Japan Set Icon" />';
  const m = parseSerebiiLogos(html);
  assert.equal(m.get(setKey('White Flare')), 'https://www.serebii.net/card/logo/whiteflare-jp.png');
  assert.equal(m.get(setKey('30th Celebration')), 'https://www.serebii.net/card/logo/30thcelebrationjapan.png');
});
