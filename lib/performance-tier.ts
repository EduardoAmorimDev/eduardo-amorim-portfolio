/**
 * The visit's performance tier (task portfolio-lp-60fps, Decided 1): `full`
 * until SLOW_WINDOWS of the last RECENT_WINDOWS frame windows fall under
 * LITE_BELOW_FPS, then `lite` for the visit (`<html data-performance>`).
 */
export type PerformanceTier = 'full' | 'lite'

// why: the window the frame rate is averaged over, and the rate under which
// the visit turns lite: the 58 fps the page must hold (task
// portfolio-lp-60fps, 1-2), so no device is left between the two.
export const TIER_WINDOW_MS = 2000
export const LITE_BELOW_FPS = 58
// why: a gap this long is a stall (a shader compiling, the tab hidden), not
// a slow frame; left out, one hitch on a fast machine never turns it lite.
export const STALL_MS = 250
// why: the first second after load is hydration and first draws.
export const WARM_UP_MS = 1000
// why: three slow windows among the last five, 6 s of slowness within 10;
// one or two in a row turned a fast machine lite when models loaded and
// shaders compiled on the way down, and needing three in a row let a page
// slow only while it scrolls, back and forth, never turn lite.
export const SLOW_WINDOWS = 3
export const RECENT_WINDOWS = 5

/**
 * Frames per second over `intervals` (ms between frames), stalls left out;
 * null when under half a window of frames is left to judge by.
 */
export const windowRate = (intervals: readonly number[]) => {
  const kept = intervals.filter(ms => ms > 0 && ms <= STALL_MS)
  const total = kept.reduce((sum, ms) => sum + ms, 0)
  return total >= TIER_WINDOW_MS / 2 ? (1000 * kept.length) / total : null
}

/** Whether a window of frame intervals is slow enough to turn the visit lite. */
export const isSlowWindow = (intervals: readonly number[]) => {
  const rate = windowRate(intervals)
  return rate !== null && rate < LITE_BELOW_FPS
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

const turnLite = () => {
  if (tier === 'lite') return
  tier = 'lite'
  document.documentElement.dataset.performance = 'lite'
  for (const listener of listeners) listener()
}

/**
 * Measures every frame from a second after it starts and turns the visit
 * lite once SLOW_WINDOWS of the last RECENT_WINDOWS windows were slow;
 * stops once lite. Returns the stop.
 */
export const watchPerformance = () => {
  const started = performance.now()
  let frame = 0
  let last = 0
  let windowStart = 0
  let intervals: number[] = []
  let recent: boolean[] = []
  const tick = (now: number) => {
    if (tier === 'lite') return
    if (now - started >= WARM_UP_MS) {
      if (last) intervals.push(now - last)
      windowStart ||= now
      if (now - windowStart >= TIER_WINDOW_MS) {
        recent = [...recent, isSlowWindow(intervals)].slice(-RECENT_WINDOWS)
        if (recent.filter(Boolean).length >= SLOW_WINDOWS) return turnLite()
        intervals = []
        windowStart = now
      }
    }
    last = now
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}
