/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { neighbors, setBrowseList } from './browse.ts';
import type { Card } from './types.ts';

const card = (id: string): Card => ({ game: 'pokemon', id, lang: 'fr', name: id, number: id, prices: [] });

test('carte précédente et suivante dans la liste ouverte', () => {
  setBrowseList([card('a'), card('b'), card('c')]);
  const n = neighbors({ game: 'pokemon', id: 'b', lang: 'fr' });
  assert.equal(n.prev?.id, 'a');
  assert.equal(n.next?.id, 'c');
  assert.equal(n.index, 1);
  assert.equal(n.total, 3);
  assert.equal(neighbors({ game: 'pokemon', id: 'a', lang: 'fr' }).prev, undefined);
  assert.equal(neighbors({ game: 'pokemon', id: 'z', lang: 'fr' }).total, 0);
});

test('variantes séparées : chaque variante est une étape du parcours', () => {
  const base = { game: 'pokemon', lang: 'fr', name: 'x', number: '1', prices: [] } as const;
  setBrowseList([{ ...base, id: 'a', variant: 'normal' }, { ...base, id: 'a', variant: 'reverse' }, { ...base, id: 'b' }]);
  const n = neighbors({ game: 'pokemon', id: 'a', lang: 'fr', variant: 'reverse' });
  assert.equal(n.prev?.variant, 'normal');
  assert.equal(n.next?.id, 'b');
  assert.equal(neighbors({ game: 'pokemon', id: 'a', lang: 'fr' }).index, 0);
});
