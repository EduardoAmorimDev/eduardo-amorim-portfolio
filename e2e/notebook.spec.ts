import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  documentTop,
  gotoNotebook,
  notebookEnd,
  pixelAt,
  screenPixels,
  scrollWindowTo,
  type Pixels
} from './page-helpers'

// why: the checklist's own numbers (C50–C52).
const SCREEN_HOST = 'kune-joaoeduardoajs-projects.vercel.app'
const PAST_END = [0, 150, 300, 450, 600]
const ALIGN_PX = 3
const FRAME_PX = 16
// why: a synthetic page stands in for the live site: red, with a green
// frame, colours nothing else on the page uses, so its painted pixels can
// be told from the laptop and the sections around it.
const SYNTHETIC_PAGE = `<html><body style="margin:0;height:100vh;box-sizing:border-box;background:#f00;border:${FRAME_PX}px solid #0f0"></body></html>`
// why: each wheel notch scrolls ~120 px, and Lenis glides to it in well
// under this.
const WHEEL_PX = 120
const WHEEL_SETTLE_MS = 700

type Rect = { left: number; top: number; right: number; bottom: number }

const isFrame = ([r = 0, g = 0, b = 0]: readonly (number | undefined)[]) =>
  g > 180 && r < 90 && b < 90
const isPage = (pixel: readonly (number | undefined)[]) => {
  const [r = 0, g = 0, b = 0] = pixel
  return isFrame(pixel) || (r > 180 && g < 90 && b < 90)
}

/** Box of the pixels `match` accepts, or null when none is painted. */
const paintedBox = (
  pixels: Pixels,
  match: (pixel: readonly (number | undefined)[]) => boolean
): Rect | null => {
  let box: Rect | null = null
  for (let y = 0; y < pixels.height; y++)
    for (let x = 0; x < pixels.width; x++) {
      if (!match(pixelAt(pixels, x, y))) continue
      box = box
        ? {
            left: Math.min(box.left, x),
            top: Math.min(box.top, y),
            right: Math.max(box.right, x + 1),
            bottom: Math.max(box.bottom, y + 1)
          }
        : { left: x, top: y, right: x + 1, bottom: y + 1 }
    }
  return box
}

const viewportPixels = async (page: Page) => {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  return screenPixels(page, { x: 0, y: 0, ...viewport })
}

const frameRect = (page: Page) =>
  page.locator('#notebook iframe').evaluate(frame => {
    const { left, top, right, bottom } = frame.getBoundingClientRect()
    return { left, top, right, bottom }
  })

/**
 * Opens the notebook with the synthetic page on the laptop, scrolls to the
 * end of its animation and lets the screen turn fully on.
 */
const gotoSyntheticEnd = async (page: Page) => {
  await page.route(`https://${SCREEN_HOST}/**`, route =>
    route.fulfill({ contentType: 'text/html', body: SYNTHETIC_PAGE })
  )
  await gotoNotebook(page)
  const end = await notebookEnd(page)
  await scrollWindowTo(page, end)
  await expect
    .poll(() => screenOpacity(page), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(0.99)
  // why: the scroll-driven pose damps into place over a second or so.
  await page.waitForTimeout(1500)
  return end
}

/**
 * Where the page is painted against where the laptop puts it: the painted
 * frame at the end of the section, moved by as much as the iframe's box
 * (which follows the laptop, bobbing included) has moved since.
 */
const placement = async (
  page: Page,
  reference: { painted: Rect; box: Rect }
) => {
  const box = await frameRect(page)
  const pixels = await viewportPixels(page)
  const dx = box.left - reference.box.left
  const dy = box.top - reference.box.top
  const expected = {
    left: reference.painted.left + dx,
    top: reference.painted.top + dy,
    right: reference.painted.right + dx,
    bottom: reference.painted.bottom + dy
  }
  return { pixels, expected, painted: paintedBox(pixels, isFrame) }
}

const reference = async (page: Page) => {
  const box = await frameRect(page)
  const painted = paintedBox(await viewportPixels(page), isFrame)
  if (!painted) throw new Error('the synthetic page is not painted')
  return { painted, box }
}

const screenOpacity = (page: Page) =>
  page
    .locator('#notebook iframe')
    .evaluate(frame => Number(getComputedStyle(frame).opacity))

test('notebook is labelled and shows no text', async ({ page }) => {
  await page.goto('/')
  const notebook = page.locator('#notebook')
  await expect(notebook).toHaveAttribute('aria-label', 'Notebook')
  await expect(notebook.locator('h1, h2, h3, p')).toHaveCount(0)
  expect(await notebook.evaluate(node => (node.textContent ?? '').trim())).toBe(
    ''
  )
})

test('notebook is three screens tall and holds its scene', async ({ page }) => {
  await gotoNotebook(page)
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  const box = await page.locator('#notebook').boundingBox()
  expect(box?.height).toBe(viewport.height * 3)

  const top = await documentTop(page.locator('#notebook'))
  await scrollWindowTo(page, top + viewport.height)
  const scene = await page
    .locator('[data-testid="notebook-scene"]')
    .evaluate(node => {
      const { top, bottom } = node.getBoundingClientRect()
      return { top, bottom }
    })
  expect(scene).toEqual({ top: 0, bottom: viewport.height })
})

test('scrolling through the notebook powers the laptop on', async ({
  page
}) => {
  await gotoNotebook(page)
  expect(await screenOpacity(page)).toBeLessThanOrEqual(0.05)

  await scrollWindowTo(page, await notebookEnd(page))
  await expect
    .poll(() => screenOpacity(page), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(0.9)
})

test('nothing floats over the notebook', async ({ page }) => {
  await gotoNotebook(page)
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  const top = await documentTop(page.locator('#notebook'))
  await scrollWindowTo(page, top + viewport.height)

  await expect(page.locator('#notebook [data-testid="hero-grid"]')).toHaveCount(
    0
  )
  await expect(page.locator('[data-testid="sections-grid"]')).toHaveCount(0)
  // invariant: every parallax layer and glow is clipped to its own block of
  // sections, so a block off screen leaves nothing of them on screen.
  const reaching = await page.evaluate(() => {
    const boxes = [
      ...[...document.querySelectorAll('[data-parallax-layer]')].map(
        layer => layer.parentElement
      ),
      ...[...document.querySelectorAll('[data-testid="sections-glow"]')].map(
        glow => glow.closest('[aria-hidden="true"]')
      ),
      document.querySelector('#hero')
    ]
    return boxes.flatMap(node => {
      if (!node) return ['a layer without a clipping box']
      const { top, bottom } = node.getBoundingClientRect()
      return bottom > 0 && top < innerHeight
        ? [`${node.tagName} ${top}–${bottom}`]
        : []
    })
  })
  expect(reaching).toEqual([])
})

test("the page stays on the laptop's glass as the section scrolls away", async ({
  page
}) => {
  const end = await gotoSyntheticEnd(page)
  const start = await reference(page)
  for (const past of PAST_END) {
    await scrollWindowTo(page, end + past)
    await page.waitForTimeout(300)
    const { expected, painted } = await placement(page, start)
    const height = page.viewportSize()?.height ?? 0
    const label = `${past}px past the end`
    if (expected.bottom <= 0) {
      expect(painted, label).toBeNull()
      continue
    }
    if (!painted) throw new Error(`${label}: the page is not painted`)
    expect(Math.abs(painted.left - expected.left), label).toBeLessThanOrEqual(
      ALIGN_PX
    )
    expect(Math.abs(painted.right - expected.right), label).toBeLessThanOrEqual(
      ALIGN_PX
    )
    // invariant: an edge off screen is cut at the screen's edge, so only an
    // edge expected on screen is compared.
    if (expected.top >= 0)
      expect(Math.abs(painted.top - expected.top), label).toBeLessThanOrEqual(
        ALIGN_PX
      )
    if (expected.bottom <= height)
      expect(
        Math.abs(painted.bottom - expected.bottom),
        label
      ).toBeLessThanOrEqual(ALIGN_PX)
  }
})

test('no page pixel shows outside the glass', async ({ page }) => {
  const end = await gotoSyntheticEnd(page)
  const start = await reference(page)
  for (const past of PAST_END) {
    await scrollWindowTo(page, end + past)
    await page.waitForTimeout(300)
    const { pixels, expected } = await placement(page, start)
    let outside = 0
    for (let y = 0; y < pixels.height; y++)
      for (let x = 0; x < pixels.width; x++) {
        const inside =
          x >= expected.left - ALIGN_PX &&
          x < expected.right + ALIGN_PX &&
          y >= expected.top - ALIGN_PX &&
          y < expected.bottom + ALIGN_PX
        if (!inside && isPage(pixelAt(pixels, x, y))) outside++
      }
    expect(outside, `${past}px past the end`).toBe(0)
  }
})

test('the page moves with the laptop under the wheel', async ({ page }) => {
  await gotoSyntheticEnd(page)
  const start = await reference(page)
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  await page.mouse.move(viewport.width / 2, viewport.height / 2)
  let steps = 0
  for (;;) {
    await page.mouse.wheel(0, WHEEL_PX)
    await page.waitForTimeout(WHEEL_SETTLE_MS)
    const { expected, painted } = await placement(page, start)
    if (expected.bottom <= 0) break
    steps++
    const label = `wheel step ${steps}`
    if (!painted) throw new Error(`${label}: the page is not painted`)
    expect(
      Math.abs(painted.bottom - expected.bottom),
      label
    ).toBeLessThanOrEqual(ALIGN_PX)
  }
  expect(steps, 'wheel steps while the page was on screen').toBeGreaterThan(3)
})
