import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { tokenRgb } from './page-helpers'

const MAX_BURST_MS = 600
const MIN_SHIFT_PX = 1
const MAX_SHIFT_PX = 8
const MAX_SHAKE_PX = 2
const FRAMES_WITH_COPIES = 6
// invariant: a band is four corners of one polygon; three bands, twelve.
const POINTS_PER_CLIP = 12
// why: a heading far below the hero, so it is off screen at load.
const HEADING = '#cases h2'

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

const expectOneShortBurst = (log: Change[]) => {
  const bursts = burstsOf(log)
  expect(bursts, JSON.stringify(log)).toHaveLength(1)
  const [burst] = bursts
  if (!burst || burst.end === undefined)
    throw new Error('the burst never ended')
  expect(burst.end - burst.start).toBeLessThanOrEqual(MAX_BURST_MS)
}

/** Scrolls the heading into view and waits for its entry burst to settle. */
const bringIntoView = async (page: Page, heading: Locator) => {
  const log = await watch(heading)
  await heading.evaluate(element =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' })
  )
  await expect
    .poll(async () => burstsOf(await log.jsonValue()).at(-1)?.end)
    .toBeDefined()
  // why: well past the entry burst, so the next trigger starts a new one.
  await page.waitForTimeout(1200)
}

test('a heading glitches once when it scrolls into view', async ({ page }) => {
  await page.goto('/')
  const heading = page.locator(HEADING)
  await expect(heading).toHaveAttribute('data-glitch', 'off')
  const log = await watch(heading)

  await heading.evaluate(element =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' })
  )
  await page.waitForTimeout(2000)

  expectOneShortBurst(await log.jsonValue())
  await expect(heading).toHaveAttribute('data-glitch', 'off')
})

test('hovering a heading triggers one burst', async ({ page }) => {
  await page.goto('/')
  const heading = page.locator(HEADING)
  await bringIntoView(page, heading)
  const log = await watch(heading)

  await heading.hover()
  await page.waitForTimeout(1500)

  expectOneShortBurst(await log.jsonValue())
})

test('no burst repeats on its own', async ({ page }) => {
  await page.goto('/')
  const heading = page.locator(HEADING)
  await bringIntoView(page, heading)
  const log = await watch(heading)

  await page.waitForTimeout(6000)

  expect(await log.jsonValue()).toEqual([])
  await expect(heading).toHaveAttribute('data-glitch', 'off')
})

test.describe('dark scheme', () => {
  test.use({ colorScheme: 'dark' })

  test('a burst shows a primary and a mist copy, shifted at most 8px and cut in three bands', async ({
    page
  }) => {
    await page.goto('/')
    const heading = page.locator(HEADING)
    await bringIntoView(page, heading)

    // why: the snapshot is taken inside the page the moment the burst
    // starts; a round trip from the test could miss an 80 ms frame.
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
                      transform: style.transform,
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
    await heading.hover()
    const { text, copies } = await snapshot

    expect(copies).toHaveLength(2)
    const colors = copies.map(copy => copy.color)
    expect(new Set(colors)).toEqual(
      new Set([await tokenRgb(page, 'primary'), await tokenRgb(page, 'mist')])
    )
    for (const copy of copies) {
      expect(copy.text).toBe(text)
      expect(copy.visibility).toBe('visible')
      expect(copy.clipPath).toMatch(/^polygon\(/)
      expect(copy.clipPath.split(',')).toHaveLength(POINTS_PER_CLIP)
      const shift = /^matrix\(1, 0, 0, 1, (-?[\d.]+), 0\)$/.exec(copy.transform)
      expect(shift, `horizontal shift only: ${copy.transform}`).not.toBeNull()
      const x = Math.abs(Number(shift?.[1]))
      expect(x).toBeGreaterThanOrEqual(MIN_SHIFT_PX)
      expect(x).toBeLessThanOrEqual(MAX_SHIFT_PX)
    }

    await expect(heading).toHaveAttribute('data-glitch', 'off')
    for (const copy of await heading.locator('[data-glitch-copy]').all())
      await expect(copy).toBeHidden()
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

type Frame = {
  shake: string
  copies: { transform: string; clipPath: string }[]
}

/**
 * Hovers the heading and records, inside the page, every frame its burst
 * paints until it ends: the heading's own transform and each copy's.
 */
const recordBurst = async (page: Page, heading: Locator) => {
  const frames = heading.evaluate(
    element =>
      new Promise<{ frames: Frame[]; after: string }>(resolve => {
        const frames: Frame[] = []
        const copies = [
          ...element.querySelectorAll<HTMLElement>('[data-glitch-copy]')
        ]
        // why: a frame is painted in one task, and the observer runs once
        // after it, so each callback sees one whole frame.
        const observer = new MutationObserver(() => {
          if (element.dataset.glitch === 'on') {
            frames.push({
              shake: element.style.transform,
              copies: copies.map(copy => ({
                transform: copy.style.transform,
                clipPath: copy.style.clipPath
              }))
            })
            return
          }
          if (!frames.length) return
          observer.disconnect()
          resolve({ frames, after: getComputedStyle(element).transform })
        })
        observer.observe(element, { attributes: true, subtree: true })
      })
  )
  await heading.hover()
  return frames
}

test('a burst paints six frames of copies', async ({ page }) => {
  await page.goto('/')
  const heading = page.locator(HEADING)
  await bringIntoView(page, heading)
  const { frames } = await recordBurst(page, heading)

  const distinct = new Set(frames.map(frame => JSON.stringify(frame.copies)))
  expect(distinct.size, JSON.stringify(frames)).toBe(FRAMES_WITH_COPIES)
  await expect(heading).toHaveAttribute('data-glitch', 'off')
})

test('the heading trembles during a burst and settles', async ({ page }) => {
  await page.goto('/')
  const heading = page.locator(HEADING)
  await bringIntoView(page, heading)
  const { frames, after } = await recordBurst(page, heading)

  const shakes = frames.map(({ shake }) => {
    if (!shake) return 0
    const match = /^translateX\((-?[\d.]+)px\)$/.exec(shake)
    expect(match, `horizontal shake only: ${shake}`).not.toBeNull()
    return Number(match?.[1])
  })
  expect(
    shakes.some(shake => shake !== 0),
    'the text trembles'
  ).toBe(true)
  for (const shake of shakes)
    expect(Math.abs(shake)).toBeLessThanOrEqual(MAX_SHAKE_PX)
  expect(after, 'the heading is back in place').toBe('none')
  for (const copy of await heading.locator('[data-glitch-copy]').all())
    await expect(copy).toHaveCSS('transform', 'none')
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
