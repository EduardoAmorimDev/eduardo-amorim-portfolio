import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { documentTop, nextFrames, scrollWindowTo } from './page-helpers'

const SPEEDS = { back: 0.2, mid: 0.5, front: 1.3 }
const TOLERANCE_PX = 4
const SCROLL_PX = 400

// why: the layers of the block holding #solucoes, the block on screen; the
// block after the notebook has its own, moving at the same speeds.
const layerTops = (page: Page) =>
  page.evaluate(() => ({
    scrollY,
    tops: Object.fromEntries(
      [
        ...(document
          .querySelector('#solucoes')
          ?.parentElement?.querySelectorAll<HTMLElement>(
            '[data-parallax-layer]'
          ) ?? [])
      ].map(layer => [
        layer.dataset.parallaxLayer,
        layer.getBoundingClientRect().top
      ])
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

test('the field is far stars, glowing near stars and blurred dust', async ({
  page
}) => {
  await page.goto('/')
  // invariant: task you-are-here, 9: stars that twinkle at the back, brighter
  // ones with a halo in the middle, blurred dust in front, nothing else.
  const found = await page.evaluate(() =>
    [
      ...(document
        .querySelector('#solucoes')
        ?.parentElement?.querySelectorAll<HTMLElement>(
          '[data-parallax-layer]'
        ) ?? [])
    ].map(layer => ({
      name: layer.dataset.parallaxLayer,
      depth: Number(getComputedStyle(layer).zIndex),
      items: [...layer.children].map(child => {
        const style = getComputedStyle(child)
        return {
          kind:
            child.getAttribute('data-star') ??
            (child.hasAttribute('data-dust') ? 'dust' : child.tagName),
          shadow: style.boxShadow,
          filter: style.filter,
          animation: style.animationName
        }
      })
    }))
  )
  const kinds = Object.fromEntries(
    found.map(({ name, items }) => [
      name,
      [...new Set(items.map(({ kind }) => kind))]
    ])
  )
  expect(kinds).toEqual({ back: ['far'], mid: ['near'], front: ['dust'] })
  for (const { name, depth, items } of found) {
    expect(items.length, name).toBeGreaterThan(0)
    // why: the sections sit at z-index 0 of the block, between the layers.
    if (name === 'front') expect(depth, 'over the sections').toBeGreaterThan(0)
    else expect(depth, `${name} behind the sections`).toBeLessThan(0)
    for (const item of items) {
      if (name === 'back') expect(item.animation).toBe('twinkle')
      if (name === 'mid') expect(item.shadow, 'a halo').not.toBe('none')
      if (name === 'front')
        expect(item.filter, 'blurred').toMatch(/blur\([1-9]/)
    }
  }
})
