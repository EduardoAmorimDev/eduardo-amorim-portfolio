import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  isBlank,
  readCanvas,
  sweepPointer,
  type GridImage
} from './grid-helpers'
import {
  boxesOf,
  channelGap,
  channels,
  gotoStopped,
  luminanceAt,
  pixelAt,
  screenPixels,
  tokenRgb
} from './page-helpers'

// why: the checklist's own numbers (C38, C39, C41, C43).
const RADIUS = 120
const RADIUS_SLACK = 1.5
const CENTRE_SLACK = 2
const RING_ALPHA = 0.3
const FOLLOW_MS = 100
const CLOSE_MS = 300
const STARS = { min: 6, max: 10 }
const STAR_BOX = { min: 2, max: 4 }
// why: a star is drawn opaque; the lines joining them, and the ring, are
// faint, so a high alpha tells a star from the rest.
const STAR_ALPHA = 0.6 * 255
const OUTSIDE = RADIUS + 2
const MIST_SLACK = 1
const DIM = 0.3
const LIT = 0.6
const STROKE_SLACK = 12

/**
 * Replaces Math.random, from the first script on, with a seeded generator,
 * so every run draws the same constellation.
 */
const seedRandom = (page: Page) =>
  page.addInitScript(() => {
    let state = 0x2545f491
    Math.random = () => {
      state = (state + 0x6d2b79f5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  })

type Pixel = { x: number; y: number; alpha: number; rgb: number[] }

/** Every inked pixel of a canvas reading, in CSS px. */
const inked = ({ pixels, scale }: GridImage) => {
  const found: Pixel[] = []
  for (let y = 0; y < pixels.height; y++)
    for (let x = 0; x < pixels.width; x++) {
      const index = (y * pixels.width + x) * 4
      const alpha = pixels.data[index + 3] ?? 0
      if (!alpha) continue
      found.push({
        x: (x + 0.5) / scale,
        y: (y + 0.5) / scale,
        alpha,
        rgb: [0, 1, 2].map(channel => pixels.data[index + channel] ?? 0)
      })
    }
  return found
}

/** The ring: the faint inked pixels near the lens radius from `around`. */
const ringOf = (pixels: Pixel[], around: { x: number; y: number }) => {
  const ring = pixels.filter(({ x, y }) => {
    const reach = Math.hypot(x - around.x, y - around.y)
    return reach > RADIUS - 8 && reach < RADIUS + 8
  })
  const weight = ring.reduce((sum, { alpha }) => sum + alpha, 0)
  const centre = {
    x: ring.reduce((sum, { x, alpha }) => sum + x * alpha, 0) / weight,
    y: ring.reduce((sum, { y, alpha }) => sum + y * alpha, 0) / weight
  }
  const radius =
    ring.reduce(
      (sum, { x, y, alpha }) =>
        sum + Math.hypot(x - centre.x, y - centre.y) * alpha,
      0
    ) / weight
  return { ring, centre, radius }
}

/** Groups pixels into touching clusters (8-neighbourhood). */
const clusters = (pixels: Pixel[]) => {
  const key = ({ x, y }: { x: number; y: number }) =>
    `${Math.floor(x)},${Math.floor(y)}`
  const left = new Map(pixels.map(pixel => [key(pixel), pixel]))
  const groups: Pixel[][] = []
  for (const start of pixels) {
    if (!left.has(key(start))) continue
    left.delete(key(start))
    const group = [start]
    for (let index = 0; index < group.length; index++) {
      const { x, y } = group[index] ?? start
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const next = left.get(key({ x: x + dx, y: y + dy }))
          if (!next) continue
          left.delete(key(next))
          group.push(next)
        }
    }
    groups.push(group)
  }
  return groups
}

/** Lens open at `spot` and settled; the clock is stopped throughout. */
const openAt = async (page: Page, spot: { x: number; y: number }) => {
  await sweepPointer(page, spot)
  await page.clock.runFor(400)
}

test('a 120px lens with a faint mist ring follows the mouse within 100ms', async ({
  page
}) => {
  await gotoStopped(page, 300)
  const first = { x: 400, y: 650 }
  const second = { x: first.x + 96, y: first.y }
  await openAt(page, first)
  await page.mouse.move(second.x, second.y)
  await page.clock.runFor(FOLLOW_MS)
  const { ring, centre, radius } = ringOf(
    inked(await readCanvas(page, 'hero-lens')),
    second
  )
  expect(ring.length).toBeGreaterThan(200)
  expect(
    Math.hypot(centre.x - second.x, centre.y - second.y)
  ).toBeLessThanOrEqual(CENTRE_SLACK)
  expect(Math.abs(radius - RADIUS)).toBeLessThanOrEqual(RADIUS_SLACK)
  const mist = channels(await tokenRgb(page, 'mist'))
  for (const { rgb, alpha } of ring) {
    expect(alpha).toBeLessThanOrEqual(RING_ALPHA * 255 + 1)
    // why: a faint pixel's colour is stored times its alpha and read back
    // divided by it, rounding twice: up to 2 × 255 / alpha levels off.
    if (alpha >= 40)
      expect(channelGap(rgb, mist)).toBeLessThanOrEqual(
        MIST_SLACK + (2 * 255) / alpha
      )
  }
})

test('the lens shows 6 to 10 stars and nothing outside its circle', async ({
  page
}) => {
  await seedRandom(page)
  await gotoStopped(page, 300)
  const spot = { x: 400, y: 650 }
  await openAt(page, spot)
  const pixels = inked(await readCanvas(page, 'hero-lens'))
  const outside = pixels.filter(
    ({ x, y }) => Math.hypot(x - spot.x, y - spot.y) > OUTSIDE
  )
  expect(outside.length, 'inked pixels outside the circle').toBe(0)
  const stars = clusters(
    pixels.filter(
      ({ x, y, alpha }) =>
        alpha >= STAR_ALPHA && Math.hypot(x - spot.x, y - spot.y) < RADIUS - 2
    )
  )
  expect(stars.length).toBeGreaterThanOrEqual(STARS.min)
  expect(stars.length).toBeLessThanOrEqual(STARS.max)
  const mist = channels(await tokenRgb(page, 'mist'))
  for (const star of stars) {
    const xs = star.map(({ x }) => x)
    const ys = star.map(({ y }) => y)
    const sides = [
      Math.max(...xs) - Math.min(...xs) + 1,
      Math.max(...ys) - Math.min(...ys) + 1
    ]
    // why: a 2 px dot covers at least two pixels across in one direction,
    // even placed right on a pixel's edge; a 3 px one at most four.
    expect(Math.max(...sides)).toBeGreaterThanOrEqual(STAR_BOX.min)
    for (const side of sides) expect(side).toBeLessThanOrEqual(STAR_BOX.max)
    for (const { rgb, alpha } of star)
      expect(channelGap(rgb, mist), 'star in mist').toBeLessThanOrEqual(
        MIST_SLACK + (2 * 255) / alpha
      )
  }
  // invariant: lines join the stars, so there is faint ink inside besides
  // them and the ring.
  const lines = pixels.filter(
    ({ x, y, alpha }) =>
      alpha < STAR_ALPHA && Math.hypot(x - spot.x, y - spot.y) < RADIUS - 4
  )
  expect(lines.length).toBeGreaterThan(50)
  for (const { rgb, alpha } of lines.filter(({ alpha }) => alpha >= 40))
    expect(channelGap(rgb, mist), 'line in mist').toBeLessThanOrEqual(
      MIST_SLACK + (2 * 255) / alpha
    )
})

test('inside the lens the title is an outline; outside it stays solid', async ({
  page
}) => {
  await gotoStopped(page, 300)
  const [title] = await boxesOf(page, ['#hero h1'])
  if (!title) throw new Error('no title')
  const clip = {
    x: Math.floor(title.left),
    y: Math.floor(title.top),
    width: Math.ceil(title.right - title.left),
    height: Math.ceil(title.bottom - title.top)
  }
  const before = await screenPixels(page, clip)
  // why: a pixel deep inside a letter, lit with all its neighbours, is the
  // letter's fill, not its edge.
  const fill: { x: number; y: number }[] = []
  for (let y = 3; y < before.height - 3; y++)
    for (let x = 3; x < before.width - 3; x++) {
      let solid = true
      for (let dy = -3; dy <= 3 && solid; dy++)
        for (let dx = -3; dx <= 3 && solid; dx++)
          solid = luminanceAt(before, x + dx, y + dy) > LIT
      if (solid) fill.push({ x, y })
    }
  expect(fill.length, 'letters have a fill').toBeGreaterThan(200)
  const lens = {
    x: (title.left + title.right) / 2,
    y: (title.top + title.bottom) / 2
  }
  await openAt(page, lens)
  const after = await screenPixels(page, clip)
  const at = (point: { x: number; y: number }) =>
    Math.hypot(point.x + clip.x - lens.x, point.y + clip.y - lens.y)
  const inside = fill.filter(point => at(point) < RADIUS - 10)
  const outside = fill.filter(point => at(point) > RADIUS + 10)
  expect(inside.length).toBeGreaterThan(50)
  expect(outside.length).toBeGreaterThan(50)
  const share = (points: typeof fill, test: (lum: number) => boolean) =>
    points.filter(({ x, y }) => test(luminanceAt(after, x, y))).length /
    points.length
  expect(
    share(inside, lum => lum < DIM),
    'fill gone inside'
  ).toBeGreaterThan(0.9)
  expect(
    share(outside, lum => lum > LIT),
    'fill kept outside'
  ).toBeGreaterThan(0.95)
  // invariant: the outline is drawn: lit pixels remain inside the circle,
  // along the letters' edges.
  // why: a 1 px stroke is the brightest thing in the lens bar a star, and in
  // mist; its brightest pixels sit within antialiasing of mist itself.
  const mist = channels(await tokenRgb(page, 'mist'))
  let stroke = 0
  let closest = Infinity
  for (let y = 0; y < after.height; y++)
    for (let x = 0; x < after.width; x++)
      if (at({ x, y }) < RADIUS - 10 && luminanceAt(after, x, y) > 0.5) {
        stroke++
        closest = Math.min(closest, channelGap(pixelAt(after, x, y), mist))
      }
  expect(stroke, 'outline pixels inside the lens').toBeGreaterThan(50)
  expect(closest, 'the outline is mist').toBeLessThanOrEqual(STROKE_SLACK)
})

test('the lens is gone within 300ms of leaving', async ({ page }) => {
  await gotoStopped(page, 300)
  // why: half the hero scrolled away leaves room below it to take the mouse
  // out of the hero.
  await page.evaluate(() => window.scrollTo({ top: 450, behavior: 'instant' }))
  await page.clock.runFor(50)
  await openAt(page, { x: 400, y: 200 })
  expect(isBlank(await readCanvas(page, 'hero-lens'))).toBe(false)
  await page.mouse.move(400, 700, { steps: 4 })
  await page.clock.runFor(CLOSE_MS)
  expect(isBlank(await readCanvas(page, 'hero-lens'))).toBe(true)
  const clipPath = await page
    .locator('[data-lens="outline"]')
    .evaluate(element => getComputedStyle(element).clipPath)
  expect(clipPath).toMatch(/^circle\(0px /)
})

test('touch and pen open no lens', async ({ page }) => {
  await gotoStopped(page, 300)
  await page.evaluate(() => {
    for (const pointerType of ['touch', 'pen'])
      for (const type of ['pointerover', 'pointerenter', 'pointermove'])
        window.dispatchEvent(
          new PointerEvent(type, {
            pointerType,
            clientX: 400,
            clientY: 650,
            bubbles: true
          })
        )
  })
  await page.clock.runFor(400)
  expect(isBlank(await readCanvas(page, 'hero-lens'))).toBe(true)
})

test.describe('touch screen', () => {
  test.use({ hasTouch: true })

  test('a tap opens no lens', async ({ page }) => {
    await gotoStopped(page, 300)
    await page.touchscreen.tap(400, 650)
    await page.clock.runFor(400)
    expect(isBlank(await readCanvas(page, 'hero-lens'))).toBe(true)
  })
})
