/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DIM, decodeIndex, encodeIndex, isConfident, normalizeVec, topMatches, type IndexFile } from './visualIndex.ts';

const rand = (seed: number) => {
  const v = new Float32Array(DIM);
  for (let i = 0; i < DIM; i++) v[i] = Math.sin(seed * 997 + i * 13.37);
  return normalizeVec(v);
};

test('aller-retour encodage / décodage et recherche du plus proche', () => {
  const items = [0, 1, 2].map((i) => ({ id: `SV8-00${i}`, name: `Carte ${i}`, localId: `00${i}`, image: '' }));
  const vecs = new Float32Array(3 * DIM);
  items.forEach((_, i) => vecs.set(rand(i + 1), i * DIM));
  const ix = decodeIndex(encodeIndex(items, vecs, '2026-10-13'))!;
  assert.equal(ix.items.length, 3);
  const top = topMatches(rand(2), ix, 2);
  assert.equal(top[0].item.id, 'SV8-001');
  assert.ok(top[0].score > 0.99);
  assert.ok(isConfident(top));
});

test("l'index de la première version (card-index.json) se lit toujours", () => {
  const o = JSON.parse(readFileSync(new URL('../../../../card-index.json', import.meta.url), 'utf8')) as IndexFile;
  const ix = decodeIndex(o)!;
  assert.ok(ix.items.length > 1000);
  // Une carte de l'index retrouve sa propre empreinte en premier.
  const q = ix.vecs.slice(42 * DIM, 43 * DIM);
  assert.equal(topMatches(q, ix, 1)[0].item.id, ix.items[42].id);
});
