import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  documentTop,
  gotoHero,
  gotoNotebook,
  gotoStopped,
  hideHeroCopy,
  laptopScreen,
  nextFrames,
  notebookAt,
  scrollWindowTo
} from './page-helpers'

// why: layers are positioned in whole and sub-pixels; within a pixel of the
// content means they scrolled with it.
const PARALLAX_SLACK = 1
const SCROLL_PX = 400
// why: the checklist's own numbers (C17, C58).
const GLITCH_WAIT_MS = 15_000
// why: two frames at 60 Hz; an animated close would take 300 ms.
const AT_ONCE_MS = 50
// why: at 0.01 rad/s of orbit and 24 grain frames a second, a scene still
// running would differ well within this.
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

test('the black hole holds still under reduced motion', async ({ page }) => {
  await gotoHero(page)
  await hideHeroCopy(page)
  await nextFrames(page)
  const frame = () => page.locator('#hero').screenshot()
  const first = await frame()
  // invariant: task hero-gargantua, 5: the disk does not turn, the camera
  // does not move, and the pointer does not turn it.
  for (const spot of [
    { x: 100, y: 100 },
    { x: 1300, y: 800 },
    { x: 720, y: 450 }
  ])
    await page.mouse.move(spot.x, spot.y, { steps: 8 })
  await page.waitForTimeout(STILL_MS)
  const second = await frame()
  expect(second.equals(first), 'two frames 2 s apart are identical').toBe(true)
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
  // why: 0.75 of the section: the laptop is open and lit, before the dive.
  await scrollWindowTo(page, await notebookAt(page, 0.75))
  await expect
    .poll(
      () =>
        laptopScreen(page).evaluate(frame =>
          Number(getComputedStyle(frame).opacity)
        ),
      { timeout: 10_000 }
    )
    .toBeGreaterThanOrEqual(0.9)
})
