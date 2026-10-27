import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { horizonIn, firstScreen } from './black-hole-helpers'
import {
  boxesOf,
  channelGap,
  channels,
  gotoHero,
  notebookEnd,
  pixelAt,
  scrollWindowTo,
  showSceneOnly,
  tokenRgb
} from './page-helpers'

// why: the hero's box is laid out in whole CSS px; a sub-pixel of slack
// absorbs rounding in the grid's own box.
const SLACK = 1
// why: the checklist's own numbers (C42–C48).
const CENTRE_SLACK = 2
const TITLE_BAND = { from: 0.4, to: 0.55 }
const TITLE_PX = { at1440: 157.5, floor: 72 }
const FONT_SLACK = 1
const SIZES = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 375, height: 667 }
]
// why: around the resting black hole, its disk and arcs, at 1440×900; past
// it, anything lit off the background is the logo. It shrinks with the hole.
const HOLE_REACH = { x: 240, y: 95 }
const LOGO_GAP = 24
const CORNERS = [
  { x: 2, y: 2 },
  { x: 1438, y: 2 },
  { x: 2, y: 898 },
  { x: 1438, y: 898 }
]
// why: the logo eases into each new lean; this is several of its time
// constants.
const LEAN_MS = 1500

test('hero is one screen tall', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  expect(await page.evaluate(() => scrollY)).toBe(0)
  const box = await page.locator('#hero').boundingBox()
  expect(box?.height).toBe(900)
})

test('hero has no laptop', async ({ page }) => {
  await gotoHero(page)
  await expect(page.locator('#hero iframe')).toHaveCount(0)
  // why: the laptop's screen page, the only iframe, loads near the notebook
  // (offscreen.spec), so the top of the page has none at all.
  await expect(page.locator('iframe')).toHaveCount(0)
})

test('only the logo model is loaded', async ({ page }) => {
  const models = new Set<string>()
  page.on('request', request => {
    const match = /\/models\/glass\/([a-z]+)\.glb$/.exec(request.url())
    if (match?.[1]) models.add(match[1])
  })
  await gotoHero(page)
  // why: down to the end, so a model loaded lazily further down counts too.
  await scrollWindowTo(page, await notebookEnd(page))
  await scrollWindowTo(
    page,
    await page.evaluate(() => document.documentElement.scrollHeight)
  )
  await page.waitForLoadState('networkidle')
  expect([...models]).toEqual(['logo'])
})

test('the hero grid covers the hero and nothing else', async ({ page }) => {
  await gotoHero(page)
  const grids = page.locator('[data-testid="hero-grid"]')
  await expect(grids).toHaveCount(1)
  await expect(page.locator('#hero [data-testid="hero-grid"]')).toHaveCount(1)
  const hero = await page.locator('#hero').boundingBox()
  const grid = await grids.boundingBox()
  if (!hero || !grid) throw new Error('no hero or grid box')
  for (const side of ['x', 'y', 'width', 'height'] as const)
    expect(Math.abs(grid[side] - hero[side]), side).toBeLessThanOrEqual(SLACK)
})

for (const { width, height } of SIZES)
  test(`the hero copy is centred at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const [title, subtitle, cta] = await boxesOf(page, [
      '#hero h1',
      '#hero p',
      '#hero a'
    ])
    if (!title || !subtitle || !cta) throw new Error('no hero copy')
    for (const [name, box] of [
      ['title', title],
      ['subtitle', subtitle],
      ['cta', cta]
    ] as const)
      expect(
        Math.abs((box.left + box.right) / 2 - width / 2),
        `${name} centred`
      ).toBeLessThanOrEqual(CENTRE_SLACK)
    const middle = (title.top + title.bottom) / 2
    expect(middle).toBeGreaterThanOrEqual(height * TITLE_BAND.from)
    expect(middle).toBeLessThanOrEqual(height * TITLE_BAND.to)
    expect(subtitle.top, 'subtitle below the title').toBeGreaterThanOrEqual(
      title.bottom
    )
    expect(cta.top, 'cta below the subtitle').toBeGreaterThanOrEqual(
      subtitle.bottom
    )
  })

/** The logo's box on screen: everything lit off the background, outside
 * the resting black hole; the scene must be shown alone. */
const logoBox = async (page: Page) => {
  const pixels = await firstScreen(page)
  const ink = channels(await tokenRgb(page, 'ink'))
  const hole = horizonIn(pixels, ink)
  if (!hole) throw new Error('no event horizon on screen')
  // why: the horizon is 96 px across at 1440×900; its disk and arcs scale
  // with it.
  const reach = {
    x: (HOLE_REACH.x * hole.width) / 96,
    y: (HOLE_REACH.y * hole.width) / 96
  }
  let left = Infinity
  let right = -Infinity
  let top = Infinity
  let bottom = -Infinity
  let count = 0
  const lit: { x: number; y: number }[] = []
  for (let y = 0; y < pixels.height; y++)
    for (let x = 0; x < pixels.width; x++) {
      if (Math.abs(x - hole.cx) < reach.x && Math.abs(y - hole.cy) < reach.y)
        continue
      if (channelGap(pixelAt(pixels, x, y), ink) <= LOGO_GAP) continue
      count++
      lit.push({ x, y })
      left = Math.min(left, x)
      right = Math.max(right, x)
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
    }
  // why: the logo is a frame, so its box's centre may be its hole; the lit
  // pixel nearest that centre is on the glass.
  const centre = { x: (left + right) / 2, y: (top + bottom) / 2 }
  const onGlass = lit.reduce(
    (best, point) =>
      Math.hypot(point.x - centre.x, point.y - centre.y) <
      Math.hypot(best.x - centre.x, best.y - centre.y)
        ? point
        : best,
    lit[0] ?? centre
  )
  return { left, right, top, bottom, count, onGlass }
}

test.describe('at rest', () => {
  test.use({ reducedMotion: 'reduce' })

  for (const { width, height } of [
    { width: 1440, height: 900 },
    { width: 375, height: 667 }
  ])
    test(`the logo clears the title and the CTA at ${width}x${height}`, async ({
      page
    }) => {
      await page.setViewportSize({ width, height })
      await gotoHero(page)
      const [title, cta] = await boxesOf(page, ['#hero h1', '#hero a'])
      if (!title || !cta) throw new Error('no hero copy')
      await showSceneOnly(page)
      // why: the logo leans and shifts towards the pointer; wherever the
      // pointer is, it must stay clear, so the four corners are tried too.
      const corners = CORNERS.map(({ x, y }) => ({
        x: x > 2 ? width - 2 : x,
        y: y > 2 ? height - 2 : y
      }))
      for (const pointer of [null, ...corners]) {
        if (pointer) {
          await page.mouse.move(pointer.x, pointer.y, { steps: 4 })
          await page.waitForTimeout(LEAN_MS)
        }
        const logo = await logoBox(page)
        const at = pointer
          ? `pointer at ${pointer.x},${pointer.y}`
          : 'no pointer'
        expect(logo.count, `the logo is on screen, ${at}`).toBeGreaterThan(500)
        for (const [name, box] of [
          ['title', title],
          ['cta', cta]
        ] as const) {
          const crosses =
            logo.left < box.right &&
            logo.right > box.left &&
            logo.top < box.bottom &&
            logo.bottom > box.top
          expect(crosses, `logo vs ${name}, ${at}`).toBe(false)
        }
      }
    })

  test('the logo still takes the pointer', async ({ page }) => {
    await gotoHero(page)
    await showSceneOnly(page)
    const { onGlass } = await logoBox(page)
    // why: the layers come back before the hit test; a hidden element is
    // skipped by it, so only with every layer shown can one be caught
    // taking the pointer.
    await page.evaluate(() => {
      for (const node of document.querySelectorAll<HTMLElement>('#hero *'))
        node.style.visibility = ''
    })
    // why: R3F hears the pointer on the 3D canvas and leans or grows the
    // logo from there (glass-motion.test.ts); nothing laid over the scene,
    // grid, lens or copy, may take the pointer on the logo's glass.
    const hit = await page.evaluate(({ x, y }) => {
      const scene = document.querySelector('[data-testid="hero-scene"]')
      const target = document.elementFromPoint(x, y)
      return !!target && !!scene?.contains(target)
    }, onGlass)
    expect(hit).toBe(true)
  })
})

test('the hero copy lies over the black hole', async ({ page }) => {
  await gotoHero(page)
  const hits = await page.evaluate(() =>
    ['h1', 'p', 'a'].map(tag => {
      const element = document.querySelector(`#hero ${tag}`)
      const box = element?.getBoundingClientRect()
      if (!element || !box) throw new Error(`no hero ${tag}`)
      const hit = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2
      )
      return !!hit && element.contains(hit)
    })
  )
  expect(hits).toEqual([true, true, true])
})

test('the title is 157.5px at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('#hero h1')).toHaveCSS('font-size', '157.5px')
})

test('the title scales with the window', async ({ page }) => {
  for (const { width, expected } of [
    { width: 1024, expected: 112 },
    { width: 375, expected: TITLE_PX.floor },
    { width: 1280, expected: (TITLE_PX.at1440 * 1280) / 1440 },
    { width: 768, expected: (TITLE_PX.at1440 * 768) / 1440 }
  ]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const size = await page
      .locator('#hero h1')
      .evaluate(title => parseFloat(getComputedStyle(title).fontSize))
    expect(
      Math.abs(size - Math.max(TITLE_PX.floor, expected)),
      `at ${width}px: ${size}px`
    ).toBeLessThanOrEqual(FONT_SLACK)
  }
})

/** Each word of an element's first text node, with its line boxes. */
const wordBoxes = (page: Page, selector: string) =>
  page.locator(selector).evaluate(element => {
    const node = [...element.childNodes].find(
      child => child.nodeType === Node.TEXT_NODE
    )
    const text = node?.textContent ?? ''
    if (!node) throw new Error('no text')
    const origin = element.getBoundingClientRect()
    const words: { word: string; rects: { x: number; y: number }[] }[] = []
    for (const match of text.matchAll(/\S+/g)) {
      const range = document.createRange()
      range.setStart(node, match.index)
      range.setEnd(node, match.index + match[0].length)
      words.push({
        word: match[0],
        rects: [...range.getClientRects()].map(rect => ({
          x: rect.left - origin.left,
          y: rect.top - origin.top
        }))
      })
    }
    return { words, fontSize: getComputedStyle(element).fontSize }
  })

test('the lens outline wraps like the title', async ({ page }) => {
  for (const size of SIZES) {
    await page.setViewportSize(size)
    await page.goto('/')
    const title = await wordBoxes(page, '#hero h1')
    const outline = await wordBoxes(page, '#hero [data-lens="outline"]')
    const at = `${size.width}x${size.height}`
    expect(outline.fontSize, at).toBe(title.fontSize)
    expect(
      outline.words.map(({ word }) => word),
      at
    ).toEqual(title.words.map(({ word }) => word))
    title.words.forEach(({ word, rects }, index) => {
      const twin = outline.words[index]?.rects[0]
      const own = rects[0]
      if (!own || !twin) throw new Error(`${at}: ${word} has no box`)
      expect(Math.abs(twin.x - own.x), `${at}: ${word}`).toBeLessThanOrEqual(1)
      expect(Math.abs(twin.y - own.y), `${at}: ${word}`).toBeLessThanOrEqual(1)
    })
  }
})

for (const { width, height } of SIZES)
  test(`no word of the title breaks at ${width}x${height}`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    const { words } = await wordBoxes(page, '#hero h1')
    for (const { word, rects } of words) expect(rects.length, word).toBe(1)
  })
