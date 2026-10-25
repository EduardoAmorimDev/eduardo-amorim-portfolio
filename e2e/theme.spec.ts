import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { readGrid, type GridImage } from './grid-helpers'
import {
  channelGap,
  channels,
  gotoHero,
  hideHeroCopy,
  meanLuminance,
  pixelAt,
  relativeLuminance,
  screenPixels,
  tokenRgb,
  type Pixels
} from './page-helpers'

const INK = 'rgb(16, 17, 19)'
const MIST = 'rgb(242, 247, 255)'
const WHITE = 'rgb(255, 255, 255)'
const THEMES = {
  dark: { background: INK, text: MIST, other: WHITE },
  light: { background: WHITE, text: INK, other: INK }
} as const
type Scheme = keyof typeof THEMES
// why: the checklist's tolerance for the sky's colour, per channel.
const SKY_SLACK = 3
// why: a step between neighbouring floor pixels larger than this would read
// as an edge; a fog fade changes a few levels per pixel at most.
const MAX_STEP = 4

/**
 * Each section's painted background (the first opaque one up its
 * ancestors) and its text colour.
 */
const sectionColours = (page: Page) =>
  page.locator('main section').evaluateAll(sections =>
    sections.map(section => {
      let background = 'rgba(0, 0, 0, 0)'
      for (
        let node: Element | null = section;
        node && background === 'rgba(0, 0, 0, 0)';
        node = node.parentElement
      )
        background = getComputedStyle(node).backgroundColor
      return {
        id: section.id,
        background,
        text: getComputedStyle(section).color
      }
    })
  )

const expectSectionsIn = async (page: Page, scheme: Scheme) => {
  const found = await sectionColours(page)
  expect(found.map(({ id }) => id)).toHaveLength(9)
  for (const { id, background, text } of found) {
    expect(background, `${id} background`).toBe(THEMES[scheme].background)
    expect(text, `${id} text`).toBe(THEMES[scheme].text)
  }
}

/** The hero's whole first screen, as painted. */
const heroScreen = async (page: Page) => {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  return screenPixels(page, { x: 0, y: 0, ...viewport })
}

/** The sky: the pixel at the hero's top left corner. */
const expectSkyIn = (pixels: Pixels, scheme: Scheme) => {
  const sky = pixelAt(pixels, 2, 2)
  expect(
    channelGap(sky, channels(THEMES[scheme].background)),
    `sky ${sky.join(',')}`
  ).toBeLessThanOrEqual(SKY_SLACK)
}

/**
 * The floor seen along both side edges of the screen, from the bottom up to
 * where it meets the sky: it starts in the theme's floor colour and fades,
 * with no edge, into the theme's background.
 */
const expectFloorIn = (pixels: Pixels, scheme: Scheme) => {
  const background = channels(THEMES[scheme].background)
  const other = channels(THEMES[scheme].other)
  for (const x of [pixels.width * 0.02, pixels.width * 0.98]) {
    const column: { y: number; pixel: number[] }[] = []
    for (
      let y = Math.floor(pixels.height * 0.97);
      y > pixels.height * 0.45;
      y--
    )
      column.push({ y, pixel: pixelAt(pixels, x, y) })
    for (let index = 1; index < column.length; index++)
      expect(
        channelGap(column[index]?.pixel ?? [], column[index - 1]?.pixel ?? []),
        `step at ${Math.round(x)},${column[index]?.y}`
      ).toBeLessThanOrEqual(MAX_STEP)
    // why: the floor's far edge projects just below the middle of the screen
    // (the camera sits 3 units above a 30-unit floor); this band is the far
    // floor, between that edge and where the spotlights reach.
    const far = column.filter(
      ({ y }) => y >= pixels.height * 0.5 && y <= pixels.height * 0.58
    )
    expect(far.length).toBeGreaterThan(0)
    for (const { y, pixel } of far)
      expect(
        channelGap(pixel, background),
        `far floor at ${Math.round(x)},${y}: ${pixel.join(',')}`
      ).toBeLessThanOrEqual(SKY_SLACK)
  }
  // invariant: the near floor is lit by the spotlights, so it is not the
  // background exactly, but it sits on the theme's side of the two.
  const near = meanLuminance(pixels, {
    x0: 0,
    x1: pixels.width,
    y0: pixels.height * 0.9,
    y1: pixels.height
  })
  expect(
    Math.abs(near - relativeLuminance(background)),
    `near floor luminance ${near.toFixed(3)}`
  ).toBeLessThan(Math.abs(near - relativeLuminance(other)))
}

/** Colours of the fully inked pixels of the hero grid. */
const gridInk = ({ pixels }: GridImage) => {
  const found = new Set<string>()
  for (let index = 0; index < pixels.data.length; index += 4)
    if (pixels.data[index + 3] === 255)
      found.add(
        `rgb(${pixels.data[index]}, ${pixels.data[index + 1]}, ${pixels.data[index + 2]})`
      )
  return [...found]
}

const glitchCopyColours = (page: Page) =>
  page
    .locator('h1, h2')
    .evaluateAll(headings =>
      headings.map(heading =>
        [...heading.querySelectorAll('[data-glitch-copy]')].map(
          copy => getComputedStyle(copy).color
        )
      )
    )

test.describe('dark scheme', () => {
  test.use({ colorScheme: 'dark' })

  test('dark scheme paints ink background and mist text', async ({ page }) => {
    await page.goto('/')
    await expectSectionsIn(page, 'dark')
  })
})

test.describe('light scheme', () => {
  test.use({ colorScheme: 'light' })

  test('light scheme paints white background and ink text', async ({
    page
  }) => {
    await page.goto('/')
    await expectSectionsIn(page, 'light')
  })

  test('light scheme glitch copies are primary and steel', async ({ page }) => {
    await page.goto('/')
    const expected = new Set([
      await tokenRgb(page, 'primary'),
      await tokenRgb(page, 'steel')
    ])
    const headings = await glitchCopyColours(page)
    expect(headings).toHaveLength(9)
    for (const copies of headings) {
      expect(copies).toHaveLength(2)
      expect(new Set(copies)).toEqual(expected)
    }
  })

  test('light scheme grids are drawn in steel', async ({ page }) => {
    await gotoHero(page)
    const steel = await tokenRgb(page, 'steel')
    expect(gridInk(await readGrid(page))).toEqual([steel])

    const gradients = await page
      .locator('[data-testid="sections-grid"]')
      .evaluate(node => getComputedStyle(node).backgroundImage)
    const colours = [...gradients.matchAll(/rgba?\([^)]*\)/g)]
      .map(([colour]) => colour)
      .filter(colour => !colour.startsWith('rgba(0, 0, 0, 0'))
    expect(colours.length).toBeGreaterThan(0)
    expect(new Set(colours)).toEqual(new Set([steel]))
  })
})

for (const scheme of ['dark', 'light'] as const) {
  test.describe(`${scheme} scene`, () => {
    test.use({ colorScheme: scheme })

    test('3D scene sky matches the theme background', async ({ page }) => {
      await gotoHero(page)
      expectSkyIn(await heroScreen(page), scheme)
    })

    test('far floor fades into the theme background', async ({ page }) => {
      await gotoHero(page)
      await hideHeroCopy(page)
      // why: the floor is read on its own; the grid lines behind the faded
      // floor would otherwise be counted as floor.
      await page
        .locator('[data-testid="hero-grid"]')
        .evaluate(grid => (grid.style.visibility = 'hidden'))
      expectFloorIn(await heroScreen(page), scheme)
    })
  })
}

test.describe('switching scheme', () => {
  test.use({ colorScheme: 'dark' })

  /** Marks the document, so a reload would be caught. */
  const markDocument = (page: Page) =>
    page.evaluate(() => (document.documentElement.dataset.sameDocument = 'yes'))
  const expectSameDocument = (page: Page) =>
    expect(page.locator('html')).toHaveAttribute('data-same-document', 'yes')

  test('switching scheme live repaints the sections', async ({ page }) => {
    await page.goto('/')
    await markDocument(page)
    await expectSectionsIn(page, 'dark')

    await page.emulateMedia({ colorScheme: 'light' })
    await expectSectionsIn(page, 'light')
    await page.emulateMedia({ colorScheme: 'dark' })
    await expectSectionsIn(page, 'dark')
    await expectSameDocument(page)
  })

  test('switching scheme live repaints the 3D scene', async ({ page }) => {
    await gotoHero(page)
    await markDocument(page)
    await hideHeroCopy(page)
    const grid = page.locator('[data-testid="hero-grid"]')
    const showGrid = (visibility: string) =>
      grid.evaluate(
        (node, value) => (node.style.visibility = value),
        visibility
      )
    const expectScene = async (scheme: Scheme) => {
      const screen = await heroScreen(page)
      expectSkyIn(screen, scheme)
      await showGrid('hidden')
      expectFloorIn(await heroScreen(page), scheme)
      await showGrid('')
    }
    await expectScene('dark')
    expect(gridInk(await readGrid(page))).toEqual([
      await tokenRgb(page, 'mist')
    ])

    await page.emulateMedia({ colorScheme: 'light' })
    // why: the scene re-reads its colours on the change event and redraws on
    // the next frame; a short pause lets that frame land.
    await page.waitForTimeout(500)
    await expectScene('light')
    expect(gridInk(await readGrid(page))).toEqual([
      await tokenRgb(page, 'steel')
    ])
    expect(new Set((await glitchCopyColours(page)).flat())).toEqual(
      new Set([await tokenRgb(page, 'primary'), await tokenRgb(page, 'steel')])
    )
    await expectSameDocument(page)
  })
})
