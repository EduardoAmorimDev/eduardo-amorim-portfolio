import { MathUtils } from 'three'

type Window = readonly [start: number, end: number]

/**
 * Windows of the section's scroll progress (0..1) for each step of the
 * device carousel: phone → tablet → laptop.
 */
export const STAGES = {
  // why: the phone spins in from afar and lands facing the viewer.
  phoneIn: [0, 0.2],
  // why: one window for both, so the tablet enters as the phone leaves.
  phoneOut: [0.3, 0.45],
  // why: inside the tablet's rest (0.45-0.55), so it turns while centred.
  tabletTurn: [0.46, 0.54],
  tabletOut: [0.55, 0.7],
  // invariant: the laptop's own straighten/open/power windows run inside
  // this one, remapped to 0..1.
  laptop: [0.7, 1]
} as const satisfies Record<string, Window>

/** 0..1 inside `window`, eased in and out, clamped outside it. */
export const ease = (p: number, [start, end]: Window) =>
  MathUtils.smoothstep(p, start, end)

/** 0..1 inside `window`, linear, clamped outside it. */
export const local = (p: number, [start, end]: Window) =>
  MathUtils.clamp((p - start) / (end - start), 0, 1)

export type Frame = { width: number; height: number }
type Viewport = { width: number; height: number }

// invariant: never above 1, so large screens keep the designed size; the
// smaller ratio wins, covering portrait phones and short landscape screens.
export const fitIn = (viewport: Viewport, frame: Frame) =>
  Math.min(1, viewport.width / frame.width, viewport.height / frame.height)

/** Distance from the centre at which a device is wholly off screen. */
export const offstage = (viewport: Viewport, frame: Frame) =>
  (viewport.width + frame.width * fitIn(viewport, frame)) / 2

// why: higher values follow the scroll more tightly; lower values glide,
// which hides the discrete steps of a mouse wheel.
export const SMOOTHING = 4
// why: the same idle bob for every device: ±0.06 units, ~12.6 s per cycle.
export const FLOAT = { height: 0.06, speed: 0.5 }
export const floatAt = (elapsed: number) =>
  Math.sin(elapsed * FLOAT.speed) * FLOAT.height
