// why: the limits come from the task (T21–T22): a burst is short, never loops
// and never flickers faster than 3 text changes in any one-second window.
export const GLITCH = {
  windowMs: 1000,
  maxChangesPerWindow: 3,
  maxBurstMs: 600,
  maxShiftPx: 4
} as const

/** One copy of the text during a frame: shifted sideways, cut to a band. */
export type GlitchSlice = {
  /** Horizontal shift in px; negative is left. */
  x: number
  /** Inset of the visible band from the top and bottom, in % of the height. */
  top: number
  bottom: number
}

export type GlitchFrame = {
  /** Milliseconds after the burst starts. */
  at: number
  /** The two copies shown in this frame; null clears them (clean text). */
  copies: readonly [GlitchSlice, GlitchSlice] | null
}

// invariant: each frame is one change of what the text looks like, and the
// last one clears it, so a burst is exactly BURST.length changes.
export const BURST: readonly GlitchFrame[] = [
  {
    at: 0,
    copies: [
      { x: -3, top: 12, bottom: 52 },
      { x: 4, top: 58, bottom: 10 }
    ]
  },
  {
    at: 160,
    copies: [
      { x: 2, top: 40, bottom: 28 },
      { x: -4, top: 6, bottom: 70 }
    ]
  },
  { at: 320, copies: null }
]

/** The CSS clip-path that keeps only the slice's band of the copy. */
export const clipPath = ({ top, bottom }: GlitchSlice) =>
  `inset(${top}% 0 ${bottom}% 0)`

/** True when no window of `GLITCH.windowMs` holds more allowed changes. */
export const fitsRate = (changes: readonly number[]) => {
  const sorted = [...changes].sort((a, b) => a - b)
  return sorted.every((start, index) => {
    const end = start + GLITCH.windowMs
    let count = 0
    for (let next = index; next < sorted.length && sorted[next] < end; next++)
      count++
    return count <= GLITCH.maxChangesPerWindow
  })
}

const burstChanges = (start: number) => BURST.map(frame => start + frame.at)

/**
 * The earliest time at or after `now` when a whole burst fits the rate limit
 * alongside the `changes` already made.
 */
export const burstStart = (changes: readonly number[], now: number) => {
  // why: the count in a window only drops when a new change passes the end
  // of a window that opens on an old one, so those are the only candidates.
  const candidates = [now]
  for (const change of changes)
    for (const frame of BURST)
      candidates.push(change + GLITCH.windowMs - frame.at)
  const ordered = candidates.filter(time => time >= now).sort((a, b) => a - b)
  const fit = ordered.find(time =>
    fitsRate([...changes, ...burstChanges(time)])
  )
  // invariant: a start one window after the last change always fits.
  return fit ?? Math.max(now, ...changes) + GLITCH.windowMs
}

/** What a heading remembers between triggers. */
export type GlitchHistory = {
  /** When the text changed, in ms; only the last window is kept. */
  changes: readonly number[]
  /** Until when a burst is running or waiting to start. */
  busyUntil: number
}

export const IDLE_GLITCH: GlitchHistory = { changes: [], busyUntil: -Infinity }

/**
 * Asks for a burst at `now` (entering the viewport, or a hover). Returns null
 * while one is running or pending; otherwise when it starts, possibly later
 * than `now` to respect the rate limit, and the updated history.
 */
export const requestBurst = (history: GlitchHistory, now: number) => {
  if (now < history.busyUntil) return null
  const start = burstStart(history.changes, now)
  const recent = history.changes.filter(
    change => change > start - GLITCH.windowMs
  )
  const changes = [...recent, ...burstChanges(start)]
  const last = BURST[BURST.length - 1]
  return {
    start,
    history: { changes, busyUntil: start + (last ? last.at : 0) }
  }
}
