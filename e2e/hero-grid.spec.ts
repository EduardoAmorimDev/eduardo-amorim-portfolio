import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  allLines,
  between,
  gridTop,
  maxShift,
  measureLines,
  readGrid,
  restLines,
  sweepPointer,
  type MeasuredLine
} from './grid-helpers'
import { gotoHero, heroEnd, nextFrames, scrollWindowTo } from './page-helpers'

const SPACING = 48
const RADIUS = 160
const MAX_SHIFT = 12
const SETTLE_MS = 800
// why: a line's centre is read from antialiased pixels, exact to a fraction
// of a px; this slack keeps rounding from failing a bend right at the limit.
const SLACK = 0.5
// why: a straight line is drawn on whole pixels, so its read centre does not
// move at all; anything past this is a bend.
const STILL = 0.05

/** Lines within (or beyond) the radius of the pointer, per family. */
const byDistance = (
  measured: ReturnType<typeof measureLines>,
  pointer: { x: number; y: number },
  near: boolean
) => {
  const pick = (lines: MeasuredLine[], at: number) =>
    lines.filter(line => Math.abs(line.rest - at) <= RADIUS === near)
  return [
    ...pick(measured.vertical, pointer.x),
    ...pick(measured.horizontal, pointer.y)
  ]
}

/** Records, in page time, every pointer move on the document element. */
const recordMoves = (page: Page) =>
  page.evaluate(() => {
    const root = document.documentElement
    window.addEventListener('pointermove', event => {
      root.dataset.lastMove = String(performance.now())
      const grid = document.querySelector('[data-testid="hero-grid"]')
      const box = grid?.getBoundingClientRect()
      if (box && event.clientY > box.bottom && !root.dataset.leftAt)
        root.dataset.leftAt = String(performance.now())
    })
  })

/** Waits until `ms` have passed in page time since the recorded `key`. */
const waitSince = (page: Page, key: 'lastMove' | 'leftAt', ms: number) =>
  page.waitForFunction(
    ([name, wait]) => {
      const since = document.documentElement.dataset[name]
      return since !== undefined && performance.now() >= Number(since) + wait
    },
    [key, ms] as const
  )

/** The hero at rest, its grid's rest lines and a pointer spot between them. */
const restAtTop = async (page: Page) => {
  await gotoHero(page)
  const rest = restLines(await readGrid(page))
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  const pointer = between(rest, {
    x: viewport.width / 2,
    y: viewport.height / 2
  })
  return { rest, pointer }
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} grid`, () => {
    test.use({ colorScheme: scheme })

    test('grid is straight and 48px apart at rest', async ({ page }) => {
      await gotoHero(page)
      const viewport = page.viewportSize()
      if (!viewport) throw new Error('no viewport')
      // why: the hero's last screen leaves its top half on screen, so the
      // pointer can move below it, outside the hero, while the grid is read.
      await scrollWindowTo(page, (await heroEnd(page)) + viewport.height / 2)
      for (const x of [200, 600, 1000])
        await sweepPointer(page, { x, y: viewport.height - 100 })

      const grid = await readGrid(page)
      const rest = restLines(grid)
      for (const lines of [rest.vertical, rest.horizontal]) {
        expect(lines.length).toBeGreaterThan(2)
        for (let index = 1; index < lines.length; index++)
          expect((lines[index] ?? NaN) - (lines[index - 1] ?? NaN)).toBeCloseTo(
            SPACING,
            2
          )
      }
      for (const line of allLines(measureLines(grid, rest)))
        expect(maxShift(line), `line at ${line.rest}px`).toBeLessThanOrEqual(
          STILL
        )
    })
  })
}

test('lines near a moving pointer bend at most 12px', async ({ page }) => {
  const { rest, pointer } = await restAtTop(page)
  await sweepPointer(page, pointer)

  const near = byDistance(
    measureLines(await readGrid(page), rest),
    pointer,
    true
  )
  // invariant: halfway between lines, three lines per side and family fall
  // within 160px (24, 72 and 120px away).
  expect(near).toHaveLength(12)
  for (const line of near) {
    const shift = maxShift(line)
    expect(shift, `line at ${line.rest}px bends`).toBeGreaterThan(STILL)
    expect(shift, `line at ${line.rest}px`).toBeLessThanOrEqual(
      MAX_SHIFT + SLACK
    )
  }
})

test('lines beyond 160px stay straight', async ({ page }) => {
  const { rest, pointer } = await restAtTop(page)
  await sweepPointer(page, pointer)

  const measured = measureLines(await readGrid(page), rest)
  expect(
    Math.max(...byDistance(measured, pointer, true).map(maxShift)),
    'the pointer did bend the lines near it'
  ).toBeGreaterThan(1)
  const far = byDistance(measured, pointer, false)
  expect(far.length).toBeGreaterThan(0)
  for (const line of far)
    expect(maxShift(line), `line at ${line.rest}px`).toBeLessThanOrEqual(STILL)
})

test('lines straighten within 800ms after the pointer stops', async ({
  page
}) => {
  const { rest, pointer } = await restAtTop(page)
  await recordMoves(page)
  await sweepPointer(page, pointer)
  const bent = measureLines(await readGrid(page), rest)
  expect(Math.max(...allLines(bent).map(maxShift))).toBeGreaterThan(1)

  await waitSince(page, 'lastMove', SETTLE_MS)
  for (const line of allLines(measureLines(await readGrid(page), rest)))
    expect(maxShift(line), `line at ${line.rest}px`).toBeLessThanOrEqual(STILL)
})

test('lines straighten within 800ms after the pointer leaves', async ({
  page
}) => {
  await gotoHero(page)
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  await scrollWindowTo(page, (await heroEnd(page)) + viewport.height / 2)
  await nextFrames(page)
  const rest = restLines(await readGrid(page))
  const top = await gridTop(page)
  // why: the hero holds the top half of the screen here; aim at the middle of
  // that half, between lines, in the grid's own coordinates.
  const spot = between(rest, {
    x: viewport.width / 2,
    y: viewport.height / 4 - top
  })
  const inside = { x: spot.x, y: spot.y + top }
  await recordMoves(page)
  await sweepPointer(page, inside)
  const bent = measureLines(await readGrid(page), rest)
  expect(Math.max(...allLines(bent).map(maxShift))).toBeGreaterThan(1)

  await page.mouse.move(inside.x, viewport.height - 80, { steps: 8 })
  await page.mouse.move(inside.x + 120, viewport.height - 60, { steps: 4 })
  await waitSince(page, 'leftAt', SETTLE_MS)
  for (const line of allLines(measureLines(await readGrid(page), rest)))
    expect(maxShift(line), `line at ${line.rest}px`).toBeLessThanOrEqual(STILL)
})

test('grid never takes the pointer from the 3D canvas', async ({ page }) => {
  await gotoHero(page)
  const grid = page.locator('[data-testid="hero-grid"]')
  await expect(grid).toHaveCSS('pointer-events', 'none')

  const hit = await page.evaluate(() => {
    const scene = document.querySelector('[data-testid="hero-scene"]')
    const hero = document.querySelector('#hero')
    const box = hero?.getBoundingClientRect()
    if (!scene || !box) throw new Error('no hero scene')
    const target = document.elementFromPoint(
      box.left + box.width / 2,
      Math.min(box.top + box.height / 2, innerHeight / 2)
    )
    const webgl = [...scene.querySelectorAll('canvas')].filter(
      canvas => canvas.getContext('webgl2') !== null
    )
    return {
      tag: target?.tagName,
      webgl: webgl.length,
      inScene: !!target && scene.contains(target),
      onGrid: !!target?.closest('[data-testid="hero-grid"]')
    }
  })
  // why: R3F listens for the pointer on the <div> that holds its WebGL
  // canvas; a hit on the canvas or on that <div> reaches the scene alike.
  expect(hit.webgl, 'the scene draws with one WebGL canvas').toBe(1)
  expect(hit.onGrid, `hit ${hit.tag}`).toBe(false)
  expect(hit.inScene, `hit ${hit.tag}`).toBe(true)
})
