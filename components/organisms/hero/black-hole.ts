import { viewFit } from './glass-motion.ts'
import { sheetScale } from './grid-motion.ts'

// why: at 1440×900: a 144 px horizon (a quarter off 192), a disk out to 4
// horizon radii (288 px on screen, as before the horizon shrank), its back
// bent into a ring up to 1.22 radii below and 1.43 above; it rests at the
// centre, 32% down, its sphere and arcs 10% clear of every edge.
export const HOLE = {
  /** Horizon diameter in CSS px at the design size. */
  horizon: 144,
  /** The design size the numbers above are measured at. */
  designHeight: 900,
  /** The body's half extent, in horizon radii: the disk's outer edge … */
  halfWidth: 8,
  /** … the vertical disk's outer edge below the horizon … */
  halfHeight: 1.39,
  /** … and above it; both bands twice as wide as they were (task
   * black-hole-wide, 4). */
  topHeight: 1.8,
  /** Resting point, as a share of the hero's width and height. */
  rest: { x: 0.5, y: 0.32 },
  /** Share of the hero kept clear on every side; small, so the black
   * hole can circle round the copy (task black-hole-alive, 10). */
  margin: 0.02
} as const

// why: the disk hugs the black hole, from 1.15 to 4 horizon radii, and
// turns faster near the horizon, like a real one, but slowly overall: about
// 73 s a turn at the inner edge, 145 s at the outer one (80 and 160 s,
// then 1.1 times as fast, as asked).
export const DISK = {
  /** Inner and outer edges, in horizon radii; twice its former 4 (task
   * black-hole-wide, 4). */
  inner: 1.15,
  outer: 8,
  /** Seconds per turn at the inner and outer edges. */
  innerTurn: 80 / 1.1,
  outerTurn: 160 / 1.1
} as const

// why: what lies on this layer is behind the black hole and is only seen
// through its lens (task black-hole-behind, 5); the camera sees layer 0.
export const BEHIND_LAYER = 1

// why: the disk is seen 7° above its plane, more from the side than from
// above, and its long axis rises 20° to the right, like a "/" (task
// black-hole-wide, 5–6). The hero holds it still; diskPose can still swing
// and rock it.
export const DISK_POSE = {
  tilt: (7 * Math.PI) / 180,
  slant: (20 * Math.PI) / 180,
  tiltSwing: (3 * Math.PI) / 180,
  tiltPeriod: 16,
  // why: the slant sways ±1.5° as it travels (task black-hole-alive, 2,
  // halved after review).
  roll: (1.5 * Math.PI) / 180,
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

// why: the black hole rises off the grid and sinks back to it (task
// black-hole-scale, criteria 7–11): nearer the viewer it looks up to 1.12×
// its size and its well is half as strong; resting on the grid, 0.88× and
// full strength. One rise and fall takes 12 s, apart from the disk's 16 s
// and 21 s cycles.
export const LIFT = {
  period: 12,
  lowest: 0.88,
  highest: 1.12,
  weakest: 0.5,
  /** Where a still black hole holds. */
  still: 0.5
} as const

/**
 * How far off the grid the black hole is `seconds` into its motion: 0
 * resting on it, 1 the farthest; it starts on the grid. Still, it holds at
 * LIFT.still.
 */
export const holeLift = (seconds: number, still: boolean) =>
  still
    ? LIFT.still
    : 0.5 - 0.5 * Math.cos((2 * Math.PI * seconds) / LIFT.period)

/** How much larger the black hole looks at `lift`: 0.88 to 1.12. */
export const liftScale = (lift: number) =>
  LIFT.lowest + (LIFT.highest - LIFT.lowest) * lift

/** How strong its well is at `lift`: 1 on the grid, 0.5 the farthest. */
export const wellStrength = (lift: number) => 1 - (1 - LIFT.weakest) * lift

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
