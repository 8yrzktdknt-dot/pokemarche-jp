/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScanStabilizer } from './stabilizer.ts';

test('confirme après deux lectures identiques consécutives', () => {
  const st = new ScanStabilizer(2, 4000);
  assert.equal(st.push('OP05-119', 0), null);
  assert.equal(st.push('OP05-119', 100), 'OP05-119');
});

test('une lecture différente remet le compteur à zéro', () => {
  const st = new ScanStabilizer(2, 4000);
  st.push('OP05-119', 0);
  assert.equal(st.push('OP05-118', 100), null);
  assert.equal(st.push('OP05-118', 200), 'OP05-118');
});

test('la même carte est ignorée pendant le délai, puis acceptée à nouveau', () => {
  const st = new ScanStabilizer(2, 4000);
  st.push('A', 0); st.push('A', 1);
  st.push('A', 1000);
  assert.equal(st.push('A', 1500), null);
  // Carte restée sous la caméra : reconnue à nouveau dès la fin du délai.
  assert.equal(st.push('A', 5000), 'A');
});
