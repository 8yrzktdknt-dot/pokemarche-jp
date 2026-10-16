import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectUrls, large } from './warm-images.mjs';

test('collectUrls relève petite et grande taille', () => {
  const u = 'https://wsrv.nl/?url=en.onepiece-cardgame.com%2Fimages%2Fcardlist%2Fcard%2FOP01-001.png&w=360&output=webp';
  const set = collectUrls(JSON.stringify({ rows: [[1, u], [2, u]] }));
  assert.deepEqual([...set], [u, large(u)]);
  assert.match(large(u), /&w=900&/);
});

test('collectUrls relève les visuels Riftbound réduits', () => {
  const u = 'https://cmsassets.rgpub.io/sanity/images/x/a-744x1039.png?accountingTag=RB&w=360&fm=webp';
  const set = collectUrls(JSON.stringify([{ image: u }, { image: 'https://cmsassets.rgpub.io/sanity/images/x/logo.png' }]));
  assert.deepEqual([...set], [u, u.replace('w=360', 'w=900')]);
});
