import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  channelGap,
  channels,
  documentTop,
  gotoNotebook,
  notebookEnd,
  pixelAt,
  tokenRgb,
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
// why: with the page hidden, the hole the laptop leaves for it shows the
// section's ink background; the bezel around the glass is far lighter.
const GLASS_DARK = 10
// why: each wheel notch scrolls ~120 px, and Lenis glides to it in well
// under this.
const WHEEL_PX = 120
// why: the checklist's own numbers (C60): halfway through the power-on
// window the page is neither off nor on; opening, the lid lifts the
// laptop's top edge by a quarter of its open height or more; upright, the
// page fills 97% of its box.
const POWER_MIDWAY = 0.775
const FADE = { from: 0.2, to: 0.8 }
const LID_RISE = 0.25
const SQUARE_FILL = 0.97
// why: the laptop's lit parts reach well past this channel level; the
// spotlit floor and the sky stay below it.
const LAPTOP_LEVEL = 100
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

/** Box of the laptop's lit parts on screen. */
const laptopBox = (pixels: Pixels) => {
  const box = paintedBox(
    pixels,
    ([r = 0, g = 0, b = 0]) => Math.max(r, g, b) > LAPTOP_LEVEL
  )
  if (!box) throw new Error('no laptop on screen')
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

/**
 * The glass on screen, as the 3D laptop draws it: with the page hidden, the
 * dark region walled in by the bezel around `inside`. Edges cut by the
 * screen's edge are reported there.
 */
const glassBox = async (page: Page, inside: { x: number; y: number }) => {
  const ink = channels(await tokenRgb(page, 'ink'))
  const screen = page.locator('#notebook iframe')
  await screen.evaluate(frame => {
    const backing = frame.parentElement
    if (backing) backing.style.visibility = 'hidden'
  })
  await page.waitForTimeout(100)
  const pixels = await viewportPixels(page)
  await screen.evaluate(frame => {
    const backing = frame.parentElement
    if (backing) backing.style.visibility = ''
  })
  const { width, height } = pixels
  const dark = (x: number, y: number) =>
    channelGap(pixelAt(pixels, x, y), ink) <= GLASS_DARK
  const seen = new Uint8Array(width * height)
  const start = { x: Math.round(inside.x), y: Math.round(inside.y) }
  if (!dark(start.x, start.y)) throw new Error('the glass is not dark')
  const stack = [start]
  seen[start.y * width + start.x] = 1
  const box = { left: start.x, top: start.y, right: start.x, bottom: start.y }
  while (stack.length) {
    const { x, y } = stack.pop() ?? start
    box.left = Math.min(box.left, x)
    box.right = Math.max(box.right, x + 1)
    box.top = Math.min(box.top, y)
    box.bottom = Math.max(box.bottom, y + 1)
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1]
    ] as const) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      if (seen[ny * width + nx] || !dark(nx, ny)) continue
      seen[ny * width + nx] = 1
      stack.push({ x: nx, y: ny })
    }
  }
  // invariant: walled in: the glass never runs out to the screen's sides.
  expect(box.left, 'glass walled in on the left').toBeGreaterThan(0)
  expect(box.right, 'glass walled in on the right').toBeLessThan(width)
  return box
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
    const { expected, painted, pixels } = await placement(page, start)
    const height = page.viewportSize()?.height ?? 0
    const label = `${past}px past the end`
    if (expected.bottom <= 0) {
      expect(painted, label).toBeNull()
      continue
    }
    if (!painted) throw new Error(`${label}: the page is not painted`)
    // invariant: the page, red and green, fills the glass the laptop draws,
    // edge for edge, wherever the edge is on screen.
    const before = paintedBox(pixels, isPage)
    if (!before) throw new Error(`${label}: the page is not painted`)
    const glass = await glassBox(page, {
      x: (before.left + before.right) / 2,
      y: (Math.max(before.top, 0) + before.bottom) / 2
    })
    // why: the laptop bobs a few px a second; the page painted just before
    // and just after the glass, averaged, is where it was with the glass.
    const after = paintedBox(await viewportPixels(page), isPage) ?? before
    const shown = {
      left: (before.left + after.left) / 2,
      top: (before.top + after.top) / 2,
      right: (before.right + after.right) / 2,
      bottom: (before.bottom + after.bottom) / 2
    }
    for (const edge of ['left', 'right'] as const)
      expect(
        Math.abs(shown[edge] - glass[edge]),
        `${label}: ${edge} edge on the glass`
      ).toBeLessThanOrEqual(ALIGN_PX)
    if (glass.top > 0)
      expect(
        Math.abs(shown.top - glass.top),
        `${label}: top edge on the glass`
      ).toBeLessThanOrEqual(ALIGN_PX)
    if (glass.bottom < height)
      expect(
        Math.abs(shown.bottom - glass.bottom),
        `${label}: bottom edge on the glass`
      ).toBeLessThanOrEqual(ALIGN_PX)
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

test('the screen page takes no pointer or focus and is hidden from assistive tech', async ({
  page
}) => {
  await gotoNotebook(page)
  const frame = page.locator('#notebook iframe')
  await expect(frame).toHaveAttribute('aria-hidden', 'true')
  await expect(frame).toHaveAttribute('tabindex', '-1')
  await expect(frame).toHaveCSS('pointer-events', 'none')
  // invariant: nothing of the embedded page reaches the accessibility tree.
  const tree = await page.locator('#notebook').ariaSnapshot()
  expect(tree).not.toMatch(/iframe|document/i)
})

test('the laptop opens, straightens and fades its page in with the scroll', async ({
  page
}) => {
  await page.route(`https://${SCREEN_HOST}/**`, route =>
    route.fulfill({ contentType: 'text/html', body: SYNTHETIC_PAGE })
  )
  await gotoNotebook(page)
  const start = laptopBox(await viewportPixels(page))
  const top = await documentTop(page.locator('#notebook'))
  const end = await notebookEnd(page)
  // why: midway through the power-on window (60–95% of the scroll), the
  // screen is half on.
  await scrollWindowTo(page, top + POWER_MIDWAY * (end - top))
  await page.waitForTimeout(1500)
  const midway = await screenOpacity(page)
  expect(midway, 'fading in').toBeGreaterThan(FADE.from)
  expect(midway, 'fading in').toBeLessThan(FADE.to)
  await scrollWindowTo(page, end)
  await page.waitForTimeout(2000)
  const pixels = await viewportPixels(page)
  const open = laptopBox(pixels)
  // invariant: the lid stands up as it opens, so the laptop's top edge
  // rises by a good share of its open height.
  expect(start.top - open.top, 'opens').toBeGreaterThanOrEqual(
    LID_RISE * (open.bottom - open.top)
  )
  // invariant: square to the camera, the page is painted as an upright
  // rectangle that fills its own box.
  const box = paintedBox(pixels, isPage)
  if (!box) throw new Error('the page is not painted')
  let filled = 0
  for (let y = box.top; y < box.bottom; y++)
    for (let x = box.left; x < box.right; x++)
      if (isPage(pixelAt(pixels, x, y))) filled++
  const area = (box.right - box.left) * (box.bottom - box.top)
  expect(filled / area, 'straightened').toBeGreaterThanOrEqual(SQUARE_FILL)
})
