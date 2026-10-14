import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cnAttrs, cnBloc, parseTwDetail, parseTwExpansions, twCard } from './build-pokemon-zh.mjs';

test('zh-tw : extensions de la page de recherche', () => {
  const page = `<li class="expansion"> <a class="expansionLink" href="/tw/card-search/list/?expansionCodes=M6a"> <div class="leftColumn"><img src="x.png"></div>
    <div class="rightColumn"> <div class="seriesBlock"> <span class="series">超級進化</span> </div> <div class="titleBlock"> <h3 class="expansionTitle"> 擴充包「30th CELEBRATION」 </h3>
    <label class="releaseDateLabel">發售日</label> <time class="relaseDate" datetime="09-16-2026"> <span>09-16-2026</span> </time> </div> </div> </a> </li>`;
  assert.deepEqual(parseTwExpansions(page), [{ code: 'M6a', series: '超級進化', title: '擴充包「30th CELEBRATION」', date: '2026-09-16' }]);
});

test('zh-tw : fiche d\'une carte', () => {
  const page = `<h1 class="pageHeader cardDetail"> <span class="evolveMarker"> 基礎 </span> 蛋蛋 </h1>
    <p class="mainInfomation"> <span class="hitPoint">HP</span> <span class="number">60</span> <span class="slash">/</span> <span class="type">屬性</span> <img src="https://asia.pokemon-card.com/various_images/energy/Grass.png"> </p>
    <div class="skill"><img src="https://asia.pokemon-card.com/various_images/energy/Colorless.png"></div>
    <span class="alpha"> J </span> <span class="collectorNumber"> 001/103 </span>
    <h3>No.102 蛋寶可夢</h3>
    <div class="illustrator"> <h3>繪師</h3> <a href="/tw/card-search/list/?illustratorName=Nelnal">Nelnal</a> </div>`;
  assert.deepEqual(parseTwDetail(page), { n: '蛋蛋', no: '001/103', hp: '60', t: ['Grass'], st: '基礎', il: 'Nelnal', r: 'J', dex: '102' });
});

test('zh-tw : carte reliée à la carte japonaise (noms, rareté, Cardmarket)', () => {
  const jp = { id: 'M6a-001', localId: '001', nameEn: 'Exeggcute', nameFr: 'Noeunoeuf', rarity: 'C', cmPath: '30th-Celebration/Exeggcute-30C001', attrs: { type: 'Plante', stage: 'De base' }, cm: { id: 907765, avg7: 0.05 } };
  const c = twCard('M6a', 19913, { n: '蛋蛋', no: '001/103', hp: '60', t: ['Grass'], st: '基礎', il: 'Nelnal', r: 'J' }, jp);
  assert.equal(c.id, 'M6a-001');
  assert.equal(c.name, '蛋蛋');
  assert.equal(c.nameFr, 'Noeunoeuf');
  assert.equal(c.image, 'https://asia.pokemon-card.com/tw/card-img/tw00019913.png');
  assert.equal(c.cm.id, 907765);
  assert.equal(c.cmPath, undefined);
  assert.equal(c.attrs.hp, '60');
  assert.equal(c.attrs.illustrator, 'Nelnal');
});

test('zh-cn : attributs et blocs', () => {
  assert.deepEqual(cnAttrs({ ty: 'Pokemon' }, { hp: 320, e: 'G', st: 'Stage 2', il: 'PLANETA Mochizuki', rm: 'G' }),
    { illustrator: 'PLANETA Mochizuki', type: 'Plante', hp: '320', stage: 'Niveau 2', category: 'Pokémon', regulation: 'G' });
  assert.equal(cnBloc('CSV1C').id, 'sv');
  assert.equal(cnBloc('CS4aC').id, 'swsh');
  assert.equal(cnBloc('CSM2aC').id, 'sm');
  assert.equal(cnBloc('30thC').id, '30th');
});
