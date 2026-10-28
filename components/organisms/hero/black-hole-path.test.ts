import assert from 'node:assert/strict'
import { test } from 'node:test'
import { horizonAt, restPoint } from './black-hole.ts'
import { createWander, holeBox } from './black-hole-path.ts'

// why: the checklists' own numbers (cosmos C53–C57; black-hole-scale C5,
// C19–C21), fixed here so a change to the module's constants cannot move
// the bar the tests hold it to.
const MIN_SPEED = 10
const MAX_SPEED = 30
const MIN_LEG_S = 4
const MAX_LEG_S = 10
const MAX_FRAME_PX = 4
// why: a change of direction a viewer can see, about 3°.
const MIN_TURN = 0.05
const MARGIN = 0.1
// why: the sphere and its arcs reach 1.65 horizon radii; fully risen, the
// black hole looks 1.12 times its size.
const ARCS = 1.65
const HIGHEST = 1.12
const FRAME_S = 1 / 60
const MINUTES = 10

const SIZES = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 375, height: 667 }
]
const SEEDS = [1, 7, 42, 1234, 99991]

/** A small seeded generator, so every run draws the same paths. */
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

const wanderFor = (seed: number, size: { width: number; height: number }) => {
  const box = holeBox(size.width, size.height)
  return createWander(seeded(seed), box, restPoint(size.width, size.height))
}

const cases = SIZES.flatMap(size => SEEDS.map(seed => ({ size, seed })))

test('the speed stays within 10 to 30px/s and never stops', () => {
  for (const { size, seed } of cases) {
    const wander = wanderFor(seed, size)
    let previous = wander.position
    for (let frame = 0; frame < (MINUTES * 60) / FRAME_S; frame++) {
      const now = wander.step(FRAME_S)
      const speed = Math.hypot(now.x - previous.x, now.y - previous.y) / FRAME_S
      const label = `${size.width}×${size.height} seed ${seed} frame ${frame}`
      assert.ok(wander.speed >= MIN_SPEED && wander.speed <= MAX_SPEED, label)
      // why: a frame's chord is a hair shorter than the arc it cuts, and a
      // frame crossing a turn mixes two legs' speeds.
      assert.ok(speed >= MIN_SPEED * 0.97, `${label}: ${speed} px/s`)
      assert.ok(speed <= MAX_SPEED + 1e-6, `${label}: ${speed} px/s`)
      previous = now
    }
  }
})

test('the path turns every 4 to 10 s', () => {
  for (const { size, seed } of cases) {
    const wander = wanderFor(seed, size)
    let leg = wander.leg
    let since = 0
    let legs = 0
    const headings: number[] = []
    let previous = wander.position
    for (let frame = 0; frame < (MINUTES * 60) / FRAME_S; frame++) {
      const now = wander.step(FRAME_S)
      since += FRAME_S
      if (wander.leg !== leg) {
        const label = `${size.width}×${size.height} seed ${seed} leg ${leg}`
        assert.ok(since >= MIN_LEG_S - FRAME_S, `${label}: ${since} s`)
        assert.ok(since <= MAX_LEG_S + FRAME_S, `${label}: ${since} s`)
        headings.push(Math.atan2(now.y - previous.y, now.x - previous.x))
        leg = wander.leg
        since = 0
        legs++
      }
      previous = now
    }
    assert.ok(legs >= (MINUTES * 60) / MAX_LEG_S - 1, `${legs} legs`)
    // invariant: a turn at each leg, so the heading at one turn differs from
    // the heading at the next by a visible angle.
    for (let index = 1; index < headings.length; index++) {
      const turn = Math.abs(
        Math.atan2(
          Math.sin((headings[index] ?? 0) - (headings[index - 1] ?? 0)),
          Math.cos((headings[index] ?? 0) - (headings[index - 1] ?? 0))
        )
      )
      assert.ok(turn >= MIN_TURN, `leg ${index} turns ${turn} rad`)
    }
  }
})

test('no frame moves it more than 4px', () => {
  for (const { size, seed } of cases) {
    const wander = wanderFor(seed, size)
    const draw = seeded(seed + 1)
    let previous = wander.position
    for (let frame = 0; frame < 20_000; frame++) {
      // why: frames from 4 ms up to a half-second hitch.
      const now = wander.step(0.004 + draw() * 0.5)
      const moved = Math.hypot(now.x - previous.x, now.y - previous.y)
      assert.ok(moved <= MAX_FRAME_PX + 1e-9, `frame ${frame}: ${moved}px`)
      previous = now
    }
  }
})

test('the sphere and arcs stay 10% inside the hero at any lift', () => {
  for (const { size, seed } of cases) {
    const wander = wanderFor(seed, size)
    for (let frame = 0; frame < (MINUTES * 60) / FRAME_S; frame++) {
      const { x, y } = wander.step(FRAME_S)
      // invariant: largest when fully risen, at the depth of this height.
      const reach = ARCS * HIGHEST * horizonAt(size.width, size.height, y)
      const label = `${size.width}×${size.height} seed ${seed}: ${x}, ${y}`
      assert.ok(x - reach >= size.width * MARGIN - 1e-9, label)
      assert.ok(x + reach <= size.width * (1 - MARGIN) + 1e-9, label)
      assert.ok(y - reach >= size.height * MARGIN - 1e-9, label)
      assert.ok(y + reach <= size.height * (1 - MARGIN) + 1e-9, label)
    }
  }
})

test('every load draws a new path', () => {
  const size = SIZES[0] ?? { width: 1440, height: 900 }
  const after = (random: () => number) => {
    const box = holeBox(size.width, size.height)
    const wander = createWander(random, box, restPoint(size.width, size.height))
    for (let frame = 0; frame < 30 / FRAME_S; frame++) wander.step(FRAME_S)
    return wander.position
  }
  const a = after(seeded(3))
  const b = after(seeded(4))
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 20, 'two draws, two paths')
  assert.deepEqual(after(seeded(3)), a, 'one draw, one path')
})
