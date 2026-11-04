/**
 * The glass models (public/models/glass, restored from a7cf52c^): each is
 * centred on its origin with its largest side at 1 unit.
 */
export const GLASS_MODELS = [
  'atom',
  'brick',
  'cursor',
  'flag',
  'logo',
  'note',
  'wave'
] as const

export type GlassModel = (typeof GLASS_MODELS)[number]

export const modelUrl = (name: GlassModel) => `/models/glass/${name}.glb`

// why: one per solution card, in card order (task reach-and-seams, 13 and
// Unresolved 3); the logo is the brand mark, kept out of the cards.
export const SOLUTION_MODELS = [
  'atom',
  'brick',
  'cursor',
  'flag',
  'note',
  'wave'
] as const satisfies readonly GlassModel[]

/** Radians per second an icon turns about its vertical axis (task, 15). */
export const SPIN_SPEED = 0.3
// why: a frame after a long pause (a backgrounded tab, an idle canvas)
// must not jump the icon by the whole pause.
const MAX_STEP = 0.1

/** The icon's angle after `delta` seconds; unchanged when `still`. */
export const spinStep = (angle: number, delta: number, still: boolean) =>
  still ? angle : angle + SPIN_SPEED * Math.min(Math.max(delta, 0), MAX_STEP)

/** Largest tilt of the glass cursor, in radians: 15° (task, 23). */
export const MAX_TILT = (15 * Math.PI) / 180
// why: the pointer speed, in px/s, at which the cursor leans all the way.
const FULL_TILT_SPEED = 1500

const clampTilt = (value: number) =>
  Math.min(MAX_TILT, Math.max(-MAX_TILT, value))

/**
 * The lean the cursor aims for at a pointer velocity (px/s): towards the
 * motion, up to MAX_TILT on each axis; none when `still`. `x` turns about
 * the screen's horizontal axis (vertical motion), `y` about the vertical.
 */
export const tiltFor = (vx: number, vy: number, still: boolean) =>
  still
    ? { x: 0, y: 0 }
    : {
        x: clampTilt((vy / FULL_TILT_SPEED) * MAX_TILT),
        y: clampTilt((vx / FULL_TILT_SPEED) * MAX_TILT)
      }

/** Cursor size over a control (button, link, summary) and elsewhere. */
export const CURSOR_SCALE = { control: 1.2, rest: 1 } as const

/** What the cursor counts as a control, as the native pointer did. */
export const CONTROL_SELECTOR = 'button, a[href], summary'
