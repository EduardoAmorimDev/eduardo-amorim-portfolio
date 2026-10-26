import assert from 'node:assert/strict'
import { test } from 'node:test'
import { holeShift, pointerShift, sheet } from './grid-motion.ts'

// why: the checklist's own numbers (C26, C28, C33).
const SPACING = 48
const TOP_TO_BOTTOM = 0.8
const POINTER_RADIUS = 180
const HOLE_RADIUS = 280
const HOLE_PULL = 48
const HORIZON = 48

const WIDTH = 1440
const HEIGHT = 900
const hole = { x: 720, y: 288, horizon: HORIZON, scale: 1 }
const pointer = { x: 300, y: 600, strength: 1 }

test('a 30° tilt: straight verticals, 48px apart at the middle, closer at the top', () => {
  const grid = sheet(WIDTH, HEIGHT)
  const gaps = (y: number) =>
    grid.verticals
      .slice(1)
      .map(
        (u, index) =>
          grid.verticalX(u, y) - grid.verticalX(grid.verticals[index] ?? u, y)
      )
  for (const gap of gaps(HEIGHT / 2)) assert.ok(Math.abs(gap - SPACING) < 1e-9)
  const top = gaps(0)[0] ?? NaN
  const bottom = gaps(HEIGHT)[0] ?? NaN
  assert.ok(
    top <= TOP_TO_BOTTOM * bottom,
    `${top} at the top, ${bottom} at the bottom`
  )
  // invariant: a straight line has the same slope between any two rows.
  for (const u of grid.verticals) {
    const slope = (a: number, b: number) =>
      (grid.verticalX(u, b) - grid.verticalX(u, a)) / (b - a)
    assert.ok(Math.abs(slope(0, 450) - slope(450, 900)) < 1e-9, `line ${u}`)
  }
  // invariant: the sheet covers the hero: lines past both sides at the top,
  // rows within a gap of both edges.
  assert.ok(grid.verticalX(grid.verticals[0] ?? 0, 0) <= 0)
  assert.ok(grid.verticalX(grid.verticals.at(-1) ?? 0, 0) >= WIDTH)
  assert.ok((grid.rows[0] ?? Infinity) <= SPACING)
  assert.ok((grid.rows.at(-1) ?? -Infinity) >= HEIGHT - SPACING)
})

test('no displacement beyond either well', () => {
  for (let angle = 0; angle < 2 * Math.PI; angle += 0.05)
    for (const extra of [1e-6, 1, 40, 400]) {
      const far = (body: { x: number; y: number }, radius: number) => ({
        x: body.x + (radius + extra) * Math.cos(angle),
        y: body.y + (radius + extra) * Math.sin(angle)
      })
      assert.deepEqual(pointerShift(far(pointer, POINTER_RADIUS), pointer), {
        x: 0,
        y: 0
      })
      assert.deepEqual(holeShift(far(hole, HOLE_RADIUS), hole), { x: 0, y: 0 })
    }
  assert.deepEqual(
    pointerShift({ x: 310, y: 610 }, { ...pointer, strength: 0 }),
    {
      x: 0,
      y: 0
    }
  )
})

test('the hole pulls towards its centre, by at most 48px, within 280px', () => {
  let strongest = 0
  for (let distance = 0.5; distance < HOLE_RADIUS; distance += 0.5)
    for (let angle = 0; angle < 2 * Math.PI; angle += 0.3) {
      const point = {
        x: hole.x + distance * Math.cos(angle),
        y: hole.y + distance * Math.sin(angle)
      }
      const shift = holeShift(point, hole)
      const size = Math.hypot(shift.x, shift.y)
      strongest = Math.max(strongest, size)
      assert.ok(size <= HOLE_PULL + 1e-9, `${size}px at ${distance}px`)
      assert.ok(size > 0, `the well reaches ${distance}px`)
      // invariant: towards the centre, and never past it.
      const after = { x: point.x + shift.x, y: point.y + shift.y }
      const before = Math.hypot(point.x - hole.x, point.y - hole.y)
      const now = Math.hypot(after.x - hole.x, after.y - hole.y)
      assert.ok(now < before, `closer at ${distance}px`)
      const along =
        (after.x - hole.x) * (point.x - hole.x) +
        (after.y - hole.y) * (point.y - hole.y)
      assert.ok(along >= -1e-9, `not past the centre at ${distance}px`)
    }
  assert.ok(strongest > HOLE_PULL - 1, `the well reaches ${strongest}px`)
})

test('the pointer pulls lines sideways towards it and sinks them, by at most 20px', () => {
  for (let dx = -179; dx <= 179; dx += 3)
    for (let dy = -179; dy <= 179; dy += 3) {
      if (Math.hypot(dx, dy) >= POINTER_RADIUS || dx === 0) continue
      const shift = pointerShift(
        { x: pointer.x + dx, y: pointer.y + dy },
        pointer
      )
      assert.ok(Math.sign(shift.x) === -Math.sign(dx), `towards at ${dx},${dy}`)
      assert.ok(Math.abs(shift.x) < Math.abs(dx), `not past it at ${dx},${dy}`)
      assert.ok(shift.y > 0, `down at ${dx},${dy}`)
      assert.ok(Math.hypot(shift.x, shift.y) <= 20, `${dx},${dy}`)
    }
})
