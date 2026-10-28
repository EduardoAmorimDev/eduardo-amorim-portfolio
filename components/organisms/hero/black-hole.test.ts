import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  diskPose,
  diskTurnSeconds,
  holeLift,
  horizonAt,
  liftScale,
  wellStrength,
  horizonRadius,
  DISK
} from './black-hole.ts'
import { GRID, sheet } from './grid-motion.ts'

// why: the checklists' own numbers (cosmos C52, C59; gravity C10, C11).
const HORIZON_PX = 192
const MAX_TURN_S = 20
const REST_SHARE = 0.32
const SIZE_SLACK = 0.1
const TILT = { min: 12, max: 18, rest: 15 }
const TILT_PERIOD = { min: 14, max: 20 }
const ROCK = 3
const ROCK_PERIOD = { min: 17, max: 25 }
const ANGLE_SLACK = 0.1
const degrees = (radians: number) => (radians * 180) / Math.PI

/**
 * The swing of one of the pose's angles over `seconds`, sampled finely:
 * its lowest and highest values and its period, the shortest lag after
 * which the whole sampled curve repeats.
 */
const swing = (angle: (seconds: number) => number, seconds: number) => {
  const step = 0.01
  const values: number[] = []
  for (let t = 0; t <= seconds; t += step) values.push(degrees(angle(t)))
  let period = NaN
  for (let lag = Math.round(1 / step); lag < values.length / 2; lag++) {
    const repeats = values
      .slice(0, values.length - lag)
      .every(
        (value, index) => Math.abs(value - (values[index + lag] ?? NaN)) < 1e-3
      )
    if (repeats) {
      period = lag * step
      break
    }
  }
  return { low: Math.min(...values), high: Math.max(...values), period }
}

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

test("the horizon follows the sheet's scale", () => {
  for (const [width, height] of [
    [1440, 900],
    [375, 667],
    [1024, 768]
  ] as const) {
    const grid = sheet(width, height)
    // invariant: a cell's width at screen y, read from two neighbouring
    // verticals of the drawn sheet.
    const cell = (y: number) => {
      const middle = Math.floor(grid.verticals.length / 2)
      const a = grid.verticals[middle - 1] ?? 0
      const b = grid.verticals[middle] ?? 0
      return grid.verticalX(b, y) - grid.verticalX(a, y)
    }
    const rest = height * REST_SHARE
    const atRest = 2 * horizonAt(width, height, rest)
    assert.ok(Math.abs(atRest - 2 * horizonRadius(width, height)) < 1e-9)
    for (let y = 0; y <= height; y += height / 20) {
      const expected = (atRest * cell(y)) / cell(rest)
      const diameter = 2 * horizonAt(width, height, y)
      assert.ok(
        Math.abs(diameter - expected) <= expected * SIZE_SLACK,
        `${width}x${height} at ${y}: ${diameter} vs ${expected}`
      )
    }
    assert.ok(cell(height / 2) === GRID.spacing)
  }
})

test("the disk's tilt swings between 12 and 18 degrees every 14 to 20 s", () => {
  const { low, high, period } = swing(t => diskPose(t, false).tilt, 120)
  assert.ok(Math.abs(low - TILT.min) <= ANGLE_SLACK, `lowest ${low}°`)
  assert.ok(Math.abs(high - TILT.max) <= ANGLE_SLACK, `highest ${high}°`)
  assert.ok(
    period >= TILT_PERIOD.min && period <= TILT_PERIOD.max,
    `period ${period} s`
  )
})

test("the disk's axis rocks 3 degrees on its own cycle", () => {
  const rock = swing(t => diskPose(t, false).roll, 120)
  const tilt = swing(t => diskPose(t, false).tilt, 120)
  assert.ok(Math.abs(rock.low + ROCK) <= ANGLE_SLACK, `lowest ${rock.low}°`)
  assert.ok(Math.abs(rock.high - ROCK) <= ANGLE_SLACK, `highest ${rock.high}°`)
  assert.ok(
    rock.period >= ROCK_PERIOD.min && rock.period <= ROCK_PERIOD.max,
    `period ${rock.period} s`
  )
  assert.ok(Math.abs(rock.period - tilt.period) > 0.5, 'its own cycle')
})

test('a still disk rests at 15 degrees, square', () => {
  for (let t = 0; t <= 60; t += 0.37) {
    const pose = diskPose(t, true)
    assert.ok(Math.abs(degrees(pose.tilt) - TILT.rest) < 1e-9, `tilt at ${t}`)
    assert.equal(pose.roll, 0, `roll at ${t}`)
  }
})

// why: the checklist's own numbers (black-hole-scale C11, C12, C14, C17).
const LIFT_PERIOD = { min: 10, max: 14 }
const DISK_PERIODS = [16, 21]
const SIZE = { low: 0.88, high: 1.12 }
const STRENGTH = { low: 1, high: 0.5 }

test('the lift rises from 0 to 1 and back every 10 to 14 s', () => {
  const step = 0.01
  const values: number[] = []
  for (let t = 0; t <= 120; t += step) values.push(holeLift(t, false))
  assert.ok(Math.abs(Math.min(...values)) < 1e-6, 'reaches 0')
  assert.ok(Math.abs(Math.max(...values) - 1) < 1e-6, 'reaches 1')
  let period = NaN
  for (let lag = 100; lag < values.length / 2; lag++)
    if (
      values
        .slice(0, values.length - lag)
        .every(
          (value, index) =>
            Math.abs(value - (values[index + lag] ?? NaN)) < 1e-6
        )
    ) {
      period = lag * step
      break
    }
  assert.ok(
    period >= LIFT_PERIOD.min && period <= LIFT_PERIOD.max,
    `${period} s`
  )
  for (const other of DISK_PERIODS)
    assert.ok(Math.abs(period - other) > 0.5, `apart from ${other} s`)
})

test('the black hole is 0.88 to 1.12 times its size as it rises', () => {
  for (let lift = 0; lift <= 1; lift += 0.05) {
    const expected = SIZE.low + (SIZE.high - SIZE.low) * lift
    assert.ok(Math.abs(liftScale(lift) - expected) < 1e-9, `at ${lift}`)
  }
})

test('the well weakens from 1 to 0.5 as the black hole rises', () => {
  for (let lift = 0; lift <= 1; lift += 0.05) {
    const expected = STRENGTH.low + (STRENGTH.high - STRENGTH.low) * lift
    assert.ok(Math.abs(wellStrength(lift) - expected) < 1e-9, `at ${lift}`)
  }
})

test('a still black hole holds at half lift', () => {
  for (let t = 0; t <= 60; t += 0.37) assert.equal(holeLift(t, true), 0.5)
})
