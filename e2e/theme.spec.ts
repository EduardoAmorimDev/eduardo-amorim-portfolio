import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { readGrid, type GridImage } from './grid-helpers'
import {
  channelGap,
  channels,
  gotoHero,
  gotoNotebook,
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
// invariant: the page has one theme; the system's scheme never changes it.
const THEME = { background: INK, text: MIST, other: WHITE } as const
const SCHEMES = ['dark', 'light'] as const
// why: the checklist's tolerance for the sky's colour, per channel.
const SKY_SLACK = 3
// why: a step between neighbouring floor pixels larger than this would read
// as an edge; a fog fade changes a few levels per pixel at most.
const MAX_STEP = 4
// why: the lit near floor measured ~0.016 against ink's ~0.0056; half that
// lift still tells a lit floor from a bare ink one.
const MIN_FLOOR_LIFT = 0.005

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

const expectSectionsInk = async (page: Page) => {
  const found = await sectionColours(page)
  expect(found.map(({ id }) => id)).toHaveLength(10)
  for (const { id, background, text } of found) {
    expect(background, `${id} background`).toBe(THEME.background)
    expect(text, `${id} text`).toBe(THEME.text)
  }
}

/** The whole first screen, as painted. */
const firstScreen = async (page: Page) => {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  return screenPixels(page, { x: 0, y: 0, ...viewport })
}

/** The sky: the pixel at the screen's top left corner. */
const expectInkSky = (pixels: Pixels) => {
  const sky = pixelAt(pixels, 2, 2)
  expect(
    channelGap(sky, channels(THEME.background)),
    `sky ${sky.join(',')}`
  ).toBeLessThanOrEqual(SKY_SLACK)
}

/**
 * The floor seen along both side edges of the screen, from the bottom up to
 * where it meets the sky: it starts in the theme's floor colour and fades,
 * with no edge, into the theme's background.
 */
const expectInkFloor = (pixels: Pixels) => {
  const background = channels(THEME.background)
  const other = channels(THEME.other)
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
  // background exactly, but it sits on the ink side of ink and white.
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
  expect(
    near - relativeLuminance(background),
    `near floor is lit: ${near.toFixed(4)}`
  ).toBeGreaterThanOrEqual(MIN_FLOOR_LIFT)
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

/** Every colour this task fixes, as the page paints it right now. */
const paintedColours = async (page: Page) => ({
  sections: await sectionColours(page),
  grid: gridInk(await readGrid(page)),
  glitch: await glitchCopyColours(page)
})

for (const scheme of SCHEMES) {
  test.describe(`${scheme} system scheme`, () => {
    test.use({ colorScheme: scheme })

    test(`sections paint ink and mist under ${scheme}`, async ({ page }) => {
      await page.goto('/')
      await expectSectionsInk(page)
    })

    test(`glitch copies are primary and mist under ${scheme}`, async ({
      page
    }) => {
      await page.goto('/')
      const expected = new Set([
        await tokenRgb(page, 'primary'),
        await tokenRgb(page, 'mist')
      ])
      const headings = await glitchCopyColours(page)
      expect(headings).toHaveLength(9)
      for (const copies of headings) {
        expect(copies).toHaveLength(2)
        expect(new Set(copies)).toEqual(expected)
      }
    })

    test(`hero grid is drawn in mist under ${scheme}`, async ({ page }) => {
      await gotoHero(page)
      expect(gridInk(await readGrid(page))).toEqual([
        await tokenRgb(page, 'mist')
      ])
    })

    test(`the document declares a dark color scheme under ${scheme}`, async ({
      page
    }) => {
      await page.goto('/')
      expect(
        await page.evaluate(
          () => getComputedStyle(document.documentElement).colorScheme
        )
      ).toBe('dark')
    })

    test(`${scheme} scheme notebook sky and floor are ink`, async ({
      page
    }) => {
      await gotoNotebook(page)
      const screen = await firstScreen(page)
      expectInkSky(screen)
      expectInkFloor(screen)
    })
  })
}

test.describe('switching scheme', () => {
  test.use({ colorScheme: 'dark' })

  test('switching the system scheme changes no colour', async ({ page }) => {
    await gotoHero(page)
    const before = await paintedColours(page)
    expect(before.sections).toHaveLength(10)

    await page.emulateMedia({ colorScheme: 'light' })
    // why: anything listening for the change would repaint on the next
    // frame; a short pause lets such a frame land.
    await page.waitForTimeout(500)
    expect(await paintedColours(page)).toEqual(before)
  })
})
