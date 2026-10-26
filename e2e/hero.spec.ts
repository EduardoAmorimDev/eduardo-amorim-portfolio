import { expect, test } from './fixtures'
import { gotoHero, notebookEnd, scrollWindowTo } from './page-helpers'

// why: the hero's box is laid out in whole CSS px; a sub-pixel of slack
// absorbs rounding in the grid's own box.
const SLACK = 1

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
  // invariant: the laptop exists, just elsewhere; its screen page is the
  // only iframe on the page.
  await expect(page.locator('#notebook iframe')).toHaveCount(1)
})

test('only the cursor, atom and logo models are loaded', async ({ page }) => {
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
  expect([...models].sort()).toEqual(['atom', 'cursor', 'logo'])
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
