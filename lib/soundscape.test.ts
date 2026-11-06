import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  breath,
  entryShare,
  heroPresence,
  layerMix,
  murmurEnvelope,
  swing
} from './soundscape.ts'

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

test('a breath rises, crests and falls within its bounds', () => {
  for (const draw of [0, 0.5, 0.9999]) {
    const { rise, crest, fall } = breath(() => draw)
    assert.ok(rise >= 3 && rise <= 4.5)
    assert.ok(crest >= 0.8 && crest <= 1)
    assert.ok(fall >= 4 && fall <= 6)
  }
  const uneven = [0.1, 0.7].map(draw => {
    const { rise, fall } = breath(() => draw)
    return rise + fall
  })
  assert.notEqual(uneven[0], uneven[1])
})

// why: a fixed sequence keeps every run on the same draws.
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32
  return seed / 2 ** 32
}

test('a murmur is syllables in phrases, starting and ending at rest', () => {
  const rate = 3000
  const seconds = 20
  const levels = murmurEnvelope(rate * seconds, rate, seeded(11))
  assert.ok(levels.every(level => level >= 0 && level <= 1))
  assert.equal(levels[0], 0)
  assert.equal(levels[levels.length - 1], 0)
  let onsets = 0
  for (let at = 1; at < levels.length; at++)
    if ((levels[at - 1] ?? 0) === 0 && (levels[at] ?? 0) > 0) onsets++
  const quiet = levels.filter(level => level === 0).length / levels.length
  // invariant: speech runs 3 to 6 syllables a second, pauses between phrases.
  assert.ok(onsets / seconds > 3 && onsets / seconds < 8, `${onsets}`)
  assert.ok(quiet > 0.1 && quiet < 0.5, `${quiet}`)
})

test('a swing of the blade ends before the next one begins', () => {
  for (const draw of [0, 0.5, 0.9999]) {
    const { rise, fall, next } = swing(() => draw)
    assert.ok(rise >= 0.6 && rise <= 1)
    assert.ok(fall >= 1.2 && fall <= 1.8)
    assert.ok(next >= 3.5 && next <= 6)
    assert.ok(rise + fall < next)
  }
})
