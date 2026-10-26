// why: the limits come from the task (T15–T17): one short burst per trigger,
// six frames of sliced copies, then clean text, never looping.
export const GLITCH = {
  maxBurstMs: 600,
  maxShiftPx: 8,
  maxShakePx: 2,
  framesWithCopies: 6,
  bandsPerCopy: 3
} as const

/** A horizontal band of a copy, in % of the heading's height from the top. */
export type GlitchBand = { from: number; to: number }

/** One copy of the text during a frame: shifted sideways, cut to bands. */
export type GlitchSlice = {
  /** Horizontal shift in px; negative is left. */
  x: number
  bands: readonly [GlitchBand, GlitchBand, GlitchBand]
}

export type GlitchFrame = {
  /** Milliseconds after the burst starts. */
  at: number
  /** Horizontal shift of the heading's own text in px; 0 is at rest. */
  shake: number
  /** The two copies shown in this frame; null clears them (clean text). */
  copies: readonly [GlitchSlice, GlitchSlice] | null
}

const slice = (x: number, ...bands: [number, number][]): GlitchSlice => {
  const [a = [0, 0], b = [0, 0], c = [0, 0]] = bands
  return {
    x,
    bands: [
      { from: a[0], to: a[1] },
      { from: b[0], to: b[1] },
      { from: c[0], to: c[1] }
    ]
  }
}

// invariant: copy 0 is --glitch-a (primary), copy 1 --glitch-b (mist); the
// last frame clears both and the shake, so a burst always ends clean.
export const BURST: readonly GlitchFrame[] = [
  {
    at: 0,
    shake: -1,
    copies: [
      slice(-6, [8, 22], [40, 52], [70, 84]),
      slice(5, [2, 12], [30, 46], [78, 92])
    ]
  },
  {
    at: 80,
    shake: 2,
    copies: [
      slice(3, [16, 30], [48, 60], [86, 96]),
      slice(-8, [6, 18], [36, 50], [62, 74])
    ]
  },
  {
    at: 160,
    shake: -2,
    copies: [
      slice(-8, [0, 10], [26, 40], [56, 70]),
      slice(7, [14, 26], [44, 58], [80, 96])
    ]
  },
  {
    at: 240,
    shake: 1,
    copies: [
      slice(6, [10, 24], [34, 44], [66, 80]),
      slice(-4, [4, 16], [50, 62], [72, 88])
    ]
  },
  {
    at: 320,
    shake: -1,
    copies: [
      slice(-3, [20, 34], [46, 56], [74, 90]),
      slice(8, [0, 14], [28, 38], [58, 72])
    ]
  },
  {
    at: 400,
    shake: 1,
    copies: [
      slice(2, [6, 14], [38, 50], [84, 98]),
      slice(-2, [18, 28], [52, 66], [76, 86])
    ]
  },
  { at: 480, shake: 0, copies: null }
]

/**
 * The CSS clip-path that keeps only the slice's bands of the copy: one
 * polygon whose bands are joined along the left edge, where the joins have
 * no width and so draw nothing.
 */
export const clipPath = ({ bands }: GlitchSlice) =>
  `polygon(${bands
    .map(({ from, to }) => `0% ${from}%, 100% ${from}%, 100% ${to}%, 0% ${to}%`)
    .join(', ')})`

/** What a heading remembers between triggers. */
export type GlitchHistory = {
  /** Until when a burst is running. */
  busyUntil: number
}

export const IDLE_GLITCH: GlitchHistory = { busyUntil: -Infinity }

/**
 * Asks for a burst at `now` (entering the viewport, or a hover). Returns null
 * while one is running; otherwise it starts at `now`, with the history that
 * keeps the next trigger out until it ends.
 */
export const requestBurst = (history: GlitchHistory, now: number) => {
  if (now < history.busyUntil) return null
  const last = BURST[BURST.length - 1]
  return {
    start: now,
    history: { busyUntil: now + (last ? last.at : 0) }
  }
}
