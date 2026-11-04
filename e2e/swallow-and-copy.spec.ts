import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  documentTop,
  gotoHero,
  gotoNotebook,
  laptopScreen,
  notebookAt,
  pixelAt,
  screenPixels,
  scrollWindowTo,
  type Pixels
} from './page-helpers'

// why: the task's own numbers (.tasks/portfolio-lp-swallow-and-copy.md).
const VIEW = { width: 1440, height: 900 }
const DARK = 12
const SWALLOW = { quarter: 0.55, never: 0.9, gone: 0.1 }
const STEP = { reach: 40, rows: 4, max: 0.5 }
const COVER_VIEWS = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 }
]
const LAPTOP_LIT = 0.75
const SETTLE_MS = 900

const mean = (pixels: Pixels, x: number, y: number) => {
  const [r = 0, g = 0, b = 0] = pixelAt(pixels, x, y)
  return (r + g + b) / 3
}

/** Longest run of dark pixels in any row: share of the width, middle x, row. */
const darkRun = (pixels: Pixels) => {
  let best = { share: 0, middle: 0, y: 0 }
  for (let y = 0; y < pixels.height; y += 5) {
    let run = 0
    for (let x = 0; x < pixels.width; x++) {
      run = mean(pixels, x, y) <= DARK ? run + 1 : 0
      if (run / pixels.width > best.share)
        best = { share: run / pixels.width, middle: x - run / 2, y }
    }
  }
  return best
}

const darkRunAt = async (page: Page, scrolled: number) => {
  await scrollWindowTo(page, scrolled * VIEW.height)
  await page.waitForTimeout(SETTLE_MS)
  return darkRun(await screenPixels(page, { x: 0, y: 0, ...VIEW }))
}

const rowLuminance = (pixels: Pixels, y: number) => {
  let sum = 0
  for (let x = 0; x < pixels.width; x++) {
    const [r = 0, g = 0, b = 0] = pixelAt(pixels, x, y)
    sum += 0.299 * r + 0.587 * g + 0.114 * b
  }
  return sum / pixels.width
}

/** Largest step between the 4 rows above and the 4 below any row near `edge`. */
const largestStep = async (page: Page, edge: number) => {
  const top = edge - STEP.reach - STEP.rows
  const pixels = await screenPixels(page, {
    x: 0,
    y: top,
    width: VIEW.width,
    height: 2 * (STEP.reach + STEP.rows)
  })
  const rows = Array.from({ length: pixels.height }, (_, y) =>
    rowLuminance(pixels, y)
  )
  const band = (from: number) =>
    rows.slice(from, from + STEP.rows).reduce((a, b) => a + b, 0) / STEP.rows
  let largest = 0
  for (let y = STEP.rows; y <= rows.length - STEP.rows; y++)
    largest = Math.max(largest, Math.abs(band(y - STEP.rows) - band(y)))
  return largest
}

test.describe('the black hole almost swallows the visitor', () => {
  test('the shadow swells as the hero leaves', async ({ page }) => {
    await gotoHero(page)
    const quarter = await darkRunAt(page, 0.25)
    expect(quarter.share).toBeGreaterThanOrEqual(SWALLOW.quarter)
    expect(quarter.y).toBeLessThan(VIEW.height / 2)
    expect(quarter.middle).toBeGreaterThan(VIEW.width / 3)
    expect(quarter.middle).toBeLessThan((2 * VIEW.width) / 3)
    expect((await darkRunAt(page, 1)).share).toBeLessThanOrEqual(SWALLOW.gone)
  })

  test('the black hole rises out through the top as it swells', async ({
    page
  }) => {
    await gotoHero(page)
    const early = await darkRunAt(page, 0.15)
    const quarter = await darkRunAt(page, 0.25)
    expect(quarter.y).toBeLessThan(early.y)
    expect((await darkRunAt(page, 0.75)).share).toBeLessThanOrEqual(
      SWALLOW.gone
    )
  })

  test('the shadow never covers the whole width', async ({ page }) => {
    await gotoHero(page)
    // why: from a quarter screen on: at rest the sky beside the black hole
    // is as dark as its shadow, and the resting frame is criterion 5's.
    for (const scrolled of [0.25, 0.5, 0.75, 1, 1.25, 1.5])
      expect(
        (await darkRunAt(page, scrolled)).share,
        `hero scrolled ${scrolled}`
      ).toBeLessThan(SWALLOW.never)
  })
})

test('solutions and reach share one sky', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const top = await documentTop(page.locator('#notebook'))
  for (const share of [0.75, 0.5, 0.25]) {
    await scrollWindowTo(page, top - share * VIEW.height)
    await page.waitForTimeout(SETTLE_MS)
    expect(
      await largestStep(page, share * VIEW.height),
      `stage top at ${share * 100}%`
    ).toBeLessThanOrEqual(STEP.max)
  }
})

for (const view of COVER_VIEWS)
  test(`the page covers the laptop's glass at ${view.width}x${view.height}`, async ({
    page
  }) => {
    await page.setViewportSize(view)
    await gotoNotebook(page)
    await scrollWindowTo(page, await notebookAt(page, LAPTOP_LIT))
    await page.waitForTimeout(2500)
    const { glass, frame } = await laptopScreen(page).evaluate(node => {
      const box = (element: Element) => {
        const { top, right, bottom, left } = element.getBoundingClientRect()
        return { top, right, bottom, left }
      }
      if (!node.parentElement) throw new Error('the page has no glass')
      return { glass: box(node.parentElement), frame: box(node) }
    })
    expect(frame.top).toBeLessThanOrEqual(glass.top + 1)
    expect(frame.bottom).toBeGreaterThanOrEqual(glass.bottom - 1)
    expect(frame.left).toBeLessThanOrEqual(glass.left + 1)
    expect(frame.right).toBeGreaterThanOrEqual(glass.right - 1)
  })
