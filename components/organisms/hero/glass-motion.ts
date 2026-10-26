import { MathUtils } from 'three'

export type GlassName = 'logo'

export type GlassLayout = {
  name: GlassName
  /** Position as a fraction of the half view at `depth`: -1 left/bottom edge, 1 right/top. */
  anchor: readonly [number, number]
  /** World z; negative is farther from the camera. */
  depth: number
  /** Largest side in world units (each model's largest side is 1). */
  size: number
  /** Resting rotation in radians, so each icon shows its best angle. */
  pose: readonly [number, number, number]
}

// why: the title holds the centre and the black hole wanders around it, so
// the logo floats alone at the top right, clear of the title and the CTA.
export const GLASS_LAYOUT: readonly GlassLayout[] = [
  {
    name: 'logo',
    anchor: [0.62, 0.62],
    depth: 0,
    size: 0.95,
    pose: [0.2, 0.4, 0]
  }
]

// why: the whole layout fits ~6 units at z = 0; narrower views shrink the
// icons with them so they never crowd the copy.
export const LAYOUT_WIDTH = 6

/** The hero's camera; it looks at the origin from a little above. */
export const HERO_CAMERA = {
  position: [0, 1, 7] as [number, number, number],
  fov: 40
}

/**
 * How much the icons shrink in a hero `width` × `height` px: the view's width
 * at the origin over LAYOUT_WIDTH, never above 1.
 */
export const viewFit = (width: number, height: number) => {
  const [x, y, z] = HERO_CAMERA.position
  const distance = Math.hypot(x, y, z)
  const halfFov = (HERO_CAMERA.fov * Math.PI) / 360
  const viewWidth = (width / height) * 2 * distance * Math.tan(halfFov)
  return Math.min(1, viewWidth / LAYOUT_WIDTH)
}

// why: kept small on purpose; the icons should feel alive, not draw the eye
// away from the copy. Radians for tilt, world units for shift.
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
