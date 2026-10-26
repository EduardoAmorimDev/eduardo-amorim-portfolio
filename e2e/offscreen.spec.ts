import type { Page } from '@playwright/test'
import { findHorizon } from './black-hole-helpers'
import { expect, test } from './fixtures'
import {
  channels,
  documentTop,
  gotoHero,
  gotoStopped,
  scrollWindowTo,
  showSceneOnly,
  tokenRgb
} from './page-helpers'

const SCREEN_HOST = 'kune-joaoeduardoajs-projects.vercel.app'
const DRAWS = '__draws'
const SAMPLE_MS = 1000
// why: the observer reports and React re-renders a frame or two after the
// scroll; this covers both with room to spare.
const SETTLE_MS = 300
// why: the clock is faked in that test, so the scene only animates when the
// test advances it: 0.1 s of it after returning moves the black hole 6 px at
// most (60 px/s), while 2 s away would move it 40 px or more (20 px/s).
const RESUMED_PX = 12
const AWAY_MS = 2000
const RESUME_MS = 100

/**
 * Counts, from the first script on, every draw call by the canvas that made
 * it: WebGL draws, and the 2D strokes, fills and clears of the hero's grid
 * and lens, so a test can tell which layer drew and which sat idle.
 */
const recordDraws = (page: Page) =>
  page.addInitScript(key => {
    const draws = new Map<HTMLCanvasElement, number>()
    Reflect.set(window, key, draws)
    const count = (prototype: object, names: string[]) => {
      for (const name of names) {
        const original: unknown = Reflect.get(prototype, name)
        if (typeof original !== 'function') continue
        Reflect.set(
          prototype,
          name,
          function (this: { canvas: unknown }, ...args: unknown[]) {
            const { canvas } = this
            if (canvas instanceof HTMLCanvasElement)
              draws.set(canvas, (draws.get(canvas) ?? 0) + 1)
            return Reflect.apply(original, this, args)
          }
        )
      }
    }
    count(WebGL2RenderingContext.prototype, [
      'drawArrays',
      'drawElements',
      'drawArraysInstanced',
      'drawElementsInstanced'
    ])
    count(CanvasRenderingContext2D.prototype, [
      'stroke',
      'fill',
      'fillRect',
      'clearRect'
    ])
  }, DRAWS)

/** Draw calls each layer makes over `SAMPLE_MS` of real time. */
const drawsNow = async (page: Page) => {
  await page.waitForTimeout(SETTLE_MS)
  return page.evaluate(
    async ({ key, ms }) => {
      const read = () => {
        const draws: unknown = Reflect.get(window, key)
        if (!(draws instanceof Map)) throw new Error('draws are not recorded')
        const of = (selector: string) => {
          const canvas = document.querySelector(selector)
          if (!canvas) throw new Error(`no ${selector}`)
          const count: unknown = draws.get(canvas)
          return typeof count === 'number' ? count : 0
        }
        return {
          hero: of('[data-testid="hero-scene"] canvas'),
          grid: of('[data-testid="hero-grid"]'),
          lens: of('[data-testid="hero-lens"]'),
          notebook: of('[data-testid="notebook-scene"] canvas')
        }
      }
      const before = read()
      await new Promise(resolve => setTimeout(resolve, ms))
      const after = read()
      return {
        hero: after.hero - before.hero,
        grid: after.grid - before.grid,
        lens: after.lens - before.lens,
        notebook: after.notebook - before.notebook
      }
    },
    { key: DRAWS, ms: SAMPLE_MS }
  )
}

const scrollToSection = async (page: Page, selector: string) =>
  scrollWindowTo(page, await documentTop(page.locator(selector)))

/** Every request the page makes to the laptop screen's site. */
const screenRequests = (page: Page) => {
  const urls: string[] = []
  page.on('request', request => {
    if (new URL(request.url()).hostname === SCREEN_HOST)
      urls.push(request.url())
  })
  return urls
}

test('only the hero draws at the top of the page', async ({ page }) => {
  await recordDraws(page)
  await gotoHero(page)
  // why: the lens draws only under the mouse, so the mouse is put there; the
  // counts below then show each hero layer is counted while it draws.
  await page.mouse.move(400, 650, { steps: 4 })
  const draws = await drawsNow(page)
  expect(draws.hero).toBeGreaterThan(0)
  expect(draws.grid).toBeGreaterThan(0)
  expect(draws.lens).toBeGreaterThan(0)
  expect(draws.notebook).toBe(0)
})

test('only the notebook draws while it is on screen', async ({ page }) => {
  await recordDraws(page)
  await gotoHero(page)
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  const top = await documentTop(page.locator('#notebook'))
  await scrollWindowTo(page, top + viewport.height)
  const draws = await drawsNow(page)
  expect(draws.notebook).toBeGreaterThan(0)
  expect(draws).toMatchObject({ hero: 0, grid: 0, lens: 0 })
})

test('no scene draws while both are off screen', async ({ page }) => {
  await recordDraws(page)
  await gotoHero(page)
  for (const section of ['#sobre', '#faq']) {
    await scrollToSection(page, section)
    expect(await drawsNow(page), section).toEqual({
      hero: 0,
      grid: 0,
      lens: 0,
      notebook: 0
    })
  }
})

test('the hero draws again when scrolled back', async ({ page }) => {
  await recordDraws(page)
  await gotoHero(page)
  await scrollToSection(page, '#faq')
  expect((await drawsNow(page)).hero).toBe(0)
  await scrollWindowTo(page, 0)
  expect((await drawsNow(page)).hero).toBeGreaterThan(0)
})

test('the black hole resumes where it stopped', async ({ page }) => {
  // why: a capture takes 0.3-0.6 s, long enough for the black hole to move
  // under it; with time stopped, nothing moves while one is taken.
  await gotoStopped(page, 2000)
  await showSceneOnly(page)
  const ink = channels(await tokenRgb(page, 'ink'))
  const before = await findHorizon(page, ink)

  await page.evaluate(() =>
    document.querySelector('#faq')?.scrollIntoView({ behavior: 'instant' })
  )
  await page.waitForTimeout(SETTLE_MS)
  await page.clock.runFor(AWAY_MS)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(SETTLE_MS)
  await page.clock.runFor(RESUME_MS)
  const after = await findHorizon(page, ink)

  expect(
    Math.hypot(after.cx - before.cx, after.cy - before.cy)
  ).toBeLessThanOrEqual(RESUMED_PX)
})

test("the laptop's screen page is not loaded at the top", async ({ page }) => {
  const requests = screenRequests(page)
  await gotoHero(page)
  await expect(page.locator('iframe')).toHaveCount(0)
  expect(requests).toEqual([])
})

test('the screen page loads a screen before the notebook', async ({ page }) => {
  const requests = screenRequests(page)
  await gotoHero(page)
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  const top = await documentTop(page.locator('#notebook'))
  // why: the notebook's top half a screen below the window's bottom.
  await scrollWindowTo(page, top - viewport.height * 1.5)
  await expect(page.locator('iframe')).toHaveCount(1)
  await expect(page.locator('#notebook iframe')).toHaveAttribute(
    'src',
    new RegExp(`^https://${SCREEN_HOST.replaceAll('.', '\\.')}/`)
  )
  await expect.poll(() => requests.length).toBeGreaterThan(0)
})

test('the screen page unloads far past the notebook', async ({ page }) => {
  await gotoHero(page)
  await scrollToSection(page, '#notebook')
  await expect(page.locator('#notebook iframe')).toHaveCount(1)
  await scrollToSection(page, '#faq')
  await expect(page.locator('iframe')).toHaveCount(0)
})
