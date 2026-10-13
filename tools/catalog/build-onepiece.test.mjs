import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCards, parseSeries } from './build-onepiece.mjs';

test('sélecteur des extensions (extraits réels)', () => {
  const html = `<option value="569105" >BOOSTER PACK &lt;br class=&quot;spInline&quot;&gt;-AWAKENING OF THE NEW ERA- [OP-05]
<option value="569115" >BOOSTER PACK &lt;br class=&quot;spInline&quot;&gt;-ADVENTURE ON KAMI’S ISLAND- &lt;br class=&quot;spInline&quot;&gt;[OP15-EB04]
<option value="550105" >ブースターパック 新時代の主役【OP-05】
<option value="569030" >STARTER DECK EX &lt;br class=&quot;spInline&quot;&gt;-Luffy &amp; Ace- [ST-30]`;
  const s = parseSeries(html);
  assert.deepEqual(s.map((x) => x.code), ['OP-05', 'OP15', 'OP-05', 'ST-30']);
  assert.match(s[0].label, /AWAKENING OF THE NEW ERA/);
});

test('cartes d\'une page officielle (extrait réel)', () => {
  const html = `<dl class="modalCol" id="OP05-001">
            <dt>
              <div class="infoCol">
                <span>OP05-001</span> | <span>L</span> | <span>LEADER</span>
              </div>
              <div class="cardName">サボ</div>
            </dt>
            <dd>
              <div class="frontCol">
                <img class="lazy" src="/images/cardlist/dummy.gif" data-src="../images/cardlist/card/OP05-001.png?260929" alt="サボ">
              </div>
                  <div class="color"><h3>色</h3>赤/黒</div>`;
  const [c] = parseCards(html, 'https://www.onepiece-cardgame.com');
  assert.equal(c.number, 'OP05-001');
  assert.equal(c.rarity, 'L');
  assert.equal(c.category, 'LEADER');
  assert.equal(c.name, 'サボ');
  assert.equal(c.image, 'https://www.onepiece-cardgame.com/images/cardlist/card/OP05-001.png');
  assert.deepEqual(c.colors, ['赤', '黒']);
});
