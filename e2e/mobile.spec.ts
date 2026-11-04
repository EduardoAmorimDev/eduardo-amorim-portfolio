import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  documentTop,
  gotoNotebook,
  nextFrames,
  notebookAt,
  notebookEnd,
  paintedShare,
  screenPixels,
  scrollWindowTo
} from './page-helpers'

// why: the checklist's own numbers (.checks/portfolio-lp-mobile.md).
const PHONE = { width: 390, height: 844 }
const CLOUD_ASPECT = { min: 0.95, max: 1.05 }
const MAX_MAGNIFICATION = 2
const MAX_TOUCH_DPR = 1.5
const MAX_CANVASES = 4
const MAX_SLAB_SCREENS = 2
const DEVICE_WIDTHS = {
  'Preview of the projects section on a phone': 390,
  'Preview of the projects section on a tablet': 820,
  'Preview of the projects section on a tablet, landscape': 1180,
  'Preview of the projects section on a laptop': PHONE.width
}
// why: time for the glass models to load and draw (as reach-and-seams).
const LOAD_MS = 3000
const SETTLE_MS = 1200

const TOUCH = {
  viewport: PHONE,
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3
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

  /** Mean channel change in `clip` when the shelf's canvas is hidden. */
  const shelfChange = async (
    page: Page,
    clip: { x: number; y: number; width: number; height: number }
  ) => {
    const shelf = page.locator('[data-testid="glass-shelf"]')
    const shown = await screenPixels(page, clip)
    await shelf.evaluate(node => ((node as HTMLElement).style.opacity = '0'))
    await nextFrames(page)
    const hidden = await screenPixels(page, clip)
    await shelf.evaluate(node => ((node as HTMLElement).style.opacity = ''))
    await nextFrames(page)
    let total = 0
    for (let i = 0; i < shown.data.length; i++)
      total += Math.abs((shown.data[i] ?? 0) - (hidden.data[i] ?? 0))
    return total / shown.data.length
  }

  test('on touch the glass icons scroll with their cards', async ({ page }) => {
    await atSolutions(page)
    const shelf = page.locator('#solucoes [data-testid="glass-shelf"]')
    await expect(shelf).toHaveCount(1)
    await expect(shelf).not.toHaveCSS('position', 'fixed')
    await expect(
      page.locator('#solucoes [data-glass-icon][data-ready]')
    ).toHaveCount(6)
    const start = await documentTop(page.locator('#solucoes ul'))
    const gaps: number[] = []
    for (const offset of [-200, 0, 150, 300, 450]) {
      await scrollWindowTo(page, start + offset)
      gaps.push(
        await page.evaluate(() => {
          const list = document.querySelector('#solucoes ul')
          const canvas = document.querySelector(
            '[data-testid="glass-shelf"] canvas'
          )
          if (!list || !canvas) throw new Error('no list or shelf canvas')
          return (
            canvas.getBoundingClientRect().top -
            list.getBoundingClientRect().top
          )
        })
      )
    }
    for (const gap of gaps) expect(gap).toBe(gaps[0])

    // invariant: mid-list, the glass is drawn in its slot and nowhere else
    // in its card.
    await scrollWindowTo(page, start + 150)
    await page.waitForTimeout(300)
    const icon = await page
      .locator('#solucoes [data-glass-icon]')
      .nth(1)
      .boundingBox()
    if (!icon) throw new Error('no icon box')
    expect(await shelfChange(page, icon), 'glass in its slot').toBeGreaterThan(
      1
    )
    const beside = { ...icon, x: icon.x + icon.width + 8 }
    expect(await shelfChange(page, beside), 'no glass beside it').toBeLessThan(
      0.5
    )
  })

  test('on touch there is no full-window glass stage', async ({ page }) => {
    await atSolutions(page)
    await expect(page.locator('[data-testid="glass-stage"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="glass-shelf"]')).toHaveCount(1)
  })

  test('on touch a missing model leaves the glyph', async ({ page }) => {
    await page.route('**/models/glass/atom.glb', route =>
      route.fulfill({ status: 404 })
    )
    await atSolutions(page)
    const atom = page.locator('#solucoes [data-glass-icon="atom"]')
    await expect(atom.locator('svg')).toHaveCount(1)
    await expect(atom).not.toHaveAttribute('data-ready', '')
    await expect(
      page.locator('#solucoes [data-glass-icon][data-ready]')
    ).toHaveCount(5)
  })

  test('on touch the icons canvas rests away from the list', async ({
    page
  }) => {
    // why: counts the draws each WebGL context makes, by its canvas.
    await page.addInitScript(() => {
      const counts = new WeakMap<HTMLCanvasElement, number>()
      const scope = window as unknown as { shelfDraws: () => number }
      for (const proto of [
        WebGLRenderingContext.prototype,
        WebGL2RenderingContext.prototype
      ]) {
        const draw = proto.drawElements
        proto.drawElements = function (...args: Parameters<typeof draw>) {
          const canvas = this.canvas
          if (canvas instanceof HTMLCanvasElement)
            counts.set(canvas, (counts.get(canvas) ?? 0) + 1)
          return draw.apply(this, args)
        }
      }
      scope.shelfDraws = () => {
        const canvas = document.querySelector(
          '[data-testid="glass-shelf"] canvas'
        )
        return canvas instanceof HTMLCanvasElement
          ? (counts.get(canvas) ?? 0)
          : -1
      }
    })
    const draws = () =>
      page.evaluate(() =>
        (window as unknown as { shelfDraws: () => number }).shelfDraws()
      )
    await atSolutions(page)
    expect(await draws(), 'it draws near the list').toBeGreaterThan(0)
    // why: well past the list's quarter screen of lead.
    await scrollWindowTo(page, await notebookAt(page, 0.3))
    await page.waitForTimeout(500)
    const shelf = page.locator('[data-testid="glass-shelf"]')
    await expect(shelf).not.toHaveAttribute('data-live', '')
    const before = await draws()
    await page.waitForTimeout(1000)
    expect(await draws()).toBe(before)
  })

  test('every device page stays inside its glass', async ({ page }) => {
    await gotoNotebook(page)
    const pages = await page.locator('#notebook iframe').evaluateAll(frames =>
      frames.map(frame => {
        const zoomed: string[] = []
        for (let node: Element | null = frame; node; node = node.parentElement)
          if (getComputedStyle(node).zoom !== '1') zoomed.push(node.tagName)
        const clip = frame.closest<HTMLElement>('[data-scaled-page]')
        const inner = clip?.firstElementChild
        if (
          !clip ||
          !(inner instanceof HTMLElement) ||
          !(frame instanceof HTMLElement)
        )
          throw new Error('a device page outside its scaled box')
        return {
          title: frame.getAttribute('title'),
          zoomed,
          overflow: getComputedStyle(clip).overflow,
          right: frame.offsetLeft + frame.offsetWidth,
          bottom: frame.offsetTop + frame.offsetHeight,
          width: inner.offsetWidth,
          height: inner.offsetHeight
        }
      })
    )
    expect(pages).toHaveLength(3)
    for (const {
      title,
      zoomed,
      overflow,
      right,
      bottom,
      width,
      height
    } of pages) {
      expect(zoomed, `${title}: no zoom`).toEqual([])
      expect(overflow, title ?? '').toBe('hidden')
      expect(right, title ?? '').toBeLessThanOrEqual(width)
      expect(bottom, title ?? '').toBeLessThanOrEqual(height)
    }
  })

  // why: a device's page is laid out only while the device is on stage
  // (off stage it is display:none); the tablet before its turn.
  const ON_STAGE = [
    { device: 'phone', progress: 0.1 },
    { device: 'tablet', progress: 0.3 },
    { device: 'tablet', progress: 0.45, label: ', landscape' },
    { device: 'laptop', progress: 0.85 }
  ] as const

  test('every device page lays out at its device width', async ({ page }) => {
    await gotoNotebook(page)
    const widths: Record<string, number | undefined> = {}
    for (const stop of ON_STAGE) {
      const { device, progress } = stop
      await scrollWindowTo(page, await notebookAt(page, progress))
      await page.waitForTimeout(SETTLE_MS)
      const frame = page.locator(`#notebook iframe[title$="on a ${device}"]`)
      await expect
        .poll(() =>
          frame.evaluate(
            node =>
              (node as HTMLIFrameElement).contentDocument?.documentElement
                .clientWidth ?? 0
          )
        )
        .toBeGreaterThan(0)
      const title = await frame.getAttribute('title')
      if (!title) throw new Error(`no ${device} page`)
      widths[`${title}${'label' in stop ? stop.label : ''}`] =
        await frame.evaluate(
          node =>
            (node as HTMLIFrameElement).contentDocument?.documentElement
              .clientWidth
        )
    }
    expect(widths).toEqual(DEVICE_WIDTHS)
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
    await gotoNotebook(page)
    const stage = await page
      .locator('[data-testid="notebook-scene"]')
      .evaluate(canvas => canvas.closest('.sticky')?.getBoundingClientRect())
    expect(stage?.height).toBe(await lengthOf(page, '100lvh'))
    expect(stage?.height).toBeGreaterThanOrEqual(
      await page.evaluate(() => innerHeight)
    )
  })

  test('the chapter copy ends above the dynamic viewport', async ({ page }) => {
    await gotoNotebook(page)
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
    await gotoNotebook(page)
    // why: past the hand-off (a quarter screen past the end) the real
    // section is what shows; before it, the laptop's page stands in.
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
          [...document.querySelectorAll('canvas')].map(canvas => ({
            ratio: canvas.clientWidth ? canvas.width / canvas.clientWidth : 0
          }))
        )
      )
    }
    return seen
  }

  test('on touch no canvas draws above 1.5x', async ({ page }) => {
    const stops = await canvasesAlong(page)
    expect(stops.flat().length).toBeGreaterThan(0)
    for (const { ratio } of stops.flat())
      expect(ratio).toBeLessThanOrEqual(MAX_TOUCH_DPR + 0.01)
  })

  test('on touch at most four webgl canvases', async ({ page }) => {
    for (const canvases of await canvasesAlong(page))
      expect(canvases.length).toBeLessThanOrEqual(MAX_CANVASES)
  })
})
