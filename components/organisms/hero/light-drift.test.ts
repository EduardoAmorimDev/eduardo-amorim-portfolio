import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lightDrift } from './light-drift.ts'

// why: world units per CSS px at the light's depth (8.5 units from a 40° fov
// camera) on a 900 px tall view; the checklist's bounds are in px (C16).
const UNITS_PER_PX = (2 * 8.5 * Math.tan((20 * Math.PI) / 180)) / 900
const MAX_REACH_PX = 40
const MIN_MOVE_PX = 2

const samples = Array.from({ length: 4000 }, (_, index) => index * 0.025)
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

test('the drift never strays more than 40px from rest', () => {
  for (const time of samples) {
    const reach = Math.hypot(lightDrift(time).x, lightDrift(time).y)
    assert.ok(reach / UNITS_PER_PX <= MAX_REACH_PX, `at ${time} s`)
  }
})

test('any 2 s of drift moves the light at least 2px', () => {
  for (const time of samples) {
    const moved = distance(lightDrift(time), lightDrift(time + 2))
    assert.ok(moved / UNITS_PER_PX >= MIN_MOVE_PX, `from ${time} s`)
  }
})

test('the drift starts at rest', () => {
  assert.deepEqual(lightDrift(0), { x: 0, y: 0 })
})
