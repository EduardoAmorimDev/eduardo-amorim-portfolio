import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { findHorizon } from './black-hole-helpers'
import { isBlank, readCanvas, readGrid, sweepPointer } from './grid-helpers'
import {
  channels,
  documentTop,
  pixelAt,
  screenPixels,
  gotoHero,
  gotoNotebook,
  gotoStopped,
  nextFrames,
  notebookEnd,
  scrollWindowTo,
  showSceneOnly,
  tokenRgb
} from './page-helpers'

// why: layers are positioned in whole and sub-pixels; within a pixel of the
// content means they scrolled with it.
const PARALLAX_SLACK = 1
const SCROLL_PX = 400
// why: the checklist's own numbers (C17, C58).
const GLITCH_WAIT_MS = 15_000
const REST = { x: 720, y: 288 }
const REST_SLACK = 4
const STILL_PX = 1
// why: two frames at 60 Hz; an animated close would take 300 ms.
const AT_ONCE_MS = 50
// why: the checklists' own numbers (gravity C32, black-hole-scale C1): the
// disk and its arcs reach 4.2 and 1.65 horizon radii, 96 px each at rest.
const DISK_BOX = { x: 420, y: 160 }
const STILL_LEVELS = 1
const STILL_MS = 2000

test.use({ reducedMotion: 'reduce' })

/**
 * Collects, from the first paint on, every heading that turns its glitch
 * on; the page reports each one back to the test.
 */
const logGlitches = async (page: Page) => {
  const log: string[] = []
  await page.exposeFunction('reportGlitch', (tag: string) => log.push(tag))
  await page.addInitScript(() => {
    const report = Reflect.get(window, 'reportGlitch')
    new MutationObserver(records => {
      for (const { target } of records)
        if (
          target instanceof HTMLElement &&
          target.dataset.glitch === 'on' &&
          typeof report === 'function'
        )
          report(target.tagName)
    }).observe(document, {
      attributes: true,
      attributeFilter: ['data-glitch'],
      subtree: true
    })
  })
  return log
}

test('no glitch under reduced motion', async ({ page }) => {
  // why: each heading waits out a whole burst cycle on the page's own clock.
  test.setTimeout(240_000)
  const log = await logGlitches(page)
  await gotoStopped(page, 100)
  for (const heading of await page.locator('h1, h2').all()) {
    await heading.evaluate(node =>
      node.scrollIntoView({ block: 'center', behavior: 'instant' })
    )
    // why: real time for the visibility observer to report the scroll.
    await page.waitForTimeout(300)
    await page.clock.runFor(GLITCH_WAIT_MS)
  }
  expect(log).toEqual([])
  for (const heading of await page.locator('h1, h2').all())
    await expect(heading).toHaveAttribute('data-glitch', 'off')
})

test('the grid holds still under reduced motion', async ({ page }) => {
  await gotoHero(page)
  // hazard: after a few getImageData reads Chrome draws a canvas in software,
  // which antialiases a hair differently; a few reads and redraws first, so
  // both compared readings come from the same drawing path.
  for (let warm = 0; warm < 3; warm++) {
    await readGrid(page)
    await page.mouse.move(10 + warm, 10)
    await page.waitForTimeout(300)
  }
  const before = await readGrid(page)
  for (const spot of [
    { x: 400, y: 640 },
    { x: 720, y: 450 },
    { x: 1100, y: 300 }
  ])
    await sweepPointer(page, spot)
  await page.waitForTimeout(2000)
  const after = await readGrid(page)
  expect(Buffer.from(after.pixels.data).equals(before.pixels.data)).toBe(true)
})

test('no lens under reduced motion', async ({ page }) => {
  await gotoHero(page)
  await sweepPointer(page, { x: 400, y: 640 })
  await sweepPointer(page, { x: 720, y: 420 })
  await page.waitForTimeout(500)
  expect(isBlank(await readCanvas(page, 'hero-lens'))).toBe(true)
})

test('the black hole rests at the centre, 32% down', async ({ page }) => {
  await gotoHero(page)
  await showSceneOnly(page)
  const ink = channels(await tokenRgb(page, 'ink'))
  const first = await findHorizon(page, ink)
  expect(
    Math.hypot(first.cx - REST.x, first.cy - REST.y),
    `horizon at ${first.cx},${first.cy}`
  ).toBeLessThanOrEqual(REST_SLACK)
  await page.waitForTimeout(2000)
  const second = await findHorizon(page, ink)
  expect(
    Math.hypot(second.cx - first.cx, second.cy - first.cy)
  ).toBeLessThanOrEqual(STILL_PX)
})

test('the disk holds still under reduced motion', async ({ page }) => {
  await gotoHero(page)
  await showSceneOnly(page)
  const clip = {
    x: REST.x - DISK_BOX.x,
    y: REST.y - DISK_BOX.y,
    width: 2 * DISK_BOX.x,
    height: 2 * DISK_BOX.y
  }
  const first = await screenPixels(page, clip)
  await page.waitForTimeout(STILL_MS)
  const second = await screenPixels(page, clip)
  let sum = 0
  for (let y = 0; y < first.height; y++)
    for (let x = 0; x < first.width; x++) {
      const a = pixelAt(first, x, y)
      const b = pixelAt(second, x, y)
      for (let channel = 0; channel < 3; channel++)
        sum += Math.abs((a[channel] ?? 0) - (b[channel] ?? 0))
    }
  const mean = sum / (first.width * first.height * 3)
  expect(mean, 'mean change per channel').toBeLessThanOrEqual(STILL_LEVELS)
})

test('faq answers open and close without animation', async ({ page }) => {
  await page.goto('/')
  const question = page.locator('#faq details').nth(2)
  const summary = question.locator('summary')
  await summary.scrollIntoViewIfNeeded()
  const box = await summary.boundingBox()
  if (!box) throw new Error('the question has no box')
  // why: the answer and the "+" are what open and close; the summary's own
  // hover colour is not part of it.
  const animations = () =>
    question.evaluate(details =>
      [
        ...details.querySelectorAll('[data-answer], summary [aria-hidden]')
      ].flatMap(element => element.getAnimations())
    )
  // why: in page time, from the pointer crossing the edge to the open state
  // changing; at once means within a frame or two.
  await question.evaluate(details => {
    const stamp = (key: string) =>
      (details.dataset[key] = String(performance.now()))
    details.addEventListener('pointerenter', () => stamp('enteredAt'))
    details.addEventListener('pointerleave', () => stamp('leftAt'))
    new MutationObserver(() =>
      stamp(details.hasAttribute('open') ? 'openedAt' : 'closedAt')
    ).observe(details, { attributes: true, attributeFilter: ['open'] })
  })
  const took = (from: string, to: string) =>
    question.evaluate(
      (details, [a, b]) =>
        Number(details.dataset[b]) - Number(details.dataset[a]),
      [from, to] as const
    )
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await expect(question).toHaveJSProperty('open', true)
  await expect(question).toHaveAttribute('data-state', 'open')
  expect(await took('enteredAt', 'openedAt')).toBeLessThanOrEqual(AT_ONCE_MS)
  expect(await animations()).toEqual([])
  await page.mouse.move(2, 2, { steps: 4 })
  await expect(question).toHaveJSProperty('open', false)
  expect(await took('leftAt', 'closedAt')).toBeLessThanOrEqual(AT_ONCE_MS)
  expect(await animations()).toEqual([])
})

test("the sections' background holds still", async ({ page }) => {
  await page.goto('/')
  await scrollWindowTo(page, await documentTop(page.locator('#solucoes')))
  const moving = await page.evaluate(() =>
    document
      .getAnimations()
      .flatMap(animation =>
        animation.effect instanceof KeyframeEffect && animation.effect.target
          ? [animation.effect.target]
          : []
      )
      .filter(
        target =>
          target instanceof Element &&
          !!target.closest(
            '[data-parallax-layer], [data-testid="sections-glow"]'
          )
      )
      .map(target =>
        target instanceof Element ? target.outerHTML.slice(0, 80) : ''
      )
  )
  expect(moving).toEqual([])
})

test('parallax layers stay put under reduced motion', async ({ page }) => {
  await page.goto('/')
  const content = page.locator('#solucoes')
  await scrollWindowTo(page, await documentTop(content))
  const offsets = () =>
    page.evaluate(() => {
      const anchor = document.querySelector('#solucoes')
      const block = anchor?.parentElement
      if (!anchor || !block) throw new Error('no #solucoes in a block')
      const top = anchor.getBoundingClientRect().top
      return {
        scrollY,
        layers: [
          ...block.querySelectorAll<HTMLElement>('[data-parallax-layer]')
        ].map(layer => ({
          name: layer.dataset.parallaxLayer,
          offset: layer.getBoundingClientRect().top - top
        }))
      }
    })
  const before = await offsets()
  await page.evaluate(
    by => window.scrollBy({ top: by, behavior: 'instant' }),
    SCROLL_PX
  )
  await nextFrames(page)
  const after = await offsets()

  expect(after.scrollY - before.scrollY).toBe(SCROLL_PX)
  expect(before.layers.map(({ name }) => name)).toEqual([
    'back',
    'mid',
    'front'
  ])
  for (const [index, layer] of before.layers.entries()) {
    const moved = (after.layers[index]?.offset ?? NaN) - layer.offset
    expect(
      Math.abs(moved),
      `${layer.name} moved ${moved}px against the content`
    ).toBeLessThanOrEqual(PARALLAX_SLACK)
  }
})

test('laptop still opens with the scroll under reduced motion', async ({
  page
}) => {
  await gotoNotebook(page)
  await scrollWindowTo(page, await notebookEnd(page))
  await expect
    .poll(
      () =>
        page
          .locator('#notebook iframe')
          .evaluate(frame => Number(getComputedStyle(frame).opacity)),
      { timeout: 10_000 }
    )
    .toBeGreaterThanOrEqual(0.9)
})
