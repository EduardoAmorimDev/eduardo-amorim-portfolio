/**
 * The visit's performance tier (task portfolio-lp-60fps, Decided 1, and
 * portfolio-lp-still-scenes, 16): `full` until the page, with no live scene
 * drawing, falls under BELOW_FPS in SLOW_WINDOWS of its last RECENT_WINDOWS
 * windows, then `lite` for the visit (`<html data-performance>`). Lite only
 * stills the page's effects; no canvas draws coarser or fewer frames.
 */
export type PerformanceTier = 'full' | 'lite'

// why: the user's bar: a device that cannot draw at 50 fps gets images
// (task portfolio-lp-still-scenes, Intent); lite uses the same one.
export const BELOW_FPS = 50
// why: the page's window; a scene is judged on shorter ones, so a black
// hole that judders turns still within seconds rather than six.
export const TIER_WINDOW_MS = 2000
export const SCENE_WINDOW_MS = 1000
// why: a gap this long is a stall (a shader compiling), not a slow frame;
// left out, one hitch on a fast machine never turns it lite.
export const STALL_MS = 250
// why: a gap this long is the tab hidden or the machine asleep, never
// judged; shorter stalls that fill a window are a device drawing at a
// frame or two a second, which must turn still (task
// portfolio-lp-still-scenes, 11).
export const PAUSE_MS = 2000
// why: the first second after load, or after a scene starts drawing, is
// hydration, models and first draws.
export const WARM_UP_MS = 1000
// why: three slow windows among the last five; one or two in a row turned a
// fast machine lite when models loaded and shaders compiled on the way down.
export const SLOW_WINDOWS = 3
export const RECENT_WINDOWS = 5

const rate = (intervals: readonly number[], windowMs: number) => {
  const total = intervals.reduce((sum, ms) => sum + ms, 0)
  return total >= windowMs / 2 ? (1000 * intervals.length) / total : null
}

/**
 * Frames per second over `intervals` (ms between frames), stalls left out
 * while at least half of `windowMs` is ordinary frames, stalls counted when
 * they fill the window, pauses never; null when too little is left.
 */
export const windowRate = (
  intervals: readonly number[],
  windowMs = TIER_WINDOW_MS
) =>
  rate(
    intervals.filter(ms => ms > 0 && ms <= STALL_MS),
    windowMs
  ) ??
  rate(
    intervals.filter(ms => ms > 0 && ms <= PAUSE_MS),
    windowMs
  )

/** Whether a window of frame intervals falls under BELOW_FPS. */
export const isSlowWindow = (
  intervals: readonly number[],
  windowMs = TIER_WINDOW_MS
) => {
  const rate = windowRate(intervals, windowMs)
  return rate !== null && rate < BELOW_FPS
}

/**
 * Judges frame intervals in windows of `windowMs`, after WARM_UP_MS of them:
 * `push` returns true once SLOW_WINDOWS of the last RECENT_WINDOWS were
 * slow.
 */
export const createJudge = (windowMs: number) => {
  let warm = 0
  let spent = 0
  let intervals: number[] = []
  let recent: boolean[] = []
  return {
    push(ms: number) {
      if (warm < WARM_UP_MS) {
        warm += ms
        return false
      }
      intervals.push(ms)
      spent += ms
      if (spent < windowMs) return false
      recent = [...recent, isSlowWindow(intervals, windowMs)].slice(
        -RECENT_WINDOWS
      )
      intervals = []
      spent = 0
      return recent.filter(Boolean).length >= SLOW_WINDOWS
    }
  }
}

let tier: PerformanceTier = 'full'
const listeners = new Set<() => void>()

/** The tier now; `full` until the visit has been measured slow. */
export const currentTier = () => tier

/** Calls `listener` when the tier changes; returns the unsubscribe. */
export const onTierChange = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Turns the visit lite, for good. */
export const turnLite = () => {
  if (tier === 'lite') return
  tier = 'lite'
  document.documentElement.dataset.performance = 'lite'
  for (const listener of listeners) listener()
}
