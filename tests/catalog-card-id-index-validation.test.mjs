import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCatalogCards } from '../dist/index.js';

test('catalog comparison rejects sparse and inherited card ID slots before resolution', () => {
  const ids = ['card-a', 'card-b'];
  delete ids[1];
  assert.throws(() => compareCatalogCards(undefined, ids, [], 2026), /cardIds must contain non-empty card IDs/);
  const inherited = Object.create(Array.prototype);
  inherited[1] = 'inherited-card';
  Object.setPrototypeOf(ids, inherited);
  assert.throws(() => compareCatalogCards(undefined, ids, [], 2026), /cardIds must contain non-empty card IDs/);
});

test('catalog comparison does not execute caller-controlled card ID map', () => {
  const ids = ['card-a', 'card-b'];
  let invoked = false;
  ids.map = () => { invoked = true; throw new Error('caller map invoked'); };
  assert.throws(() => compareCatalogCards(undefined, ids, [], 2026), error =>
    error instanceof Error && error.message !== 'caller map invoked');
  assert.equal(invoked, false);
});

test('catalog comparison rejects invalid card ID before catalog access', () => {
  assert.throws(() => compareCatalogCards(undefined, ['card-a', ''], [], 2026), /cardIds must contain non-empty card IDs/);
});
