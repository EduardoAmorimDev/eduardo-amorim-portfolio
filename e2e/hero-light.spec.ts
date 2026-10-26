import { expect, test } from './fixtures'
import { brightest, coreCentre, firstScreen } from './light-helpers'
import {
  gotoHero,
  gotoNotebook,
  hideHeroCopy,
  luminanceAt
} from './page-helpers'

const CORE_MIN = 0.9
const HALO = { distance: 40, min: 0.15, max: 0.9, samples: 16 }
const MAX_REACH_PX = 40
const MIN_MOVE_PX = 2
const DRIFT_SAMPLES = 4
const SAMPLE_GAP_MS = 2000
// why: share of the notebook screen, from the top, that lies above the
// laptop in its starting pose; nothing but the sky is drawn there.
const SKY_SHARE = 0.3
const DARK_SKY_MAX = 0.1

const gap = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

test('a glowing light core with a halo sits at the top left of the hero', async ({
  page
}) => {
  await gotoHero(page)
  await hideHeroCopy(page)
  const pixels = await firstScreen(page)
  const core = brightest(pixels)
  expect(core.luminance).toBeGreaterThanOrEqual(CORE_MIN)

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

test('the light drifts slowly near its rest point', async ({ page }) => {
  await gotoHero(page)
  await hideHeroCopy(page)
  const samples = [await coreCentre(page)]
  for (let index = 1; index < DRIFT_SAMPLES; index++) {
    await page.waitForTimeout(SAMPLE_GAP_MS)
    samples.push(await coreCentre(page))
  }
  // why: under reduced motion the light snaps back to rest, which is how the
  // test finds where rest is.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(500)
  const rest = await coreCentre(page)

  for (const [index, sample] of samples.entries()) {
    expect(gap(sample, rest), `sample ${index} from rest`).toBeLessThanOrEqual(
      MAX_REACH_PX
    )
    const next = samples[index + 1]
    if (next)
      expect(
        gap(sample, next),
        `samples ${index} and ${index + 1}, 2 s apart`
      ).toBeGreaterThanOrEqual(MIN_MOVE_PX)
  }
})

test('the notebook shows no light core or halo', async ({ page }) => {
  await gotoNotebook(page)
  const pixels = await firstScreen(page)
  let top = 0
  for (let y = 0; y < pixels.height * SKY_SHARE; y++)
    for (let x = 0; x < pixels.width; x++)
      top = Math.max(top, luminanceAt(pixels, x, y))
  expect(top, 'brightest pixel above the laptop').toBeLessThan(DARK_SKY_MAX)
})
