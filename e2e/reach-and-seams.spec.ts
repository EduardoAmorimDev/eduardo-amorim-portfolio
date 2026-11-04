import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  channels,
  documentTop,
  gotoHero,
  pixelAt,
  screenPixels,
  scrollWindowTo,
  tokenRgb,
  type Pixels
} from './page-helpers'

// why: the task's own numbers (.tasks/portfolio-lp-reach-and-seams.md).
const VIEW = { width: 1440, height: 900 }
const SEAM = { band: 8, maxGap: 3 }
const SPILL = { visible: 0.25, gone: 0.5 }
const ICON_PX = 64
const CURSOR = { tip: 2, grow: 1.2, growSlack: 0.08 }
const PULSE = { seconds: 2, scale: 1.25 }
const TIMELINE_BREAKPOINT = 1024
// why: damped poses, the sky's fade and the glass need a moment to settle.
const SETTLE_MS = 900
const LOAD_MS = 4000

/** Mean luminance (0–255, Rec. 601) of rows y0..y1 of the pixels. */
const rowMean = (pixels: Pixels, y0: number, y1: number) => {
  let sum = 0
  for (let y = y0; y < y1; y++)
    for (let x = 0; x < pixels.width; x++) {
      const [r = 0, g = 0, b = 0] = pixelAt(pixels, x, y)
      sum += 0.299 * r + 0.587 * g + 0.114 * b
    }
  return sum / ((y1 - y0) * pixels.width)
}

/** |mean of the band above − band below| a horizontal edge at `edgeY`. */
const seamGap = async (page: Page, edgeY: number) => {
  const pixels = await screenPixels(page, {
    x: 0,
    y: edgeY - SEAM.band,
    width: VIEW.width,
    height: SEAM.band * 2
  })
  return Math.abs(
    rowMean(pixels, 0, SEAM.band) - rowMean(pixels, SEAM.band, SEAM.band * 2)
  )
}

/** Mean per-channel change of a region when `selector` is hidden. */
const changeWhenHidden = async (
  page: Page,
  selector: string,
  clip: { x: number; y: number; width: number; height: number }
) => {
  const shown = await screenPixels(page, clip)
  const rule = await page.addStyleTag({
    content: `${selector} { visibility: hidden !important }`
  })
  await page.waitForTimeout(100)
  const hidden = await screenPixels(page, clip)
  await rule.evaluate(node => node.parentNode?.removeChild(node))
  await page.waitForTimeout(100)
  let sum = 0
  for (let index = 0; index < shown.data.length; index += 4)
    for (let c = 0; c < 3; c++)
      sum += Math.abs(
        (shown.data[index + c] ?? 0) - (hidden.data[index + c] ?? 0)
      )
  return { mean: sum / (shown.data.length / 4) / 3, shown, hidden }
}

const elementBottom = (page: Page, selector: string) =>
  page
    .locator(selector)
    .evaluate(element => element.getBoundingClientRect().bottom + scrollY)

test.describe('the hero dissolves into the sky', () => {
  test('no seam under the hero', async ({ page }) => {
    await gotoHero(page)
    const bottom = await elementBottom(page, '#hero')
    await scrollWindowTo(page, bottom - VIEW.height / 2)
    await page.waitForTimeout(SETTLE_MS)
    expect(await seamGap(page, VIEW.height / 2)).toBeLessThanOrEqual(
      SEAM.maxGap
    )
  })

  test('the black hole spills under the hero', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gotoHero(page)
    const bottom = await elementBottom(page, '#hero')
    // why: the edge high on screen, so the whole spill is in view.
    const edge = 100
    await scrollWindowTo(page, bottom - edge)
    await page.waitForTimeout(SETTLE_MS)
    // why: only the hero's canvas over the bare page, nothing painted on it.
    await page.addStyleTag({
      content: 'main > div { visibility: hidden !important }'
    })
    const band = (share: number) => ({
      x: 0,
      y: edge + share * VIEW.height - 10,
      width: VIEW.width,
      height: 20
    })
    const past = await screenPixels(page, band(SPILL.gone + 0.02))
    const hidden = await changeWhenHidden(
      page,
      '[data-testid="hero-scene"]',
      band(SPILL.visible)
    )
    expect(hidden.mean, 'the canvas draws 25svh below').toBeGreaterThan(0.5)
    const ink = channels(await tokenRgb(page, 'ink'))
    const [r, g, b] = pixelAt(past, VIEW.width / 2, 10)
    expect(
      Math.max(
        Math.abs((r ?? 0) - (ink[0] ?? 0)),
        Math.abs((g ?? 0) - (ink[1] ?? 0)),
        Math.abs((b ?? 0) - (ink[2] ?? 0))
      ),
      'gone by 50svh below'
    ).toBeLessThanOrEqual(2)
    const mask = await page
      .locator('[data-testid="hero-scene"]')
      .evaluate(element => getComputedStyle(element).maskImage)
    expect(mask).toContain('linear-gradient')
  })

  test('the hero ground is ink', async ({ page }) => {
    await page.goto('/')
    const ground = await page
      .locator('#hero')
      .evaluate(element => getComputedStyle(element).backgroundColor)
    expect(channels(ground)).toEqual(channels(await tokenRgb(page, 'ink')))
  })

  test('the sky lies over the spill', async ({ page }) => {
    await gotoHero(page)
    const bottom = await elementBottom(page, '#hero')
    await scrollWindowTo(page, bottom - 100)
    await page.waitForTimeout(SETTLE_MS)
    const change = await changeWhenHidden(
      page,
      'main > div:first-of-type [data-parallax-layer], main > div:first-of-type [data-testid="sections-glow"]',
      { x: 0, y: 100, width: VIEW.width, height: VIEW.height / 2 }
    )
    expect(change.mean).toBeGreaterThan(0.2)
  })

  test('the spill takes no clicks', async ({ page }) => {
    await gotoHero(page)
    const bottom = await elementBottom(page, '#hero')
    await scrollWindowTo(page, bottom - VIEW.height / 2)
    const hit = await page.evaluate(
      ({ x, y }) => {
        const found = document.elementFromPoint(x, y)
        return {
          inHero: !!found?.closest('#hero'),
          inBlock: !!found?.closest('main > div')
        }
      },
      { x: VIEW.width / 2, y: VIEW.height / 2 + 100 }
    )
    expect(hit).toEqual({ inHero: false, inBlock: true })
  })
})

test.describe('the notebook stage carries the sky', () => {
  test('no seam over the notebook', async ({ page }) => {
    await page.goto('/')
    const top = await documentTop(page.locator('#notebook'))
    await scrollWindowTo(page, top - VIEW.height / 2)
    await page.waitForTimeout(SETTLE_MS)
    expect(await seamGap(page, VIEW.height / 2)).toBeLessThanOrEqual(
      SEAM.maxGap
    )
  })

  test('the notebook stage has the sky', async ({ page }) => {
    await page.goto('/')
    await scrollWindowTo(page, await documentTop(page.locator('#notebook')))
    const sky = page.locator('#notebook [data-testid="notebook-sky"]')
    await expect(sky.locator('[data-testid="sections-glow"]')).toHaveCount(2)
    await expect(sky.locator('[data-glow="primary"]')).toHaveCount(1)
    await expect(sky.locator('[data-glow="steel"]')).toHaveCount(1)
    expect(await sky.locator('[data-star]').count()).toBeGreaterThan(0)
    // why: pinned, the stage has fully entered, so its sky shows at full
    // (a sub-pixel scroll offset leaves it a hair under 1).
    const opacity = Number(
      await sky.evaluate(element => getComputedStyle(element).opacity)
    )
    expect(opacity).toBeGreaterThan(0.99)
  })
})

test.describe('glass icons on the solution cards', () => {
  const MODELS = ['atom', 'brick', 'cursor', 'flag', 'note', 'wave']

  const atSolutions = async (page: Page) => {
    await page.goto('/')
    await scrollWindowTo(page, await documentTop(page.locator('#solucoes')))
    await page.waitForTimeout(LOAD_MS)
  }

  test('glass icons on the solution cards', async ({ page }) => {
    await atSolutions(page)
    const icons = page.locator('#solucoes li [data-glass-icon]')
    await expect(icons).toHaveCount(MODELS.length)
    expect(
      await icons.evaluateAll(all =>
        all.map(icon => (icon as HTMLElement).dataset.glassIcon)
      )
    ).toEqual(MODELS)
    for (const icon of await icons.all()) {
      await expect(icon).toHaveAttribute('data-ready', '')
      await expect(icon.locator('svg')).toHaveCount(0)
      const box = await icon.boundingBox()
      expect(box?.width).toBe(ICON_PX)
      expect(box?.height).toBe(ICON_PX)
    }
    const first = await icons.first().boundingBox()
    if (!first) throw new Error('no icon box')
    const glass = await changeWhenHidden(
      page,
      '[data-testid="glass-stage"]',
      first
    )
    expect(glass.mean, 'the glass is drawn in the box').toBeGreaterThan(1)
  })

  test('a missing model leaves the glyph', async ({ page }) => {
    await page.route('**/models/glass/atom.glb', route =>
      route.fulfill({ status: 404 })
    )
    await atSolutions(page)
    const atom = page.locator('#solucoes li').first()
    await expect(atom.locator('[data-glass-icon="atom"] svg')).toHaveCount(1)
    await expect(atom.locator('[data-glass-icon="atom"]')).not.toHaveAttribute(
      'data-ready',
      ''
    )
    await expect(atom.locator('h3')).toBeVisible()
    await expect(atom.locator('p')).toBeVisible()
    await expect(
      page.locator('#solucoes [data-glass-icon][data-ready]')
    ).toHaveCount(MODELS.length - 1)
  })
})

test.describe('one canvas for all the glass', () => {
  test('one canvas for all the glass', async ({ page }) => {
    await page.goto('/')
    await page.mouse.move(300, 300)
    await expect(
      page.locator('[data-testid="glass-stage"] canvas')
    ).toHaveCount(1)
    await expect(page.locator('#solucoes canvas')).toHaveCount(0)
    await expect(
      page.locator('[data-testid="glass-cursor"] canvas')
    ).toHaveCount(0)
    const stage = page.locator('[data-testid="glass-stage"]')
    await expect(stage).toHaveCSS('position', 'fixed')
    await expect(stage).toHaveCSS('pointer-events', 'none')
  })

  test('the glass canvas rests', async ({ page }) => {
    // why: counts the draws each WebGL context makes, by its canvas.
    await page.addInitScript(() => {
      const counts = new WeakMap<HTMLCanvasElement, number>()
      const scope = window as unknown as {
        glassDraws: () => number
      }
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
      scope.glassDraws = () => {
        const canvas = document.querySelector(
          '[data-testid="glass-stage"] canvas'
        )
        return canvas instanceof HTMLCanvasElement
          ? (counts.get(canvas) ?? 0)
          : -1
      }
    })
    const draws = () =>
      page.evaluate(() =>
        (window as unknown as { glassDraws: () => number }).glassDraws()
      )
    await page.goto('/')
    await page.mouse.move(400, 300, { steps: 5 })
    await page.waitForTimeout(LOAD_MS)
    const idleFrom = await draws()
    await page.waitForTimeout(1000)
    expect(await draws(), 'still pointer, far from the icons').toBe(idleFrom)
    await scrollWindowTo(page, await documentTop(page.locator('#solucoes')))
    await page.waitForTimeout(LOAD_MS)
    const spinFrom = await draws()
    await page.waitForTimeout(500)
    expect(await draws(), 'icons on screen keep turning').toBeGreaterThan(
      spinFrom
    )
  })
})

test.describe('the workflow timeline', () => {
  const geometry = (page: Page) =>
    page.locator('#workflow').evaluate(section => {
      const box = (element: Element | null) => {
        if (!element) throw new Error('missing timeline part')
        const { left, right, top, bottom } = element.getBoundingClientRect()
        return {
          left,
          right,
          top,
          bottom,
          x: (left + right) / 2,
          y: (top + bottom) / 2
        }
      }
      return {
        line: box(section.querySelector('[data-timeline-line]')),
        steps: [...section.querySelectorAll('ol > li')].map(step => ({
          box: box(step),
          marker: box(step.querySelector('[data-step-number]')),
          text: box(step.querySelector('h3'))
        }))
      }
    })

  test('workflow is a timeline', async ({ page }) => {
    await page.goto('/')
    const steps = page.locator('#workflow ol > li')
    await expect(steps).toHaveCount(6)
    await expect(steps.locator('[data-step-number]')).toHaveText([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06'
    ])
    for (const step of await steps.all())
      await expect(step).not.toHaveClass(/glass-card/)
    const { line, steps: nodes } = await geometry(page)
    const first = nodes[0]
    const last = nodes.at(-1)
    if (!first || !last) throw new Error('no steps')
    expect(line.top).toBeLessThanOrEqual(first.marker.y)
    expect(line.bottom).toBeGreaterThanOrEqual(last.marker.y)
    for (const node of nodes) {
      expect(Math.abs(node.marker.x - line.x)).toBeLessThanOrEqual(1)
      expect(node.marker.right - node.marker.left).toBe(40)
    }
  })

  test('timeline alternates on wide screens', async ({ page }) => {
    await page.goto('/')
    const wide = await geometry(page)
    const ol = await page.locator('#workflow ol').evaluate(list => {
      const { left, right } = list.getBoundingClientRect()
      return (left + right) / 2
    })
    expect(Math.abs(wide.line.x - ol)).toBeLessThanOrEqual(1)
    wide.steps.forEach((step, index) => {
      if (index % 2 === 0) expect(step.text.right).toBeLessThan(wide.line.x)
      else expect(step.text.left).toBeGreaterThan(wide.line.x)
    })
    await page.setViewportSize({ width: TIMELINE_BREAKPOINT - 1, height: 900 })
    const narrow = await geometry(page)
    for (const step of narrow.steps)
      expect(step.text.left).toBeGreaterThan(narrow.line.x)
    expect(narrow.line.x).toBeLessThan(ol / 2)
  })
})

test.describe('the call', () => {
  test('the call pulses', async ({ page }) => {
    await page.goto('/')
    const button = page.locator('#contato').getByRole('button')
    const ring = button.locator('[data-call-pulse]')
    const animation = await ring.evaluate(element => {
      const [running] = element.getAnimations()
      if (!running) return null
      const timing = running.effect?.getComputedTiming()
      const frames =
        running.effect instanceof KeyframeEffect
          ? running.effect.getKeyframes()
          : []
      return {
        duration: timing?.duration,
        iterations: timing?.iterations,
        scales: frames.map(frame => String(frame.scale))
      }
    })
    expect(animation).toEqual({
      duration: PULSE.seconds * 1000,
      iterations: Infinity,
      scales: ['1', String(PULSE.scale)]
    })
    await expect(ring).toHaveCSS(
      'border-top-color',
      await tokenRgb(page, 'primary')
    )
    const before = await button.boundingBox()
    await page.waitForTimeout(700)
    expect(await button.boundingBox()).toEqual(before)
  })

  test('no pulse under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const ring = page.locator('#contato [data-call-pulse]')
    expect(await ring.evaluate(element => element.getAnimations().length)).toBe(
      0
    )
    await expect(ring).toHaveCSS('opacity', '0')
  })
})

test.describe('the glass cursor', () => {
  const cursorBox = (page: Page) =>
    page.locator('[data-testid="glass-cursor"]').boundingBox()

  /** Height of the region the glass paints around the pointer, in px. */
  const paintedHeight = async (page: Page, x: number, y: number) => {
    const clip = { x: x - 48, y: y - 48, width: 96, height: 96 }
    const { shown, hidden } = await changeWhenHidden(
      page,
      '[data-testid="glass-stage"]',
      clip
    )
    let top = Infinity
    let bottom = -Infinity
    let left = Infinity
    for (let row = 0; row < shown.height; row++)
      for (let col = 0; col < shown.width; col++) {
        const a = pixelAt(shown, col, row)
        const b = pixelAt(hidden, col, row)
        const delta = Math.max(
          ...[0, 1, 2].map(c => Math.abs((a[c] ?? 0) - (b[c] ?? 0)))
        )
        if (delta > 24) {
          top = Math.min(top, row)
          bottom = Math.max(bottom, row)
          left = Math.min(left, col)
        }
      }
    return { height: bottom - top + 1, top: top - 48, left: left - 48 }
  }

  const showAt = async (page: Page, x: number, y: number) => {
    await page.mouse.move(x - 40, y - 40)
    await page.mouse.move(x, y, { steps: 6 })
    await page.waitForTimeout(SETTLE_MS)
  }

  // why: under reduced motion the page behind holds still (the hero's grain
  // and the stars' twinkle stop), so only the glass changes between shots.
  test('the glass cursor follows the pointer', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.waitForTimeout(LOAD_MS)
    await showAt(page, 700, 300)
    await expect(page.locator('html')).toHaveClass(/glass-cursor/)
    await expect(page.locator('h1')).toHaveCSS('cursor', 'none')
    const box = await cursorBox(page)
    if (!box) throw new Error('no cursor box')
    expect(Math.abs(box.x + box.width / 2 - 700)).toBeLessThanOrEqual(
      CURSOR.tip
    )
    expect(Math.abs(box.y + box.height / 2 - 300)).toBeLessThanOrEqual(
      CURSOR.tip
    )
    const glass = await paintedHeight(page, 700, 300)
    // invariant: the tip is the topmost, leftmost pixel of the arrow.
    expect(Math.abs(glass.top)).toBeLessThanOrEqual(CURSOR.tip)
    expect(Math.abs(glass.left)).toBeLessThanOrEqual(CURSOR.tip)
  })

  test('the glass cursor grows over controls', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await scrollWindowTo(page, await documentTop(page.locator('#faq')))
    await page.waitForTimeout(LOAD_MS)
    const summary = await page.locator('#faq summary').first().boundingBox()
    const title = await page.locator('#faq h2').boundingBox()
    if (!summary || !title) throw new Error('no faq boxes')
    // why: right of the title, on the bare sky, off any control.
    const rest = { x: title.x + title.width + 120, y: title.y + 10 }
    await showAt(page, rest.x, rest.y)
    await expect(
      page.locator('[data-testid="glass-cursor"]')
    ).not.toHaveAttribute('data-control', '')
    const small = await paintedHeight(page, rest.x, rest.y)
    const over = { x: summary.x + summary.width / 2, y: summary.y + 6 }
    await showAt(page, over.x, over.y)
    await expect(page.locator('[data-testid="glass-cursor"]')).toHaveAttribute(
      'data-control',
      ''
    )
    const grown = await paintedHeight(page, over.x, over.y)
    expect(grown.height / small.height).toBeGreaterThan(
      CURSOR.grow - CURSOR.growSlack
    )
    expect(grown.height / small.height).toBeLessThan(
      CURSOR.grow + CURSOR.growSlack
    )
  })

  test('the glass cursor hides over the device screens and off the window', async ({
    page
  }) => {
    await page.goto('/')
    await page.waitForTimeout(LOAD_MS)
    // why: the device screens take no pointer today (laptop.tsx); a frame
    // that does is what the cursor must step aside for.
    await page.evaluate(() => {
      const frame = document.createElement('iframe')
      frame.id = 'probe-frame'
      frame.style.cssText =
        'position:fixed;left:900px;top:500px;width:200px;height:200px;z-index:70;border:0'
      document.body.append(frame)
    })
    const cursor = page.locator('[data-testid="glass-cursor"]')
    await showAt(page, 700, 300)
    await expect(cursor).toHaveAttribute('data-shown', '')
    await page.mouse.move(1000, 600, { steps: 6 })
    await expect(cursor).not.toHaveAttribute('data-shown', '')
    await showAt(page, 700, 300)
    await expect(cursor).toHaveAttribute('data-shown', '')
    await page.evaluate(() =>
      document.body.dispatchEvent(
        new PointerEvent('pointerout', { bubbles: true, relatedTarget: null })
      )
    )
    await expect(cursor).not.toHaveAttribute('data-shown', '')
  })

  test('the glass cursor lets clicks through', async ({ page }) => {
    await page.goto('/')
    const button = page.locator('#contato').getByRole('button')
    await scrollWindowTo(page, await documentTop(page.locator('#contato')))
    await page.waitForTimeout(LOAD_MS)
    await button.evaluate(element =>
      element.addEventListener('click', () =>
        element.setAttribute('data-clicked', '')
      )
    )
    await button.click()
    await expect(button).toHaveAttribute('data-clicked', '')
    const box = await button.boundingBox()
    if (!box) throw new Error('no button box')
    const top = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest('button') !== null,
      { x: box.x + 20, y: box.y + 20 }
    )
    expect(top).toBe(true)
  })

  test('a model that fails keeps the native cursor', async ({ page }) => {
    await page.route('**/models/glass/cursor.glb', route =>
      route.fulfill({ status: 404 })
    )
    await page.goto('/')
    await page.waitForTimeout(LOAD_MS)
    await showAt(page, 700, 300)
    await expect(page.locator('html')).not.toHaveClass(/glass-cursor/)
    await expect(page.locator('h1')).toHaveCSS('cursor', 'default')
  })
})

test.describe('touch', () => {
  test.use({
    viewport: { width: 412, height: 915 },
    hasTouch: true,
    isMobile: true
  })

  test('touch keeps the native cursor', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(LOAD_MS)
    await expect(page.locator('[data-testid="glass-cursor"]')).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveClass(/glass-cursor/)
  })
})
