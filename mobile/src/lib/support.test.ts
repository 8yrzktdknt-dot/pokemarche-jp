/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mailtoLink, reportFields } from './support.ts';

test('message au support : sujet, carte, adresse de réponse', () => {
  const f = reportFields({ topic: 'Visuel', message: ' Mauvaise image ', email: 'a@b.fr', card: { game: 'pokemon', id: 'M6a-001', lang: 'ja', name: 'タマタマ', number: '001' }, version: '0.0.17' });
  assert.equal(f._subject, '[TCGMarket] Visuel · タマタマ (ja)');
  assert.equal(f.Message, 'Mauvaise image');
  assert.equal(f._replyto, 'a@b.fr');
  assert.equal(f.Identifiant, 'pokemon / ja / M6a-001');
  assert.match(mailtoLink({ topic: 'Autre', message: 'x' }), /^mailto:support\.tcgmarket@gmail\.com\?subject=/);
});
