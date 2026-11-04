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
  // invariant: task earth-and-sky, 14-15: the Milky Way and stars that
  // twinkle at the back, brighter ones with a halo in the middle, blurred
  // dust in front, nothing else.
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
            (child.hasAttribute('data-dust')
              ? 'dust'
              : child.hasAttribute('data-milky-way')
                ? 'milky-way'
                : child.tagName),
          shadow: style.boxShadow,
          filter: style.filter,
          animation: style.animationName,
          twinkles: child.hasAttribute('data-twinkle')
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
  expect(kinds).toEqual({
    back: ['milky-way', 'far'],
    mid: ['near'],
    front: ['dust']
  })
  for (const { name, depth, items } of found) {
    expect(items.length, name).toBeGreaterThan(0)
    // why: the sections sit at z-index 0 of the block, between the layers.
    if (name === 'front') expect(depth, 'over the sections').toBeGreaterThan(0)
    else expect(depth, `${name} behind the sections`).toBeLessThan(0)
    for (const item of items) {
      // invariant: task earth-and-sky, 13: the brighter far stars twinkle,
      // the faint 1 px ones hold still.
      if (item.kind === 'far')
        expect(item.animation).toBe(item.twinkles ? 'twinkle' : 'none')
      if (name === 'mid') expect(item.shadow, 'a halo').not.toBe('none')
      if (name === 'front')
        expect(item.filter, 'blurred').toMatch(/blur\([1-9]/)
    }
  }
})

type Star = {
  top: number
  left: number
  size: number
  peak: number
  colour: string
}

/** Every star of a kind in the block holding #solucoes, in % of its layer. */
const starsOf = (page: Page, kind: string) =>
  page.evaluate(selector => {
    const block = document.querySelector('#solucoes')?.parentElement
    if (!block) throw new Error('no #solucoes block')
    return [...block.querySelectorAll<HTMLElement>(selector)].map(star => ({
      top: parseFloat(star.style.top),
      left: parseFloat(star.style.left),
      size: parseFloat(star.style.width),
      peak: Number(star.style.getPropertyValue('--star-peak') || 1),
      // why: the tint alone; the alpha is the star's brightness.
      colour: getComputedStyle(star)
        .backgroundColor.replace(/\s*\/\s*[\d.]+\s*\)$|,\s*[\d.]+\)$/, ')')
        .replace(/^rgba?\(/, 'rgb(')
    }))
  }, kind)

/** Coefficient of variation of the gaps between sorted values. */
const gapVariation = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const gaps = sorted
    .slice(1)
    .map((value, index) => value - (sorted[index] ?? 0))
  const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
  const spread = Math.sqrt(
    gaps.reduce((sum, gap) => sum + (gap - mean) ** 2, 0) / gaps.length
  )
  return spread / mean
}

// why: the checklist's own numbers (task earth-and-sky, 12-13, 15).
const SKY = { far: 220, variation: 0.5, faint: 0.6, bright: 0.05, tints: 3 }

test('a night sky, scattered with no rows', async ({ page }) => {
  await page.goto('/')
  const far: Star[] = await starsOf(page, '[data-star="far"]')
  expect(far.length).toBeGreaterThanOrEqual(SKY.far)
  const sets = {
    far,
    near: await starsOf(page, '[data-star="near"]'),
    dust: await starsOf(page, '[data-dust]')
  }
  for (const [name, stars] of Object.entries(sets)) {
    expect(
      gapVariation(stars.map(({ top }) => top)),
      `${name} tops`
    ).toBeGreaterThan(SKY.variation)
    expect(
      gapVariation(stars.map(({ left }) => left)),
      `${name} lefts`
    ).toBeGreaterThan(SKY.variation)
  }
  const faint = far.filter(({ size, peak }) => size === 1 && peak <= 0.5)
  const bright = far.filter(({ size }) => size >= 2.5)
  expect(faint.length / far.length).toBeGreaterThanOrEqual(SKY.faint)
  expect(bright.length / far.length).toBeLessThanOrEqual(SKY.bright)
  expect(new Set(far.map(({ colour }) => colour)).size).toBeGreaterThanOrEqual(
    SKY.tints
  )
})

test('the milky way crowds the stars along a faint diagonal', async ({
  page
}) => {
  await page.goto('/')
  const band = page
    .locator('#solucoes')
    .locator('xpath=..')
    .locator('[data-parallax-layer="back"] [data-milky-way]')
  await expect(band).toHaveCount(1)
  const { opacity, start, end, half } = await band.evaluate(element => ({
    opacity: Number(getComputedStyle(element).opacity),
    start: Number(element.getAttribute('data-band-start')),
    end: Number(element.getAttribute('data-band-end')),
    half: Number(element.getAttribute('data-band-half'))
  }))
  expect(opacity).toBeGreaterThan(0)
  expect(opacity).toBeLessThanOrEqual(0.12)
  // invariant: diagonal: its middle line drops across the layer.
  expect(Math.abs(end - start)).toBeGreaterThanOrEqual(30)
  const far: Star[] = await starsOf(page, '[data-star="far"]')
  const inside = far.filter(
    ({ top, left }) =>
      Math.abs(top - (start + ((end - start) * left) / 100)) < half
  ).length
  // why: the band's share of the layer, measured on a fine grid.
  let cells = 0
  let inBand = 0
  for (let x = 0.5; x < 100; x++)
    for (let y = 0.5; y < 100; y++) {
      cells++
      if (Math.abs(y - (start + ((end - start) * x) / 100)) < half) inBand++
    }
  const share = inBand / cells
  const density = inside / far.length / share
  const outside = (far.length - inside) / far.length / (1 - share)
  expect(density / outside).toBeGreaterThanOrEqual(2)
})

test('the sky hydrates as the server drew it', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(errors.filter(text => /hydrat/i.test(text))).toEqual([])
})
