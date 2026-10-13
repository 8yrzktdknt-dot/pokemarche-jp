import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanName, parseOfficialCard, parseOfficialNumber, parseSerebiiLogos, setKey } from './official-jp.mjs';

const card = `<div class="subtext Text-fjalla">
                        <img src="/assets/images/card/regulation_logo_1/M6a.gif" class="img-regulation" alt="M6a" />
&nbsp;039&nbsp;/&nbsp;103&nbsp;

                    </div>`;
const energy = `<div class="subtext Text-fjalla">
                        <img src="/assets/images/card/regulation_logo_1/M6a.gif" class="img-regulation" alt="M6a" />

                    </div>
                    <span>&nbsp;</span>  <div class="author">1 / 2</div>`;

const rare = `<div class="subtext Text-fjalla">
                        <img src="/assets/images/card/regulation_logo_1/M6a.gif" class="img-regulation" alt="M6a" />
&nbsp;088&nbsp;/&nbsp;103&nbsp;
<img src="/assets/images/card/rarity/ic_rare_rr.gif" width="24" />
                    </div>`;

test('numéro officiel', () => {
  assert.deepEqual(parseOfficialNumber(rare), { n: '088', total: 103, rarity: 'RR' });
  assert.deepEqual(parseOfficialNumber(card), { n: '039', total: 103 });
  assert.equal(parseOfficialNumber(energy), null);
});

test('logos Serebii', () => {
  const html = '<img src="/card/logo/whiteflare-jp.png" loading="lazy" alt="White Flare - Jp Set Icon" height="40" /><img src="/card/logo/30thcelebrationjapan.png" loading="lazy" alt="30th Celebration Japan Set Icon" />';
  const m = parseSerebiiLogos(html);
  assert.equal(m.get(setKey('White Flare')), 'https://www.serebii.net/card/logo/whiteflare-jp.png');
  assert.equal(m.get(setKey('30th Celebration')), 'https://www.serebii.net/card/logo/30thcelebrationjapan.png');
});

test('carte LEGEND : deux numéros, nom, image', () => {
  const html = `<div class="LeftBox"><img class="fit" src="/assets/images/card_images/large/M6a/050728_P_X.jpg"  alt="x" />
<div class="subtext Text-fjalla"><img src="/assets/images/card/regulation_logo_1/M6a.gif" class="img-regulation" alt="M6a" />
&nbsp;151&nbsp;/&nbsp;103&nbsp;&nbsp;&nbsp;(上)<br />
<img src="/assets/images/card/regulation_logo_1/M6a.gif" class="img-regulation" alt="M6a" />
&nbsp;152&nbsp;/&nbsp;103&nbsp;&nbsp;&nbsp;(下)
</div></div><h1 class="Heading1 mt20">ダークライ＆クレセリアLEGEND</h1>`;
  const c = parseOfficialCard(html);
  assert.equal(c.n, '151');
  assert.deepEqual(c.numbers, ['151', '152']);
  assert.equal(c.name, 'ダークライ＆クレセリアLEGEND');
  assert.equal(c.set, 'M6a');
  assert.equal(c.image, 'https://www.pokemon-card.com/assets/images/card_images/large/M6a/050728_P_X.jpg');
});

test('symbole Méga dans le nom', () => {
  assert.equal(cleanName('<span class="pcg pcg-megamark"></span>サーナイトEX'), 'MサーナイトEX');
});
