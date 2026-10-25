import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  documentTop,
  nextFrames,
  scrollWindowTo,
  tokenRgb
} from './page-helpers'

const SPEEDS = { back: 0.2, mid: 0.5, front: 1.3 }
const TOLERANCE_PX = 4
const SCROLL_PX = 400

const layerTops = (page: Page) =>
  page.evaluate(() => ({
    scrollY,
    tops: Object.fromEntries(
      [...document.querySelectorAll<HTMLElement>('[data-parallax-layer]')].map(
        layer => [
          layer.dataset.parallaxLayer,
          layer.getBoundingClientRect().top
        ]
      )
    )
  }))

test('layers move at 0.2x, 0.5x and 1.3x of the scroll', async ({ page }) => {
  await page.goto('/')
  const start = await documentTop(page.locator('#solucoes'))
  await scrollWindowTo(page, start)
  const before = await layerTops(page)

  await page.evaluate(
    by => window.scrollBy({ top: by, behavior: 'instant' }),
    SCROLL_PX
  )
  await nextFrames(page)
  const after = await layerTops(page)

  const scrolled = after.scrollY - before.scrollY
  expect(scrolled).toBe(SCROLL_PX)
  for (const [layer, speed] of Object.entries(SPEEDS)) {
    const from = before.tops[layer]
    const to = after.tops[layer]
    if (from === undefined || to === undefined)
      throw new Error(`no [data-parallax-layer="${layer}"]`)
    const moved = from - to
    expect(
      Math.abs(moved - speed * scrolled),
      `${layer} moved ${moved}px for ${scrolled}px`
    ).toBeLessThanOrEqual(TOLERANCE_PX)
  }
})

test('front layer is blurred code bars near the side edges', async ({
  page
}) => {
  await page.goto('/')
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  const bars = page.locator('[data-parallax-layer="front"] [data-code-bar]')
  expect(await bars.count()).toBeGreaterThan(0)

  const found = await bars.evaluateAll(elements =>
    elements.map(element => {
      let blur = 0
      for (
        let node: Element | null = element;
        node && !node.matches('[data-parallax-layer]');
        node = node.parentElement
      ) {
        const match = /blur\(([\d.]+)px\)/.exec(getComputedStyle(node).filter)
        if (match) blur = Math.max(blur, Number(match[1]))
      }
      const style = getComputedStyle(element)
      const { left, right } = element.getBoundingClientRect()
      return {
        color: style.backgroundColor,
        radius: parseFloat(style.borderTopLeftRadius),
        blur,
        left,
        right
      }
    })
  )

  const palette = await Promise.all(
    (['primary', 'steel', 'mist'] as const).map(token => tokenRgb(page, token))
  )
  expect(new Set(found.map(bar => bar.color))).toEqual(new Set(palette))
  const edge = viewport.width * 0.15
  for (const bar of found) {
    expect(bar.radius, 'rounded').toBeGreaterThan(0)
    expect(bar.blur, 'blurred').toBeGreaterThanOrEqual(8)
    expect(
      bar.right <= edge || bar.left >= viewport.width - edge,
      `bar at ${bar.left}–${bar.right}px is within 15% of a side`
    ).toBe(true)
  }
})

test('middle layer has a glowing octahedron and rounded cube', async ({
  page
}) => {
  await page.goto('/')
  const mid = page.locator('[data-parallax-layer="mid"]')
  for (const shape of ['octahedron', 'rounded-cube']) {
    const element = mid.locator(`[data-shape="${shape}"]`).first()
    await expect(element, shape).toBeAttached()
    const glow = await element.evaluate(node => {
      const { filter, boxShadow } = getComputedStyle(node)
      return { filter, boxShadow }
    })
    expect(
      glow.filter.includes('drop-shadow') || glow.boxShadow !== 'none',
      `${shape} glows: ${JSON.stringify(glow)}`
    ).toBe(true)
  }
})
