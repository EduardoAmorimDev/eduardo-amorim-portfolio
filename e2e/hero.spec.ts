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
// why: the checklist's own numbers (C18, C19, C22).
const CENTRE_SLACK = 2
const TITLE_BAND = { from: 0.4, to: 0.55 }
// why: around the resting black hole, its disk and arcs; past it, anything
// lit off the background is the logo.
const HOLE_REACH = { x: 240, y: 110 }
const LOGO_GAP = 24

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

for (const { width, height } of [
  { width: 1440, height: 900 },
  { width: 375, height: 667 }
])
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

test.describe('at rest', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the logo clears the title and the CTA', async ({ page }) => {
    await gotoHero(page)
    const [title, cta] = await boxesOf(page, ['#hero h1', '#hero a'])
    if (!title || !cta) throw new Error('no hero copy')
    await showSceneOnly(page)
    const pixels = await firstScreen(page)
    const ink = channels(await tokenRgb(page, 'ink'))
    const hole = horizonIn(pixels, ink)
    if (!hole) throw new Error('no event horizon on screen')
    let left = Infinity
    let right = -Infinity
    let top = Infinity
    let bottom = -Infinity
    let count = 0
    for (let y = 0; y < pixels.height; y++)
      for (let x = 0; x < pixels.width; x++) {
        if (
          Math.abs(x - hole.cx) < HOLE_REACH.x &&
          Math.abs(y - hole.cy) < HOLE_REACH.y
        )
          continue
        if (channelGap(pixelAt(pixels, x, y), ink) <= LOGO_GAP) continue
        count++
        left = Math.min(left, x)
        right = Math.max(right, x)
        top = Math.min(top, y)
        bottom = Math.max(bottom, y)
      }
    expect(count, 'the logo is on screen').toBeGreaterThan(500)
    for (const [name, box] of [
      ['title', title],
      ['cta', cta]
    ] as const) {
      const crosses =
        left < box.right &&
        right > box.left &&
        top < box.bottom &&
        bottom > box.top
      expect(crosses, `logo ${left}–${right}×${top}–${bottom} vs ${name}`).toBe(
        false
      )
    }
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
