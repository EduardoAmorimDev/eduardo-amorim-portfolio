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
  channels,
  gotoStopped,
  luminanceAt,
  pixelAt,
  screenPixels,
  tokenRgb,
  type Pixels
} from './page-helpers'

// why: the checklist's own numbers (gravity C33–C39, C41).
const INNER = 80
const RADIUS = 160
const CENTRE_SLACK = 2
const OPEN_MS = 150
// why: the lens starts opening on the first frame after the pointer
// arrives, up to one frame (1/60 s) later.
const FRAME_MS = 17
const FOLLOW_MS = 100
const CLOSE_MS = 300
const ALPHA_SLACK = 8
const FULL_ALPHA = 200
const DIM = 0.3
const LIT = 0.6
// why: halfway through the fade the title is half solid, half outline;
// a quarter either side is still plainly in between.
const MIDWAY = { at: 120, reach: 10, from: 0.25, to: 0.75 }
// why: at 1440×900 the title's box spans 80–1360 × 278–558; inside it, a
// point on the first line, and the same line 96 px on; outside it, a point
// in the hero below the subtitle, beyond the reach of the pointer's well.
const ON_TITLE = { x: 500, y: 380 }
const ON_TITLE_LATER = { x: 596, y: 380 }
const OFF_TITLE = { x: 300, y: 760 }

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

/** The lens's fade at `distance` px from its centre, per the checklist. */
const intensity = (distance: number) =>
  Math.min(1, Math.max(0, (RADIUS - distance) / (RADIUS - INNER)))

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

/** Lens open at `spot` and settled; the clock is stopped throughout. */
const openAt = async (page: Page, spot: { x: number; y: number }) => {
  await sweepPointer(page, spot)
  await page.clock.runFor(400)
}

/**
 * Where the title's lens masks are centred and how far they reach, in
 * screen px: the lens as the title shows it.
 */
const lensOnTitle = (page: Page) =>
  page.locator('[data-lens="solid"]').evaluate(element => {
    if (!(element instanceof HTMLElement)) throw new Error('no title')
    const box = element.getBoundingClientRect()
    const read = (name: string) =>
      parseFloat(element.style.getPropertyValue(name))
    return {
      x: box.left + read('--lens-x'),
      y: box.top + read('--lens-y'),
      inner: read('--lens-in'),
      outer: read('--lens-out')
    }
  })

type TitleCapture = {
  clip: { x: number; y: number; width: number; height: number }
  before: Pixels
  fill: { x: number; y: number }[]
}

/** The title as painted with no lens, and the pixels deep in its letters. */
const captureTitle = async (page: Page): Promise<TitleCapture> => {
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
  for (let y = 3; y < before.height - 3; y += 2)
    for (let x = 3; x < before.width - 3; x += 2) {
      let solid = true
      for (let dy = -3; dy <= 3 && solid; dy++)
        for (let dx = -3; dx <= 3 && solid; dx++)
          solid = luminanceAt(before, x + dx, y + dy) > LIT
      if (solid) fill.push({ x, y })
    }
  expect(fill.length, 'letters have a fill').toBeGreaterThan(200)
  return { clip, before, fill }
}

/** Share of the fill still lit, solid, in a fresh capture. */
const solidShare = async (page: Page, { clip, fill }: TitleCapture) => {
  const now = await screenPixels(page, clip)
  return (
    fill.filter(({ x, y }) => luminanceAt(now, x, y) > LIT).length / fill.length
  )
}

test('no lens over the hero outside the title', async ({ page }) => {
  await gotoStopped(page, 300)
  const title = await captureTitle(page)
  await openAt(page, OFF_TITLE)
  expect(isBlank(await readCanvas(page, 'hero-lens')), 'stars').toBe(true)
  expect(await solidShare(page, title), 'title solid').toBe(1)
})

test('the lens opens on the title within 150ms and follows within 100ms', async ({
  page
}) => {
  await gotoStopped(page, 300)
  await sweepPointer(page, ON_TITLE)
  await page.clock.runFor(OPEN_MS + FRAME_MS)
  const opened = await lensOnTitle(page)
  expect(opened.outer, 'fully open').toBeGreaterThanOrEqual(RADIUS - 0.5)
  expect(opened.inner, 'fully open').toBeGreaterThanOrEqual(INNER - 0.5)
  expect(isBlank(await readCanvas(page, 'hero-lens')), 'stars').toBe(false)
  await page.mouse.move(ON_TITLE_LATER.x, ON_TITLE_LATER.y)
  await page.clock.runFor(FOLLOW_MS)
  const moved = await lensOnTitle(page)
  expect(
    Math.hypot(moved.x - ON_TITLE_LATER.x, moved.y - ON_TITLE_LATER.y)
  ).toBeLessThanOrEqual(CENTRE_SLACK)
})

test('the lens closes within 300ms of leaving the title', async ({ page }) => {
  await gotoStopped(page, 300)
  const title = await captureTitle(page)
  await openAt(page, ON_TITLE)
  expect(isBlank(await readCanvas(page, 'hero-lens'))).toBe(false)
  expect(await solidShare(page, title), 'title opened').toBeLessThan(0.99)
  await page.mouse.move(OFF_TITLE.x, OFF_TITLE.y, { steps: 4 })
  await page.clock.runFor(CLOSE_MS)
  expect(isBlank(await readCanvas(page, 'hero-lens')), 'stars').toBe(true)
  expect(await solidShare(page, title), 'title solid').toBe(1)
})

test('the lens has no ring and nothing past 160px', async ({ page }) => {
  await seedRandom(page)
  await gotoStopped(page, 300)
  await openAt(page, ON_TITLE)
  const centre = await lensOnTitle(page)
  expect(
    Math.hypot(centre.x - ON_TITLE.x, centre.y - ON_TITLE.y)
  ).toBeLessThanOrEqual(CENTRE_SLACK)
  const pixels = inked(await readCanvas(page, 'hero-lens'))
  expect(pixels.length, 'the lens is drawn').toBeGreaterThan(50)
  const past = pixels.filter(
    ({ x, y }) => Math.hypot(x - centre.x, y - centre.y) >= RADIUS
  )
  expect(past.length, 'inked pixels 160px or more from the centre').toBe(0)
})

test('nothing in the lens is brighter than its fade allows', async ({
  page
}) => {
  await seedRandom(page)
  await gotoStopped(page, 300)
  await openAt(page, ON_TITLE)
  const centre = await lensOnTitle(page)
  const pixels = inked(await readCanvas(page, 'hero-lens'))
  let fullest = 0
  for (const { x, y, alpha } of pixels) {
    const distance = Math.hypot(x - centre.x, y - centre.y)
    expect(
      alpha,
      `alpha ${Math.round(distance)}px from the centre`
    ).toBeLessThanOrEqual(255 * intensity(distance) + ALPHA_SLACK)
    if (distance < INNER) fullest = Math.max(fullest, alpha)
  }
  // invariant: within 80 px nothing is faded, so a star there is opaque.
  expect(fullest, 'a whole star within 80px').toBeGreaterThanOrEqual(FULL_ALPHA)
})

test('the title turns to outline inside the lens and fades back to solid', async ({
  page
}) => {
  await gotoStopped(page, 300)
  const title = await captureTitle(page)
  await openAt(page, ON_TITLE)
  const centre = await lensOnTitle(page)
  // why: the stars are drawn on their own canvas; hidden for this capture,
  // nothing but the title, its outline and the grid sits in the letters.
  await page.locator('[data-testid="hero-lens"]').evaluate(canvas => {
    if (canvas instanceof HTMLElement) canvas.style.visibility = 'hidden'
  })
  const after = await screenPixels(page, title.clip)
  const from = ({ x, y }: { x: number; y: number }) =>
    Math.hypot(x + title.clip.x - centre.x, y + title.clip.y - centre.y)
  const inside = title.fill.filter(point => from(point) < INNER - 10)
  const outside = title.fill.filter(point => from(point) > RADIUS + 10)
  const midway = title.fill.filter(
    point => Math.abs(from(point) - MIDWAY.at) <= MIDWAY.reach
  )
  for (const [name, set] of [
    ['inside', inside],
    ['outside', outside],
    ['midway', midway]
  ] as const)
    expect(set.length, `fill ${name}`).toBeGreaterThan(30)
  const share = (points: typeof inside, test: (lum: number) => boolean) =>
    points.filter(({ x, y }) => test(luminanceAt(after, x, y))).length /
    points.length
  expect(
    share(inside, lum => lum < DIM),
    'outline only inside'
  ).toBe(1)
  expect(
    share(outside, lum => lum > LIT),
    'solid outside'
  ).toBeGreaterThan(0.95)
  // invariant: midway the fill is neither the letter nor the background:
  // its red channel sits between the two, by the fade's share.
  const [inkRed = 0] = channels(await tokenRgb(page, 'ink'))
  const kept =
    midway.reduce((sum, { x, y }) => {
      const [was = 0] = pixelAt(title.before, x, y)
      const [now = 0] = pixelAt(after, x, y)
      return sum + (now - inkRed) / (was - inkRed)
    }, 0) / midway.length
  expect(kept, 'fill kept midway').toBeGreaterThanOrEqual(MIDWAY.from)
  expect(kept, 'fill kept midway').toBeLessThanOrEqual(MIDWAY.to)
})

test('the lens is gone within 300ms of leaving the hero', async ({ page }) => {
  await gotoStopped(page, 300)
  // why: half the hero scrolled away leaves room below it to take the mouse
  // out of the hero; the title's box then reaches down to ~108 px.
  await page.evaluate(() => window.scrollTo({ top: 450, behavior: 'instant' }))
  await page.clock.runFor(50)
  await openAt(page, { x: ON_TITLE.x, y: 50 })
  expect(isBlank(await readCanvas(page, 'hero-lens'))).toBe(false)
  await page.mouse.move(ON_TITLE.x, 700, { steps: 4 })
  await page.clock.runFor(CLOSE_MS)
  expect(isBlank(await readCanvas(page, 'hero-lens'))).toBe(true)
  expect((await lensOnTitle(page)).outer).toBe(-1)
})

test('touch and pen open no lens', async ({ page }) => {
  await gotoStopped(page, 300)
  await page.evaluate(spot => {
    for (const pointerType of ['touch', 'pen'])
      for (const type of ['pointerover', 'pointerenter', 'pointermove'])
        window.dispatchEvent(
          new PointerEvent(type, {
            pointerType,
            clientX: spot.x,
            clientY: spot.y,
            bubbles: true
          })
        )
  }, ON_TITLE)
  await page.clock.runFor(400)
  expect(isBlank(await readCanvas(page, 'hero-lens'))).toBe(true)
})

test.describe('touch screen', () => {
  test.use({ hasTouch: true })

  test('a tap opens no lens', async ({ page }) => {
    await gotoStopped(page, 300)
    await page.touchscreen.tap(ON_TITLE.x, ON_TITLE.y)
    await page.clock.runFor(400)
    expect(isBlank(await readCanvas(page, 'hero-lens'))).toBe(true)
  })
})
