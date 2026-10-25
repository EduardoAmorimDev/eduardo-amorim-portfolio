import { MathUtils } from 'three'

// why: the limits come from the task (T12–T14): lines 48 px apart, bent only
// within 160 px of the pointer, by at most 12 px, straight again within 800 ms
// of the last pointer move. CSS px and milliseconds throughout.
export const GRID = {
  spacing: 48,
  /** The first line's distance from the top or left edge, so none runs along it. */
  offset: 24,
  radius: 160,
  maxShift: 12,
  /** How long a bend takes to fade after the last pointer move. */
  fadeMs: 600,
  /** The task's limit for the fade; fadeMs stays inside it. */
  settleMs: 800,
  /** Distance between the points a bent line is drawn through. */
  step: 4
} as const

// invariant: max of u(1 - u²)² over 0..1 is 16 / (25√5), at u = 1/√5; this
// gain scales that peak to exactly 1, so the shift peaks at GRID.maxShift.
const PEAK_GAIN = (25 * Math.sqrt(5)) / 16

/** Rest positions of the lines across a side `length` px long. */
export const gridLines = (length: number) => {
  const lines: number[] = []
  for (let at = GRID.offset; at < length; at += GRID.spacing) lines.push(at)
  return lines
}

/**
 * How bent the grid is `sinceMove` ms after the pointer last moved over it:
 * 1 at the move, easing out to 0 at GRID.fadeMs and staying there.
 */
export const bendEnergy = (sinceMove: number) => {
  const t = MathUtils.clamp(sinceMove / GRID.fadeMs, 0, 1)
  return (1 - t) * (1 - t)
}

/**
 * How far a point on a line moves across it, away from the pointer.
 * `across` is the line's signed distance from the pointer (line minus
 * pointer); `along` is the point's distance from the pointer along the line.
 * Zero at the pointer's own line and from GRID.radius out; at most
 * GRID.maxShift × energy in between.
 */
export const bendShift = (across: number, along: number, energy: number) => {
  const reach = (across * across + along * along) / (GRID.radius * GRID.radius)
  if (reach >= 1 || energy <= 0) return 0
  const falloff = (1 - reach) * (1 - reach)
  return GRID.maxShift * energy * PEAK_GAIN * (across / GRID.radius) * falloff
}

/** A point of a drawn line: `along` it, and its position `across` the grid. */
export type LinePoint = { along: number; across: number }

/**
 * The points to draw one line through. `rest` is where the line sits
 * straight, `length` how long it is; `pointer` is the pointer's position on
 * the same two axes, or null when there is none. A straight line is just its
 * two ends.
 */
export const bentLine = (
  rest: number,
  length: number,
  pointer: LinePoint | null,
  energy: number
): LinePoint[] => {
  const ends = [
    { along: 0, across: rest },
    { along: length, across: rest }
  ]
  if (!pointer || energy <= 0) return ends
  const across = rest - pointer.across
  if (Math.abs(across) >= GRID.radius) return ends
  const points: LinePoint[] = []
  for (let along = 0; along < length; along += GRID.step)
    points.push({
      along,
      across: rest + bendShift(across, along - pointer.along, energy)
    })
  points.push({
    along: length,
    across: rest + bendShift(across, length - pointer.along, energy)
  })
  return points
}
