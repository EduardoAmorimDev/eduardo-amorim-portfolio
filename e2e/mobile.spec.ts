import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  documentTop,
  notebookAt,
  notebookEnd,
  paintedShare,
  scrollWindowTo,
  tokenRgb
} from './page-helpers'

// why: the checklist's own numbers (.checks/portfolio-lp-mobile.md).
const PHONE = { width: 390, height: 844 }
const CLOUD_ASPECT = { min: 0.95, max: 1.05 }
const MAX_MAGNIFICATION = 2
const MAX_CANVASES = 1
const MAX_SLAB_SCREENS = 2
// why: time for the glass models to load and draw (as reach-and-seams).
const LOAD_MS = 3000
const SETTLE_MS = 1200

const TOUCH = {
  viewport: PHONE,
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3
}

/** Loads the page and scrolls to the Alcance, its images loaded. */
const gotoStillNotebook = async (page: Page) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await scrollWindowTo(page, await documentTop(page.locator('#notebook')))
  await page.locator('[data-testid="notebook-still"]').waitFor()
  await page.waitForLoadState('networkidle')
}

/** The size the clouds are drawn at and the image's own, for every band. */
const cloudTiles = (page: Page) =>
  page.evaluate(async () => {
    const bands = [...document.querySelectorAll('[data-milky-way]')]
    return Promise.all(
      bands.map(async band => {
        const style = getComputedStyle(band)
        const url = /url\("?([^")]+)"?\)/.exec(style.maskImage)?.[1]
        if (!url) throw new Error('a band without its cloud mask')
        const image = new Image()
        image.src = url
        await image.decode()
        const [width = 0, height = 0] = style.maskSize
          .split(' ')
          .map(value => parseFloat(value))
        return {
          drawn: { width, height },
          natural: { width: image.naturalWidth, height: image.naturalHeight }
        }
      })
    )
  })

test.describe('the sky', () => {
  for (const { width, height } of [PHONE, { width: 1440, height: 900 }])
    test(`the milky way clouds keep their shape at ${width}x${height}`, async ({
      page
    }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/')
      const tiles = await cloudTiles(page)
      expect(tiles.length).toBeGreaterThan(0)
      for (const { drawn, natural } of tiles) {
        const aspect =
          drawn.height / natural.height / (drawn.width / natural.width)
        expect(aspect).toBeGreaterThanOrEqual(CLOUD_ASPECT.min)
        expect(aspect).toBeLessThanOrEqual(CLOUD_ASPECT.max)
      }
    })
})

test.describe('touch', () => {
  test.use(TOUCH)

  test('the sky draws no live noise and never magnifies its clouds past 2x', async ({
    page
  }) => {
    await page.goto('/')
    await expect(page.locator('feTurbulence')).toHaveCount(0)
    const ratio = await page.evaluate(() => devicePixelRatio)
    expect(ratio).toBe(TOUCH.deviceScaleFactor)
    for (const { drawn, natural } of await cloudTiles(page)) {
      expect((drawn.width * ratio) / natural.width).toBeLessThanOrEqual(
        MAX_MAGNIFICATION
      )
      expect((drawn.height * ratio) / natural.height).toBeLessThanOrEqual(
        MAX_MAGNIFICATION
      )
    }
  })

  test('no parallax slab is taller than two screens', async ({ page }) => {
    await page.goto('/')
    const { screen, slabs } = await page.evaluate(() => ({
      screen: innerHeight,
      slabs: [
        ...document.querySelectorAll<HTMLElement>('[data-parallax-slab]')
      ].map(slab => slab.offsetHeight)
    }))
    expect(slabs.length).toBeGreaterThan(0)
    for (const height of slabs)
      expect(height).toBeLessThanOrEqual(MAX_SLAB_SCREENS * screen)
  })

  const atSolutions = async (page: Page) => {
    await page.goto('/')
    await scrollWindowTo(page, await documentTop(page.locator('#solucoes')))
    await page.waitForTimeout(LOAD_MS)
  }

  // why: task portfolio-lp-mobile-smooth, 3-5: on touch each card shows its
  // object drawn flat, in the models' order, with no canvas and no model.
  const SOLUTION_MODELS = ['atom', 'brick', 'cursor', 'flag', 'note', 'wave']
  const ICON_PX = 64
  const MAX_ICON_BYTES = 60 * 1024

  test('the solution icons are drawn, with no canvas and no model', async ({
    page
  }) => {
    const requests: string[] = []
    page.on('request', request => requests.push(request.url()))
    await atSolutions(page)
    await scrollWindowTo(page, await documentTop(page.locator('#solucoes ul')))
    await page.waitForTimeout(SETTLE_MS)
    await expect(page.locator('[data-testid="glass-shelf"]')).toHaveCount(0)
    await expect(page.locator('#solucoes canvas')).toHaveCount(0)
    // invariant: the section's models; the Alcance loads its own laptop.
    expect(requests.filter(url => url.includes('/models/glass/'))).toEqual([])

    const icons = page.locator('#solucoes li [data-glass-icon]')
    expect(
      await icons.evaluateAll(all =>
        all.map(icon => (icon as HTMLElement).dataset.glassIcon)
      )
    ).toEqual(SOLUTION_MODELS)
    for (const icon of await icons.all()) {
      const box = await icon.boundingBox()
      expect(box?.width).toBe(ICON_PX)
      expect(box?.height).toBe(ICON_PX)
      const drawn = icon.locator('svg[data-flat-icon]')
      await expect(drawn).toHaveCount(1)
      await expect(drawn).toHaveClass(/stroke-primary/)
      await expect(drawn).toHaveClass(/fill-none/)
      await expect(drawn).toHaveClass(/bg-primary\/15/)
      await expect(icon).not.toHaveAttribute('data-ready', '')
    }
    const bytes = await page
      .locator('#solucoes svg[data-flat-icon]')
      .evaluateAll(all =>
        all.reduce((sum, svg) => sum + new Blob([svg.outerHTML]).size, 0)
      )
    expect(bytes).toBeLessThanOrEqual(MAX_ICON_BYTES)
    // invariant: the icons come in the page's own HTML, before any script.
    const html = await (await page.request.get('/')).text()
    expect(html.match(/data-flat-icon="/g) ?? []).toHaveLength(
      SOLUTION_MODELS.length
    )
    // invariant: drawn inline, the icons fetch nothing of their own.
    await expect(
      page.locator('#solucoes img, #solucoes svg use, #solucoes svg image')
    ).toHaveCount(0)
    await page
      .locator('#solucoes ul')
      .screenshot({ path: 'test-results/solution-icons-390.png' })
  })

  test('on touch the solutions draw no glass canvas', async ({ page }) => {
    await atSolutions(page)
    await expect(page.locator('[data-testid="glass-stage"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="glass-shelf"]')).toHaveCount(0)
  })

  /** The image shots of the Alcance visible at `progress`, settled. */
  const shotsAt = async (page: Page, progress: number) => {
    await scrollWindowTo(page, await notebookAt(page, progress))
    await page.waitForTimeout(SETTLE_MS)
    return page
      .locator('#notebook [data-shot]')
      .evaluateAll(shots =>
        shots
          .filter(shot => (shot as HTMLElement).style.visibility === 'visible')
          .map(shot => shot.getAttribute('data-shot'))
      )
  }

  // why: task portfolio-lp-still-scenes, 1, 5 and 17: on touch the hero and
  // the Alcance are images and the globe is the one scene drawn in 3D.
  test('on touch the hero and the alcance are images, the globe is 3D', async ({
    page
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#hero')).toHaveAttribute('data-scene', 'still')
    await expect(page.locator('#notebook')).toHaveAttribute(
      'data-scene',
      'still'
    )
    await expect(page.locator('#hero canvas')).toHaveCount(0)
    await expect(page.locator('[data-testid="hero-still"] img')).toBeVisible()
    await scrollWindowTo(page, await notebookAt(page, 0.3))
    await page.waitForTimeout(SETTLE_MS)
    await expect(page.locator('#notebook canvas')).toHaveCount(0)
    await expect(page.locator('#notebook [data-shot]')).toHaveCount(4)
    await scrollWindowTo(page, await documentTop(page.locator('#contato')))
    await expect(
      page.locator('[data-testid="globe-scene"] canvas')
    ).toHaveCount(1)
  })

  // why: task portfolio-lp-still-scenes, 2: never enlarged, so never soft.
  test('the hero image is drawn at most one screen px per image px', async ({
    page
  }) => {
    await page.goto('/')
    const image = page.locator('[data-testid="hero-still"] img')
    await expect
      .poll(() => image.evaluate(node => (node as HTMLImageElement).complete))
      .toBe(true)
    const density = await image.evaluate(node => {
      const img = node as HTMLImageElement
      const width = Number(/-(\d+)\.webp$/.exec(img.currentSrc)?.[1] ?? 0)
      const height = (width * img.naturalHeight) / img.naturalWidth
      const box = img.getBoundingClientRect()
      const cover = Math.max(box.width / width, box.height / height)
      return cover * devicePixelRatio
    })
    expect(density).toBeGreaterThan(0)
    expect(density).toBeLessThanOrEqual(1.01)
  })

  // why: task portfolio-lp-still-scenes, 5: on a phone the tablet comes
  // first, then the laptop, the phone last.
  test("the alcance images come in the visitor's order", async ({ page }) => {
    await gotoStillNotebook(page)
    expect(await shotsAt(page, 0.1)).toEqual(['tablet'])
    expect(await shotsAt(page, 0.215)).toEqual(['tabletLandscape'])
    expect(await shotsAt(page, 0.37)).toEqual(['laptop'])
    expect(await shotsAt(page, 0.75)).toEqual(['phone'])
  })

  // why: task portfolio-lp-still-scenes, 6-7: the zoom ends with the
  // phone's screen covering the window, enlarged at most 1.5x.
  test("the zoom ends on the phone's screen covering the window", async ({
    page
  }) => {
    await gotoStillNotebook(page)
    expect(await shotsAt(page, 0.96)).toEqual(['phone'])
    const end = await page
      .locator('#notebook [data-shot="phone"]')
      .evaluate(node => {
        const img = node as HTMLImageElement
        const width = Number(/-(\d+)\.webp$/.exec(img.currentSrc)?.[1] ?? 0)
        const box = img.getBoundingClientRect()
        return {
          density: (box.width * devicePixelRatio) / width,
          box: {
            left: box.left,
            top: box.top,
            right: box.right,
            bottom: box.bottom
          }
        }
      })
    expect(end.density).toBeLessThanOrEqual(1.5)
    expect(end.box.left).toBeLessThan(0)
    expect(end.box.top).toBeLessThan(0)
    expect(end.box.right).toBeGreaterThan(PHONE.width)
    expect(end.box.bottom).toBeGreaterThan(PHONE.height)
  })

  // why: task portfolio-lp-still-scenes, 8.
  test('a device image that fails leaves the story and the hand-off', async ({
    page
  }) => {
    await page.route('**/stills/device-laptop-*', route => route.abort())
    await gotoStillNotebook(page)
    expect(await shotsAt(page, 0.37)).toEqual([])
    await expect(page.locator('#notebook [aria-current="step"]')).toHaveCount(1)
    await scrollWindowTo(page, (await notebookEnd(page)) + PHONE.height * 0.3)
    await page.waitForTimeout(300)
    await expect(page.locator('#notebook > .sticky')).toHaveCSS(
      'visibility',
      'hidden'
    )
  })

  /** Height in px of a probe box `length` tall, e.g. `100lvh`. */
  const lengthOf = (page: Page, length: string) =>
    page.evaluate(value => {
      const probe = document.createElement('div')
      probe.style.cssText = `position:absolute;top:0;height:${value}`
      document.body.append(probe)
      const height = probe.getBoundingClientRect().height
      probe.remove()
      return height
    }, length)

  test('the alcance stage is as tall as the largest viewport', async ({
    page
  }) => {
    await gotoStillNotebook(page)
    const stage = await page
      .locator('[data-testid="notebook-still"]')
      .evaluate(still => still.closest('.sticky')?.getBoundingClientRect())
    expect(stage?.height).toBe(await lengthOf(page, '100lvh'))
    expect(stage?.height).toBeGreaterThanOrEqual(
      await page.evaluate(() => innerHeight)
    )
  })

  test('the chapter copy ends above the dynamic viewport', async ({ page }) => {
    await gotoStillNotebook(page)
    await scrollWindowTo(page, await notebookAt(page, 0.1))
    await page.waitForTimeout(SETTLE_MS)
    const chapter = page.locator('#notebook [aria-current="step"]')
    await expect(chapter).toHaveCount(1)
    const box = await chapter.boundingBox()
    if (!box) throw new Error('no chapter box')
    expect(box.y + box.height).toBeLessThanOrEqual(
      await lengthOf(page, '100dvh')
    )
  })

  test('the cases stay painted from the alcance to the workflow', async ({
    page
  }) => {
    await gotoStillNotebook(page)
    // why: past the hand-off (a quarter screen past the end) the real
    // section is what shows; before it, the last device's page stands in.
    const from = (await notebookEnd(page)) + PHONE.height * 0.25 + 1
    const to = await documentTop(page.locator('#workflow'))
    // why: by the hand-off the section's title has scrolled up past the
    // window, so the cards are what is left of the section to see.
    const cards = page.locator('#cases article h3')
    let checked = 0
    for (let top = from; top <= to; top += PHONE.height / 2) {
      await scrollWindowTo(page, top)
      await page.waitForTimeout(300)
      for (const card of await cards.all()) {
        const box = await card.boundingBox()
        if (!box || box.y < 0 || box.y + box.height > PHONE.height) continue
        expect(await paintedShare(page, card), `at ${top}`).toBeGreaterThan(
          0.02
        )
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  /** Every canvas on the page, at each stop from the hero to the contact. */
  const canvasesAlong = async (page: Page) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const stops = [
      0,
      await documentTop(page.locator('#solucoes ul')),
      await notebookAt(page, 0.3),
      await documentTop(page.locator('#contato'))
    ]
    const seen = []
    for (const top of stops) {
      await scrollWindowTo(page, top)
      await page.waitForTimeout(SETTLE_MS)
      seen.push(
        await page.evaluate(() =>
          [...document.querySelectorAll('canvas')].map(
            canvas =>
              canvas.closest('[data-testid]')?.getAttribute('data-testid') ?? ''
          )
        )
      )
    }
    return seen
  }

  // why: task portfolio-lp-still-scenes, 14 and 17: the globe draws at
  // the screen's own ratio, up to 2, and never steps down.
  test('the globe draws sharp on a dense screen', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await scrollWindowTo(page, await documentTop(page.locator('#contato')))
    await page.waitForTimeout(300)
    expect(
      await page
        .locator('[data-testid="globe-scene"] canvas')
        .evaluate(node => {
          const canvas = node as HTMLCanvasElement
          return canvas.width / canvas.clientWidth
        })
    ).toBeCloseTo(2, 1)
  })

  test('the contact title stands out from the globe light', async ({
    page
  }) => {
    // why: the user, 2026-11-05: on short phones the globe's white light
    // sits behind the title, and white letters vanished into it.
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    const ink = (await tokenRgb(page, 'ink')).match(/\d+/g)?.map(Number)
    const shadows = await page.locator('#contato h2').evaluate(title =>
      // why: the browser writes the relative colour as color(srgb r g b / a),
      // channels 0..1; each shadow is its colour, then its offsets and blur.
      [
        ...getComputedStyle(title).textShadow.matchAll(
          /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+) \/ ([\d.]+)\) 0px 0px (\d+)px/g
        )
      ].map(([, r, g, b, alpha, blur]) => ({
        rgb: [r, g, b].map(channel => Math.round(Number(channel) * 255)),
        alpha: Number(alpha),
        blur: Number(blur)
      }))
    )
    expect(shadows).toEqual([
      { rgb: ink, alpha: 0.9, blur: 24 },
      { rgb: ink, alpha: 0.8, blur: 6 }
    ])
  })

  test('on touch the globe is the one webgl canvas', async ({ page }) => {
    for (const canvases of await canvasesAlong(page))
      expect(canvases.length).toBeLessThanOrEqual(MAX_CANVASES)
  })
})
