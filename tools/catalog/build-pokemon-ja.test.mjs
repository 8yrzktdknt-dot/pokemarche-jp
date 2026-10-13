import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCardList, parseSetList } from './build-pokemon-ja.mjs';

test('liste des extensions Limitless (extrait réel)', () => {
  const html = `<tr><th class="sub-heading" colspan=4>Mega</th></tr>
  <tr>
                <td><a href="/cards/jp/M6"><img class="set" alt="M6" src="https://s3.limitlesstcg.com/sets/jp/M6.png"> Storm Emeralda <span class="code annotation">M6</span></a></td>
                <td><a href="/cards/jp/M6">31 Jul 26</a></td>
                <td class="md-only"><a href="/cards/jp/M6">113 <span class="playability">16.81%</span></a></td>
  </tr>
  <tr><th class="sub-heading" colspan=4>Scarlet &amp; Violet</th></tr>
  <tr>
                <td><a href="/cards/jp/SV8"><img class="set" alt="SV8" src="https://s3.limitlesstcg.com/sets/jp/SV8.png"> Super Electric Breaker <span class="code annotation">SV8</span></a></td>
                <td><a href="/cards/jp/SV8">18 Oct 24</a></td>
                <td class="md-only"><a href="/cards/jp/SV8">138 <span class="playability">1%</span></a></td>
  </tr>`;
  const blocs = parseSetList(html);
  assert.deepEqual(blocs.map((b) => b.name), ['Mega', 'Scarlet & Violet']);
  assert.deepEqual(blocs[0].sets[0], { id: 'M6', code: 'M6', name: 'Storm Emeralda', logo: 'https://s3.limitlesstcg.com/sets/jp/M6.png', releaseDate: '2026-07-31', count: 113 });
  assert.equal(blocs[1].sets[0].releaseDate, '2024-10-18');
});

test('vue liste d\'une extension (extrait réel)', () => {
  const html = `<table><tr data-hover="https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpc/M6/M6_1_R_JP_XS.png">
                    <td><span class="card-set" data-tooltip="ストームエメラルダ"><img class="set" alt="M6" src="x">M6</span></td>
                    <td><a href="/cards/jp/M6/1">1</a></td>
                    <td><a href="/cards/jp/M6/1">ヘラクロス</a></td>
                    <td class="md-only">
                        <a href="/cards/jp/M6/1">
                                                    <span class="ptcg-symbol">G</span> Basic
                                                </a>
                    </td>
                    <td class="md-only"><a href="/cards/jp/M6/1"> Common </a></td>
                    <td></td>
                    <td></td>
                                    </tr></table>`;
  const { cards, setNameJa } = parseCardList(html, 'M6');
  assert.equal(setNameJa, 'ストームエメラルダ');
  assert.deepEqual(cards, [{ n: '1', name: 'ヘラクロス', rarity: 'Common', image: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpc/M6/M6_1_R_JP_SM.png' }]);
});
