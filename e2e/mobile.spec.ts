import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  documentTop,
  gotoNotebook,
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
const MAX_TOUCH_DPR = 1.5
const MAX_CANVASES = 4
const MAX_SLAB_SCREENS = 2
// why: on a phone the phone comes last, laid out at the window, and the
// laptop keeps its own width (task portfolio-lp-device-last, 7-8).
const DEVICE_WIDTHS = {
  'Preview of the projects section on a phone': PHONE.width,
  'Preview of the projects section on a tablet': 820,
  'Preview of the projects section on a tablet, landscape': 1180,
  'Preview of the projects section on a laptop': 1280
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
  // (off stage it is display:none); on a phone the tablet comes first and
  // turns at 0.15-0.21, then the laptop, then the phone.
  const ON_STAGE = [
    { device: 'tablet', progress: 0.1 },
    { device: 'tablet', progress: 0.215, label: ', landscape' },
    { device: 'laptop', progress: 0.37 },
    { device: 'phone', progress: 0.85 }
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
