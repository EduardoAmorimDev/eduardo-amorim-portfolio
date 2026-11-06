import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { globeLayout } from '../components/organisms/you-are-here/globe-layout'
import {
  atContato,
  documentTop,
  forceLite,
  luminanceAt,
  meanLuminance,
  nextFrames,
  placeIs,
  screenPixels,
  scrollWindowTo,
  type Pixels
} from './page-helpers'

// why: the checklist's own numbers (task earth-and-sky, 2, 9-11).
const DRAG_PX = 300
const DRAG_CHANGE = 0.005
const LIFT = 0.5
const STEP = 0.02
// why: time for the globe to reach the pin and the bloom to settle.
const SETTLE_MS = 1500
const CURITIBA = { latitude: -25.43, longitude: -49.27, city: 'Curitiba' }

const canvasBox = async (page: Page) => {
  const box = await page.locator('[data-testid="globe-scene"]').boundingBox()
  if (!box) throw new Error('the globe has no box')
  return box
}

/** Share of pixels whose colour moved by more than a hair. */
const changedShare = (a: Pixels, b: Pixels) => {
  let changed = 0
  for (let index = 0; index < a.data.length; index += 4) {
    const gap = Math.max(
      Math.abs((a.data[index] ?? 0) - (b.data[index] ?? 0)),
      Math.abs((a.data[index + 1] ?? 0) - (b.data[index + 1] ?? 0)),
      Math.abs((a.data[index + 2] ?? 0) - (b.data[index + 2] ?? 0))
    )
    if (gap > 8) changed++
  }
  return changed / (a.data.length / 4)
}

test('no label over the pin', async ({ page }) => {
  await placeIs(page, CURITIBA)
  const contato = await atContato(page)
  await page.waitForTimeout(SETTLE_MS * 2)
  await expect(contato.getByText(/você está aqui/i)).toHaveCount(0)
})

test('the canvas takes no gesture', async ({ page }) => {
  await placeIs(page, CURITIBA)
  await atContato(page)
  const scene = page.locator('[data-testid="globe-scene"]')
  const { touchAction, pointerEvents, className } = await scene.evaluate(
    element => ({
      ...(({ touchAction, pointerEvents }) => ({ touchAction, pointerEvents }))(
        getComputedStyle(element)
      ),
      className: element.className
    })
  )
  expect(touchAction).toBe('auto')
  expect(pointerEvents).toBe('none')
  expect(className).not.toMatch(/cursor-grab|touch-pan-y/)
})

test.describe('under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('dragging does not turn the globe', async ({ page }) => {
    await placeIs(page, CURITIBA)
    await atContato(page)
    await page.waitForTimeout(SETTLE_MS)
    const viewport = page.viewportSize()
    if (!viewport) throw new Error('no viewport')
    // why: the globe sits right of the copy on a wide screen.
    const clip = {
      x: viewport.width / 2,
      y: 0,
      width: viewport.width / 2,
      height: viewport.height
    }
    const before = await screenPixels(page, clip)
    const centre = {
      x: viewport.width * 0.7,
      y: viewport.height / 2
    }
    await page.mouse.move(centre.x, centre.y)
    await page.mouse.down()
    await page.mouse.move(centre.x + DRAG_PX, centre.y, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(SETTLE_MS)
    const after = await screenPixels(page, clip)
    expect(changedShare(before, after)).toBeLessThan(DRAG_CHANGE)
  })
})

test('the light rises over the faq', async ({ page }) => {
  await placeIs(page, CURITIBA)
  const contato = await atContato(page)
  const section = await contato.boundingBox()
  if (!section) throw new Error('contato has no box')
  const canvas = await canvasBox(page)
  const height = await page.evaluate(() => innerHeight)
  expect(Math.abs(section.y - canvas.y - height * LIFT)).toBeLessThanOrEqual(2)
  const mask = await page
    .locator('[data-testid="globe-scene"]')
    .evaluate(element => getComputedStyle(element).maskImage)
  expect(mask).toMatch(/linear-gradient/)
})

const expectNoStep = async (page: Page) => {
  await placeIs(page, CURITIBA)
  const contato = await atContato(page)
  // why: the section's top at 40% of the screen, with half a screen of
  // risen light above it.
  const height = await page.evaluate(() => innerHeight)
  await scrollWindowTo(page, (await documentTop(contato)) - height * 0.4)
  await page.addStyleTag({
    content:
      '[data-parallax-layer], [data-testid="sections-glow"] { visibility: hidden !important }'
  })
  await nextFrames(page)
  await page.waitForTimeout(SETTLE_MS)
  const section = await contato.boundingBox()
  const viewport = page.viewportSize()
  if (!section || !viewport) throw new Error('no box')
  const pixels = await screenPixels(page, {
    x: 0,
    y: 0,
    width: viewport.width,
    height: viewport.height
  })
  // why: the globe's column, right of centre on a wide screen, in the
  // middle on a tall one.
  const column =
    viewport.width > viewport.height ? viewport.width * 0.7 : viewport.width / 2
  const band = (y: number) =>
    meanLuminance(pixels, {
      x0: column - 20,
      x1: column + 20,
      y0: y,
      y1: y + 1
    })
  const above = band(section.y - 2)
  const below = band(section.y + 2)
  expect(Math.abs(above - below)).toBeLessThan(STEP)
}

test('no step in the light at 1440 × 900', async ({ page }) => {
  await expectNoStep(page)
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('no step in the light at 390 × 844', async ({ page }) => {
    await expectNoStep(page)
  })
})

test('the faq stays above the light', async ({ page }) => {
  await placeIs(page, CURITIBA)
  const contato = await atContato(page)
  const question = page.locator('#faq details').last()
  const summary = question.locator('summary')
  await summary.scrollIntoViewIfNeeded()
  const box = await summary.boundingBox()
  const canvas = await canvasBox(page)
  const section = await contato.boundingBox()
  if (!box || !section) throw new Error('no box')
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  // invariant: the question lies where the canvas rises over the FAQ.
  expect(centre.y).toBeGreaterThan(canvas.y)
  expect(centre.y).toBeLessThan(section.y)
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest('summary') !== null,
    centre
  )
  expect(hit, 'the summary is on top').toBe(true)
  await page.mouse.click(centre.x, centre.y)
  await expect(question).toHaveAttribute('data-state', 'open')
})

// why: task portfolio-lp-mobile-smooth, 13: without the bloom, lite keeps
// the globe's light within 15% of the full scene's, over the disc and a
// ring to 1.3 radii; the camera's own numbers (you-are-here.tsx).
const LIGHT_TOLERANCE = 0.15
const LIGHT_RING = 1.3
const GLOBE_CAMERA = { z: 3.4, fov: 35 }
const MAX_LIFT = 0.6

/** Mean luminance over the globe's disc and ring, as painted now. */
const globeLight = async (page: Page) => {
  const canvas = await canvasBox(page)
  const stage = await page
    .locator('#contato')
    .evaluate(node => node.clientHeight)
  const height =
    2 * GLOBE_CAMERA.z * Math.tan(((GLOBE_CAMERA.fov / 2) * Math.PI) / 180)
  const width = (height * canvas.width) / canvas.height
  const lift = Math.min(Math.max(1 - stage / canvas.height, 0), MAX_LIFT)
  const layout = globeLayout({ width, height }, lift)
  const pxPerUnit = canvas.height / height
  const centre = {
    x: canvas.x + canvas.width / 2 + layout.x * pxPerUnit,
    y: canvas.y + canvas.height / 2 - layout.y * pxPerUnit
  }
  const radius = layout.scale * pxPerUnit * LIGHT_RING
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  const pixels = await screenPixels(page, {
    x: 0,
    y: 0,
    width: viewport.width,
    height: viewport.height
  })
  let sum = 0
  let count = 0
  for (let y = 0; y < pixels.height; y++)
    for (let x = 0; x < pixels.width; x++)
      if (Math.hypot(x - centre.x, y - centre.y) <= radius) {
        sum += luminanceAt(pixels, x, y)
        count++
      }
  return sum / Math.max(count, 1)
}

test.describe('on a phone, held still', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 3,
    reducedMotion: 'reduce'
  })

  /** Loads the page, lite or not, and measures the still globe's light. */
  const lightIn = async (page: Page, lite: boolean) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    if (lite) await forceLite(page)
    const answered = page.waitForResponse('**/api/onde-estou')
    await scrollWindowTo(page, await documentTop(page.locator('#contato')))
    await answered
    await page.waitForTimeout(SETTLE_MS * 2)
    // why: the copy over the globe is the same in both; hidden, it leaves
    // the light alone to compare.
    await page
      .locator('#contato > div.z-10')
      .evaluate(node => ((node as HTMLElement).style.visibility = 'hidden'))
    await nextFrames(page)
    return globeLight(page)
  }

  test('the globe keeps its light in lite mode', async ({ page }) => {
    test.setTimeout(90_000)
    await placeIs(page, CURITIBA)
    const full = await lightIn(page, false)
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-performance',
      'lite'
    )
    const lite = await lightIn(page, true)
    expect(full).toBeGreaterThan(0)
    expect(
      Math.abs(lite - full) / full,
      `full ${full}, lite ${lite}`
    ).toBeLessThanOrEqual(LIGHT_TOLERANCE)
  })
})
