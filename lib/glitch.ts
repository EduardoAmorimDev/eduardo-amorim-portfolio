// why: the limits come from the task (cosmos, criteria 8–10): a subtle burst
// of at most three frames of sliced copies, then clean text, never moving
// the heading itself; bursts come on their own, 5 to 12 s apart.
export const GLITCH = {
  maxBurstMs: 300,
  maxShiftPx: 3,
  framesWithCopies: 3,
  bandsPerCopy: 3,
  minWaitMs: 5000,
  maxWaitMs: 12000
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
// last frame clears both, so a burst always ends clean.
export const BURST: readonly GlitchFrame[] = [
  {
    at: 0,
    copies: [
      slice(-2, [10, 18], [44, 52], [72, 80]),
      slice(2, [4, 12], [34, 40], [82, 90])
    ]
  },
  {
    at: 60,
    copies: [
      slice(3, [22, 30], [56, 62], [84, 92]),
      slice(-1, [8, 16], [40, 48], [66, 74])
    ]
  },
  {
    at: 120,
    copies: [
      slice(-1, [2, 8], [30, 38], [60, 68]),
      slice(3, [16, 24], [50, 58], [78, 86])
    ]
  },
  { at: 180, copies: null }
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
 * Asks for a burst at `now`, when its drawn wait is over. Returns null
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

/**
 * How long a heading waits before its next burst, from a uniform draw
 * `random` in [0, 1): GLITCH.minWaitMs at 0, up to GLITCH.maxWaitMs.
 */
export const burstWait = (random: number) =>
  GLITCH.minWaitMs + (GLITCH.maxWaitMs - GLITCH.minWaitMs) * random
