import { viewFit } from './glass-motion.ts'
import { sheetScale } from './grid-motion.ts'

// why: the task's numbers (cosmos, criteria 28–30) at 1440×900: a 96 px
// horizon, a near edge-on disk ~4 diameters wide (outer radius 4.2 horizon
// radii), the back of the disk bent into arcs up to 1.65 radii above and
// below; it rests at the centre, 32% down, 10% clear of every edge.
export const HOLE = {
  /** Horizon diameter in CSS px at the design size. */
  horizon: 96,
  /** The design size the numbers above are measured at. */
  designHeight: 900,
  /** The body's half extent, in horizon radii: the disk's outer edge … */
  halfWidth: 4.2,
  /** … and the arcs' outer edge. */
  halfHeight: 1.65,
  /** Resting point, as a share of the hero's width and height. */
  rest: { x: 0.5, y: 0.32 },
  /** Share of the hero kept clear on every side. */
  margin: 0.1
} as const

// why: the disk turns faster near the horizon, like a real one, yet every
// radius completes a turn in at most 20 s (criterion 30).
export const DISK = {
  /** Inner and outer edges, in horizon radii. */
  inner: 1.5,
  outer: 4.2,
  /** Seconds per turn at the inner and outer edges. */
  innerTurn: 8,
  outerTurn: 16
} as const

// why: the disk is seen 15° above its plane, so it reads as a tilted ring
// (task gravity, criteria 10 and 14–15): the tilt swings 12–18° every 16 s
// and the axis rocks ±3° every 21 s, two cycles that never line up.
export const DISK_POSE = {
  tilt: (15 * Math.PI) / 180,
  tiltSwing: (3 * Math.PI) / 180,
  tiltPeriod: 16,
  roll: (3 * Math.PI) / 180,
  rollPeriod: 21
} as const

/**
 * The disk's pose `seconds` into its motion: `tilt` is how far above its
 * plane it is seen, `roll` how far its axis leans in the screen's plane,
 * both in radians. A `still` disk rests at the middle tilt, square.
 */
export const diskPose = (seconds: number, still: boolean) => {
  if (still) return { tilt: DISK_POSE.tilt, roll: 0 }
  const turn = (period: number) => Math.sin((2 * Math.PI * seconds) / period)
  return {
    tilt: DISK_POSE.tilt + DISK_POSE.tiltSwing * turn(DISK_POSE.tiltPeriod),
    roll: DISK_POSE.roll * turn(DISK_POSE.rollPeriod)
  }
}

/**
 * The black hole's size in a hero `width` × `height` px, relative to the
 * design (1 at 1440×900): it follows the glass icons, which shrink by
 * `viewFit` and otherwise scale with the hero's height.
 */
export const holeScale = (width: number, height: number) =>
  (viewFit(width, height) * height) / HOLE.designHeight

/** Horizon radius in px for a hero `width` × `height` px. */
export const horizonRadius = (width: number, height: number) =>
  (HOLE.horizon / 2) * holeScale(width, height)

/**
 * Horizon radius in px with the black hole's centre at screen `y`: it sits
 * on the sheet, so it scales with the cells there, and is horizonRadius at
 * the resting height.
 */
export const horizonAt = (width: number, height: number, y: number) =>
  (horizonRadius(width, height) * sheetScale(height, y)) /
  sheetScale(height, height * HOLE.rest.y)

/** Seconds the disk takes to turn once at `radius` horizon radii. */
export const diskTurnSeconds = (radius: number) => {
  const share = Math.min(
    1,
    Math.max(0, (radius - DISK.inner) / (DISK.outer - DISK.inner))
  )
  return DISK.innerTurn + (DISK.outerTurn - DISK.innerTurn) * share
}

/** Where the black hole rests in a hero `width` × `height` px. */
export const restPoint = (width: number, height: number) => ({
  x: width * HOLE.rest.x,
  y: height * HOLE.rest.y
})
