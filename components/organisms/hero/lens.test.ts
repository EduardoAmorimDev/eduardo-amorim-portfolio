import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LENS, constellation, createStars, driftStars } from './lens.ts'

// why: the checklist's own numbers (C40).
const RADIUS = 120
const MIN_STARS = 6
const MAX_STARS = 10
const MIN_SIZE = 2
const MAX_SIZE = 3
const MAX_LINE = 1
const MAX_DRIFT = 10

/** A small seeded generator, so every run draws the same stars. */
const seeded = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

test('stars are 2 to 3px, lines 1px, and each drifts at most 10px/s inside the circle', () => {
  assert.equal(LENS.radius, RADIUS)
  assert.ok(LENS.lineWidth <= MAX_LINE)
  for (let seed = 1; seed <= 40; seed++) {
    const stars = createStars(seeded(seed))
    assert.ok(stars.length >= MIN_STARS && stars.length <= MAX_STARS)
    for (const star of stars)
      assert.ok(star.size >= MIN_SIZE && star.size <= MAX_SIZE, `${star.size}`)
    const frame = 1 / 60
    for (let step = 0; step < 60 * 60; step++) {
      const before = stars.map(({ x, y }) => ({ x, y }))
      driftStars(stars, frame)
      stars.forEach((star, index) => {
        const was = before[index] ?? star
        const speed = Math.hypot(star.x - was.x, star.y - was.y) / frame
        assert.ok(speed <= MAX_DRIFT + 1e-9, `${speed}px/s`)
        assert.ok(Math.hypot(star.x, star.y) + star.size / 2 < RADIUS)
      })
    }
    for (const [a, b] of constellation(stars)) {
      assert.ok(a !== b && stars[a] && stars[b], `pair ${a}-${b}`)
    }
  }
})
