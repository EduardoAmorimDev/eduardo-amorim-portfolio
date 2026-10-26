import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  alphaAt,
  columnCrossings,
  fitLine,
  linesFrom,
  readGrid,
  readableRows,
  rowCrossings,
  sweepPointer,
  type GridImage
} from './grid-helpers'
import { gotoHero, gotoStopped } from './page-helpers'

// why: the checklist's own numbers (C24–C37), at 1440×900.
const SPACING = 48
const SPACING_SLACK = 0.5
const TOP_TO_BOTTOM = 0.8
const POINTER_RADIUS = 180
const HOLE_RADIUS = 280
const HOLE_PULL = 48
const NEAREST = { min: 6, max: 20 }
const STRAIGHT_PX = 1
const FOLLOW_MS = 150
const SETTLE_MS = 800
const CORNER = 64
// why: where the black hole rests: the hero's centre, 32% down.
const REST = { x: 720, y: 288 }
const HORIZON = 48
// why: the black hole moves at most 60 px/s from rest, which it leaves at
// load; a test that runs the page clock `ms` in all keeps every sample this
// much further from rest, so it stays clear of the well wherever the hole is.
const MAX_SPEED = 60
const drift = (ms: number) => (MAX_SPEED * ms) / 1000 + 4
const WIDTH = 1440
// why: a line is matched to the crossing nearest its straight course only
// within half a gap; past that the crossing is its neighbour's, and a row
// where a sagging horizontal hides the crossing is skipped for that line.
const MATCH_PX = 25

/** The crossing nearest `expected` on a row, if it is within MATCH_PX. */
const nearestTo = (xs: readonly number[], expected: number) => {
  const found = xs.reduce(
    (best, x) =>
      Math.abs(x - expected) < Math.abs(best - expected) ? x : best,
    Infinity
  )
  return Math.abs(found - expected) <= MATCH_PX ? found : null
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

/** Far from both wells, where the grid must be straight. */
const farFrom =
  (pointer: { x: number; y: number } | null, holeSlack: number) =>
  (point: { x: number; y: number }) =>
    distance(point, REST) > HOLE_RADIUS + holeSlack &&
    (!pointer || distance(point, pointer) > POINTER_RADIUS + 10)

/** Straight fits of every vertical line, from its samples kept by `keep`. */
const fits = (
  grid: GridImage,
  keep: (point: { x: number; y: number }) => boolean
) => {
  const lines = linesFrom(readableRows(grid, 2, 898, 2), WIDTH / 2, keep)
  return [...lines.values()]
    .filter(samples => samples.length >= 20)
    .map(samples => ({ samples, line: fitLine(samples) }))
}

/** A readable row near `y` and the two verticals around `x` on it. */
const between = (grid: GridImage, x: number, y: number) => {
  for (let dy = 0; dy < 20; dy++)
    for (const row of [y + dy, y - dy]) {
      const xs = rowCrossings(grid, row)
      const right = xs?.findIndex(at => at > x) ?? -1
      const left = xs?.[right - 1]
      const next = xs?.[right]
      if (xs && right > 0 && left !== undefined && next !== undefined)
        return { y: row, left, right: next }
    }
  throw new Error(`no readable row near ${y}`)
}

/**
 * How far each of the two lines that sat at `left` and `right` on row `y`
 * bends, row by row within the pointer's radius: positive is to the right.
 * Each line's straight course comes from its samples far from both wells.
 */
const bends = (
  holeSlack: number,
  grid: GridImage,
  pointer: { x: number; y: number },
  rest: { y: number; left: number; right: number }
) => {
  const straight = fits(grid, farFrom(pointer, holeSlack))
  const course = (x: number) => {
    const found = straight.reduce((best, fit) =>
      Math.abs(fit.line.at(rest.y) - x) < Math.abs(best.line.at(rest.y) - x)
        ? fit
        : best
    )
    return found.line
  }
  const left = course(rest.left)
  const right = course(rest.right)
  const shifts: { left: number[]; right: number[] } = { left: [], right: [] }
  for (const { y, xs } of readableRows(
    grid,
    pointer.y - POINTER_RADIUS,
    pointer.y + POINTER_RADIUS,
    2
  )) {
    for (const [side, line] of [
      ['left', left],
      ['right', right]
    ] as const) {
      const expected = line.at(y)
      const nearest = nearestTo(xs, expected)
      if (nearest !== null) shifts[side].push(nearest - expected)
    }
  }
  return shifts
}

const expectStraight = (
  grid: GridImage,
  keep: (p: { x: number; y: number }) => boolean
) => {
  const lines = fits(grid, keep)
  expect(lines.length, 'lines measured').toBeGreaterThan(20)
  for (const { samples, line } of lines)
    for (const { x, y } of samples)
      expect(
        Math.abs(x - line.at(y)),
        `line near ${Math.round(line.at(450))}px at ${y}px`
      ).toBeLessThanOrEqual(STRAIGHT_PX)
}

/** Moves the mouse onto `to` and lets the page's stopped clock run `ms`. */
const pointAt = async (
  page: Page,
  to: { x: number; y: number },
  ms: number
) => {
  await sweepPointer(page, to)
  await page.clock.runFor(ms)
}

test('the grid reaches every corner', async ({ page }) => {
  await gotoHero(page)
  const grid = await readGrid(page)
  for (const [x0, y0] of [
    [0, 0],
    [WIDTH - CORNER, 0],
    [0, 900 - CORNER],
    [WIDTH - CORNER, 900 - CORNER]
  ] as const) {
    let inked = 0
    for (let y = y0; y < y0 + CORNER; y++)
      for (let x = x0; x < x0 + CORNER; x++) if (alphaAt(grid, x, y)) inked++
    expect(inked, `corner at ${x0},${y0}`).toBeGreaterThan(0)
  }
})

test.describe('black hole at rest', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the grid recedes: verticals closer at the top and 48px apart at the middle', async ({
    page
  }) => {
    await gotoHero(page)
    const grid = await readGrid(page)
    const keep = farFrom(null, 20)
    const gaps = (from: number, to: number) => {
      const row = readableRows(grid, from, to, 1)[0]
      if (!row) throw new Error(`no readable row in ${from}–${to}`)
      const xs = row.xs.filter(x => keep({ x, y: row.y }))
      return xs
        .slice(1)
        .map((x, index) => x - (xs[index] ?? x))
        .filter(gap => gap < 2 * SPACING)
    }
    const median = (values: number[]) =>
      [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? NaN
    const top = median(gaps(1, 40))
    const bottom = median(gaps(860, 899))
    expect(top, `top ${top}, bottom ${bottom}`).toBeLessThanOrEqual(
      TOP_TO_BOTTOM * bottom
    )
    const middle = gaps(450, 450)
    expect(middle.length).toBeGreaterThan(10)
    for (const gap of middle)
      expect(Math.abs(gap - SPACING), `gap ${gap}`).toBeLessThanOrEqual(
        SPACING_SLACK
      )
  })

  test('lines near the black hole bend towards it', async ({ page }) => {
    await gotoHero(page)
    const grid = await readGrid(page)
    const straight = fits(grid, farFrom(null, 20))
    // why: lines 195–265 px off the centre bend by less than half a gap, so
    // the crossing nearest a line's straight course is that line's own.
    const near = straight.filter(({ line }) => {
      const off = Math.abs(line.at(REST.y) - REST.x)
      return off >= 195 && off <= 265
    })
    expect(near.length).toBeGreaterThanOrEqual(2)
    const rows = readableRows(grid, REST.y - 12, REST.y + 12, 1)
    expect(rows.length).toBeGreaterThan(0)
    for (const { line } of near) {
      const towards = Math.sign(REST.x - line.at(REST.y))
      let pulled = 0
      for (const { y, xs } of rows) {
        const expected = line.at(y)
        const nearest = nearestTo(xs, expected)
        if (nearest !== null)
          pulled = Math.max(pulled, (nearest - expected) * towards)
      }
      const label = `line at ${Math.round(line.at(REST.y))}px`
      expect(pulled, label).toBeGreaterThan(1)
      expect(pulled, label).toBeLessThanOrEqual(HOLE_PULL + SPACING_SLACK)
    }
  })

  test('no grid line inside the event horizon', async ({ page }) => {
    await gotoHero(page)
    const grid = await readGrid(page)
    for (let y = REST.y - HORIZON; y <= REST.y + HORIZON; y++)
      for (let x = REST.x - HORIZON; x <= REST.x + HORIZON; x++)
        if (distance({ x, y }, REST) < HORIZON - 1)
          expect(alphaAt(grid, x, y), `ink at ${x},${y}`).toBe(0)
  })
})

test('lines far from the pointer and the black hole stay straight', async ({
  page
}) => {
  await gotoStopped(page, 300)
  const pointer = { x: 240, y: 640 }
  await pointAt(page, pointer, 300)
  expectStraight(await readGrid(page), farFrom(pointer, drift(600)))
})

test('the pointer pulls the nearest verticals 6 to 20px towards it', async ({
  page
}) => {
  await gotoStopped(page, 300)
  const rest = between(await readGrid(page), 240, 640)
  const gap = rest.right - rest.left
  for (const [share, nearest] of [
    [0.5, 'both'],
    [0.25, 'left']
  ] as const) {
    const pointer = { x: rest.left + gap * share, y: rest.y }
    await pointAt(page, pointer, 300)
    const shift = bends(drift(900), await readGrid(page), pointer, rest)
    const label = `pointer at ${share} of the gap`
    // invariant: towards the pointer is right for the left line, left for
    // the right one; never the other way.
    for (const value of shift.left)
      expect(value, `${label}: left`).toBeGreaterThanOrEqual(-0.5)
    for (const value of shift.right)
      expect(value, `${label}: right`).toBeLessThanOrEqual(0.5)
    const left = Math.max(...shift.left)
    const right = -Math.min(...shift.right)
    for (const [side, value] of [
      ['left', left],
      ['right', right]
    ] as const) {
      if (nearest !== 'both' && nearest !== side) {
        expect(value, `${label}: ${side} bends`).toBeGreaterThan(1)
        continue
      }
      expect(value, `${label}: ${side}`).toBeGreaterThanOrEqual(NEAREST.min)
      expect(value, `${label}: ${side}`).toBeLessThanOrEqual(NEAREST.max)
    }
  }
})

test('horizontals near the pointer sag downwards', async ({ page }) => {
  await gotoStopped(page, 300)
  const rest = between(await readGrid(page), 240, 640)
  const pointer = { x: (rest.left + rest.right) / 2, y: rest.y }
  const flat = columnCrossings(await readGrid(page), 40)
  await pointAt(page, pointer, 300)
  const bent = columnCrossings(await readGrid(page), pointer.x)
  let sagging = 0
  for (const y of flat) {
    const off = Math.abs(y - pointer.y)
    if (off >= POINTER_RADIUS) continue
    const now = bent.reduce((best, at) =>
      Math.abs(at - y) < Math.abs(best - y) ? at : best
    )
    // why: the sag fades to nothing at the radius; well inside it, it is
    // plain to see, and near the edge it is still downwards.
    const least = off < POINTER_RADIUS * 0.75 ? 0.5 : 0
    expect(now - y, `line at ${y}px`).toBeGreaterThan(least)
    sagging++
  }
  expect(sagging, 'lines within the radius').toBeGreaterThanOrEqual(4)
})

test('the well follows the pointer within 150ms and stays while it rests', async ({
  page
}) => {
  await gotoStopped(page, 300)
  // why: on the middle row lines sit exactly 48 px apart, so two gaps on
  // from one midpoint lies another.
  const start = between(await readGrid(page), 200, 450)
  const first = { x: (start.left + start.right) / 2, y: start.y }
  const second = { x: first.x + 2 * SPACING, y: first.y }
  const rest = {
    y: start.y,
    left: start.left + 2 * SPACING,
    right: start.right + 2 * SPACING
  }
  await pointAt(page, first, 300)
  await page.mouse.move(second.x, second.y)
  for (const wait of [FOLLOW_MS, 2000]) {
    await page.clock.runFor(wait)
    const shift = bends(drift(2750), await readGrid(page), second, rest)
    const left = Math.max(...shift.left)
    const right = -Math.min(...shift.right)
    const label = `${wait} ms after the jump`
    for (const value of [left, right]) {
      expect(value, label).toBeGreaterThanOrEqual(NEAREST.min)
      expect(value, label).toBeLessThanOrEqual(NEAREST.max)
    }
    expect(Math.abs(left - right), `${label}: centred`).toBeLessThanOrEqual(1.5)
  }
})

test('the well fades within 800ms after the pointer leaves', async ({
  page
}) => {
  await gotoStopped(page, 300)
  // why: half the hero scrolled away leaves its lower half on screen, with
  // room below it to take the mouse out of the hero.
  await page.evaluate(() => window.scrollTo({ top: 450, behavior: 'instant' }))
  await page.clock.runFor(50)
  const pointer = { x: 240, y: 675 }
  await pointAt(page, { x: pointer.x, y: pointer.y - 450 }, 300)
  const bent = bends(
    drift(650),
    await readGrid(page),
    pointer,
    between(await readGrid(page), pointer.x, pointer.y)
  )
  expect(Math.max(...bent.left.map(Math.abs))).toBeGreaterThan(1)
  await page.mouse.move(pointer.x, 700, { steps: 4 })
  await page.clock.runFor(SETTLE_MS)
  expectStraight(await readGrid(page), farFrom(null, drift(1450)))
})

test('the grid and the lens never take the pointer', async ({ page }) => {
  await gotoHero(page)
  for (const id of ['hero-grid', 'hero-lens']) {
    await expect(page.locator(`[data-testid="${id}"]`)).toHaveCount(1)
    await expect(page.locator(`#hero [data-testid="${id}"]`)).toHaveCount(1)
    await expect(page.locator(`[data-testid="${id}"]`)).toHaveCSS(
      'pointer-events',
      'none'
    )
  }
  const hits = await page.evaluate(() => {
    const centre = (selector: string) => {
      const box = document.querySelector(selector)?.getBoundingClientRect()
      if (!box) throw new Error(`no ${selector}`)
      return document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2
      )
    }
    const scene = document.querySelector('[data-testid="hero-scene"]')
    // why: the hero's middle, which falls between the title and the
    // subtitle, on no text.
    const open = document.elementFromPoint(innerWidth / 2, innerHeight / 2)
    return {
      scene: !!open && !!scene?.contains(open),
      title: centre('#hero h1')?.closest('h1') !== null,
      cta: centre('#hero a')?.closest('a') !== null
    }
  })
  expect(hits).toEqual({ scene: true, title: true, cta: true })
})
