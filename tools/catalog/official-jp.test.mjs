import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanName, parseOfficialCard, parseWizardSet, parseOfficialNumber } from './official-jp.mjs';
import { parseSerebiiLogos, setKey } from './logos.mjs';

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

test('liste PokemonWizard', () => {
  const html = String.raw`self.__next_f.push([1,"[{\"card\":{\"id\":42944,\"tcgplayer_product_id\":716932,\"name\":\"Mew ex - 135/103\",\"slug\":\"mew-ex-135103\",\"card_number\":\"135\",\"rarity\":\"Futuristic Rare\",\"card_type\":null,\"hp\":\"160\",\"stage\":\"Basic\",\"is_presale\":false,\"image_url\":\"https://images.pokemonwizard.com/uploads/images/cards/24721/716932-mew-ex-135103-full.jpg\",\"thumbnail_url\":\"x\"}}]"])`;
  assert.deepEqual(parseWizardSet(html), [{ n: '135', total: 103, nameEn: 'Mew ex', rarity: 'FUR', image: 'https://images.pokemonwizard.com/uploads/images/cards/24721/716932-mew-ex-135103-full.jpg', tcgplayer: 716932 }]);
});

test('images officielles des 30 ans et liste Samurai Sword', async () => {
  const { parse30thImages, parseSamuraiList } = await import('./official-jp.mjs');
  const a = parse30thImages('<img src="https://www.30th.pokemon-card.com/images/m6a/cards/m6a_106_kizt5zx8.png"><img src="/images/m6a/cards/m6a_038_5l113pmo.png">');
  assert.equal(a.get('106'), 'https://www.30th.pokemon-card.com/images/m6a/cards/m6a_106_kizt5zx8.png');
  assert.equal(a.get('038'), 'https://www.30th.pokemon-card.com/images/m6a/cards/m6a_038_5l113pmo.png');
  const b = parseSamuraiList('src="https://samuraiswordtokyo.com/wp-content/uploads/2026/09/pokemon-30th-celebration-m6a-128-mewtwo-ex-320x456.webp"');
  assert.deepEqual(b.get('128'), {
    nameEn: 'Mewtwo ex',
    image: 'https://samuraiswordtokyo.com/wp-content/uploads/2026/09/pokemon-30th-celebration-m6a-128-mewtwo-ex-320x456.webp',
    full: 'https://samuraiswordtokyo.com/wp-content/uploads/2026/09/pokemon-30th-celebration-m6a-128-mewtwo-ex.webp',
  });
});

test('extension PokemonWizard reliée par nom ou par code', async () => {
  const { matchWizardSet } = await import('./official-jp.mjs');
  const paths = ['24399/mega-brave', '24721/30th-celebration-m6a', '24499/mega-dream-ex'];
  assert.equal(matchWizardSet(paths, { id: 'M1L', name: 'Mega Brave' }), '24399/mega-brave');
  assert.equal(matchWizardSet(paths, { id: 'M6a', name: '30th Celebration' }), '24721/30th-celebration-m6a');
  assert.equal(matchWizardSet(paths, { id: 'M2a', name: 'MEGA Dream ex' }), '24499/mega-dream-ex');
  assert.equal(matchWizardSet(paths, { id: 'SV1', name: 'Scarlet ex' }), undefined);
});

test('prix du marché PokemonWizard', async () => {
  const { parseWizardSet } = await import('./official-jp.mjs');
  const html = '{\\"tcgplayer_product_id\\":7,\\"name\\":\\"Mew ex - 135/103\\",\\"slug\\":\\"x\\",\\"card_number\\":\\"135\\",\\"rarity\\":\\"Futuristic Rare\\",\\"image_url\\":\\"https://i/x.jpg\\",\\"market_price\\":\\"12.5\\"}';
  assert.equal(parseWizardSet(html)[0].market, 12.5);
});

test('PokemonWizard : carte sans rareté', async () => {
  const { parseWizardSet } = await import('./official-jp.mjs');
  const html = '{\\"tcgplayer_product_id\\":8,\\"name\\":\\"Exeggcute - 001/103\\",\\"slug\\":\\"x\\",\\"card_number\\":\\"001\\",\\"rarity\\":null,\\"image_url\\":\\"https://i/e.jpg\\",\\"market_price\\":\\"0.2\\"}';
  const [c] = parseWizardSet(html);
  assert.equal(c.n, '001');
  assert.equal(c.rarity, undefined);
  assert.equal(c.market, 0.2);
});

test('attributs d\'une fiche officielle', async () => {
  const { parseOfficialAttrs, officialCardId } = await import('./official-jp.mjs');
  const html = `<div class="LeftBox"><h4>イラストレーター</h4><a href="/card-search/index.php?regulation_illust=1">Ken Sugimori</a></div>
    <div class="RightBox"> <div class="RightBox-inner"> <div class="TopInfo Text-fjalla"> <div class="tr"> <div class="td-l"> <span class="type">伝説</span> </div>
    <div class="td-r"> <span class="hp">HP</span> <span class="hp-num">150</span> <span class="hp-type">タイプ</span> <span class="icon-dark icon"></span><span class="icon-psychic icon"></span> </div></div></div> <h4><span class="icon-none icon"></span>かじる</h4>
    <h2 class="mt20">ワザ</h2> <h4><span class="icon-dark icon"></span>ロストクライシス</h4>`;
  assert.deepEqual(parseOfficialAttrs(html), { category: 'Pokémon', hp: '150', type: 'Obscurité / Psy', stage: 'LÉGENDE', illustrator: 'Ken Sugimori' });
  assert.equal(officialCardId('https://www.pokemon-card.com/assets/images/card_images/large/M6a/050713_P_PIKACHIXYUU.jpg'), 50713);
  assert.equal(officialCardId('https://images.scrydex.com/pokemon/m6a_ja-151/large'), undefined);
});
