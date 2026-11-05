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
  scrollWindowTo,
  tokenRgb
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
            // why: the hero and the globe draw at the screen's own ratio,
            // up to 2 (user, 2026-11-05); the cap holds for the rest.
            capped: !canvas.closest(
              '[data-testid="hero-scene"], [data-testid="globe-scene"]'
            ),
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
    for (const { ratio, capped } of stops.flat())
      expect(ratio).toBeLessThanOrEqual(capped ? MAX_TOUCH_DPR + 0.01 : 2.01)
  })

  test('the hero and the globe draw sharp on a dense screen', async ({
    page
  }) => {
    // why: the user, 2026-11-05: both lost their sharpness on phones, drawn
    // at 1 and 1.5 px per CSS px on a 3x screen; they start at 2.
    const ratio = (selector: string) =>
      page.locator(`${selector} canvas`).evaluate(node => {
        const canvas = node as HTMLCanvasElement
        return canvas.width / canvas.clientWidth
      })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(await ratio('[data-testid="hero-scene"]')).toBeCloseTo(2, 1)
    await scrollWindowTo(page, await documentTop(page.locator('#contato')))
    await page.waitForTimeout(300)
    expect(await ratio('[data-testid="globe-scene"]')).toBeCloseTo(2, 1)
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

  test('on touch at most four webgl canvases', async ({ page }) => {
    for (const canvases of await canvasesAlong(page))
      expect(canvases.length).toBeLessThanOrEqual(MAX_CANVASES)
  })
  /**
   * Scrolls through the Alcance down and back up in steps, calling `sample`
   * at every step, with the scroll settled.
   */
  const passThroughAlcance = async (
    page: Page,
    sample: () => Promise<void>,
    steps = 24
  ) => {
    const progress = [
      ...Array.from({ length: steps + 1 }, (_, i) => i / steps),
      ...Array.from({ length: steps + 1 }, (_, i) => 1 - i / steps)
    ]
    for (const p of progress) {
      await scrollWindowTo(page, await notebookAt(page, p))
      await page.waitForTimeout(150)
      await sample()
    }
  }

  test('the device pages hold still', async ({ page }) => {
    await gotoNotebook(page)
    await expect(page.locator('#notebook iframe')).toHaveCount(3)
    const glows = await page
      .locator('#notebook iframe')
      .evaluateAll(frames =>
        frames.flatMap(frame =>
          [
            ...((frame as HTMLIFrameElement).contentDocument?.querySelectorAll(
              '[data-testid="sections-glow"]'
            ) ?? [])
          ].map(glow => getComputedStyle(glow).animationName)
        )
      )
    expect(glows.length).toBeGreaterThan(0)
    for (const name of glows) expect(name).toBe('none')
  })

  test('on touch each device page keeps one scale', async ({ page }) => {
    await gotoNotebook(page)
    const scales: Record<string, Set<string>> = {}
    await passThroughAlcance(page, async () => {
      const seen = await page
        .locator('#notebook [data-scaled-page]')
        .evaluateAll(boxes =>
          boxes.map(box => ({
            device: box.querySelector('iframe')?.title ?? '',
            scale: box.getAttribute('data-scale') ?? ''
          }))
        )
      for (const { device, scale } of seen)
        if (device) (scales[device] ??= new Set()).add(scale)
    })
    expect(Object.keys(scales)).toHaveLength(3)
    for (const [device, values] of Object.entries(scales))
      expect([...values], device).toHaveLength(1)
  })

  test('on touch the alcance canvas never resizes', async ({ page }) => {
    // why: a slowed CPU drops frames, which is what used to step the ratio.
    test.setTimeout(120_000)
    const cdp = await page.context().newCDPSession(page)
    await gotoNotebook(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })
    const canvas = page.locator('[data-testid="notebook-scene"] canvas')
    const sizes = new Set<string>()
    const ratios = new Set<number>()
    await passThroughAlcance(
      page,
      async () => {
        const { width, height, ratio } = await canvas.evaluate(node => {
          const element = node as HTMLCanvasElement
          return {
            width: element.width,
            height: element.height,
            ratio: element.width / element.clientWidth
          }
        })
        sizes.add(`${width}x${height}`)
        ratios.add(Math.round(ratio * 100) / 100)
      },
      10
    )
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    expect([...sizes]).toHaveLength(1)
    expect([...ratios]).toEqual([1.25])
  })

  test('on touch the device pages keep their stacking', async ({ page }) => {
    await gotoNotebook(page)
    const stacks: Record<string, Set<string>> = {}
    await passThroughAlcance(page, async () => {
      const seen = await page.locator('#notebook iframe').evaluateAll(frames =>
        frames.map(frame => {
          // why: drei's wrapper is the outermost box it places in 3D.
          let wrapper: HTMLElement | null = frame as HTMLElement
          while (
            wrapper &&
            !wrapper.classList.contains('will-change-transform')
          )
            wrapper = wrapper.parentElement
          return {
            device: frame.getAttribute('title') ?? '',
            z: wrapper?.style.zIndex ?? ''
          }
        })
      )
      for (const { device, z } of seen) (stacks[device] ??= new Set()).add(z)
    })
    expect(Object.keys(stacks)).toHaveLength(3)
    for (const [device, values] of Object.entries(stacks))
      expect([...values], device).toHaveLength(1)
  })

  test('the handheld glass keeps square corners', async ({ page }) => {
    await gotoNotebook(page)
    const corners = await page
      .locator(
        '#notebook iframe[title*="phone"], #notebook iframe[title*="tablet"]'
      )
      .evaluateAll(frames =>
        frames.map(frame => {
          const clip = frame.closest<HTMLElement>('[data-scaled-page]')
          return clip ? getComputedStyle(clip).borderRadius : 'none'
        })
      )
    expect(corners).toEqual(['0px', '0px'])
  })
})
