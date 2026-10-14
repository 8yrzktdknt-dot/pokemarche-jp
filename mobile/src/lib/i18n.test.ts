/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deviceLang, translate } from './i18n.ts';

test('variables et pluriel', () => {
  assert.equal(translate('fr', 'common.cards', { n: 1 }), '1 carte');
  assert.equal(translate('fr', 'common.cards', { n: 3 }), '3 cartes');
  assert.equal(translate('en', 'common.cards', { n: 3 }), '3 cards');
  assert.equal(translate('en', 'scan.added', { name: 'Pikachu' }), 'Pikachu added — next card!');
});

test('langue de l\'appareil : variantes du chinois, langue non prise en charge → anglais', () => {
  assert.equal(deviceLang(['fr-FR', 'en']), 'fr');
  assert.equal(deviceLang(['zh-Hant-TW']), 'zh-tw');
  assert.equal(deviceLang(['zh-HK']), 'zh-tw');
  assert.equal(deviceLang(['zh-Hans-CN']), 'zh-cn');
  assert.equal(deviceLang(['pl-PL', 'de-DE']), 'de');
  assert.equal(deviceLang(['pl-PL']), 'en');
});

test('nouvelles langues, repli sur l\'anglais', () => {
  assert.equal(translate('ja', 'tab.search'), '検索');
  assert.equal(translate('de', 'common.cards', { n: 2 }), '2 Karten');
  assert.equal(translate('ko', 'acc.version', { v: '1.0' }), '버전 1.0');
});

test('attributs Pokémon dans la langue de l\'app, quelle que soit la langue de la source', async () => {
  const { localizeAttr } = await import('./attrValues.ts');
  assert.equal(localizeAttr('type', 'Plante / Psy', 'en'), 'Grass / Psychic');
  assert.equal(localizeAttr('type', 'Grass', 'ja'), '草');
  assert.equal(localizeAttr('stage', 'Stage1', 'fr'), 'Niveau 1');
  assert.equal(localizeAttr('stage', 'De base', 'de'), 'Basis');
  assert.equal(localizeAttr('stage', 'VMAX', 'ko'), 'VMAX');
  assert.equal(localizeAttr('category', 'Dresseur · Objet', 'en'), 'Trainer · Item');
  assert.equal(localizeAttr('category', 'Énergie · Basic Energy', 'fr'), 'Énergie de base');
  assert.equal(localizeAttr('category', 'Trainer · Supporter', 'zh-tw'), '訓練家 · 支援者');
  assert.equal(localizeAttr('type', 'Inconnu', 'en'), 'Inconnu');
});
