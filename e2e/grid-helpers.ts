import type { Page } from '@playwright/test'
import type { Pixels } from './page-helpers'

/** The hero grid's own pixels and how many of them make one CSS px. */
export type GridImage = { pixels: Pixels; scale: number }

// why: a line crosses a row (or a column) in a run a few px long; a line
// running along it makes a much longer run, which is not a crossing.
const MAX_CROSSING = 6
// why: a row lying on a horizontal line is inked across most of its width.
const ON_LINE = 0.3

/** Reads one of the hero's 2D canvases straight from its context. */
export const readCanvas = async (
  page: Page,
  testId: 'hero-grid' | 'hero-lens'
): Promise<GridImage> => {
  const { width, height, scale, base64 } = await page
    .locator(`[data-testid="${testId}"]`)
    .evaluate(canvas => {
      if (!(canvas instanceof HTMLCanvasElement))
        throw new Error('not a canvas')
      const context = canvas.getContext('2d')
      if (!context) throw new Error('no 2D context')
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

/** Reads the hero grid's canvas straight from its 2D context. */
export const readGrid = (page: Page) => readCanvas(page, 'hero-grid')

/** Whether no pixel of a canvas reading is inked. */
export const isBlank = ({ pixels }: GridImage) => {
  for (let index = 3; index < pixels.data.length; index += 4)
    if (pixels.data[index]) return false
  return true
}

/** Alpha (0–255) of the grid at CSS px (x, y). */
export const alphaAt = ({ pixels, scale }: GridImage, x: number, y: number) => {
  const px = Math.floor(x * scale)
  const py = Math.floor(y * scale)
  if (px < 0 || py < 0 || px >= pixels.width || py >= pixels.height) return 0
  return pixels.data[(py * pixels.width + px) * 4 + 3] ?? 0
}

/** Alpha-weighted centres, in CSS px, of the short inked runs met. */
const crossings = (
  length: number,
  scale: number,
  alpha: (i: number) => number
) => {
  const centres: number[] = []
  let sum = 0
  let weight = 0
  let run = 0
  for (let i = 0; i <= length; i++) {
    const a = i < length ? alpha(i) : 0
    if (a > 0) {
      sum += (i + 0.5) * a
      weight += a
      run++
      continue
    }
    if (weight > 0 && run <= MAX_CROSSING * scale)
      centres.push(sum / weight / scale)
    sum = 0
    weight = 0
    run = 0
  }
  return centres
}

/** Share of a device-px row of the grid that is inked. */
const inkedShare = ({ pixels }: GridImage, row: number) => {
  let inked = 0
  for (let x = 0; x < pixels.width; x++)
    if ((pixels.data[(row * pixels.width + x) * 4 + 3] ?? 0) > 0) inked++
  return inked / pixels.width
}

/**
 * Where the vertical lines cross row `y` (CSS px), or null when that row
 * lies along a horizontal line and so cannot be read.
 */
export const rowCrossings = (grid: GridImage, y: number) => {
  const { pixels, scale } = grid
  const row = Math.floor(y * scale)
  if (row < 0 || row >= pixels.height || inkedShare(grid, row) > ON_LINE)
    return null
  return crossings(
    pixels.width,
    scale,
    x => pixels.data[(row * pixels.width + x) * 4 + 3] ?? 0
  )
}

/** Where the horizontal lines cross column `x` (CSS px). */
export const columnCrossings = (grid: GridImage, x: number) => {
  const { pixels, scale } = grid
  const column = Math.floor(x * scale)
  return crossings(
    pixels.height,
    scale,
    y => pixels.data[(y * pixels.width + column) * 4 + 3] ?? 0
  )
}

/** Rows (CSS px) from `from` to `to` that cross the vertical lines cleanly. */
export const readableRows = (
  grid: GridImage,
  from: number,
  to: number,
  step: number
) => {
  const rows: { y: number; xs: number[] }[] = []
  for (let y = from; y <= to; y += step) {
    const xs = rowCrossings(grid, y)
    if (xs) rows.push({ y, xs })
  }
  return rows
}

type Sample = { x: number; y: number }

/** Least-squares line x = a + b·y through the samples. */
export const fitLine = (samples: readonly Sample[]) => {
  const n = samples.length
  const my = samples.reduce((sum, { y }) => sum + y, 0) / n
  const mx = samples.reduce((sum, { x }) => sum + x, 0) / n
  let num = 0
  let den = 0
  for (const { x, y } of samples) {
    num += (y - my) * (x - mx)
    den += (y - my) * (y - my)
  }
  const b = den ? num / den : 0
  return { at: (y: number) => mx + b * (y - my) }
}

/**
 * Groups the crossings of each row into the vertical lines they belong to:
 * per row the lines sit evenly around the hero's centre, `step` apart, so a
 * crossing's line number is its distance from the centre in steps. `keep`
 * drops crossings near a body, which do not sit on the even spacing.
 */
export const linesFrom = (
  rows: readonly { y: number; xs: number[] }[],
  centre: number,
  keep: (point: Sample) => boolean
) => {
  const lines = new Map<number, Sample[]>()
  for (const { y, xs } of rows) {
    const kept = xs.filter(x => keep({ x, y }))
    const gaps = kept
      .slice(1)
      .map((x, index) => x - (kept[index] ?? x))
      .sort((a, b) => a - b)
    const step = gaps[Math.floor(gaps.length / 2)]
    if (!step) continue
    for (const x of kept) {
      // invariant: lines sit at ±step/2, ±3·step/2… from the centre.
      const index = Math.round((x - centre) / step - 0.5)
      lines.set(index, [...(lines.get(index) ?? []), { x, y }])
    }
  }
  return lines
}

/** Moves the mouse onto `to` in short steps. */
export const sweepPointer = async (
  page: Page,
  to: { x: number; y: number }
) => {
  await page.mouse.move(to.x - 36, to.y - 24)
  await page.mouse.move(to.x, to.y, { steps: 8 })
}
