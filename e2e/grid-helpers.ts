import type { Page } from '@playwright/test'
import type { Pixels } from './page-helpers'

/** The hero grid's own pixels and how many of them make one CSS px. */
export type GridImage = { pixels: Pixels; scale: number }

/** A line of the grid: where it rests, and where it crosses each sample. */
export type MeasuredLine = { rest: number; positions: number[] }

const GRID = '[data-testid="hero-grid"]'

/** Reads the hero grid's canvas straight from its 2D context. */
export const readGrid = async (page: Page): Promise<GridImage> => {
  const { width, height, scale, base64 } = await page
    .locator(GRID)
    .evaluate(canvas => {
      if (!(canvas instanceof HTMLCanvasElement))
        throw new Error('the hero grid is not a canvas')
      const context = canvas.getContext('2d')
      if (!context) throw new Error('the hero grid has no 2D context')
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
      let binary = ''
      for (let index = 0; index < data.length; index += 0x8000)
        binary += String.fromCharCode(...data.subarray(index, index + 0x8000))
      return {
        width: canvas.width,
        height: canvas.height,
        scale: canvas.width / canvas.clientWidth,
        base64: btoa(binary)
      }
    })
  return {
    pixels: { width, height, data: Buffer.from(base64, 'base64') },
    scale
  }
}

const alphaAt = ({ pixels }: GridImage, x: number, y: number) =>
  pixels.data[(y * pixels.width + x) * 4 + 3] ?? 0

/**
 * Alpha-weighted centres, in CSS px, of the inked runs met walking `length`
 * device px; `alpha(i)` is the alpha at step i.
 */
const runCentres = (
  length: number,
  scale: number,
  alpha: (i: number) => number
) => {
  const centres: number[] = []
  let sum = 0
  let weight = 0
  for (let i = 0; i <= length; i++) {
    const a = i < length ? alpha(i) : 0
    if (a > 0) {
      sum += (i + 0.5) * a
      weight += a
    } else if (weight > 0) {
      centres.push(sum / weight / scale)
      sum = 0
      weight = 0
    }
  }
  return centres
}

/**
 * Rest positions (CSS px, line centres) of a grid at rest: the rows and
 * columns inked across most of the canvas are the straight lines.
 */
export const restLines = (grid: GridImage) => {
  const { width, height } = grid.pixels
  const full = (length: number, across: number, ink: (i: number) => number) =>
    runCentres(length, grid.scale, i => (ink(i) > across / 2 ? 1 : 0))
  const inkedRow = (y: number) => {
    let count = 0
    for (let x = 0; x < width; x++) if (alphaAt(grid, x, y) > 0) count++
    return count
  }
  const inkedColumn = (x: number) => {
    let count = 0
    for (let y = 0; y < height; y++) if (alphaAt(grid, x, y) > 0) count++
    return count
  }
  return {
    vertical: full(width, height, inkedColumn),
    horizontal: full(height, width, inkedRow)
  }
}

const midpoints = (lines: number[]) =>
  lines.slice(1).map((line, index) => (line + (lines[index] ?? line)) / 2)

/**
 * Where every line crosses the samples halfway between the lines of the
 * other family; bent lines stay inside their half cell, so the runs met
 * along a sample keep the order of the lines.
 */
export const measureLines = (
  grid: GridImage,
  rest: ReturnType<typeof restLines>
) => {
  const { width, height } = grid.pixels
  const family = (
    lines: number[],
    samples: number[],
    length: number,
    alpha: (sample: number, i: number) => number
  ): MeasuredLine[] => {
    const crossings = samples.map(sample => {
      const at = Math.floor(sample * grid.scale)
      const centres = runCentres(length, grid.scale, i => alpha(at, i))
      if (centres.length !== lines.length)
        throw new Error(
          `${centres.length} lines met at ${sample}px, ${lines.length} expected`
        )
      return centres
    })
    return lines.map((line, index) => ({
      rest: line,
      positions: crossings.map(centres => centres[index] ?? NaN)
    }))
  }
  return {
    vertical: family(rest.vertical, midpoints(rest.horizontal), width, (y, x) =>
      alphaAt(grid, x, y)
    ),
    horizontal: family(
      rest.horizontal,
      midpoints(rest.vertical),
      height,
      (x, y) => alphaAt(grid, x, y)
    )
  }
}

/** The farthest a line strays from where it rests. */
export const maxShift = ({ rest, positions }: MeasuredLine) =>
  Math.max(...positions.map(position => Math.abs(position - rest)))

/** Every line of a reading, both families. */
export const allLines = (measured: ReturnType<typeof measureLines>) => [
  ...measured.vertical,
  ...measured.horizontal
]

/** Moves the mouse onto `to` in short steps, then lets the grid redraw. */
export const sweepPointer = async (
  page: Page,
  to: { x: number; y: number }
) => {
  await page.mouse.move(to.x - 36, to.y - 24)
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.evaluate(
    () =>
      new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
}

/** A point halfway between rest lines, near the middle of the viewport. */
export const between = (
  rest: ReturnType<typeof restLines>,
  near: { x: number; y: number }
) => {
  const halfway = (lines: number[], target: number) => {
    const mids = midpoints(lines)
    const best = mids.reduce(
      (closest, mid) =>
        Math.abs(mid - target) < Math.abs(closest - target) ? mid : closest,
      mids[0] ?? target
    )
    return best
  }
  return {
    x: halfway(rest.vertical, near.x),
    y: halfway(rest.horizontal, near.y)
  }
}

/** The hero grid's top edge on screen, to turn grid px into viewport px. */
export const gridTop = (page: Page) =>
  page.locator(GRID).evaluate(canvas => canvas.getBoundingClientRect().top)
