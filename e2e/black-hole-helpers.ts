import type { Page } from '@playwright/test'
import {
  channelGap,
  luminanceAt,
  pixelAt,
  screenPixels,
  type Pixels
} from './page-helpers'

// why: within this many levels of ink a pixel is the page background; the
// black hole's light lifts its surroundings well past it.
const DARK_GAP = 6
// why: a cap of the horizon is far larger than this; specks of background
// between glass edges are smaller.
const MIN_REGION = 150

/** A box on screen, in CSS px, with its centre and size. */
export type Box = {
  x0: number
  x1: number
  y0: number
  y1: number
  cx: number
  cy: number
  width: number
  height: number
}

const boxOf = (x0: number, x1: number, y0: number, y1: number): Box => ({
  x0,
  x1,
  y0,
  y1,
  cx: (x0 + x1 + 1) / 2,
  cy: (y0 + y1 + 1) / 2,
  width: x1 - x0 + 1,
  height: y1 - y0 + 1
})

/** Regions of dark pixels walled in by light: no dark path reaches the edge. */
const enclosedRegions = (pixels: Pixels, ink: readonly number[]) => {
  const { width, height } = pixels
  const dark = new Uint8Array(width * height)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      dark[y * width + x] =
        channelGap(pixelAt(pixels, x, y), ink) <= DARK_GAP ? 1 : 0
  // invariant: 0 light, 1 dark and unvisited, 2 visited.
  const fill = (start: number, visit: (index: number) => void) => {
    const stack = [start]
    dark[start] = 2
    while (stack.length) {
      const index = stack.pop() ?? 0
      visit(index)
      const x = index % width
      const y = (index - x) / width
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1]
      ] as const) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const next = ny * width + nx
        if (dark[next] === 1) {
          dark[next] = 2
          stack.push(next)
        }
      }
    }
  }
  for (let x = 0; x < width; x++)
    for (const y of [0, height - 1])
      if (dark[y * width + x] === 1) fill(y * width + x, () => undefined)
  for (let y = 0; y < height; y++)
    for (const x of [0, width - 1])
      if (dark[y * width + x] === 1) fill(y * width + x, () => undefined)
  const regions: (Box & { area: number })[] = []
  for (let index = 0; index < dark.length; index++) {
    if (dark[index] !== 1) continue
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    let area = 0
    fill(index, at => {
      const x = at % width
      const y = (at - x) / width
      x0 = Math.min(x0, x)
      x1 = Math.max(x1, x)
      y0 = Math.min(y0, y)
      y1 = Math.max(y1, y)
      area++
    })
    if (area >= MIN_REGION) regions.push({ ...boxOf(x0, x1, y0, y1), area })
  }
  return regions
}

// why: a disc is as tall as it is wide; the tilted disk's near half covers
// the horizon's lower part (task gravity, 11), leaving a cap 0.6–0.8 as tall
// as wide, which keeps its full width and its top.
const ROUND = { min: 0.6, max: 1.25 }
// why: a box this much shorter than wide is a cap, not the whole disc.
const CAPPED = 0.95

const union = (regions: readonly Box[]) =>
  boxOf(
    Math.min(...regions.map(region => region.x0)),
    Math.max(...regions.map(region => region.x1)),
    Math.min(...regions.map(region => region.y0)),
    Math.max(...regions.map(region => region.y1))
  )

const isRound = ({ width, height }: Box) =>
  height / width >= ROUND.min && height / width <= ROUND.max

// why: the photon ring is near white; the logo's glass, which walls in the
// logo's own dark hole, is a deep blue far below this.
const RING_LIT = 0.5
const RING_REACH = 4

/** Whether a bright photon ring arches over the box's top half. */
const ringed = (pixels: Pixels, box: Box) => {
  const radius = box.width / 2
  const centre = { x: box.cx, y: box.y0 + radius }
  for (let degrees = 30; degrees <= 150; degrees += 15) {
    const angle = (degrees * Math.PI) / 180
    let brightest = 0
    for (let reach = -1; reach <= RING_REACH; reach += 0.5)
      brightest = Math.max(
        brightest,
        luminanceAt(
          pixels,
          centre.x + (radius + reach) * Math.cos(angle),
          centre.y - (radius + reach) * Math.sin(angle)
        )
      )
    if (brightest <= RING_LIT) return false
  }
  return true
}

/** A cap's whole disc: as wide as the cap, from its top down. */
const wholeDisc = (box: Box) =>
  box.height >= box.width * CAPPED
    ? box
    : boxOf(box.x0, box.x1, box.y0, box.y0 + box.width - 1)

/**
 * The event horizon in a capture of the scene alone: a dark disc walled in
 * by light. The disk crossing in front may cut it into an upper and a lower
 * cap, aligned and alike, which are joined back into one box, or cover its
 * lower part, leaving the top cap, which is read as its whole disc. Other
 * walled dark spots (the logo's hole) have no photon ring over them and are
 * passed over.
 */
export const horizonIn = (pixels: Pixels, ink: readonly number[]) => {
  const regions = enclosedRegions(pixels, ink)
  const candidates: Box[] = regions.filter(isRound)
  for (const upper of regions)
    for (const lower of regions) {
      const gap = lower.y0 - upper.y1
      if (
        lower !== upper &&
        Math.abs(lower.cx - upper.cx) <= 3 &&
        Math.abs(lower.width - upper.width) <= upper.width * 0.3 &&
        gap >= 1 &&
        gap <= upper.width * 0.6
      ) {
        const joined = union([upper, lower])
        if (isRound(joined)) candidates.push(joined)
      }
    }
  const found = candidates
    .filter(box => ringed(pixels, box))
    .sort((a, b) => b.width * b.height - a.width * a.height)[0]
  return found ? wholeDisc(found) : null
}

/** The whole first screen, as painted. */
export const firstScreen = async (page: Page) => {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  return screenPixels(page, { x: 0, y: 0, ...viewport })
}

/** The event horizon on screen now; the scene must be shown alone. */
export const findHorizon = async (page: Page, ink: readonly number[]) => {
  const horizon = horizonIn(await firstScreen(page), ink)
  if (!horizon) throw new Error('no event horizon on screen')
  return horizon
}

/** Mean luminance of the pixels along a ring around a point. */
export const ringLuminance = (
  pixels: Pixels,
  centre: { x: number; y: number },
  radius: number,
  angles: readonly number[]
) =>
  angles.map(angle =>
    luminanceAt(
      pixels,
      centre.x + radius * Math.cos(angle),
      centre.y + radius * Math.sin(angle)
    )
  )
