import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectUrls, large } from './warm-images.mjs';

test('collectUrls relève petite et grande taille', () => {
  const u = 'https://wsrv.nl/?url=en.onepiece-cardgame.com%2Fimages%2Fcardlist%2Fcard%2FOP01-001.png&w=360&output=webp';
  const set = collectUrls(JSON.stringify({ rows: [[1, u], [2, u]] }));
  assert.deepEqual([...set], [u, large(u)]);
  assert.match(large(u), /&w=900&/);
});
