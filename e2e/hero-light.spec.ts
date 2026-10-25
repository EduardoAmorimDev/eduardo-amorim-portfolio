import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  gotoHero,
  heroEnd,
  hideHeroCopy,
  laptopBox,
  luminanceAt,
  meanLuminance,
  screenPixels,
  scrollWindowTo,
  type Pixels
} from './page-helpers'

const CORE_MIN = 0.9
const HALO = { distance: 40, min: 0.15, max: 0.9, samples: 16 }
// why: the lid's screen page is a little smaller than the lid; this share of
// its height stands for the bezel when locating the laptop's top edge.
const BEZEL = 0.05

// why: the light is judged against the dark sky it was made for; on the light
// theme the white sky itself is the brightest thing on screen.
test.use({ colorScheme: 'dark' })

/** The hero's whole first screen, as painted. */
const heroScreen = async (page: Page) => {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  return screenPixels(page, { x: 0, y: 0, ...viewport })
}

/**
 * The brightest pixels of the top half: their luminance, every pixel that
 * reaches it, and their centre.
 */
const brightest = (pixels: Pixels) => {
  const half = Math.floor(pixels.height / 2)
  let top = -1
  for (let y = 0; y < half; y++)
    for (let x = 0; x < pixels.width; x++)
      top = Math.max(top, luminanceAt(pixels, x, y))
  const peak: { x: number; y: number }[] = []
  for (let y = 0; y < half; y++)
    for (let x = 0; x < pixels.width; x++)
      if (luminanceAt(pixels, x, y) >= top - 1e-9) peak.push({ x, y })
  const centre = {
    x: peak.reduce((sum, point) => sum + point.x, 0) / peak.length,
    y: peak.reduce((sum, point) => sum + point.y, 0) / peak.length
  }
  return { luminance: top, peak, centre }
}

test('a glowing light core with a halo sits above the laptop', async ({
  page
}) => {
  await gotoHero(page)
  const pixels = await heroScreen(page)
  const lid = await laptopBox(page)
  const laptopTop = lid.top - (lid.bottom - lid.top) * BEZEL

  const core = brightest(pixels)
  expect(core.luminance).toBeGreaterThanOrEqual(CORE_MIN)
  for (const point of core.peak)
    expect(point.y, 'every brightest pixel is above the laptop').toBeLessThan(
      laptopTop
    )

  for (let k = 0; k < HALO.samples; k++) {
    const angle = (k / HALO.samples) * 2 * Math.PI
    const x = core.centre.x + HALO.distance * Math.cos(angle)
    const y = core.centre.y + HALO.distance * Math.sin(angle)
    const halo = luminanceAt(pixels, x, y)
    expect(halo, `halo at ${Math.round(x)},${Math.round(y)}`).toBeGreaterThan(
      HALO.min
    )
    expect(halo, `halo at ${Math.round(x)},${Math.round(y)}`).toBeLessThan(
      HALO.max
    )
  }
})

test('floor facing the light is brighter than the far side', async ({
  page
}) => {
  await gotoHero(page)
  await hideHeroCopy(page)
  const pixels = await heroScreen(page)
  const lid = await laptopBox(page)
  const light = brightest(pixels).centre
  const middle = (lid.left + lid.right) / 2
  // why: the band along the bottom of the first screen is all floor, below
  // the laptop and the icons; the far side mirrors the light's spot across
  // the laptop's middle.
  const band = { y0: pixels.height * 0.84, y1: pixels.height * 0.98 }
  const below = { x0: light.x - 40, x1: light.x + 40, ...band }
  const mirror = 2 * middle - light.x
  const far = { x0: mirror - 40, x1: mirror + 40, ...band }

  expect(
    Math.abs(light.x - middle),
    'the light is off to one side'
  ).toBeGreaterThan(100)
  expect(meanLuminance(pixels, below)).toBeGreaterThan(
    meanLuminance(pixels, far)
  )
})

test('laptop side facing the light is brighter', async ({ page }) => {
  await gotoHero(page)
  await hideHeroCopy(page)
  const pixels = await heroScreen(page)
  const lid = await laptopBox(page)
  const light = brightest(pixels).centre
  const third = (lid.right - lid.left) / 3
  const rows = {
    y0: lid.top + (lid.bottom - lid.top) * 0.25,
    y1: lid.top + (lid.bottom - lid.top) * 0.55
  }
  const left = { x0: lid.left, x1: lid.left + third, ...rows }
  const right = { x0: lid.right - third, x1: lid.right, ...rows }
  const [facing, opposite] =
    light.x < (lid.left + lid.right) / 2 ? [left, right] : [right, left]

  expect(meanLuminance(pixels, facing)).toBeGreaterThan(
    meanLuminance(pixels, opposite)
  )
})

test('scrolling through the hero powers the laptop on', async ({ page }) => {
  await gotoHero(page)
  await scrollWindowTo(page, await heroEnd(page))
  await expect
    .poll(
      () =>
        page
          .locator('#hero iframe')
          .evaluate(frame => Number(getComputedStyle(frame).opacity)),
      { timeout: 10_000 }
    )
    .toBeGreaterThanOrEqual(0.9)
})
