import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
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

// why: the checklist's own numbers (C47–C52, C57, C59, C60).
const HORIZON_PX = 96
const HORIZON_SLACK = 0.1
const RING_REACH_PX = 8
const RING_MIN = 0.5
const DISK_SPAN = { min: 340, max: 460 }
const DISK_AT_PX = 150
const DISK_MAX_THICK = 30
// why: in horizon diameters from the centre: the disk's inner part and its
// outer stretch, short of where it fades out.
const DISK_HEART = 0.85
const DISK_EDGE = 1.8
const DISK_FADE = 0.2
const MIN_WANDER_PX = 30
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
// why: the disk is drawn at the horizon's centre row band, a little below
// the centre; a few rows cover it.
const BAND_ROWS = 18
// why: the band is the only thing lit near the horizontal through the
// centre; the photon ring is read away from it.
const BAND_ANGLE = Math.PI / 7
// why: a notebook screen's top share, above the laptop, holds sky alone.
const SKY_SHARE = 0.3
const DARK_SKY_MAX = 0.1

const inkOf = async (page: Page) => channels(await tokenRgb(page, 'ink'))

const isLit = (pixels: Pixels, ink: readonly number[], x: number, y: number) =>
  channelGap(pixelAt(pixels, x, y), ink) > LIT_GAP

/** The longest lit run along row `y` through `x`, as [from, to]. */
const litRun = (
  pixels: Pixels,
  ink: readonly number[],
  x: number,
  y: number
) => {
  let from = Math.round(x)
  let to = Math.round(x)
  while (from > 0 && isLit(pixels, ink, from - 1, y)) from--
  while (to < pixels.width - 1 && isLit(pixels, ink, to + 1, y)) to++
  return [from, to] as const
}

/** The row of the band through the horizon: the most lit one across it. */
const bandRow = (pixels: Pixels, horizon: Box) => {
  let best = { y: horizon.cy, lit: -1 }
  for (let y = horizon.cy - BAND_ROWS; y <= horizon.cy + BAND_ROWS; y++) {
    let lit = 0
    for (let x = horizon.x0; x <= horizon.x1; x++)
      lit += luminanceAt(pixels, x, y)
    if (lit > best.lit) best = { y, lit }
  }
  return best.y
}

test.describe('at rest', () => {
  test.use({ reducedMotion: 'reduce' })

  test('a 96px event horizon', async ({ page }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const horizon = await findHorizon(page, await inkOf(page))
    for (const side of [horizon.width, horizon.height])
      expect(Math.abs(side - HORIZON_PX)).toBeLessThanOrEqual(
        HORIZON_PX * HORIZON_SLACK
      )
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
      let brightest = 0
      for (let reach = -1; reach <= RING_REACH_PX; reach += 0.5)
        brightest = Math.max(
          brightest,
          luminanceAt(
            pixels,
            horizon.cx + (radius + reach) * Math.cos(angle),
            horizon.cy + (radius + reach) * Math.sin(angle)
          )
        )
      expect(
        brightest,
        `ring at ${Math.round((angle * 180) / Math.PI)}°`
      ).toBeGreaterThan(RING_MIN)
    }
  })

  test('an edge-on disk about 400px wide crosses the horizon', async ({
    page
  }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const pixels = await firstScreen(page)
    const ink = await inkOf(page)
    const horizon = horizonIn(pixels, ink)
    if (!horizon) throw new Error('no event horizon on screen')
    const row = bandRow(pixels, horizon)
    // invariant: inside the horizon, the band's row is lit, in front of it.
    for (
      let x = horizon.cx - horizon.width / 4;
      x <= horizon.cx + horizon.width / 4;
      x++
    )
      expect(isLit(pixels, ink, x, row), `inside at ${x}`).toBe(true)
    const [from, to] = litRun(pixels, ink, horizon.cx, row)
    expect(to - from + 1).toBeGreaterThanOrEqual(DISK_SPAN.min)
    expect(to - from + 1).toBeLessThanOrEqual(DISK_SPAN.max)
    // invariant: the disk is mist at its heart and the brand blue at its
    // edge: red over blue falls from mist's ~0.95 towards primary's ~0.26.
    const redOverBlue = (offset: number) => {
      let red = 0
      let blue = 0
      for (const side of [-1, 1])
        for (let dx = -4; dx <= 4; dx++) {
          const [r = 0, , b = 0] = pixelAt(
            pixels,
            horizon.cx + side * offset + dx,
            row
          )
          red += r
          blue += b
        }
      return red / blue
    }
    const heart = redOverBlue(horizon.width * DISK_HEART)
    const edge = redOverBlue(horizon.width * DISK_EDGE)
    expect(heart, `heart ${heart}, edge ${edge}`).toBeGreaterThan(
      edge + DISK_FADE
    )
    for (const x of [horizon.cx - DISK_AT_PX, horizon.cx + DISK_AT_PX]) {
      let top = row
      let bottom = row
      while (isLit(pixels, ink, x, top - 1)) top--
      while (isLit(pixels, ink, x, bottom + 1)) bottom++
      expect(bottom - top + 1, `thickness at ${x}`).toBeLessThanOrEqual(
        DISK_MAX_THICK
      )
    }
  })

  test('the back of the disk arches over and under the horizon', async ({
    page
  }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const pixels = await firstScreen(page)
    const horizon = horizonIn(pixels, await inkOf(page))
    if (!horizon) throw new Error('no event horizon on screen')
    const reach = horizon.width / 4
    const peak = (from: number, to: number) => {
      let best = 0
      for (let y = from; y <= to; y++)
        best = Math.max(best, luminanceAt(pixels, horizon.cx, y))
      return best
    }
    // why: past the photon ring, within a quarter diameter of the horizon.
    expect(peak(horizon.y0 - reach, horizon.y0 - 4), 'over').toBeGreaterThan(
      ARC_LIT
    )
    expect(peak(horizon.y1 + 4, horizon.y1 + reach), 'under').toBeGreaterThan(
      ARC_LIT
    )
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
    // why: the logo floats right of the resting black hole; past its disk,
    // everything not background is the logo.
    const logo: { x: number; y: number; lum: number }[] = []
    for (let y = 0; y < pixels.height; y++)
      for (let x = Math.round(horizon.cx + 260); x < pixels.width; x++)
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
  await page.clock.runFor(2000)
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
  const radius = first.horizon.width / 2
  const arc: { x: number; y: number }[] = []
  for (let reach = 1.15; reach <= 1.5; reach += 0.03)
    for (let angle = 0; angle < 2 * Math.PI; angle += 0.02)
      if (Math.abs(Math.sin(angle)) > 0.6)
        arc.push({
          x: reach * radius * Math.cos(angle),
          y: reach * radius * Math.sin(angle)
        })
  const change = (dx: number, dy: number) => {
    let sum = 0
    for (const { x, y } of arc) {
      const a = pixelAt(
        first.pixels,
        first.horizon.cx + x,
        first.horizon.cy + y
      )
      const b = pixelAt(
        second.pixels,
        second.horizon.cx + x + dx,
        second.horizon.cy + y + dy
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

test('the notebook shows no black hole', async ({ page }) => {
  await gotoNotebook(page)
  const pixels = await firstScreen(page)
  let top = 0
  for (let y = 0; y < pixels.height * SKY_SHARE; y++)
    for (let x = 0; x < pixels.width; x++)
      top = Math.max(top, luminanceAt(pixels, x, y))
  expect(top, 'brightest pixel above the laptop').toBeLessThan(DARK_SKY_MAX)
})
