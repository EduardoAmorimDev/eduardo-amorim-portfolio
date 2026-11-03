import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three'

type Window = readonly [start: number, end: number]

/**
 * Windows of the section's scroll progress (0..1) for each step: the
 * phone → tablet → laptop carousel, then the dive into the laptop's screen.
 */
export const STAGES = {
  // why: the phone spins in from afar and lands facing the viewer.
  phoneIn: [0, 0.14],
  // why: one window for both, so the tablet enters as the phone leaves.
  phoneOut: [0.22, 0.32],
  // why: inside the tablet's rest (0.32-0.42), so it turns while still.
  tabletTurn: [0.34, 0.4],
  tabletOut: [0.42, 0.52],
  // invariant: the laptop's own straighten/open/power windows run inside
  // this one, remapped to 0..1.
  laptop: [0.52, 0.72],
  // why: ends before 1 so the damped camera has settled on the screen by
  // the time the section lets go and the real page takes over.
  zoom: [0.8, 0.96]
} as const satisfies Record<string, Window>

// why: the carousel's end (laptop open and lit); from here on the scroll
// only drives the dive, so this is where the section holds once reached.
export const CAROUSEL_END = 0.72

/** 0..1 inside `window`, eased in and out, clamped outside it. */
export const ease = (p: number, [start, end]: Window) =>
  MathUtils.smoothstep(p, start, end)

/** 0..1 inside `window`, linear, clamped outside it. */
export const local = (p: number, [start, end]: Window) =>
  MathUtils.clamp((p - start) / (end - start), 0, 1)

export type Frame = { width: number; height: number }
type Viewport = { width: number; height: number }
type Size = { width: number; height: number }

/** The stage camera at rest, looking at the origin from above the floor. */
export const CAMERA = { position: [0, 1, 7], fov: 40 } as const

const restPosition = new Vector3(...CAMERA.position)
/** The camera's resting pose; the dive starts from and returns to it. */
export const CAMERA_REST = {
  position: restPosition,
  quaternion: new Quaternion().setFromRotationMatrix(
    new Matrix4().lookAt(restPosition, new Vector3(), new Vector3(0, 1, 0))
  )
}

// hazard: r3f's own `viewport` follows wherever the camera is when it is
// recomputed, so mid-dive it shrank the whole stage; the stage is laid out
// from the resting camera instead, always.
/** Scene units visible at the origin from the resting camera. */
export const stageViewport = (size: Size): Viewport => {
  const height =
    2 * Math.tan(MathUtils.degToRad(CAMERA.fov) / 2) * restPosition.length()
  return { height, width: (height * size.width) / size.height }
}

// invariant: Tailwind's `lg` breakpoint, and CSS `landscape` is width >
// height; device-copy.tsx switches with `lg:landscape:`, the stage with it.
const SIDE_MIN_WIDTH = 1024

/** Wide landscape screens put the copy beside each device, not under it. */
export const isSideLayout = (size: Size) =>
  size.width >= SIDE_MIN_WIDTH && size.width > size.height

// why: shares of the screen kept clear for the copy (device-copy.tsx): the
// heading above, and the chapter text below or, side by side, half the width.
const COPY_ROOM = {
  stacked: { top: 0.12, bottom: 0.26, width: 1 },
  side: { top: 0.14, bottom: 0.04, width: 0.5 }
}
const room = (side: boolean) => (side ? COPY_ROOM.side : COPY_ROOM.stacked)

/** How far to raise the stage so it centres between the copy bands. */
export const stageLift = (viewport: Viewport, side: boolean) =>
  ((room(side).bottom - room(side).top) / 2) * viewport.height

/**
 * Where a device rests, in scene units from the centre: beside its chapter
 * when side by side (`textSide` is where the text goes), centred otherwise.
 */
export const restX = (
  viewport: Viewport,
  side: boolean,
  textSide: 'left' | 'right'
) => (side ? (textSide === 'left' ? 1 : -1) * viewport.width * 0.22 : 0)

// invariant: never above 1, so large screens keep the designed size; the
// smaller ratio wins, covering portrait phones and short landscape screens.
export const fitIn = (viewport: Viewport, frame: Frame, side: boolean) => {
  const { top, bottom, width } = room(side)
  return Math.min(
    1,
    (viewport.width * width) / frame.width,
    (viewport.height * (1 - top - bottom)) / frame.height
  )
}

/** Distance from the centre at which a device is wholly off screen. */
export const offstage = (viewport: Viewport, frame: Frame, side: boolean) =>
  (viewport.width + frame.width * fitIn(viewport, frame, side)) / 2

// why: higher values follow the scroll more tightly; lower values glide,
// which hides the discrete steps of a mouse wheel.
export const SMOOTHING = 4
// why: the same idle bob for every device: ±0.06 units, ~12.6 s per cycle.
export const FLOAT = { height: 0.06, speed: 0.5 }
export const floatAt = (elapsed: number) =>
  Math.sin(elapsed * FLOAT.speed) * FLOAT.height
