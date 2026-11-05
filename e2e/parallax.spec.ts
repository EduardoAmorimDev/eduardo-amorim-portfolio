import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { documentTop, nextFrames, scrollWindowTo } from './page-helpers'

const SPEEDS = { back: 0.2, mid: 0.5, front: 1.3 }
const TOLERANCE_PX = 4
const SCROLL_PX = 400

// why: the slabs of every layer in the block holding #solucoes, the block
// on screen (task portfolio-lp-mobile, 14: a layer moves as its slabs); the
// block after the notebook has its own, moving at the same speeds.
const layerTops = (page: Page) =>
  page.evaluate(() => ({
    scrollY,
    slabs: [
      ...(document
        .querySelector('#solucoes')
        ?.parentElement?.querySelectorAll<HTMLElement>(
          '[data-parallax-slab]'
        ) ?? [])
    ].map(slab => ({
      layer: slab.dataset.parallaxSlab,
      top: slab.getBoundingClientRect().top
    }))
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
    const slabs = before.slabs.flatMap((slab, index) =>
      slab.layer === layer
        ? [{ from: slab.top, to: after.slabs[index]?.top }]
        : []
    )
    expect(slabs.length, `slabs of ${layer}`).toBeGreaterThan(0)
    for (const { from, to } of slabs) {
      if (to === undefined) throw new Error(`a ${layer} slab went missing`)
      const moved = from - to
      expect(
        Math.abs(moved - speed * scrolled),
        `${layer} moved ${moved}px for ${scrolled}px`
      ).toBeLessThanOrEqual(TOLERANCE_PX)
    }
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
      // why: a layer draws its items in slabs (task portfolio-lp-mobile,
      // 14), the twinkling stars inside their group (portfolio-lp-60fps, 9).
      items: [
        ...layer.querySelectorAll(
          '[data-parallax-slab] :is([data-star], [data-dust], [data-milky-way])'
        )
      ].map(child => {
        const style = getComputedStyle(child)
        const group = child.closest('[data-twinkle-group]')
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
          groupAnimation: group
            ? getComputedStyle(group).animationName
            : 'none',
          twinkles: child.hasAttribute('data-twinkle'),
          size: parseFloat(style.width)
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
      if (item.kind === 'far') {
        expect(item.twinkles, `a ${item.size} px star`).toBe(item.size >= 1.5)
        expect(item.animation).toBe('none')
        expect(item.groupAnimation).toBe(item.size >= 1.5 ? 'twinkle' : 'none')
      }
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
  // invariant: one band, drawn whole in each slab of the back layer and cut
  // to it (task portfolio-lp-mobile, 2), so every copy is the same band.
  const copies = await band.evaluateAll(elements =>
    elements.map(element => ({
      opacity: Number(getComputedStyle(element).opacity),
      start: Number(element.getAttribute('data-band-start')),
      end: Number(element.getAttribute('data-band-end')),
      half: Number(element.getAttribute('data-band-half'))
    }))
  )
  // why: one copy per slab of the back layer (PARALLAX_SLABS.back).
  expect(copies).toHaveLength(3)
  const [first] = copies
  if (!first) throw new Error('no milky way')
  for (const copy of copies) expect(copy).toEqual(first)
  const { opacity, start, end, half } = first
  expect({ start, end, half }).toEqual({ start: 10, end: 90, half: 9 })
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
