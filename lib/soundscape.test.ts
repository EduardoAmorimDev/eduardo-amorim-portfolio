import assert from 'node:assert/strict'
import { test } from 'node:test'
import { entryShare, heroPresence, layerMix, pick } from './soundscape.ts'

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)

test('the hero is wholly present at rest and gone once scrolled past', () => {
  assert.equal(heroPresence(0, 900), 1)
  assert.equal(heroPresence(-450, 900), 0.5)
  assert.equal(heroPresence(-900, 900), 0)
  assert.equal(heroPresence(-2000, 900), 0)
  assert.equal(heroPresence(0, 0), 0)
})

test('a section enters from the bottom of the screen to its top', () => {
  assert.equal(entryShare(2000, 900), 0)
  assert.equal(entryShare(900, 900), 0)
  assert.equal(entryShare(450, 900), 0.5)
  assert.equal(entryShare(0, 900), 1)
  assert.equal(entryShare(-500, 900), 1)
  assert.equal(entryShare(0, 0), 0)
})

test('each place plays its own sound alone', () => {
  assert.deepEqual(layerMix(1, 0), { blackHole: 1, space: 0, planet: 0 })
  close(layerMix(0, 0).space, 1)
  close(layerMix(0, 0).blackHole, 0)
  close(layerMix(0, 1).planet, 1)
  close(layerMix(0, 1).space, 0)
})

test('a crossfade keeps the loudness: the power always sums to one', () => {
  for (const [hero, planet] of [
    [0.5, 0],
    [0.2, 0],
    [0, 0.5],
    [0, 0.8]
  ] as const) {
    const { blackHole, space, planet: earth } = layerMix(hero, planet)
    close(blackHole ** 2 + space ** 2 + earth ** 2, 1)
  }
})

test('a pick stays in the list even when the draw is at its edge', () => {
  assert.equal(
    pick(['a', 'b'], () => 0),
    'a'
  )
  assert.equal(
    pick(['a', 'b'], () => 0.9999999),
    'b'
  )
  assert.equal(
    pick(['a', 'b'], () => 1),
    'b'
  )
})
