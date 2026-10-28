import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  displace,
  holeShift,
  pointerShift,
  sheet,
  sheetScale,
  wellsOf,
  type HoleBody
} from './grid-motion.ts'

// why: the checklists' own numbers (cosmos C26, C28, C33; gravity C1–C3,
// C8, C9; black-hole-scale C6–C9, C15, C16): the well twice the first one,
// its depth and pull 1 resting on the grid (lift 0) and 0.5 risen (lift 1),
// the black hole 0.88 and 1.12 times its size there.
const SPACING = 48
const MIDDLE_ASPECT = { min: 0.55, max: 0.7 }
const TOP_ASPECT = 0.55
const TOP_TO_BOTTOM = 0.75
const POINTER_RADIUS = 180
const HOLE_RADIUS = 560
const HOLE_PULL = 96
const HORIZON = 96
const REST = { x: 720, y: 288 }
const LIFTED = {
  low: { size: 0.88, strength: 1, lift: 0 },
  high: { size: 1.12, strength: 0.5, lift: 1 }
}
const LOW_SINK = { min: 80, max: 160 }
const DEEPER = 1.8
const NARROWER = 0.85

const WIDTH = 1440
const HEIGHT = 900
const grid = sheet(WIDTH, HEIGHT)
const holeBody = { u: 0, v: 200 }
const pointerBody = { u: -400, v: -150 }

/**
 * The black hole on screen at `y`, the horizon sized for that depth and
 * the rise `lifted` (resting on the grid by default).
 */
const holeAt = (
  x: number,
  y: number,
  lifted: { size: number; strength: number; lift: number } = LIFTED.low
): HoleBody => ({
  x,
  y,
  horizon:
    (HORIZON * lifted.size * sheetScale(HEIGHT, y)) /
    sheetScale(HEIGHT, REST.y),
  scale: 1,
  strength: lifted.strength,
  lift: lifted.lift
})

test('a 50° sheet: straight verticals, 48px apart at the middle, flat cells far off', () => {
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
  // invariant: a cell's height over its width, read from the rows around a
  // screen height and the vertical spacing there.
  const aspect = (y: number) => {
    const below = grid.rows.findIndex(row => row > y)
    const a = grid.rows[Math.max(0, below - 1)] ?? NaN
    const b = grid.rows[Math.max(1, below)] ?? NaN
    return (b - a) / (gaps((a + b) / 2)[0] ?? NaN)
  }
  const middle = aspect(HEIGHT / 2)
  assert.ok(
    middle >= MIDDLE_ASPECT.min && middle <= MIDDLE_ASPECT.max,
    `${middle} at the middle`
  )
  assert.ok(aspect(0) <= TOP_ASPECT, `${aspect(0)} at the top`)
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

test('a flat sheet point is drawn where it was found', () => {
  for (let y = 0; y <= HEIGHT; y += 37)
    for (let x = 0; x <= WIDTH; x += 61) {
      const back = grid.toScreen(grid.toSheet({ x, y }), 0)
      assert.ok(Math.hypot(back.x - x, back.y - y) < 1e-9, `${x},${y}`)
    }
})

test('no displacement beyond either well', () => {
  for (let angle = 0; angle < 2 * Math.PI; angle += 0.05)
    for (const extra of [1e-6, 1, 40, 400]) {
      const far = (body: { u: number; v: number }, radius: number) => ({
        u: body.u + (radius + extra) * Math.cos(angle),
        v: body.v + (radius + extra) * Math.sin(angle)
      })
      assert.deepEqual(
        pointerShift(far(pointerBody, POINTER_RADIUS), pointerBody, 1),
        { u: 0, depth: 0 }
      )
      assert.deepEqual(
        holeShift(far(holeBody, HOLE_RADIUS), holeBody, HORIZON, 1),
        { u: 0, depth: 0 }
      )
    }
  assert.deepEqual(pointerShift({ u: -390, v: -140 }, pointerBody, 0), {
    u: 0,
    depth: 0
  })
})

test('the hole pulls towards its centre, by at most 96px, within 560px', () => {
  let strongest = 0
  for (let distance = 0.5; distance < HOLE_RADIUS; distance += 0.5)
    for (let angle = 0; angle < 2 * Math.PI; angle += 0.3) {
      const du = distance * Math.cos(angle)
      const at = {
        u: holeBody.u + du,
        v: holeBody.v + distance * Math.sin(angle)
      }
      const shift = holeShift(at, holeBody, HORIZON, 1)
      strongest = Math.max(strongest, Math.abs(shift.u))
      assert.ok(Math.abs(shift.u) <= HOLE_PULL + 1e-9, `at ${distance}px`)
      assert.ok(shift.depth > 0, `the well reaches ${distance}px`)
      // invariant: towards the centre, and never past it.
      if (Math.abs(du) > 1e-9) {
        assert.ok(Math.sign(shift.u) === -Math.sign(du), `at ${distance}px`)
        assert.ok(Math.abs(shift.u) <= Math.abs(du) + 1e-9, `at ${distance}px`)
      }
    }
  assert.ok(strongest > HOLE_PULL - 1, `the well reaches ${strongest}px`)
})

test('the pointer pulls lines sideways towards it and sinks them, by at most 20px', () => {
  for (let du = -179; du <= 179; du += 3)
    for (let dv = -179; dv <= 179; dv += 3) {
      if (Math.hypot(du, dv) >= POINTER_RADIUS || du === 0) continue
      const shift = pointerShift(
        { u: pointerBody.u + du, v: pointerBody.v + dv },
        pointerBody,
        1
      )
      assert.ok(Math.sign(shift.u) === -Math.sign(du), `towards at ${du},${dv}`)
      assert.ok(Math.abs(shift.u) < Math.abs(du), `not past it at ${du},${dv}`)
      assert.ok(shift.depth > 0, `down at ${du},${dv}`)
      assert.ok(Math.hypot(shift.u, shift.depth) <= 20, `${du},${dv}`)
    }
})

/** How far a horizontal line through screen (x, y) is drawn off its course. */
const offCourse = (x: number, y: number, hole: HoleBody) => {
  const drawn = displace(grid, { x, y }, wellsOf(grid, null, hole), false)
  return Math.hypot(drawn.x - x, drawn.y - y)
}

test("the black hole's well reaches 560px at the middle", () => {
  const hole = holeAt(WIDTH / 2, HEIGHT / 2)
  for (const side of [-1, 1]) {
    assert.ok(offCourse(WIDTH / 2 + side * 550, HEIGHT / 2, hole) > 0)
    assert.equal(offCourse(WIDTH / 2 + side * 570, HEIGHT / 2, hole), 0)
  }
})

test("the well's reach does not change with the lift", () => {
  for (const lifted of [LIFTED.low, LIFTED.high]) {
    const hole = holeAt(WIDTH / 2, HEIGHT / 2, lifted)
    for (const side of [-1, 1]) {
      assert.ok(offCourse(WIDTH / 2 + side * 550, HEIGHT / 2, hole) > 0)
      assert.equal(offCourse(WIDTH / 2 + side * 570, HEIGHT / 2, hole), 0)
    }
  }
})

/** How far the horizontal nearest the hole's centre sinks at its column. */
const centreSink = (hole: HoleBody) => {
  const row = grid.rows.reduce((best, y) =>
    Math.abs(y - hole.y) < Math.abs(best - hole.y) ? y : best
  )
  const drawn = displace(
    grid,
    { x: hole.x, y: row },
    wellsOf(grid, null, hole),
    false
  )
  return drawn.y - row
}

test('at lift 0 the horizontal nearest the centre sinks 80 to 160px', () => {
  const sink = centreSink(holeAt(REST.x, REST.y))
  assert.ok(sink >= LOW_SINK.min && sink <= LOW_SINK.max, `${sink}px`)
})

test('the well sinks the grid at least 1.8 times deeper at lift 0 than at lift 1', () => {
  for (const [x, y] of [
    [REST.x, REST.y],
    [400, 300],
    [1000, 600]
  ] as const) {
    const low = centreSink(holeAt(x, y, LIFTED.low))
    const high = centreSink(holeAt(x, y, LIFTED.high))
    assert.ok(low >= DEEPER * high, `at ${x},${y}: ${low} vs ${high}`)
  }
})

test('no horizontal sinks past the next', () => {
  for (const [x, y] of [
    [REST.x, REST.y],
    [400, 300],
    [1000, 600],
    [720, 650],
    [500, 450]
  ] as const) {
    const wells = wellsOf(grid, null, holeAt(x, y))
    for (let column = 0; column <= WIDTH; column += 8) {
      const drawn = grid.rows.map(
        row => displace(grid, { x: column, y: row }, wells, false).y
      )
      drawn
        .slice(1)
        .forEach((at, index) =>
          assert.ok(
            at > (drawn[index] ?? -Infinity),
            `hole at ${x},${y}, column ${column}, row ${index + 1}`
          )
        )
    }
  }
})

test("the black hole's well is narrower higher up", () => {
  // invariant: the band is read along the hole's own row, where a line
  // leaves its course by more than 1 px.
  const band = (y: number) => {
    const hole = holeAt(WIDTH / 2, y)
    let from = Infinity
    let to = -Infinity
    for (let x = 0; x <= WIDTH; x += 0.5)
      if (offCourse(x, y, hole) > 1) {
        from = Math.min(from, x)
        to = Math.max(to, x)
      }
    return to - from
  }
  const high = band(HEIGHT * 0.25)
  const low = band(HEIGHT * 0.75)
  assert.ok(high <= NARROWER * low, `${high}px high, ${low}px low`)
})

test("the pointer's well reaches 180px at the middle", () => {
  const offCourse = (x: number) => {
    const point = { x, y: HEIGHT / 2 }
    const wells = wellsOf(
      grid,
      { x: WIDTH / 2, y: HEIGHT / 2, strength: 1 },
      null
    )
    const drawn = displace(grid, point, wells, false)
    return Math.hypot(drawn.x - point.x, drawn.y - point.y)
  }
  for (const side of [-1, 1]) {
    assert.ok(offCourse(WIDTH / 2 + side * 170) > 0)
    assert.equal(offCourse(WIDTH / 2 + side * 190), 0)
  }
})
