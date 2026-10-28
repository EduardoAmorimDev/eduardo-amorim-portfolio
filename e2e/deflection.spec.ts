import type { Page } from '@playwright/test'
import { PerspectiveCamera, Vector3 } from 'three'
import {
  bendAt,
  innerImage,
  outerImage
} from '../components/organisms/hero/deflection'
import { HERO_CAMERA } from '../components/organisms/hero/glass-motion'
import { expect, test } from './fixtures'
import { findHorizon, firstScreen, type Box } from './black-hole-helpers'
import {
  channelGap,
  channels,
  gotoStopped,
  hideHeroCopy,
  luminanceAt,
  pixelAt,
  tokenRgb,
  type Pixels
} from './page-helpers'

// why: the checklist's own numbers (black-hole-lensing C4, C6, C8, C10,
// C12, C15, C16, C20): images within 4 px of the lens equation's; the
// horizon left alone within 6 levels; the grid at half opacity; the logo
// within 15 px of its layout, where a bent one would sit ~54 px off.
const IMAGE_SLACK_PX = 4
const INSIDE_SHARE = 0.97
const INSIDE_LEVELS = 6
const GRID_OPACITY = 0.5
const HALF_WAY = { min: 0.18, max: 0.26 }
const LOGO_SLACK_PX = 15
const CENTRE_SLACK_PX = 1
// why: the horizon's box in the pixels is whole px, its centre half a px.
const HORIZON_BOX_PX = 2
const RISEN_SLACK = 0.04
const ON_GRID_SLACK_PX = 6
// why: rest is half risen under reduced motion; risen and back takes 12 s,
// so 6 s in it is at its highest.
const REST_LIFT = 0.5
const HIGHEST_LIFT = 1
const RISEN_MS = 6000
const LOW_MS = 100
// why: seconds of frames, each sending the grid to the GPU, run through a
// stopped clock; on a loaded machine that outlasts the default 30 s.
const MOTION_TIMEOUT_MS = 120_000
// why: a few frames of the stopped clock, for the scene to send and bend
// what was just drawn behind it.
const SETTLE_MS = 100
// why: the circles drawn behind are this wide, so their bent images stay
// over a px even where the lens squeezes them.
const LINE_PX = 3
// why: a diff (or, in motion, a luminance) this high is the bent circle;
// the disk's glow stays well under it.
const SEEN = 0.03
const LIT = 0.08
// why: points along a ray, every half px.
const STEP_PX = 0.5
// why: past the photon ring (1.04) and its glow, in horizon radii.
const PAST_RING = 1.08
// why: in motion the circle is 2 horizon radii out, and its outer image
// lies 2 to 3.51 radii out; nothing else is lit past 1.7 off the disk.
const CIRCLE_RADII = 2
const OUTER_REACH = { from: 1.7, to: 3.9 }
// why: every 15° within 45° of the vertical; nearer the horizontal, the
// disk (1.49 horizon radii out at 45°, 4.2 at 0°) covers the ray.
const MOTION_RAYS = Array.from({ length: 14 }, (_, index) => {
  const degrees = index < 7 ? 45 + 15 * index : -45 - 15 * (index - 7)
  return (degrees * Math.PI) / 180
})
const MIN_RAYS = 4
// why: points spread over the hero; checked for being far from the black
// hole and the logo before use.
const FAR_POINT = { x: 100, y: 800 }
const LOGO_REGION = { x0: 1000, x1: 1440, y0: 0, y1: 200 }
const LOGO_LIT = 24

type Point = { x: number; y: number }

/** What the test draws behind the black hole, in hero px. */
type Behind =
  | { kind: 'blank' }
  | { kind: 'fill' }
  | { kind: 'circle'; x: number; y: number; radius: number; line?: number }

/** Replaces what the grid's canvas holds, until its owner redraws it. */
const drawBehind = (page: Page, behind: Behind) =>
  page.evaluate(
    ({ behind, line }) => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        '[data-testid="hero-grid"]'
      )
      const context = canvas?.getContext('2d')
      if (!canvas || !context) throw new Error('no grid canvas')
      const scale = canvas.width / canvas.clientWidth
      context.save()
      context.setTransform(scale, 0, 0, scale, 0, 0)
      context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
      context.fillStyle = '#fff'
      context.strokeStyle = '#fff'
      context.lineWidth = (behind.kind === 'circle' && behind.line) || line
      if (behind.kind === 'fill')
        context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
      if (behind.kind === 'circle') {
        context.beginPath()
        context.arc(behind.x, behind.y, behind.radius, 0, 2 * Math.PI)
        context.stroke()
      }
      context.restore()
    },
    { behind, line: LINE_PX }
  )

/** Draws behind, lets the scene bend it and captures the first screen. */
const captureWith = async (page: Page, behind: Behind) => {
  await drawBehind(page, behind)
  await page.clock.runFor(SETTLE_MS)
  return firstScreen(page)
}

/**
 * From now on, every time the hero's field draws the grid it draws a
 * circle `radii` horizon radii around the black hole instead, centred where
 * the field puts it in that same frame.
 */
const circleInsteadOfGrid = (page: Page, radii: number) =>
  page.evaluate(
    ({ radii, line }) => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        '[data-testid="hero-grid"]'
      )
      const context = canvas?.getContext('2d')
      if (!canvas || !context) throw new Error('no grid canvas')
      const arc = context.arc.bind(context)
      const stroke = context.stroke.bind(context)
      let hole: { x: number; y: number; radius: number } | null = null
      // invariant: the field clips the horizon with arc(x, y, horizon + 1).
      context.arc = (x, y, radius, start, end, counter) => {
        hole = { x, y, radius: radius - 1 }
        canvas.dataset.drawnHole = `${x} ${y} ${radius - 1}`
        arc(x, y, radius, start, end, counter)
      }
      context.stroke = () => {
        if (!hole) return
        context.strokeStyle = '#fff'
        context.lineWidth = line
        context.beginPath()
        arc(hole.x, hole.y, hole.radius * radii, 0, 2 * Math.PI)
        stroke()
      }
    },
    { radii, line: LINE_PX }
  )

/** Luminance at every STEP_PX along a ray, `from` to `to` px out. */
const along = (
  pixels: Pixels,
  centre: Point,
  angle: number,
  from: number,
  to: number
) => {
  const points: { at: number; luminance: number }[] = []
  for (let at = from; at <= to; at += STEP_PX) {
    const x = centre.x + at * Math.cos(angle)
    const y = centre.y + at * Math.sin(angle)
    if (x < 0 || y < 0 || x > pixels.width - 1 || y > pixels.height - 1) break
    points.push({ at, luminance: luminanceAt(pixels, x, y) })
  }
  return points
}

/** Weighted centres of the runs where `value` passes `threshold`. */
const runCentres = (
  points: readonly { at: number; value: number }[],
  threshold: number
) => {
  const centres: number[] = []
  let weight = 0
  let sum = 0
  for (const { at, value } of [...points, { at: Infinity, value: 0 }]) {
    if (value > threshold) {
      weight += value
      sum += value * at
    } else if (weight) {
      centres.push(sum / weight)
      weight = 0
      sum = 0
    }
  }
  return centres
}

/** Centres, along a ray, of what was drawn in `after` and not `before`. */
const drawnAlong = (
  before: Pixels,
  after: Pixels,
  centre: Point,
  angle: number,
  from: number,
  to: number
) => {
  const blank = along(before, centre, angle, from, to)
  const drawn = along(after, centre, angle, from, to)
  return runCentres(
    drawn.map(({ at, luminance }, index) => ({
      at,
      value: luminance - (blank[index]?.luminance ?? 0)
    })),
    SEEN
  )
}

const nearest = (centres: readonly number[], expected: number) =>
  centres.reduce(
    (best, centre) =>
      Math.abs(centre - expected) < Math.abs(best - expected) ? centre : best,
    Infinity
  )

const inkOf = async (page: Page) => channels(await tokenRgb(page, 'ink'))

const centreOf = (horizon: Box) => ({
  x: horizon.cx,
  y: horizon.cy,
  radius: horizon.width / 2
})

/** Loads the hero still, its copy hidden and nothing behind the black hole. */
const atRest = async (page: Page) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoStopped(page, 1500)
  await hideHeroCopy(page)
  const blank = await captureWith(page, { kind: 'blank' })
  const horizon = await findHorizon(page, await inkOf(page))
  return { blank, hole: centreOf(horizon) }
}

/** Solves a 3 × 3 linear system by Cramer's rule. */
const solve3 = (m: number[][], b: number[]) => {
  const det = (a: number[][]) =>
    a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
    a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
    a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0])
  const whole = det(m)
  return [0, 1, 2].map(
    column =>
      det(
        m.map((row, index) =>
          row.map((v, at) => (at === column ? b[index] : v))
        )
      ) / whole
  )
}

/** Radius and centre offset of a circle met at `at` along unit rays. */
const leastSquares = (hits: readonly { angle: number; at: number }[]) => {
  // invariant: along unit ray u, a circle of radius r offset δ from the
  // origin is met r + δ·u away, to first order in δ.
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ]
  const b = [0, 0, 0]
  for (const { angle, at } of hits) {
    const row = [1, Math.cos(angle), Math.sin(angle)]
    for (let i = 0; i < 3; i++) {
      b[i] += row[i] * at
      for (let j = 0; j < 3; j++) m[i][j] += row[i] * row[j]
    }
  }
  const [radius, x, y] = solve3(m, b)
  return { radius, offset: { x, y } }
}

// why: a ray whose outermost lit run lies this far off the fitted circle
// met something else (the logo, a tilted disk's rim) and is left out.
const STRAY_PX = 3

/**
 * The outermost bent image of the circle along each ray that reaches far
 * enough on screen, and the circle fitted to them, once without the rays
 * that met something else.
 */
const fitCircle = (pixels: Pixels, hole: Point & { radius: number }) => {
  const hits: { angle: number; at: number }[] = []
  for (const angle of MOTION_RAYS) {
    const points = along(
      pixels,
      hole,
      angle,
      OUTER_REACH.from * hole.radius,
      OUTER_REACH.to * hole.radius
    )
    const last = points.at(-1)
    if (!last || last.at < OUTER_REACH.to * hole.radius - 1) continue
    const centres = runCentres(
      points.map(({ at, luminance }) => ({ at, value: luminance })),
      LIT
    )
    const outermost = centres.at(-1)
    if (outermost !== undefined) hits.push({ angle, at: outermost })
  }
  const first = leastSquares(hits)
  const kept = hits.filter(
    ({ angle, at }) =>
      Math.abs(
        at -
          first.radius -
          first.offset.x * Math.cos(angle) -
          first.offset.y * Math.sin(angle)
      ) <= STRAY_PX
  )
  if (kept.length < MIN_RAYS)
    throw new Error(`only ${kept.length} of ${hits.length} rays met the circle`)
  return leastSquares(kept)
}

test.describe('at rest', () => {
  test('nothing behind shows inside the horizon', async ({ page }) => {
    const { blank, hole } = await atRest(page)
    const filled = await captureWith(page, { kind: 'fill' })
    let worst = 0
    const reach = INSIDE_SHARE * hole.radius
    for (let y = Math.ceil(hole.y - reach); y <= hole.y + reach; y++)
      for (let x = Math.ceil(hole.x - reach); x <= hole.x + reach; x++)
        if (Math.hypot(x - hole.x, y - hole.y) <= reach)
          worst = Math.max(
            worst,
            channelGap(pixelAt(filled, x, y), pixelAt(blank, x, y))
          )
    expect(worst, 'levels changed inside the horizon').toBeLessThanOrEqual(
      INSIDE_LEVELS
    )
  })

  test('what lies behind appears farther out, as the lens equation says', async ({
    page
  }) => {
    const { blank, hole } = await atRest(page)
    const bend = bendAt(REST_LIFT)
    const down = Math.PI / 2
    // why: towards the hero's bottom left corner, the one farthest away.
    const corner = Math.atan2(blank.height - hole.y, -hole.x)
    for (const { distance, angle } of [
      { distance: 96, angle: down },
      { distance: 192, angle: down },
      { distance: 476, angle: down },
      { distance: 700, angle: corner }
    ]) {
      const drawn = await captureWith(page, {
        kind: 'circle',
        x: hole.x,
        y: hole.y,
        radius: distance
      })
      const expected = outerImage(distance / hole.radius, bend) * hole.radius
      const centres = drawnAlong(
        blank,
        drawn,
        hole,
        angle,
        PAST_RING * hole.radius,
        expected + 40
      )
      const found = nearest(centres, expected)
      expect(
        Math.abs(found - expected),
        `d = ${distance}: images at ${centres.map(Math.round).join(', ')}, expected ${Math.round(expected)}`
      ).toBeLessThanOrEqual(IMAGE_SLACK_PX)
    }
  })

  test('what lies behind also appears mirrored between the shadow and the Einstein ring', async ({
    page
  }) => {
    const { blank, hole } = await atRest(page)
    const bend = bendAt(REST_LIFT)
    // why: the lens squeezes the mirrored images across 4 to 19 times
    // (0.27 at 96 px, 0.05 at 476 px); a band this wide stays ~2 px thick.
    // An image below the centre comes from above it, which at 476 px is
    // past the hero's top, so that one is read to the right, inside the
    // disk's inner edge (1.5 horizon radii).
    for (const { distance, line, angle } of [
      { distance: 96, line: 8, angle: Math.PI / 2 },
      { distance: 192, line: 12, angle: Math.PI / 2 },
      { distance: 476, line: 40, angle: 0 }
    ]) {
      const drawn = await captureWith(page, {
        kind: 'circle',
        x: hole.x,
        y: hole.y,
        radius: distance,
        line
      })
      const expected =
        (innerImage(distance / hole.radius, bend) ?? NaN) * hole.radius
      const centres = drawnAlong(
        blank,
        drawn,
        hole,
        angle,
        PAST_RING * hole.radius,
        2 * hole.radius
      )
      const found = nearest(centres, expected)
      expect(
        Math.abs(found - expected),
        `d = ${distance}: images at ${centres.map(Math.round).join(', ')}, expected ${Math.round(expected)}`
      ).toBeLessThanOrEqual(IMAGE_SLACK_PX)
    }
  })

  test("what lies behind shows at the grid's half opacity", async ({
    page
  }) => {
    const { hole } = await atRest(page)
    const opacity = await page
      .locator('[data-testid="hero-grid"]')
      .evaluate(grid => Number(getComputedStyle(grid).opacity))
    expect(opacity).toBe(GRID_OPACITY)
    expect(
      Math.hypot(FAR_POINT.x - hole.x, FAR_POINT.y - hole.y),
      'the point is far from the black hole'
    ).toBeGreaterThan(5 * hole.radius)
    const filled = await captureWith(page, { kind: 'fill' })
    const luminance = luminanceAt(filled, FAR_POINT.x, FAR_POINT.y)
    expect(luminance).toBeGreaterThanOrEqual(HALF_WAY.min)
    expect(luminance).toBeLessThanOrEqual(HALF_WAY.max)
  })

  test('the logo in front is not bent', async ({ page }) => {
    const { blank } = await atRest(page)
    const ink = await inkOf(page)
    let left = Infinity
    let right = -Infinity
    let top = Infinity
    let bottom = -Infinity
    for (let y = LOGO_REGION.y0; y < LOGO_REGION.y1; y++)
      for (let x = LOGO_REGION.x0; x < LOGO_REGION.x1; x++)
        if (channelGap(pixelAt(blank, x, y), ink) > LOGO_LIT) {
          left = Math.min(left, x)
          right = Math.max(right, x)
          top = Math.min(top, y)
          bottom = Math.max(bottom, y)
        }
    // why: the logo's layout (glass-motion.ts): anchor 0.62, 0.74 of the
    // half view at z = 0, the camera looking at the origin.
    const { width, height } = blank
    const camera = new PerspectiveCamera(HERO_CAMERA.fov, width / height)
    camera.position.set(...HERO_CAMERA.position)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    const distance = camera.position.length()
    const viewHeight =
      2 * Math.tan((HERO_CAMERA.fov * Math.PI) / 360) * distance
    const viewWidth = (viewHeight * width) / height
    const projected = new Vector3(
      (0.62 * viewWidth) / 2,
      (0.74 * viewHeight) / 2,
      0
    ).project(camera)
    const expected = {
      x: ((projected.x + 1) / 2) * width,
      y: ((1 - projected.y) / 2) * height
    }
    const seen = { x: (left + right + 1) / 2, y: (top + bottom + 1) / 2 }
    expect(
      Math.hypot(seen.x - expected.x, seen.y - expected.y),
      `logo at ${Math.round(seen.x)},${Math.round(seen.y)}, laid out at ${Math.round(expected.x)},${Math.round(expected.y)}`
    ).toBeLessThanOrEqual(LOGO_SLACK_PX)
  })
})

test('the grid shows itself until the black hole draws it', async ({
  page
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoStopped(page, 0)
  const grid = page.locator('[data-testid="hero-grid"]')
  const state = () =>
    grid.evaluate(node => ({
      visibility: getComputedStyle(node).visibility,
      opacity: Number(getComputedStyle(node).opacity)
    }))
  expect(await state(), 'before the first frame').toEqual({
    visibility: 'visible',
    opacity: GRID_OPACITY
  })
  await page.clock.runFor(1500)
  expect((await state()).visibility, 'once the black hole draws').toBe('hidden')
  await hideHeroCopy(page)
  const blank = await captureWith(page, { kind: 'blank' })
  const filled = await captureWith(page, { kind: 'fill' })
  expect(
    luminanceAt(filled, FAR_POINT.x, FAR_POINT.y) -
      luminanceAt(blank, FAR_POINT.x, FAR_POINT.y),
    'what is behind shows through the black hole'
  ).toBeGreaterThan(HALF_WAY.min)
})

test('the lens is weakest on the grid and strongest risen off it', async ({
  page
}) => {
  test.setTimeout(MOTION_TIMEOUT_MS)
  await gotoStopped(page, LOW_MS)
  await hideHeroCopy(page)
  await circleInsteadOfGrid(page, CIRCLE_RADII)
  const ink = await inkOf(page)
  const measure = async () => {
    await page.clock.runFor(SETTLE_MS)
    const pixels = await firstScreen(page)
    const hole = centreOf(await findHorizon(page, ink))
    return { hole, circle: fitCircle(pixels, hole) }
  }
  const low = await measure()
  expect(
    Math.abs(low.circle.radius - CIRCLE_RADII * low.hole.radius),
    `on the grid: ${low.circle.radius} for a horizon of ${low.hole.radius}`
  ).toBeLessThanOrEqual(ON_GRID_SLACK_PX)
  await page.clock.runFor(RISEN_MS - LOW_MS - 2 * SETTLE_MS)
  const high = await measure()
  const expected =
    outerImage(CIRCLE_RADII, bendAt(HIGHEST_LIFT)) * high.hole.radius
  expect(
    Math.abs(high.circle.radius - expected) / expected,
    `risen: ${high.circle.radius}, expected ${expected}`
  ).toBeLessThanOrEqual(RISEN_SLACK)
})

test('the lens stays centred on the horizon as it wanders', async ({
  page
}) => {
  test.setTimeout(MOTION_TIMEOUT_MS)
  await gotoStopped(page, 2000)
  await hideHeroCopy(page)
  await circleInsteadOfGrid(page, CIRCLE_RADII)
  const ink = await inkOf(page)
  for (let sample = 0; sample < 3; sample++) {
    await page.clock.runFor(sample ? 2500 : SETTLE_MS)
    const pixels = await firstScreen(page)
    const horizon = centreOf(await findHorizon(page, ink))
    // why: where the field put the black hole in the frame drawn, which is
    // where the horizon is drawn (black-hole-mesh.tsx); the horizon found
    // in the pixels only confirms it, to its whole-px box.
    const [x = NaN, y = NaN, radius = NaN] = (
      (await page
        .locator('[data-testid="hero-grid"]')
        .getAttribute('data-drawn-hole')) ?? ''
    )
      .split(' ')
      .map(Number)
    expect(
      Math.hypot(horizon.x - x, horizon.y - y),
      `sample ${sample}: horizon drawn where the field put it`
    ).toBeLessThanOrEqual(HORIZON_BOX_PX)
    const { offset } = fitCircle(pixels, { x, y, radius })
    expect(
      Math.hypot(offset.x, offset.y),
      `sample ${sample}: lens ${offset.x.toFixed(2)},${offset.y.toFixed(2)} off the horizon`
    ).toBeLessThanOrEqual(CENTRE_SLACK_PX)
  }
})
