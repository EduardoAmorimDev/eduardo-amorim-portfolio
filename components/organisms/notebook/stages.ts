import { MathUtils, Matrix4, Quaternion, Vector3, type Object3D } from 'three'

type Window = readonly [start: number, end: number]

/** A device of the carousel. */
export type Device = 'phone' | 'tablet' | 'laptop'

// why: the carousel's order before the visitor's own device moves last.
const DEVICES: readonly Device[] = ['phone', 'tablet', 'laptop']
// invariant: Tailwind's `md` and `lg` breakpoints; device-copy.tsx
// switches with `lg:landscape:`, the stage (isSideLayout) with it.
const TABLET_MIN_WIDTH = 768
const SIDE_MIN_WIDTH = 1024

/** The device the visitor holds, told by the window's width in CSS px. */
export const viewerDevice = (width: number): Device =>
  width >= SIDE_MIN_WIDTH
    ? 'laptop'
    : width >= TABLET_MIN_WIDTH
      ? 'tablet'
      : 'phone'

/** The carousel's order: the other two as ever, the visitor's own last. */
export const deviceOrder = (viewer: Device): Device[] => [
  ...DEVICES.filter(device => device !== viewer),
  viewer
]

/**
 * The scroll windows (0..1) of one place in the carousel: entering, leaving
 * (never, for the last), the tablet's turn (only when not last) and the
 * laptop's own straighten, open and power-on, remapped to 0..1.
 */
export type Slot = {
  in: Window
  out: Window | null
  turn: Window | null
  own: Window
}

// why: one window for a device's exit and the next one's entrance, so one
// enters as the other leaves; a turn sits in the middle of the rest between.
// A device that is not last runs its own gesture while it is on stage; the
// last one after it has come in.
const SLOTS: readonly [Slot, Slot, Slot] = [
  { in: [0, 0.14], out: [0.22, 0.32], turn: [0.15, 0.21], own: [0, 0.22] },
  {
    in: [0.22, 0.32],
    out: [0.42, 0.52],
    turn: [0.34, 0.4],
    own: [0.22, 0.42]
  },
  { in: [0.42, 0.52], out: null, turn: null, own: [0.52, 0.72] }
]

// why: the phone comes from behind the stage's middle, where the device
// before it is still leaving; last, it waits until that one has gone, so it
// never rises through it (task portfolio-lp-mobile-smooth, 10).
const PHONE_LAST_IN: Window = [SLOTS[1].out?.[1] ?? 0.52, 0.62]

/** The windows of `device`'s place in `order`. */
export const slotOf = (order: readonly Device[], device: Device): Slot => {
  const place = order.indexOf(device)
  if (place === 0) return SLOTS[0]
  if (place === 1) return SLOTS[1]
  return device === 'phone' ? { ...SLOTS[2], in: PHONE_LAST_IN } : SLOTS[2]
}

/** Windows of the section's scroll progress (0..1) beyond the carousel. */
export const STAGES = {
  // why: ends before 1 so the damped camera has settled on the screen by
  // the time the section lets go and the real page takes over.
  zoom: [0.8, 0.96]
} as const satisfies Record<string, Window>

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

// invariant: CSS `landscape` is width > height, as here.
/** Wide landscape screens put the copy beside each device, not under it. */
export const isSideLayout = (size: Size) =>
  size.width >= SIDE_MIN_WIDTH && size.width > size.height

// why: shares of the screen kept clear for the copy (device-copy.tsx): the
// heading above, and the chapter text below or, side by side, a column on
// each side of the centred device (the middle 40% is the device's).
const COPY_ROOM = {
  stacked: { top: 0.12, bottom: 0.26, width: 1 },
  side: { top: 0.14, bottom: 0.04, width: 0.4 }
}
const room = (side: boolean) => (side ? COPY_ROOM.side : COPY_ROOM.stacked)

/** How far to raise the stage so it centres between the copy bands. */
export const stageLift = (viewport: Viewport, side: boolean) =>
  ((room(side).bottom - room(side).top) / 2) * viewport.height

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

// why: the scales a device's page is drawn at (CSS `zoom`); few steps, so it
// is only laid out again when its size on screen changes enough to matter.
const RENDER_STEPS = [0.25, 0.5, 0.75, 1]
// why: a new zoom is applied only once it has held this long (s), so a
// device in motion is not laid out again at every step it passes.
export const ZOOM_SETTLE = 0.25

/**
 * The CSS `zoom` to draw a device's page at so it is rasterised at about the
 * size it shows on screen: drawn full size and shrunk on the GPU, small text
 * came out jagged and blurry. `unitsPerPx` is world units per page CSS px,
 * `distance` from the camera to the page, `screenHeight` in CSS px.
 */
export const renderScale = (
  unitsPerPx: number,
  distance: number,
  screenHeight: number
) => {
  const visibleHeight =
    2 * distance * Math.tan(MathUtils.degToRad(CAMERA.fov) / 2)
  const shown = (unitsPerPx / visibleHeight) * screenHeight
  return RENDER_STEPS.find(step => step >= shown) ?? 1
}

/**
 * renderScale for a device at rest, seen from the resting camera: on touch
 * a page keeps this one scale for the whole visit, as every change of scale
 * left a frame with the page at the wrong size (task
 * portfolio-lp-mobile-alcance, 2).
 */
export const restRenderScale = (unitsPerPx: number, screenHeight: number) =>
  renderScale(unitsPerPx, restPosition.length(), screenHeight)

/**
 * Where the page on the last device's glass sits in the world, for the
 * camera to dive into it: the centre of its window-sized part, the way it
 * faces, its up, and that part's height.
 */
export type ScreenView = {
  centre: Vector3
  normal: Vector3
  up: Vector3
  pageHeight: number
}

/** Whether an object and every one of its ancestors are visible. */
export const isShown = (object: Object3D) => {
  for (let node: Object3D | null = object; node; node = node.parent) {
    if (!node.visible) return false
  }
  return true
}

// why: higher values follow the scroll more tightly; lower values glide,
// which hides the discrete steps of a mouse wheel.
export const SMOOTHING = 4
// why: the same idle bob for every device: ±0.06 units, ~12.6 s per cycle.
export const FLOAT = { height: 0.06, speed: 0.5 }
export const floatAt = (elapsed: number) =>
  Math.sin(elapsed * FLOAT.speed) * FLOAT.height

/**
 * The last device's bob, settling as the camera dives (`dive` 0..1): the
 * camera follows the screen, so a bob left running at the end of the dive
 * moved the camera, the 3D page and the canvas every frame for a still one.
 */
export const divingFloatAt = (elapsed: number, dive: number) =>
  floatAt(elapsed) * (1 - Math.min(Math.max(dive, 0), 1))
