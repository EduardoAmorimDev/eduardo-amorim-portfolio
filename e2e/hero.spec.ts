import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  boxesOf,
  gotoHero,
  hideHeroCopy,
  luminanceAt,
  nextFrames,
  notebookEnd,
  screenPixels,
  scrollWindowTo
} from './page-helpers'

// why: `--text-hero: clamp(3rem, 6.4vw, 6.75rem)` (app/globals.css), so
// 92.16px at 1440 wide, never under 48px nor over 108px.
const TITLE = { vw: 6.4, floor: 48, cap: 108 }
const FONT_SLACK = 0.5
const SIZES = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 375, height: 667 }
]

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
  // why: the devices' screen pages, the only iframes, load near the notebook
  // (offscreen.spec), so the top of the page has none at all.
  await expect(page.locator('iframe')).toHaveCount(0)
})

test("the only 3D models are the notebook's laptop and the glass", async ({
  page
}) => {
  const models = new Set<string>()
  page.on('request', request => {
    const match = /\/models\/(.+)\.glb$/.exec(new URL(request.url()).pathname)
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
  // invariant: the black hole is one shader (task hero-gargantua, 1);
  // laptop.tsx preloads its own model, and the glass came back as the
  // cursor and the solution icons (task reach-and-seams, 12–13, 22).
  expect([...models].filter(name => !name.startsWith('glass/'))).toEqual([
    'laptop'
  ])
  expect(models).toContain('glass/cursor')
})

test('the hero has no glass logo, icons, grid, lens or outline title', async ({
  page
}) => {
  await gotoHero(page)
  // invariant: task hero-gargantua, 6: one canvas, the scene, and the copy;
  // the sound toggle's icon is the one svg allowed.
  await expect(page.locator('#hero canvas')).toHaveCount(1)
  await expect(
    page.locator(
      '[data-testid="hero-grid"], [data-testid="hero-lens"], [data-lens], #hero img, #hero svg:not(button svg)'
    )
  ).toHaveCount(0)
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

/**
 * Where the scene's light is centred on screen, the copy hidden: the
 * luminance-weighted mean of every pixel, so the lit disk around the hole.
 */
const lightCentre = async (page: Page) => {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  await hideHeroCopy(page)
  await nextFrames(page)
  const pixels = await screenPixels(page, { x: 0, y: 0, ...viewport })
  let sum = 0
  let x = 0
  let y = 0
  for (let row = 0; row < pixels.height; row++)
    for (let column = 0; column < pixels.width; column++) {
      const light = luminanceAt(pixels, column, row)
      sum += light
      x += light * column
      y += light * row
    }
  if (!sum) throw new Error('the scene is black')
  return { x: x / sum, y: y / sum }
}

test.describe('layout', () => {
  // why: a still scene, faded in at once and turned by no pointer (task 5).
  test.use({ reducedMotion: 'reduce' })

  for (const { width, height } of SIZES.filter(
    size => size.width > size.height
  ))
    test(`the copy is left of the black hole at ${width}x${height}`, async ({
      page
    }) => {
      await page.setViewportSize({ width, height })
      await gotoHero(page)
      const boxes = await boxesOf(page, ['#hero h1', '#hero p', '#hero a'])
      const copyRight = Math.max(...boxes.map(({ right }) => right))
      // invariant: task hero-gargantua, 3: the hole to the right, the copy
      // to the left, in the left half of the screen.
      expect(copyRight).toBeLessThanOrEqual(width / 2)
      const light = await lightCentre(page)
      expect(light.x, 'the scene is lit right of the copy').toBeGreaterThan(
        copyRight
      )
    })

  for (const { width, height } of SIZES.filter(
    size => size.width < size.height
  ))
    test(`the copy is under the black hole at ${width}x${height}`, async ({
      page
    }) => {
      await page.setViewportSize({ width, height })
      await gotoHero(page)
      const boxes = await boxesOf(page, [
        '#hero span',
        '#hero h1',
        '#hero p',
        '#hero a'
      ])
      const copyTop = Math.min(...boxes.map(({ top }) => top))
      // invariant: task hero-gargantua, 3: the hole in the top half, the
      // copy below it.
      const light = await lightCentre(page)
      expect(light.y, 'the scene is lit in the top half').toBeLessThan(
        height / 2
      )
      expect(copyTop, 'the copy starts below it').toBeGreaterThan(light.y)
    })
})

test('the title is 92.16px at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('#hero h1')).toHaveCSS('font-size', '92.16px')
})

test('the title scales with the window', async ({ page }) => {
  for (const width of [1920, 1280, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const size = await page
      .locator('#hero h1')
      .evaluate(title => parseFloat(getComputedStyle(title).fontSize))
    const expected = Math.min(
      TITLE.cap,
      Math.max(TITLE.floor, (TITLE.vw * width) / 100)
    )
    expect(
      Math.abs(size - expected),
      `at ${width}px: ${size}px, not ${expected}px`
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
    const words: { word: string; lines: number }[] = []
    for (const match of text.matchAll(/\S+/g)) {
      const range = document.createRange()
      range.setStart(node, match.index)
      range.setEnd(node, match.index + match[0].length)
      words.push({ word: match[0], lines: range.getClientRects().length })
    }
    return words
  })

for (const { width, height } of SIZES)
  test(`no word of the title breaks at ${width}x${height}`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    for (const { word, lines } of await wordBoxes(page, '#hero h1'))
      expect(lines, word).toBe(1)
  })
