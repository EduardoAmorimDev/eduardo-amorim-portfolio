import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  documentTop,
  gotoNotebook,
  notebookEnd,
  scrollWindowTo
} from './page-helpers'

const screenOpacity = (page: Page) =>
  page
    .locator('#notebook iframe')
    .evaluate(frame => Number(getComputedStyle(frame).opacity))

test('notebook is labelled and shows no text', async ({ page }) => {
  await page.goto('/')
  const notebook = page.locator('#notebook')
  await expect(notebook).toHaveAttribute('aria-label', 'Notebook')
  await expect(notebook.locator('h1, h2, h3, p')).toHaveCount(0)
  expect(await notebook.evaluate(node => (node.textContent ?? '').trim())).toBe(
    ''
  )
})

test('notebook is three screens tall and holds its scene', async ({ page }) => {
  await gotoNotebook(page)
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  const box = await page.locator('#notebook').boundingBox()
  expect(box?.height).toBe(viewport.height * 3)

  const top = await documentTop(page.locator('#notebook'))
  await scrollWindowTo(page, top + viewport.height)
  const scene = await page
    .locator('[data-testid="notebook-scene"]')
    .evaluate(node => {
      const { top, bottom } = node.getBoundingClientRect()
      return { top, bottom }
    })
  expect(scene).toEqual({ top: 0, bottom: viewport.height })
})

test('scrolling through the notebook powers the laptop on', async ({
  page
}) => {
  await gotoNotebook(page)
  expect(await screenOpacity(page)).toBeLessThanOrEqual(0.05)

  await scrollWindowTo(page, await notebookEnd(page))
  await expect
    .poll(() => screenOpacity(page), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(0.9)
})

test('nothing floats over the notebook', async ({ page }) => {
  await gotoNotebook(page)
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  const top = await documentTop(page.locator('#notebook'))
  await scrollWindowTo(page, top + viewport.height)

  await expect(page.locator('#notebook [data-testid="hero-grid"]')).toHaveCount(
    0
  )
  await expect(page.locator('[data-testid="sections-grid"]')).toHaveCount(0)
  // invariant: every parallax layer and glow is clipped to its own block of
  // sections, so a block off screen leaves nothing of them on screen.
  const reaching = await page.evaluate(() => {
    const boxes = [
      ...[...document.querySelectorAll('[data-parallax-layer]')].map(
        layer => layer.parentElement
      ),
      ...[...document.querySelectorAll('[data-testid="sections-glow"]')].map(
        glow => glow.closest('[aria-hidden="true"]')
      ),
      document.querySelector('#hero')
    ]
    return boxes.flatMap(node => {
      if (!node) return ['a layer without a clipping box']
      const { top, bottom } = node.getBoundingClientRect()
      return bottom > 0 && top < innerHeight
        ? [`${node.tagName} ${top}–${bottom}`]
        : []
    })
  })
  expect(reaching).toEqual([])
})
