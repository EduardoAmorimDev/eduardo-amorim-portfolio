import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { sheetScaleAt } from './grid-helpers'
import {
  findHorizon,
  firstScreen,
  horizonIn,
  type Box
} from './black-hole-helpers'
import {
  channelGap,
  channels,
  gotoHero,
  gotoNotebook,
  gotoStopped,
  luminanceAt,
  pixelAt,
  showSceneOnly,
  tokenRgb,
  type Pixels
} from './page-helpers'

// why: the checklists' own numbers (cosmos C47–C52, C57, C59, C60; gravity
// C10, C19–C24, C30).
// why: twice the first horizon (black-hole-scale C1–C3, C13, C22), with a
// disk ~4 diameters wide; risen and back, it looks 0.88 to 1.12 times its
// size, at least 1.2 times larger at its largest; it wanders 10–30 px/s.
const HORIZON_PX = 192
const HORIZON_SLACK = 0.1
// why: at a 96 px horizon; the ring widens with the horizon (black-hole-
// scale, criterion 2), so these scale with it.
const RING_REACH_PX = 8
const RING_MIN = 0.5
// why: thin: the ring's bright part spans no more than this across.
const RING_THIN_PX = 4
// why: the photon ring sits at 1.04 horizon radii; its peaks above and below
// the centre are that much more than a diameter apart.
const RING_AT = 1.04
const DISK_SPAN = { min: 725, max: 887 }
const GROWS = 1.2
const GROW_SAMPLES = 9
const GROW_STEP_MS = 1500
const INCLINED = { min: 0.2, max: 0.32 }
const NEAR_HALF = { from: 0.3, to: 0.7 }
const OVER = { from: 20, to: 160, step: 10 }
const BRIGHTER_SIDE = 1.5
const TILT_CHANGE = 0.03
const TILT_GAP_MS = 4000
// why: the disk's ellipse is read at three quarters of its half width,
// clear of the arcs (which keep within 1.65 horizon radii) and of the
// disk's fading rim.
const COLUMN = 0.75
// why: in horizon radii from the centre, past the photon ring and short of
// where the top arc fades out; the arcs are told by luminance.
const ARC_REACH = { from: 1.1, to: 1.6 }
const ARC_SEEN = 0.04
// why: the disk spans 1.5–4.2 horizon radii; its halves are compared there,
// and within this many radii of the centre row.
const DISK_REACH = { from: 1.6, to: 4.0, rows: 1.2 }
const MIN_WANDER_PX = 30
const WANDER_MS = 4000
// why: the arcs of a disk that does not turn, aligned within a few px,
// changed by 6.3 levels at most in 1 s (measured on a build with the turn
// stopped); a turning disk changes them by over 20.
const TURNED_LEVELS = 12
// why: lit by the black hole, the facing half measured 10–16% brighter;
// with its light off, 1% darker. 5% clears the logo's own shading.
const LIT_SIDE = 1.05
const ALIGN_PX = 3
// why: lit means clearly off the ink background; the disk's outer edge is
// the brand blue, bright but of low luminance, so it is told by colour.
const LIT_GAP = 24
const ARC_LIT = 0.1
// why: the band is the only thing lit near the horizontal through the
// centre; the photon ring is read away from it.
const BAND_ANGLE = Math.PI / 7
// why: a notebook screen's top share, above the laptop, holds sky alone.
const SKY_SHARE = 0.3
const DARK_SKY_MAX = 0.1

const inkOf = async (page: Page) => channels(await tokenRgb(page, 'ink'))

const isLit = (pixels: Pixels, ink: readonly number[], x: number, y: number) =>
  channelGap(pixelAt(pixels, x, y), ink) > LIT_GAP

/** The disk's lit span along the row through the horizon's centre. */
const diskSpan = (pixels: Pixels, ink: readonly number[], horizon: Box) => {
  const row = Math.round(horizon.cy)
  // why: half the widest disk, and a margin, either side of the centre.
  const reach = DISK_SPAN.max / 2 + 20
  let left = Infinity
  let right = -Infinity
  for (let x = horizon.cx - reach; x <= horizon.cx + reach; x++)
    for (let dy = -2; dy <= 2; dy++)
      if (isLit(pixels, ink, x, row + dy)) {
        left = Math.min(left, x)
        right = Math.max(right, x)
      }
  return { left, right, width: right - left + 1 }
}

/**
 * How tall the disk's ellipse is over how wide, read on its brighter side,
 * where its edge is plainest: its half width from the horizon's centre and
 * its height at a column three quarters of the way out.
 */
const inclination = (pixels: Pixels, ink: readonly number[], horizon: Box) => {
  const span = diskSpan(pixels, ink, horizon)
  const sides = [
    { sign: -1, reach: horizon.cx - span.left },
    { sign: 1, reach: span.right - horizon.cx }
  ]
  const { sign, reach } = sides.reduce((a, b) => (b.reach > a.reach ? b : a))
  const row = Math.round(horizon.cy)
  const x = Math.round(horizon.cx + sign * COLUMN * reach)
  let top = row
  let bottom = row
  while (isLit(pixels, ink, x, top - 1)) top--
  while (isLit(pixels, ink, x, bottom + 1)) bottom++
  // invariant: an ellipse of half width a is 2·b·√(1 − c²) tall at c·a.
  return (bottom - top + 1) / (2 * reach * Math.sqrt(1 - COLUMN * COLUMN))
}

/** Luminance along the vertical through the centre, `from`–`to` radii out. */
const vertical = (
  pixels: Pixels,
  horizon: Box,
  side: -1 | 1,
  reach: { from: number; to: number }
) => {
  const radius = horizon.width / 2
  const values: number[] = []
  for (let r = reach.from * radius; r <= reach.to * radius; r++)
    values.push(luminanceAt(pixels, horizon.cx, horizon.cy + side * r))
  return values
}

test.describe('at rest', () => {
  test.use({ reducedMotion: 'reduce' })

  test('a 192px event horizon', async ({ page }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const horizon = await findHorizon(page, await inkOf(page))
    expect(Math.abs(horizon.width - HORIZON_PX), 'width').toBeLessThanOrEqual(
      HORIZON_PX * HORIZON_SLACK
    )
    // invariant: the disk covers the horizon's lower part, so its height is
    // read between the photon ring's peaks over and under it.
    const pixels = await firstScreen(page)
    const peak = (from: number, to: number) => {
      let best = { y: from, lum: -1 }
      for (let y = from; y <= to; y++) {
        const lum = luminanceAt(pixels, horizon.cx, y)
        if (lum > best.lum) best = { y, lum }
      }
      return best.y
    }
    const reach = horizon.width * 0.15
    const top = peak(horizon.y0 - reach, horizon.y0 + reach)
    const bottom = peak(
      horizon.y0 + horizon.width - reach,
      horizon.y0 + horizon.width + reach
    )
    const height = (bottom - top) / RING_AT
    expect(
      Math.abs(height - HORIZON_PX),
      `height ${height}`
    ).toBeLessThanOrEqual(HORIZON_PX * HORIZON_SLACK)
  })

  test('a thin bright photon ring hugs the horizon', async ({ page }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const pixels = await firstScreen(page)
    const horizon = horizonIn(pixels, await inkOf(page))
    if (!horizon) throw new Error('no event horizon on screen')
    const radius = horizon.width / 2
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 18) {
      const fromBand = Math.min(
        Math.abs(Math.sin(angle)),
        Math.abs(Math.sin(angle - Math.PI))
      )
      if (fromBand < Math.sin(BAND_ANGLE)) continue
      const at = (reach: number) =>
        luminanceAt(
          pixels,
          horizon.cx + (radius + reach) * Math.cos(angle),
          horizon.cy + (radius + reach) * Math.sin(angle)
        )
      let peak = -1
      const grown = horizon.width / 96
      for (let reach = -1; reach <= RING_REACH_PX * grown; reach += 0.5)
        if (at(reach) > at(peak)) peak = reach
      const label = `ring at ${Math.round((angle * 180) / Math.PI)}°`
      expect(at(peak), label).toBeGreaterThan(RING_MIN)
      // invariant: thin: the bright run through the peak is a few px across.
      let inner = peak
      let outer = peak
      while (
        at(inner - 0.5) > RING_MIN &&
        peak - inner < 2 * RING_THIN_PX * grown
      )
        inner -= 0.5
      while (
        at(outer + 0.5) > RING_MIN &&
        outer - peak < 2 * RING_THIN_PX * grown
      )
        outer += 0.5
      expect(outer - inner, `${label}: width`).toBeLessThanOrEqual(
        RING_THIN_PX * grown
      )
    }
  })

  test('the disk is about 800px wide', async ({ page }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const pixels = await firstScreen(page)
    const ink = await inkOf(page)
    const horizon = horizonIn(pixels, ink)
    if (!horizon) throw new Error('no event horizon on screen')
    const { width } = diskSpan(pixels, ink, horizon)
    expect(width).toBeGreaterThanOrEqual(DISK_SPAN.min)
    expect(width).toBeLessThanOrEqual(DISK_SPAN.max)
  })

  test('the disk is inclined: 0.2 to 0.32 as tall as wide', async ({
    page
  }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const pixels = await firstScreen(page)
    const ink = await inkOf(page)
    const horizon = horizonIn(pixels, ink)
    if (!horizon) throw new Error('no event horizon on screen')
    const ratio = inclination(pixels, ink, horizon)
    expect(ratio).toBeGreaterThanOrEqual(INCLINED.min)
    expect(ratio).toBeLessThanOrEqual(INCLINED.max)
  })

  test('the near half of the disk crosses in front of the horizon', async ({
    page
  }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const pixels = await firstScreen(page)
    const ink = await inkOf(page)
    const horizon = horizonIn(pixels, ink)
    if (!horizon) throw new Error('no event horizon on screen')
    const radius = horizon.width / 2
    let lit = 0
    let rows = 0
    for (
      let y = horizon.cy + NEAR_HALF.from * radius;
      y <= horizon.cy + NEAR_HALF.to * radius;
      y++
    ) {
      rows++
      if (isLit(pixels, ink, horizon.cx, y)) lit++
    }
    expect(lit, `${lit} of ${rows} rows lit`).toBeGreaterThanOrEqual(rows / 2)
  })

  test('the far half arches over the top of the horizon', async ({ page }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const pixels = await firstScreen(page)
    const horizon = horizonIn(pixels, await inkOf(page))
    if (!horizon) throw new Error('no event horizon on screen')
    const radius = horizon.width / 2
    for (let degrees = OVER.from; degrees <= OVER.to; degrees += OVER.step) {
      const angle = (degrees * Math.PI) / 180
      let brightest = 0
      for (let r = ARC_REACH.from; r <= ARC_REACH.to; r += 0.02)
        brightest = Math.max(
          brightest,
          luminanceAt(
            pixels,
            horizon.cx + r * radius * Math.cos(angle),
            horizon.cy - r * radius * Math.sin(angle)
          )
        )
      expect(brightest, `arc at ${degrees}°`).toBeGreaterThan(ARC_LIT)
    }
  })

  test('a thinner, fainter arc runs under the horizon', async ({ page }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const pixels = await firstScreen(page)
    const horizon = horizonIn(pixels, await inkOf(page))
    if (!horizon) throw new Error('no event horizon on screen')
    const over = vertical(pixels, horizon, -1, ARC_REACH)
    const under = vertical(pixels, horizon, 1, ARC_REACH)
    const seen = (values: number[]) =>
      values.filter(value => value > ARC_SEEN).length
    const label = `over ${seen(over)}px at ${Math.max(...over)}, under ${seen(under)}px at ${Math.max(...under)}`
    expect(seen(under), label).toBeGreaterThanOrEqual(2)
    expect(seen(under), label).toBeLessThan(seen(over))
    expect(Math.max(...under), label).toBeLessThan(Math.max(...over))
  })

  test('one side of the disk is at least 1.5 times brighter', async ({
    page
  }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const pixels = await firstScreen(page)
    const horizon = horizonIn(pixels, await inkOf(page))
    if (!horizon) throw new Error('no event horizon on screen')
    const radius = horizon.width / 2
    const side = (sign: -1 | 1) => {
      let sum = 0
      let count = 0
      for (
        let dy = -DISK_REACH.rows * radius;
        dy <= DISK_REACH.rows * radius;
        dy++
      )
        for (
          let dx = DISK_REACH.from * radius;
          dx <= DISK_REACH.to * radius;
          dx++
        ) {
          sum += luminanceAt(pixels, horizon.cx + sign * dx, horizon.cy + dy)
          count++
        }
      return sum / count
    }
    const left = side(-1)
    const right = side(1)
    expect(
      Math.max(left, right) / Math.min(left, right),
      `left ${left}, right ${right}`
    ).toBeGreaterThanOrEqual(BRIGHTER_SIDE)
  })

  test('the black hole is drawn in cool blues only', async ({ page }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const pixels = await firstScreen(page)
    const horizon = horizonIn(pixels, await inkOf(page))
    if (!horizon) throw new Error('no event horizon on screen')
    let lit = 0
    for (let y = horizon.cy - 120; y <= horizon.cy + 120; y++)
      for (let x = horizon.cx - 240; x <= horizon.cx + 240; x++) {
        if (luminanceAt(pixels, x, y) <= 0.03) continue
        lit++
        const [r = 0, g = 0, b = 0] = pixelAt(pixels, x, y)
        expect(b, `blue over red at ${x},${y}`).toBeGreaterThanOrEqual(r)
        expect(b, `blue over green at ${x},${y}`).toBeGreaterThanOrEqual(g - 2)
      }
    expect(lit, 'the black hole is lit').toBeGreaterThan(2000)
  })

  test("the black hole lights the logo's facing side", async ({ page }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const pixels = await firstScreen(page)
    const ink = await inkOf(page)
    const horizon = horizonIn(pixels, ink)
    if (!horizon) throw new Error('no event horizon on screen')
    // why: the logo floats up and right of the resting black hole. Past
    // 3.5 horizon radii right of its centre, the disk is under 0.9 radii
    // below and above it there only its faint glow reaches; up there,
    // everything not background is the logo.
    const radius = horizon.width / 2
    const logo: { x: number; y: number; lum: number }[] = []
    for (let y = 0; y < horizon.cy - 0.9 * radius; y++)
      for (let x = Math.round(horizon.cx + 3.5 * radius); x < pixels.width; x++)
        if (channelGap(pixelAt(pixels, x, y), ink) > 24)
          logo.push({ x, y, lum: luminanceAt(pixels, x, y) })
    expect(logo.length, 'the logo is on screen').toBeGreaterThan(500)
    const middle = logo.reduce((sum, { x }) => sum + x, 0) / logo.length
    const mean = (side: typeof logo) =>
      side.reduce((sum, { lum }) => sum + lum, 0) / side.length
    const facing = mean(logo.filter(({ x }) => x < middle))
    const away = mean(logo.filter(({ x }) => x >= middle))
    expect(facing, `facing ${facing}, away ${away}`).toBeGreaterThan(
      away * LIT_SIDE
    )
  })
})

test.describe('narrow screen', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 375, height: 667 } })

  test('the horizon shrinks on a narrow screen', async ({ page }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const horizon = await findHorizon(page, await inkOf(page))
    // why: the icons shrink by the view's width at the origin (camera at
    // 0, 1, 7 with a 40° fov) over the 6 units the layout fits, and grow
    // with the view's height in px; the horizon follows the same rule.
    const viewWidth =
      (375 / 667) * 2 * Math.hypot(1, 7) * Math.tan((20 * Math.PI) / 180)
    const expected = HORIZON_PX * Math.min(1, viewWidth / 6) * (667 / 900)
    expect(Math.abs(horizon.width - expected)).toBeLessThanOrEqual(
      expected * HORIZON_SLACK
    )
  })
})

test('the black hole wanders', async ({ page }) => {
  await gotoStopped(page, 500)
  await showSceneOnly(page)
  const ink = await inkOf(page)
  const before = await findHorizon(page, ink)
  await page.clock.runFor(WANDER_MS)
  const after = await findHorizon(page, ink)
  expect(
    Math.hypot(after.cx - before.cx, after.cy - before.cy)
  ).toBeGreaterThanOrEqual(MIN_WANDER_PX)
})

test("the disk's pattern turns", async ({ page }) => {
  await gotoStopped(page, 500)
  await showSceneOnly(page)
  const ink = await inkOf(page)
  const capture = async () => {
    const pixels = await firstScreen(page)
    const horizon = horizonIn(pixels, ink)
    if (!horizon) throw new Error('no event horizon on screen')
    return { pixels, horizon }
  }
  const first = await capture()
  await page.clock.runFor(1000)
  const second = await capture()
  // why: the bent back of the disk, over and under the horizon, carries the
  // same turning gas as the disk and is thick enough that the black hole
  // moving between captures barely changes it once the two are aligned.
  // invariant: the black hole grows and shrinks as it rises, so each
  // capture is sampled at the same angles and radii of its own horizon.
  const radii = [first, second].map(({ horizon }) => horizon.width / 2)
  const arc: { reach: number; angle: number }[] = []
  for (let reach = 1.15; reach <= 1.5; reach += 0.03)
    for (let angle = 0; angle < 2 * Math.PI; angle += 0.02)
      if (Math.abs(Math.sin(angle)) > 0.6) arc.push({ reach, angle })
  const at = (index: 0 | 1, { reach, angle }: (typeof arc)[number]) => ({
    x: reach * (radii[index] ?? 0) * Math.cos(angle),
    y: reach * (radii[index] ?? 0) * Math.sin(angle)
  })
  const change = (dx: number, dy: number) => {
    let sum = 0
    for (const point of arc) {
      const one = at(0, point)
      const two = at(1, point)
      const a = pixelAt(
        first.pixels,
        first.horizon.cx + one.x,
        first.horizon.cy + one.y
      )
      const b = pixelAt(
        second.pixels,
        second.horizon.cx + two.x + dx,
        second.horizon.cy + two.y + dy
      )
      for (let channel = 0; channel < 3; channel++)
        sum += Math.abs((a[channel] ?? 0) - (b[channel] ?? 0))
    }
    return sum / (arc.length * 3)
  }
  let least = Infinity
  for (let dx = -ALIGN_PX; dx <= ALIGN_PX; dx++)
    for (let dy = -ALIGN_PX; dy <= ALIGN_PX; dy++)
      least = Math.min(least, change(dx, dy))
  expect(least).toBeGreaterThan(TURNED_LEVELS)
})

test("the disk's tilt changes on screen", async ({ page }) => {
  await gotoStopped(page, 500)
  await showSceneOnly(page)
  const ink = await inkOf(page)
  const read = async () => {
    const pixels = await firstScreen(page)
    const horizon = horizonIn(pixels, ink)
    if (!horizon) throw new Error('no event horizon on screen')
    return inclination(pixels, ink, horizon)
  }
  const before = await read()
  await page.clock.runFor(TILT_GAP_MS)
  const after = await read()
  expect(
    Math.abs(after - before),
    `${before} then ${after}`
  ).toBeGreaterThanOrEqual(TILT_CHANGE)
})

test('the black hole grows and shrinks as it rises', async ({ page }) => {
  await gotoStopped(page, 500)
  await showSceneOnly(page)
  const ink = await inkOf(page)
  const sizes: number[] = []
  for (let sample = 0; sample < GROW_SAMPLES; sample++) {
    if (sample) await page.clock.runFor(GROW_STEP_MS)
    const horizon = await findHorizon(page, ink)
    // invariant: the size it has for its depth on the sheet is set apart,
    // leaving only how far it has risen.
    sizes.push(horizon.width / sheetScaleAt(horizon.cy, 900))
  }
  const ratio = Math.max(...sizes) / Math.min(...sizes)
  expect(ratio, sizes.map(Math.round).join(', ')).toBeGreaterThanOrEqual(GROWS)
})

test('the notebook shows no black hole', async ({ page }) => {
  await gotoNotebook(page)
  const pixels = await firstScreen(page)
  let top = 0
  for (let y = 0; y < pixels.height * SKY_SHARE; y++)
    for (let x = 0; x < pixels.width; x++)
      top = Math.max(top, luminanceAt(pixels, x, y))
  expect(top, 'brightest pixel above the laptop').toBeLessThan(DARK_SKY_MAX)
})
