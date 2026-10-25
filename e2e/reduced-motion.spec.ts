import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  allLines,
  between,
  maxShift,
  measureLines,
  readGrid,
  restLines,
  sweepPointer
} from './grid-helpers'
import {
  documentTop,
  gotoHero,
  heroEnd,
  nextFrames,
  scrollWindowTo
} from './page-helpers'

// why: a straight line is drawn on whole pixels, so its read centre does not
// move at all; anything past this is a bend.
const STILL = 0.05
// why: layers are positioned in whole and sub-pixels; within a pixel of the
// content means they scrolled with it.
const PARALLAX_SLACK = 1
const SCROLL_PX = 400

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
  const log = await logGlitches(page)
  await page.goto('/')
  const title = page.locator('#hero h1')
  await title.hover()
  for (const id of ['sobre', 'cases', 'contato']) {
    const heading = page.locator(`#${id} h2`)
    await heading.evaluate(node =>
      node.scrollIntoView({ block: 'center', behavior: 'instant' })
    )
    await page.waitForTimeout(800)
    await heading.hover()
    await page.waitForTimeout(800)
  }

  expect(log).toEqual([])
  for (const heading of await page.locator('h1, h2').all()) {
    await expect(heading).toHaveAttribute('data-glitch', 'off')
    for (const copy of await heading.locator('[data-glitch-copy]').all())
      await expect(copy).toBeHidden()
  }
})

test('hero grid stays straight under reduced motion', async ({ page }) => {
  await gotoHero(page)
  const rest = restLines(await readGrid(page))
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  for (const spot of [
    { x: viewport.width / 2, y: viewport.height / 2 },
    { x: viewport.width / 4, y: viewport.height / 3 }
  ]) {
    await sweepPointer(page, between(rest, spot))
    for (const line of allLines(measureLines(await readGrid(page), rest)))
      expect(maxShift(line), `line at ${line.rest}px`).toBeLessThanOrEqual(
        STILL
      )
  }
})

test('parallax layers stay put under reduced motion', async ({ page }) => {
  await page.goto('/')
  const content = page.locator('#solucoes')
  await scrollWindowTo(page, await documentTop(content))
  const offsets = () =>
    page.evaluate(() => {
      const anchor = document.querySelector('#solucoes')
      if (!anchor) throw new Error('no #solucoes')
      const top = anchor.getBoundingClientRect().top
      return {
        scrollY,
        layers: [
          ...document.querySelectorAll<HTMLElement>('[data-parallax-layer]')
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
