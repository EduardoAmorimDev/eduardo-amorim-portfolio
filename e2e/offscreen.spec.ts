import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  documentTop,
  gotoHero,
  meanLuminance,
  screenPixels,
  scrollWindowTo
} from './page-helpers'

// why: the projects section alone, shown on every device's screen.
const SCREEN_PATH = '/embed/projetos'
const DEVICES = 3
const DRAWS = '__draws'
const SAMPLE_MS = 1000
// why: the observer reports and React re-renders a frame or two after the
// scroll; this covers both with room to spare.
const SETTLE_MS = 300
// why: the hero's intro fades in from black over 2.4 s; resumed, the scene
// is still lit 0.15 s after coming back, at least 80% as bright as before.
const RESUMED_LIGHT = 0.8
const INTRO_MS = 3000
const RESUME_MS = 150
const AWAY_MS = 2000

/**
 * Counts, from the first script on, every draw call by the canvas that made
 * it, so a test can tell which scene drew and which sat idle.
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
          notebook: of('[data-testid="notebook-scene"] canvas'),
          globe: of('[data-testid="globe-scene"] canvas')
        }
      }
      const before = read()
      await new Promise(resolve => setTimeout(resolve, ms))
      const after = read()
      return {
        hero: after.hero - before.hero,
        notebook: after.notebook - before.notebook,
        globe: after.globe - before.globe
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
    if (new URL(request.url()).pathname === SCREEN_PATH)
      urls.push(request.url())
  })
  return urls
}

test('only the hero draws at the top of the page', async ({ page }) => {
  await recordDraws(page)
  await gotoHero(page)
  const draws = await drawsNow(page)
  expect(draws.hero).toBeGreaterThan(0)
  expect(draws).toMatchObject({ notebook: 0, globe: 0 })
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
  expect(draws).toMatchObject({ hero: 0, globe: 0 })
})

test('only the globe draws at the end of the page', async ({ page }) => {
  await recordDraws(page)
  await gotoHero(page)
  await scrollToSection(page, '#contato')
  const draws = await drawsNow(page)
  expect(draws.globe).toBeGreaterThan(0)
  expect(draws).toMatchObject({ hero: 0, notebook: 0 })
})

test('no scene draws while all are off screen', async ({ page }) => {
  await recordDraws(page)
  await gotoHero(page)
  for (const section of ['#sobre', '#workflow']) {
    await scrollToSection(page, section)
    expect(await drawsNow(page), section).toEqual({
      hero: 0,
      notebook: 0,
      globe: 0
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

test('the hero resumes where it stopped instead of replaying its intro', async ({
  page
}) => {
  await gotoHero(page)
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  // why: the black hole's half of the screen, clear of the copy.
  const half = {
    x0: viewport.width / 2,
    x1: viewport.width,
    y0: 0,
    y1: viewport.height
  }
  const clip = { x: 0, y: 0, ...viewport }
  await page.waitForTimeout(INTRO_MS)
  const before = meanLuminance(await screenPixels(page, clip), half)

  await scrollToSection(page, '#faq')
  await page.waitForTimeout(AWAY_MS)
  await scrollWindowTo(page, 0)
  await page.waitForTimeout(RESUME_MS)
  const after = meanLuminance(await screenPixels(page, clip), half)
  expect(after).toBeGreaterThanOrEqual(before * RESUMED_LIGHT)
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
  await expect(page.locator('#notebook iframe')).toHaveCount(DEVICES)
  for (const frame of await page.locator('#notebook iframe').all())
    await expect(frame).toHaveAttribute('src', SCREEN_PATH)
  await expect.poll(() => requests.length).toBeGreaterThan(0)
})

test('the screen page unloads far past the notebook', async ({ page }) => {
  await gotoHero(page)
  await scrollToSection(page, '#notebook')
  await expect(page.locator('#notebook iframe')).toHaveCount(DEVICES)
  await scrollToSection(page, '#faq')
  await expect(page.locator('iframe')).toHaveCount(0)
})
