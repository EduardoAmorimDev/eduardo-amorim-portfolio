import type { Frame } from './stages'

// why: the room each device needs at rest, with a margin; the tablet's is
// square and holds its 45° diagonal (~3.44) mid-turn, and the laptop's holds
// its widest pose (crooked and half open, plus the bobbing).
export const PHONE_FRAME: Frame = { width: 1.6, height: 3 }
export const TABLET_FRAME: Frame = { width: 3.6, height: 3.6 }
export const LAPTOP_FRAME: Frame = { width: 4.2, height: 3.4 }

type Size = { width: number; height: number }

/** A phone or tablet: a rounded slab with a live page on its front glass. */
export type HandheldSpec = {
  /** The page in CSS px, upright (portrait); the site lays out for it. */
  page: Size
  /** Width of the visible display in scene units; height follows the page. */
  screenWidth: number
  /** Glass around the display, in scene units. */
  bezel: number
  depth: number
  /** Radius of the slab's outline corners, in scene units. */
  corner: number
  /** Radius of the page's corners, in the page's CSS px. */
  pageRadius: number
  title: string
}

export const PHONE: HandheldSpec = {
  // why: a common phone width; the site renders its mobile layout.
  page: { width: 390, height: 844 },
  screenWidth: 1.12,
  bezel: 0.05,
  depth: 0.1,
  corner: 0.17,
  pageRadius: 42,
  title: 'Preview of the projects section on a phone'
}

export const TABLET: HandheldSpec = {
  // why: a common tablet's portrait width; the site renders its tablet layout.
  page: { width: 820, height: 1180 },
  screenWidth: 1.85,
  bezel: 0.09,
  depth: 0.08,
  corner: 0.14,
  pageRadius: 24,
  title: 'Preview of the projects section on a tablet'
}

/** The slab's outline in scene units: the display plus its bezel. */
export const bodySize = ({ page, screenWidth, bezel }: HandheldSpec) => ({
  width: screenWidth + bezel * 2,
  height: (screenWidth * page.height) / page.width + bezel * 2
})

/** Whether a window is laid out in landscape (CSS: wider than tall). */
export const isLandscape = (view: Size) => view.width > view.height

/**
 * `spec` as the visitor's own device: its page is the window, upright, so
 * the site lays out at the window's size and the body takes its proportion;
 * a landscape window shows it with the device turned on its side.
 */
export const asViewerDevice = (
  spec: HandheldSpec,
  view: Size
): HandheldSpec => ({
  ...spec,
  page: {
    width: Math.min(view.width, view.height),
    height: Math.max(view.width, view.height)
  }
})

/**
 * The room `spec` needs on stage: `designed` is the room for the body of
 * `base`, grown in step with a longer or wider body, and turned with it.
 */
export const handheldFrame = (
  designed: Frame,
  base: HandheldSpec,
  spec: HandheldSpec,
  landscape: boolean
): Frame => {
  const body = bodySize(spec)
  const designedBody = bodySize(base)
  const growth = Math.max(
    1,
    body.width / designedBody.width,
    body.height / designedBody.height
  )
  const width = designed.width * growth
  const height = designed.height * growth
  return landscape ? { width: height, height: width } : { width, height }
}
