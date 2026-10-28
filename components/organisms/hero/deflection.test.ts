import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CRITICAL_IMPACT,
  bendAt,
  deflection,
  einsteinRadius,
  innerImage,
  outerImage
} from './deflection.ts'

// why: the checklist's own numbers (black-hole-lensing C1–C3, C5, C7, C9,
// C11), in radians and, on screen, at a 96 px horizon with the black hole
// half risen, as under reduced motion.
const EXACT = [
  { impact: 1000, angle: 0.002 },
  { impact: 100, angle: 0.0203 },
  { impact: 10, angle: 0.2361 },
  { impact: 3, angle: 1.719 },
  { impact: CRITICAL_IMPACT * 1.001, angle: 6.51 }
]
const EXACT_SLACK = 0.01
const LIMIT_SLACK = 0.005
// why: Bozza (arXiv:gr-qc/0208075, eq. 50): b̄ = log[216(7 − 4√3)] − π.
const STRONG_FIELD = Math.log(216 * (7 - 4 * Math.sqrt(3))) - Math.PI
const HORIZON_PX = 96
const REST_LIFT = 0.5
const OUTER = [
  { distance: 96, image: 238 },
  { distance: 192, image: 298 },
  { distance: 476, image: 530 },
  { distance: 700, image: 737 }
]
const INNER = [
  { distance: 96, image: 160 },
  { distance: 192, image: 139 },
  { distance: 476, image: 111 }
]
const IMAGE_SLACK_PX = 4
const RINGS = [
  { lift: 0, radius: 1 },
  { lift: 0.25, radius: 1.61 },
  { lift: 0.5, radius: 2 },
  { lift: 0.75, radius: 2.25 },
  { lift: 1, radius: 2.42 }
]
const RING_SLACK = 0.03
const SHIFTS = [
  { distance: 96, shift: 142 },
  { distance: 192, shift: 106 },
  { distance: 476, shift: 54 },
  { distance: 700, shift: 37 }
]
const FARTHEST_PX = 900

const near = (actual: number, expected: number, slack: number) =>
  Math.abs(actual - expected) <= slack

/** Where a point `distance` px from the centre appears, in px, at rest. */
const outerAt = (distance: number) =>
  outerImage(distance / HORIZON_PX, bendAt(REST_LIFT)) * HORIZON_PX

/** Where it appears mirrored, in px, at rest. */
const innerAt = (distance: number) =>
  (innerImage(distance / HORIZON_PX, bendAt(REST_LIFT)) ?? NaN) * HORIZON_PX

test("the deflection is Schwarzschild's exact integral", () => {
  for (const { impact, angle } of EXACT) {
    const actual = deflection(impact)
    assert.ok(
      near(actual, angle, angle * EXACT_SLACK),
      `α(${impact}) = ${actual}, expected ${angle}`
    )
  }
})

test('the deflection meets the weak and strong field limits', () => {
  const far = 1e4
  const weak = deflection(far)
  assert.ok(near(weak, 2 / far, (2 / far) * LIMIT_SLACK), `α(${far}) = ${weak}`)
  const close = CRITICAL_IMPACT * 1.0001
  const strong = -Math.log(close / CRITICAL_IMPACT - 1) + STRONG_FIELD
  const actual = deflection(close)
  assert.ok(
    near(actual, strong, strong * LIMIT_SLACK),
    `α(b_c·1.0001) = ${actual}, expected ${strong}`
  )
})

test('a ray at or inside the critical impact is captured', () => {
  assert.equal(CRITICAL_IMPACT, (3 * Math.sqrt(3)) / 2)
  assert.equal(deflection(CRITICAL_IMPACT), Infinity)
  assert.equal(deflection(2), Infinity)
})

test('at rest a point appears farther out, on its own side', () => {
  for (const { distance, image } of OUTER) {
    const outer = outerAt(distance)
    assert.ok(
      near(outer, image, IMAGE_SLACK_PX),
      `d = ${distance}px appears at ${outer}px, expected ${image}`
    )
  }
})

test('at rest a point also appears mirrored inside the Einstein ring', () => {
  for (const { distance, image } of INNER) {
    const inner = innerAt(distance)
    assert.ok(
      near(inner, image, IMAGE_SLACK_PX),
      `d = ${distance}px appears mirrored at ${inner}px, expected ${image}`
    )
  }
})

test('the Einstein ring follows the lift as a thin lens does', () => {
  for (const { lift, radius } of RINGS) {
    const actual = einsteinRadius(bendAt(lift))
    assert.ok(
      near(actual, radius, radius * RING_SLACK),
      `ring at lift ${lift}: ${actual}, expected ${radius}`
    )
  }
})

test('the shift falls off smoothly with distance, with no edge', () => {
  for (const { distance, shift } of SHIFTS) {
    const actual = outerAt(distance) - distance
    assert.ok(
      near(actual, shift, IMAGE_SLACK_PX),
      `shift at ${distance}px: ${actual}, expected ${shift}`
    )
  }
  let previous = Infinity
  for (let distance = 1; distance <= FARTHEST_PX; distance++) {
    const shift = outerAt(distance) - distance
    assert.ok(shift < previous, `the shift grows at ${distance}px`)
    previous = shift
  }
})
