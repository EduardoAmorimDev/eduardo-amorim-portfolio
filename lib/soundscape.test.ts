import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  entryShare,
  heroPresence,
  keyClick,
  layerMix,
  phrase,
  pick,
  typingRun,
  VOWELS
} from './soundscape.ts'

// why: a fixed sequence keeps every run on the same draws.
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32
  return seed / 2 ** 32
}
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

test('a phrase is a few short vowels, falling, then a pause', () => {
  const random = seeded(3)
  for (let run = 0; run < 50; run++) {
    const { syllables, pause } = phrase(random, 150)
    assert.ok(syllables.length >= 3 && syllables.length <= 10)
    assert.ok(pause >= 0.6 && pause <= 2.8)
    for (const { seconds, formants, pitch } of syllables) {
      assert.ok(seconds >= 0.12 && seconds <= 0.26)
      assert.ok(VOWELS.some(vowel => vowel === formants))
      assert.ok(pitch > 100 && pitch < 175)
    }
  }
})

test('typing comes in runs of keys, then a pause', () => {
  const random = seeded(5)
  for (let run = 0; run < 50; run++) {
    const { gaps, pause } = typingRun(random)
    assert.ok(gaps.length >= 4 && gaps.length <= 20)
    assert.ok(gaps.every(gap => gap >= 0.07 && gap <= 0.2))
    assert.ok(pause >= 1.5 && pause <= 6)
  }
})

test('a key click is loud at the strike and dies out', () => {
  const click = keyClick(1200, seeded(9))
  const level = (from: number, to: number) =>
    click.slice(from, to).reduce((sum, x) => sum + Math.abs(x), 0)
  assert.equal(click.length, 1200)
  assert.ok(click.every(sample => sample >= -1 && sample <= 1))
  assert.ok(level(0, 100) > 20 * level(1100, 1200))
})
