import type { Page } from '@playwright/test'
import { luminanceAt, screenPixels, type Pixels } from './page-helpers'

/** The whole first screen, as painted. */
export const firstScreen = async (page: Page) => {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  return screenPixels(page, { x: 0, y: 0, ...viewport })
}

/**
 * The brightest pixels of the top left quarter, where the light rests: their
 * luminance, every pixel that reaches it, and their centre. The icons sit on
 * the right half, so their highlights never count.
 */
export const brightest = (pixels: Pixels) => {
  const width = Math.floor(pixels.width / 2)
  const height = Math.floor(pixels.height / 2)
  let top = -1
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      top = Math.max(top, luminanceAt(pixels, x, y))
  const peak: { x: number; y: number }[] = []
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (luminanceAt(pixels, x, y) >= top - 1e-9) peak.push({ x, y })
  const centre = {
    x: peak.reduce((sum, point) => sum + point.x, 0) / peak.length,
    y: peak.reduce((sum, point) => sum + point.y, 0) / peak.length
  }
  return { luminance: top, peak, centre }
}

/** Where the light's core is right now. */
export const coreCentre = async (page: Page) =>
  brightest(await firstScreen(page)).centre
