import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { tokenRgb } from './page-helpers'

const MAX_BURST_MS = 600
const MAX_SHIFT_PX = 4
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
  // why: past the rate window, so the next trigger starts a burst at once.
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

  test('a burst shows a primary and a mist copy, shifted at most 4px and sliced', async ({
    page
  }) => {
    await page.goto('/')
    const heading = page.locator(HEADING)
    await bringIntoView(page, heading)

    // why: the snapshot is taken inside the page the moment the burst
    // starts; a round trip from the test could miss a 320 ms burst.
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
      expect(copy.clipPath).not.toBe('none')
      const shift = /^matrix\(1, 0, 0, 1, (-?[\d.]+), 0\)$/.exec(copy.transform)
      expect(shift, `horizontal shift only: ${copy.transform}`).not.toBeNull()
      const x = Math.abs(Number(shift?.[1]))
      expect(x).toBeGreaterThan(0)
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

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} backdrop`, () => {
    test.use({ colorScheme: scheme })

    test('sections background is an 80px grid at most 6% opaque', async ({
      page
    }) => {
      await page.goto('/')
      const grid = page.locator('[data-testid="sections-grid"]')
      await expect(grid).toHaveCount(1)
      await expect(
        page.locator('#hero [data-testid="sections-grid"]')
      ).toHaveCount(0)
      const heroBottom = await page
        .locator('#hero')
        .evaluate(hero => hero.getBoundingClientRect().bottom)
      const gridTop = await grid.evaluate(
        node => node.getBoundingClientRect().top
      )
      expect(gridTop, 'the grid starts after the hero').toBeGreaterThanOrEqual(
        heroBottom - 1
      )

      const style = await grid.evaluate(node => {
        const computed = getComputedStyle(node)
        return {
          image: computed.backgroundImage,
          size: computed.backgroundSize,
          opacity: Number(computed.opacity)
        }
      })
      // invariant: one size per background layer; every layer tiles 80px cells.
      const sizes = style.size.split(/,\s*/)
      expect(sizes).toHaveLength(2)
      for (const size of sizes) expect(size).toMatch(/^80px( 80px)?$/)
      const gradients = style.image.split(/,\s*(?=linear-gradient)/)
      expect(gradients).toHaveLength(2)
      expect(gradients.some(gradient => gradient.includes('to right'))).toBe(
        true
      )
      for (const gradient of gradients) {
        expect(gradient).toMatch(/^linear-gradient\(/)
        // invariant: a hard stop at 1px draws a 1px line per 80px cell.
        expect(gradient).toMatch(/ 1px, rgba\(0, 0, 0, 0\) 1px\)$/)
        const alphas = [
          ...gradient.matchAll(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/g)
        ]
          .map(([, , , , alpha]) => (alpha === undefined ? 1 : Number(alpha)))
          .filter(alpha => alpha > 0)
        expect(alphas.length).toBeGreaterThan(0)
        for (const alpha of alphas) {
          expect(alpha * style.opacity).toBeGreaterThan(0)
          expect(alpha * style.opacity).toBeLessThanOrEqual(0.06)
        }
      }
    })
  })
}

test('sections background has a primary and a steel glow', async ({ page }) => {
  await page.goto('/')
  const glows = page.locator('[data-testid="sections-glow"]')
  await expect(glows).toHaveCount(2)
  const found = await glows.evaluateAll(nodes =>
    nodes.map(node => {
      const { backgroundImage, filter } = getComputedStyle(node)
      return { backgroundImage, filter }
    })
  )
  const palette = {
    primary: await tokenRgb(page, 'primary'),
    steel: await tokenRgb(page, 'steel')
  }
  for (const color of Object.values(palette)) {
    const glow = found.find(({ backgroundImage }) =>
      backgroundImage.includes(color)
    )
    expect(glow, `a glow in ${color}`).toBeDefined()
    expect(glow?.backgroundImage).toMatch(/^radial-gradient\(/)
    const blur = /blur\(([\d.]+)px\)/.exec(glow?.filter ?? '')
    expect(Number(blur?.[1] ?? 0), 'the glow is blurred').toBeGreaterThan(0)
  }
})
