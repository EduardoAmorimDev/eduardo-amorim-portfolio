import assert from 'node:assert/strict'
import { test } from 'node:test'
import { diskTurnSeconds, horizonRadius, DISK } from './black-hole.ts'

// why: the checklist's own numbers (C52, C59).
const HORIZON_PX = 96
const MAX_TURN_S = 20

/**
 * How much the glass icons shrink, as R3F sizes them: the view's width at
 * the origin, seen from the hero camera (0, 1, 7) with a 40° fov, over the
 * 6 units the layout fits in; never above 1.
 */
const iconFit = (width: number, height: number) => {
  const viewWidth =
    (width / height) * 2 * Math.hypot(0, 1, 7) * Math.tan((20 * Math.PI) / 180)
  return Math.min(1, viewWidth / 6)
}

test('the horizon is 96px at 1440x900 and shrinks with the icons', () => {
  assert.ok(Math.abs(2 * horizonRadius(1440, 900) - HORIZON_PX) < 1e-9)
  // invariant: an icon's size on screen is its world size times the fit,
  // and world units grow with the view's height in px.
  for (const [width, height] of [
    [1024, 768],
    [768, 1024],
    [375, 667],
    [1920, 1080]
  ] as const) {
    const expected = HORIZON_PX * iconFit(width, height) * (height / 900)
    assert.ok(
      Math.abs(2 * horizonRadius(width, height) - expected) < 1e-9,
      `${width}×${height}`
    )
  }
  assert.ok(2 * horizonRadius(375, 667) < HORIZON_PX / 2, 'a phone shrinks it')
})

test('the disk turns at least once every 20 s at every radius', () => {
  for (let radius = DISK.inner; radius <= DISK.outer; radius += 0.05)
    assert.ok(diskTurnSeconds(radius) <= MAX_TURN_S, `at ${radius}`)
  for (const radius of [0, 1, 10])
    assert.ok(diskTurnSeconds(radius) <= MAX_TURN_S, `at ${radius}`)
})
