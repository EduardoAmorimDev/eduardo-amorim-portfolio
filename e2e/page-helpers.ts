import type { Locator, Page } from '@playwright/test'
import type { ColorToken } from '../lib/color-tokens'

/** The computed `rgb(...)` of a theme colour token, as the browser paints it. */
export const tokenRgb = (page: Page, token: ColorToken) =>
  page.evaluate(name => {
    const probe = document.createElement('span')
    probe.style.color = `var(--color-${name})`
    document.body.append(probe)
    const { color } = getComputedStyle(probe)
    probe.remove()
    return color
  }, token)

// why: scroll events and the work they trigger run in the frame's rendering
// steps; after two frames every scroll listener has seen the new position.
export const nextFrames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )

/** Scrolls the window instantly (Lenis follows native scrolls) and settles. */
export const scrollWindowTo = async (page: Page, top: number) => {
  await page.evaluate(
    y => window.scrollTo({ top: y, behavior: 'instant' }),
    top
  )
  await nextFrames(page)
}

/** Document y of an element's top edge. */
export const documentTop = (target: Locator) =>
  target.evaluate(element => element.getBoundingClientRect().top + scrollY)

/**
 * Share of the target's box whose pixels change when the target is hidden.
 * Near 0 means something else is painted over it; text and buttons laid on
 * top change a clear share of their box.
 */
export const paintedShare = async (page: Page, target: Locator) => {
  const box = await target.boundingBox()
  if (!box) throw new Error('target has no box to compare')
  // why: a handle, because a role locator stops matching once its target is
  // hidden from the accessibility tree.
  const element = await target.elementHandle()
  const shown = await page.screenshot({ clip: box })
  await element.evaluate(node => {
    node.style.visibility = 'hidden'
  })
  const hidden = await page.screenshot({ clip: box })
  await element.evaluate(node => {
    node.style.visibility = ''
  })
  await element.dispose()
  const sources = [shown, hidden].map(
    png => `data:image/png;base64,${png.toString('base64')}`
  )
  return page.evaluate(async ([withTarget, withoutTarget]) => {
    const pixels = async (source: string) => {
      const image = new Image()
      image.src = source
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('no 2D context to read the screenshot')
      context.drawImage(image, 0, 0)
      return context.getImageData(0, 0, image.width, image.height).data
    }
    const [a, b] = await Promise.all([
      pixels(withTarget),
      pixels(withoutTarget)
    ])
    let changed = 0
    for (let index = 0; index < a.length; index += 4) {
      const delta = Math.max(
        Math.abs(a[index] - b[index]),
        Math.abs(a[index + 1] - b[index + 1]),
        Math.abs(a[index + 2] - b[index + 2])
      )
      if (delta > 48) changed++
    }
    return changed / (a.length / 4)
  }, sources)
}

/** RGBA pixels, row by row, of a region `width` × `height` px. */
export type Pixels = { width: number; height: number; data: Uint8Array }

/** Pixels of a screen region as the page paints it (1 CSS px each). */
export const screenPixels = async (
  page: Page,
  clip: { x: number; y: number; width: number; height: number }
): Promise<Pixels> => {
  const png = await page.screenshot({ clip })
  const { width, height, base64 } = await page.evaluate(
    async source => {
      const image = new Image()
      image.src = source
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('no 2D context to read the screenshot')
      context.drawImage(image, 0, 0)
      const { data } = context.getImageData(0, 0, image.width, image.height)
      let binary = ''
      for (let index = 0; index < data.length; index += 0x8000)
        binary += String.fromCharCode(...data.subarray(index, index + 0x8000))
      return { width: image.width, height: image.height, base64: btoa(binary) }
    },
    `data:image/png;base64,${png.toString('base64')}`
  )
  return { width, height, data: Buffer.from(base64, 'base64') }
}

/** The [r, g, b, a] of one pixel. */
export const pixelAt = ({ width, data }: Pixels, x: number, y: number) => {
  const index = (Math.round(y) * width + Math.round(x)) * 4
  return [data[index], data[index + 1], data[index + 2], data[index + 3]]
}

const linear = (channel: number) => {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance (0 black … 1 white) of an [r, g, b] colour. */
export const relativeLuminance = ([r = 0, g = 0, b = 0]: readonly number[]) =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)

/** WCAG relative luminance of one pixel. */
export const luminanceAt = (pixels: Pixels, x: number, y: number) =>
  relativeLuminance(pixelAt(pixels, x, y))

/** Mean luminance of a box inside the pixels, clamped to their bounds. */
export const meanLuminance = (
  pixels: Pixels,
  box: { x0: number; x1: number; y0: number; y1: number }
) => {
  let sum = 0
  let count = 0
  const x0 = Math.max(0, Math.round(box.x0))
  const x1 = Math.min(pixels.width, Math.round(box.x1))
  const y0 = Math.max(0, Math.round(box.y0))
  const y1 = Math.min(pixels.height, Math.round(box.y1))
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      sum += luminanceAt(pixels, x, y)
      count++
    }
  if (!count) throw new Error(`empty box ${JSON.stringify(box)}`)
  return sum / count
}

/** Parses `rgb(r, g, b)` into its channels. */
export const channels = (rgb: string) => {
  const match = /^rgba?\((\d+), (\d+), (\d+)/.exec(rgb)
  if (!match) throw new Error(`not an rgb colour: ${rgb}`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/** Largest per-channel difference between two colours. */
export const channelGap = (a: readonly number[], b: readonly number[]) =>
  Math.max(
    ...[0, 1, 2].map(index => Math.abs((a[index] ?? 0) - (b[index] ?? 0)))
  )

/** Hides the hero's copy, so pixel checks see only the 3D scene under it. */
export const hideHeroCopy = (page: Page) =>
  page.evaluate(() => {
    for (const node of document.querySelectorAll<HTMLElement>(
      '#hero h1, #hero p, #hero a'
    ))
      node.style.visibility = 'hidden'
  })

/**
 * Loads `/` and waits until the hero's models have arrived and drawn: every
 * model request has settled once the network is idle.
 */
export const gotoHero = async (page: Page) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  // why: a few frames for the icons' first poses to damp into place.
  await page.waitForTimeout(1500)
}

/** Scroll position at which the hero's last screen is on screen. */
export const heroEnd = (page: Page) =>
  page.locator('#hero').evaluate(hero => {
    const { top, height } = hero.getBoundingClientRect()
    return top + scrollY + height - innerHeight
  })

/** Scroll position at which the notebook's animation reaches its end. */
export const notebookEnd = (page: Page) =>
  page.locator('#notebook').evaluate(section => {
    const { top, height } = section.getBoundingClientRect()
    return top + scrollY + height - innerHeight
  })

/**
 * Loads `/`, scrolls until the notebook's top meets the screen's top, where
 * its animation starts, and waits for the laptop (its screen page exists
 * once its model has loaded and the notebook is near).
 */
export const gotoNotebook = async (page: Page) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await scrollWindowTo(page, await documentTop(page.locator('#notebook')))
  await page.locator('#notebook iframe').waitFor({ state: 'attached' })
  // why: a few frames for the laptop's damped pose to settle at the start.
  await page.waitForTimeout(1500)
}
