import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCards, parseSeries, setName, parseProductLogo, proxiedImage } from './build-onepiece.mjs';

test('visuels officiels via le proxy d\'images (le site interdit l\'affichage ailleurs)', () => {
  assert.equal(proxiedImage('https://en.onepiece-cardgame.com/images/cardlist/card/OP01-120_p1.png'), 'https://wsrv.nl/?url=en.onepiece-cardgame.com%2Fimages%2Fcardlist%2Fcard%2FOP01-120_p1.png&w=360&output=webp');
});

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

test('noms des extensions', () => {
  assert.equal(setName('BOOSTER PACK -AWAKENING OF THE NEW ERA- [OP-05]'), 'Awakening of the New Era');
  assert.equal(setName('エクストラブースター EGGHEAD CRISIS【EB-04】'), 'Egghead Crisis');
  assert.equal(setName('ブースターパック 新時代の主役【OP-05】'), '新時代の主役');
  assert.equal(setName('STARTER DECK EX -Luffy & Ace- [ST-30]'), 'Luffy & Ace');
});

test('attributs du dos de la fiche', () => {
  const html = '<dl class="modalCol" id="OP01-001"><dt><div class="infoCol"><span>OP01-001</span> | <span>L</span> | <span>LEADER</span></div><div class="cardName">Roronoa Zoro</div></dt><dd><div class="backCol"><div class="col2"><div class="cost"><h3>Life</h3>5</div><div class="attribute"><h3>Attribute</h3><img src="x" alt="Slash"><i>Slash</i></div></div><div class="col2"><div class="power"><h3>Power</h3>5000</div><div class="counter"><h3>Counter</h3>-</div></div><div class="block"><h3>Block<br class="spInline"> icon</h3>1</div><div class="feature"><h3>Type</h3>Supernovas/Straw Hat Crew</div></div></dd></dl>';
  const [c] = parseCards(html, 'https://en.onepiece-cardgame.com');
  assert.deepEqual(c.attrs, { life: '5', power: '5000', attribute: 'Slash', feature: 'Supernovas/Straw Hat Crew', block: '1' });
});

test('logo de la page produit officielle (dossier aléatoire ou relatif)', () => {
  const page = 'https://www.onepiece-cardgame.com/products/boosters/op16.php';
  assert.equal(
    parseProductLogo('<img src="/onepiececg/bccard/jp/products/2026/03/19/PH7hkxHZKAf8gXnn/logo.webp" alt="">', page),
    'https://www.onepiece-cardgame.com/onepiececg/bccard/jp/products/2026/03/19/PH7hkxHZKAf8gXnn/logo.webp',
  );
  assert.equal(parseProductLogo('<img src="./images/logo_3rd-anniv.webp"><img src="./images/mv/logo.webp">', page), 'https://www.onepiece-cardgame.com/products/boosters/images/mv/logo.webp');
  assert.equal(parseProductLogo('<img src="/renewal/images/common/logo_op.png">', page), undefined);
});

test('types One Piece dans les trois langues, terme à terme', async () => {
  const { featureTable } = await import('./build-onepiece.mjs');
  const entry = (id, feature) => ({ id, attrs: { feature } });
  const t = featureTable({
    en: [{ entries: [entry('OP01-001', 'Supernovas/Straw Hat Crew'), entry('OP01-016', 'Straw Hat Crew')] }],
    fr: [{ entries: [entry('OP01-001', 'Supernovas/Équipage de Chapeau de paille'), entry('OP01-016', 'Équipage de Chapeau de paille')] }],
    ja: [{ entries: [entry('OP01-016', '麦わらの一味')] }],
  });
  assert.deepEqual(t, [['Straw Hat Crew', 'Équipage de Chapeau de paille', '麦わらの一味'], ['Supernovas', 'Supernovas', '']]);
});
