import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { documentTop, gotoStopped, tokenRgb } from './page-helpers'

// why: the checklist's own numbers (C11–C16).
const MIN_WAIT_MS = 5000
const MAX_WAIT_MS = 12_000
const MAX_FRAMES_WITH_COPIES = 3
const MIN_SHIFT_PX = 1
const MAX_SHIFT_PX = 3
const QUIET_MS = 4900
const NEVER_MS = 15_000
// invariant: a band is four corners of one polygon; three bands, twelve.
const POINTS_PER_CLIP = 12
// why: a heading far below the hero, so it is off screen at load.
const HEADING = '#cases h2'
// why: real time for the visibility observer to report a scroll; the page's
// own clock stays stopped meanwhile.
const OBSERVE_MS = 300

type Change = { at: number; value: string | undefined }
type Burst = { start: number; end: number | undefined }

/** Starts logging every write to the heading's `data-glitch`, in page time. */
const watch = (heading: Locator) =>
  heading.evaluateHandle(element => {
    const log: Change[] = []
    new MutationObserver(() =>
      log.push({ at: performance.now(), value: element.dataset.glitch })
    ).observe(element, { attributes: true, attributeFilter: ['data-glitch'] })
    return log
  })

/** Folds a change log into bursts: each "off" → "on" until the next "off". */
const burstsOf = (log: Change[]) => {
  const bursts: Burst[] = []
  let current: Burst | undefined
  for (const { at, value } of log) {
    if (value === 'on' && !current) {
      current = { start: at, end: undefined }
      bursts.push(current)
    }
    if (value === 'off' && current) {
      current.end = at
      current = undefined
    }
  }
  return bursts
}

/** Scrolls the heading to the middle of the screen; returns the page time. */
const bringIn = async (page: Page, heading: Locator) => {
  await heading.evaluate(element =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' })
  )
  await page.waitForTimeout(OBSERVE_MS)
  return page.evaluate(() => performance.now())
}

test('a visible heading bursts 5 to 12 s after entering and after each burst', async ({
  page
}) => {
  await gotoStopped(page, 100)
  const heading = page.locator(HEADING)
  const log = await watch(heading)
  const entered = await bringIn(page, heading)
  await page.clock.runFor(MAX_WAIT_MS + 400)
  const [first] = burstsOf(await log.jsonValue())
  if (!first?.end) throw new Error('no burst within 12 s of entering')
  expect(first.start - entered).toBeGreaterThanOrEqual(MIN_WAIT_MS)
  expect(first.start - entered).toBeLessThanOrEqual(MAX_WAIT_MS)
  await page.clock.runFor(MAX_WAIT_MS + 400)
  const second = burstsOf(await log.jsonValue())[1]
  if (!second) throw new Error('no second burst within 12 s of the first')
  expect(second.start - first.end).toBeGreaterThanOrEqual(MIN_WAIT_MS)
  expect(second.start - first.end).toBeLessThanOrEqual(MAX_WAIT_MS)
})

test.describe('tall window', () => {
  // why: tall enough for two headings to be on screen at once.
  test.use({ viewport: { width: 1440, height: 2400 } })

  test('each heading draws its own wait', async ({ page }) => {
    await gotoStopped(page, 100)
    const headings = [page.locator('#cases h2'), page.locator('#workflow h2')]
    const logs = await Promise.all(headings.map(watch))
    await page.evaluate(
      top => window.scrollTo({ top, behavior: 'instant' }),
      (await documentTop(page.locator('#cases'))) - 200
    )
    await page.waitForTimeout(OBSERVE_MS)
    await page.clock.runFor(MAX_WAIT_MS + 400)
    const starts = await Promise.all(
      logs.map(async log => burstsOf(await log.jsonValue())[0]?.start)
    )
    expect(starts.every(start => start !== undefined)).toBe(true)
    expect(starts[0]).not.toBe(starts[1])
  })
})

test('entering, hovering or clicking a heading starts no burst', async ({
  page
}) => {
  await gotoStopped(page, 100)
  const heading = page.locator(HEADING)
  const log = await watch(heading)
  await bringIn(page, heading)
  await heading.hover()
  await page.clock.runFor(500)
  await heading.click()
  await page.clock.runFor(QUIET_MS - 500)
  expect(await log.jsonValue()).toEqual([])
})

test('hovering a heading sets off no glitch', async ({ page }) => {
  await gotoStopped(page, 100)
  for (const selector of ['#hero h1', HEADING]) {
    const heading = page.locator(selector)
    await bringIn(page, heading)
    const log = await watch(heading)
    await heading.hover()
    await page.clock.runFor(1000)
    expect(await log.jsonValue(), selector).toEqual([])
  }
})

test('a heading less than half on screen never bursts', async ({ page }) => {
  await gotoStopped(page, 100)
  const heading = page.locator(HEADING)
  const log = await watch(heading)
  // why: the heading's top 40% shows above the bottom of the window.
  await heading.evaluate(element => {
    const { top, height } = element.getBoundingClientRect()
    window.scrollTo({
      top: scrollY + top - innerHeight + height * 0.4,
      behavior: 'instant'
    })
  })
  await page.waitForTimeout(OBSERVE_MS)
  await page.clock.runFor(NEVER_MS)
  expect(await log.jsonValue()).toEqual([])
})

type Frame = {
  heading: { inline: string; computed: string }
  copies: { transform: string; clipPath: string }[]
}

/**
 * Records, inside the page, every frame the heading's next burst paints
 * until it ends: the heading's own transform and each copy's.
 */
const recordBurst = (heading: Locator) =>
  heading.evaluate(
    element =>
      new Promise<Frame[]>(resolve => {
        const frames: Frame[] = []
        const copies = [
          ...element.querySelectorAll<HTMLElement>('[data-glitch-copy]')
        ]
        // why: a frame is painted in one task, and the observer runs once
        // after it, so each callback sees one whole frame.
        const observer = new MutationObserver(() => {
          if (element.dataset.glitch === 'on') {
            frames.push({
              heading: {
                inline: element.style.transform,
                computed: getComputedStyle(element).transform
              },
              copies: copies.map(copy => ({
                transform: copy.style.transform,
                clipPath: copy.style.clipPath
              }))
            })
            return
          }
          if (!frames.length) return
          observer.disconnect()
          resolve(frames)
        })
        observer.observe(element, { attributes: true, subtree: true })
      })
  )

test('a burst paints at most three frames, shifted at most 3px, and the heading never moves', async ({
  page
}) => {
  await gotoStopped(page, 100)
  const heading = page.locator(HEADING)
  await bringIn(page, heading)
  const recorded = recordBurst(heading)
  await page.clock.runFor(MAX_WAIT_MS + 400)
  const frames = await recorded

  const distinct = new Set(frames.map(frame => JSON.stringify(frame.copies)))
  expect(distinct.size).toBeGreaterThanOrEqual(1)
  expect(distinct.size).toBeLessThanOrEqual(MAX_FRAMES_WITH_COPIES)
  for (const frame of frames) {
    expect(frame.heading).toEqual({ inline: '', computed: 'none' })
    for (const copy of frame.copies) {
      const shift = /^translateX\((-?[\d.]+)px\)$/.exec(copy.transform)
      expect(shift, `horizontal shift only: ${copy.transform}`).not.toBeNull()
      const x = Math.abs(Number(shift?.[1]))
      expect(x).toBeGreaterThanOrEqual(MIN_SHIFT_PX)
      expect(x).toBeLessThanOrEqual(MAX_SHIFT_PX)
    }
  }
  await expect(heading).toHaveAttribute('data-glitch', 'off')
  for (const copy of await heading.locator('[data-glitch-copy]').all())
    await expect(copy).toBeHidden()
})

test.describe('dark scheme', () => {
  test.use({ colorScheme: 'dark' })

  test('a burst shows a primary and a mist copy, cut in three bands', async ({
    page
  }) => {
    await gotoStopped(page, 100)
    const heading = page.locator(HEADING)
    await bringIn(page, heading)
    // why: the snapshot is taken inside the page the moment the burst
    // starts; a round trip from the test could miss a 60 ms frame.
    const snapshot = heading.evaluate(
      element =>
        new Promise<{ text: string; copies: Record<string, string>[] }>(
          resolve => {
            const observer = new MutationObserver(() => {
              if (element.dataset.glitch !== 'on') return
              observer.disconnect()
              resolve({
                text: element.firstChild?.textContent ?? '',
                copies: [...element.querySelectorAll('[data-glitch-copy]')].map(
                  copy => {
                    const style = getComputedStyle(copy)
                    return {
                      text: copy.textContent ?? '',
                      color: style.color,
                      clipPath: style.clipPath,
                      visibility: style.visibility
                    }
                  }
                )
              })
            })
            observer.observe(element, {
              attributes: true,
              attributeFilter: ['data-glitch']
            })
          }
        )
    )
    await page.clock.runFor(MAX_WAIT_MS + 400)
    const { text, copies } = await snapshot

    expect(copies).toHaveLength(2)
    expect(new Set(copies.map(copy => copy.color))).toEqual(
      new Set([await tokenRgb(page, 'primary'), await tokenRgb(page, 'mist')])
    )
    for (const copy of copies) {
      expect(copy.text).toBe(text)
      expect(copy.visibility).toBe('visible')
      expect(copy.clipPath).toMatch(/^polygon\(/)
      expect(copy.clipPath.split(',')).toHaveLength(POINTS_PER_CLIP)
    }
  })
})

test('copies are hidden from assistive tech', async ({ page }) => {
  await page.goto('/')
  const headings = page.locator('h1, h2')
  expect(await headings.count()).toBe(9)
  for (const heading of await headings.all()) {
    const copies = heading.locator('[data-glitch-copy]')
    await expect(copies).toHaveCount(2)
    const text = (await copies.first().textContent()) ?? ''
    expect(text).toMatch(/\S/)
    for (const copy of await copies.all())
      await expect(copy).toHaveAttribute('aria-hidden', 'true')
    await expect(heading).toHaveAccessibleName(text)
    await expect(heading).toHaveText(text.repeat(3))
  }
})

test('no section but the hero has a grid', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-testid="sections-grid"]')).toHaveCount(0)
  // invariant: a grid of lines is a repeating linear-gradient with a hard
  // stop at 1px; nothing outside the hero paints one.
  const lined = await page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter(node => !node.closest('#hero'))
      .filter(node => {
        const image = getComputedStyle(node).backgroundImage
        return image.includes('linear-gradient') && image.includes(' 1px')
      })
      .map(node => `${node.tagName}.${node.className}`)
  )
  expect(lined).toEqual([])
})

test('sections background has a primary and a steel glow', async ({ page }) => {
  await page.goto('/')
  const glows = page.locator('[data-testid="sections-glow"]')
  // invariant: one primary and one steel glow per block of sections, the
  // block before the notebook and the one after it.
  await expect(glows).toHaveCount(4)
  const found = await glows.evaluateAll(nodes =>
    nodes.map(node => {
      const { backgroundImage, filter } = getComputedStyle(node)
      const block = node.closest('main > div')
      const siblings = block?.parentElement?.children ?? []
      return {
        backgroundImage,
        filter,
        block: block ? [...siblings].indexOf(block) : -1
      }
    })
  )
  const palette = {
    primary: await tokenRgb(page, 'primary'),
    steel: await tokenRgb(page, 'steel')
  }
  const blocks = [...new Set(found.map(({ block }) => block))]
  expect(blocks).toHaveLength(2)
  for (const block of blocks)
    for (const color of Object.values(palette)) {
      const glow = found.find(
        glow => glow.block === block && glow.backgroundImage.includes(color)
      )
      expect(glow, `a glow in ${color} in block ${block}`).toBeDefined()
      expect(glow?.backgroundImage).toMatch(/^radial-gradient\(/)
      const blur = /blur\(([\d.]+)px\)/.exec(glow?.filter ?? '')
      expect(Number(blur?.[1] ?? 0), 'the glow is blurred').toBeGreaterThan(0)
    }
})
