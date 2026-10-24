import { MathUtils } from 'three'

export type GlassName =
  'note' | 'flag' | 'wave' | 'brick' | 'cursor' | 'atom' | 'logo'

export type GlassLayout = {
  name: GlassName
  /** Position as a fraction of the half view at `depth`: -1 left/bottom edge, 1 right/top. */
  anchor: readonly [number, number]
  /** World z; negative is behind the laptop. */
  depth: number
  /** Largest side in world units (each model's largest side is 1). */
  size: number
  /** Resting rotation in radians, so each icon shows its best angle. */
  pose: readonly [number, number, number]
}

// why: anchors keep the icons in the margins around the laptop on any aspect
// ratio; corners on wide screens, the bands above and below it on phones.
export const GLASS_LAYOUT: readonly GlassLayout[] = [
  {
    name: 'note',
    anchor: [-0.78, 0.45],
    depth: -1.5,
    size: 1.3,
    pose: [0.15, 0.45, 0.1]
  },
  {
    name: 'flag',
    anchor: [0.78, 0.45],
    depth: -1,
    size: 1.2,
    pose: [0.1, -0.5, -0.05]
  },
  {
    name: 'wave',
    anchor: [-0.72, -0.55],
    depth: 0.5,
    size: 1.3,
    pose: [0.55, 0.35, -0.3]
  },
  {
    name: 'brick',
    anchor: [0.74, -0.5],
    depth: 0,
    size: 1.1,
    pose: [0.5, -0.6, 0.12]
  },
  {
    name: 'cursor',
    anchor: [-0.4, 0.62],
    depth: -3,
    size: 0.95,
    pose: [0.25, 0.5, -0.25]
  },
  {
    name: 'atom',
    anchor: [0.42, 0.62],
    depth: -3.5,
    size: 1.15,
    pose: [0.2, 0.3, 0.1]
  },
  {
    name: 'logo',
    anchor: [-0.78, 0],
    depth: -2.5,
    size: 0.95,
    pose: [0.2, 0.4, 0]
  }
]

// why: the whole layout fits ~6 units at z = 0; narrower views shrink the
// icons with them so they never crowd the laptop.
export const LAYOUT_WIDTH = 6

// why: kept small on purpose; the icons should feel alive, not draw the eye
// away from the laptop. Radians for tilt, world units for shift.
export const MOTION = {
  /** Every icon leans this far towards the pointer, wherever it is. */
  parallaxTilt: 0.12,
  parallaxShift: 0.08,
  /** A hovered icon leans this far towards the point under the pointer. */
  hoverTilt: 0.3,
  hoverScale: 1.06,
  /** Idle bobbing and sway, so icons are never frozen. */
  bob: 0.05,
  sway: 0.12,
  speed: 0.5
}

// why: a Dyson-sphere cage: each ring tumbles about its own diameter, at its
// own speed and direction, while the whole cage turns slowly about the atom's
// vertical axis; together they sweep a sphere around the nucleus.
export const ORBIT = {
  /** Radians per second ring n tumbles; the sign is the direction. */
  tumble: [0.55, -0.42, 0.32],
  /** Radians per second the cage turns about the atom's y (~25 s a turn). */
  cage: 0.25
}

// invariant: the atom names its equal rings Orbit1..3, each centred on the
// nucleus at its origin with a diameter along its local x (canvas-lab's
// glass-elements.js).
const ORBIT_NAME = /^Orbit(\d+)$/

/** The ring number of an atom ring from its mesh name; null for the rest. */
export const orbitIndex = (name: string) => {
  const match = ORBIT_NAME.exec(name)
  return match ? Number(match[1]) : null
}

/** How far ring `index` (1-based) has tumbled about its diameter by `time`. */
export const tumbleAngle = (time: number, index: number) => {
  const { tumble } = ORBIT
  // invariant: rings past the list reuse its speeds in turn, never NaN.
  const slot = (((index - 1) % tumble.length) + tumble.length) % tumble.length
  return time * tumble[slot]
}

/** How far the whole cage has turned about the atom's vertical by `time`. */
export const cageAngle = (time: number) => time * ORBIT.cage

type Point = { x: number; y: number }

/** Maps an anchor to world x, y inside a view of the given size. */
export const anchorToWorld = (
  anchor: GlassLayout['anchor'],
  view: { width: number; height: number }
) => ({ x: (anchor[0] * view.width) / 2, y: (anchor[1] * view.height) / 2 })

/**
 * Where an icon should be heading this frame, before damping.
 * `pointer` is the canvas pointer (-1..1); `hover` is the point under it in
 * the icon's own space (-1..1), or null when the icon is not hovered.
 */
export const motionTarget = (
  pointer: Point,
  hover: Point | null,
  time: number,
  phase: number
) => {
  const lean = hover ?? pointer
  const tilt = hover ? MOTION.hoverTilt : MOTION.parallaxTilt
  const wave = Math.sin(time * MOTION.speed + phase)
  return {
    // invariant: positive x tilt turns the top away, so the icon leans towards
    // a pointer above it when the pointer's y is positive.
    rotationX: -MathUtils.clamp(lean.y, -1, 1) * tilt,
    rotationY: MathUtils.clamp(lean.x, -1, 1) * tilt + wave * MOTION.sway,
    shiftX: pointer.x * MOTION.parallaxShift,
    shiftY: pointer.y * MOTION.parallaxShift + wave * MOTION.bob,
    scale: hover ? MOTION.hoverScale : 1
  }
}
