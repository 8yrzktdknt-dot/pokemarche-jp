import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAlerts } from './alerts.mjs';

const card = (id) => ({ game: 'pokemon', lang: 'fr', id, name: id, number: '1', prices: [{ value: 0, currency: 'EUR' }] });
const prices = { a: 9, b: 20, c: 4 };
const priceOf = (c) => (prices[c.id] === undefined ? undefined : { value: prices[c.id], currency: 'EUR' });
const id = (v) => v;
const wl = [{ card: card('a'), target: 10, currency: 'EUR' }, { card: card('b'), target: 10, currency: 'EUR' }, { card: card('c'), target: 5, currency: 'EUR' }];
const targets = [{ user: 'u1', endpoint: 'e1', wishlist: wl }, { user: 'u1', endpoint: 'e2', wishlist: wl }, { user: 'u2', endpoint: 'e3', wishlist: [] }];

test('une alerte par carte passée sous le prix cible, sur chaque appareil', () => {
  const r = computeAlerts(targets, priceOf, id, {});
  assert.deepEqual(r.alerts.map((a) => [a.target.endpoint, a.deals.map((d) => d.card.id)]), [['e1', ['a', 'c']], ['e2', ['a', 'c']]]);
  assert.deepEqual(r.state, { 'u1|pokemon:fr:a': 9, 'u1|pokemon:fr:c': 4 });
  // Passage suivant, rien de neuf : pas d'alerte.
  assert.equal(computeAlerts(targets, priceOf, id, r.state).alerts.length, 0);
  // Nouvelle baisse de 10 % : nouvelle alerte ; carte repassée au-dessus : oubliée (signalée de nouveau plus tard).
  prices.a = 8; prices.c = 6;
  const r2 = computeAlerts(targets, priceOf, id, r.state);
  assert.deepEqual(r2.alerts[0].deals.map((d) => d.card.id), ['a']);
  assert.deepEqual(r2.state, { 'u1|pokemon:fr:a': 8 });
});
