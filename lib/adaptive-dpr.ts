/**
 * How a `<Canvas>` trades sharpness for frame rate (components/atoms/
 * adaptive-dpr): drei's PerformanceMonitor moves a factor between 0 and 1
 * in steps as the measured frame rate falls short of, or meets, the
 * display's refresh rate, and the factor picks a pixel ratio in a range.
 */

/** A pixel ratio, or a [min, max] clamp of the device's own, as r3f takes it. */
export type DprSetting = number | [number, number]

// why: four steps from sharpest to cheapest; each resize of the drawing
// buffer is a hitch, so fewer, larger steps settle sooner.
export const DPR_STEP = 0.25

// why: a frame rate under 90% of the refresh rate is visible judder, so
// the canvas gives up pixels; it takes them back only at 97%, a gap wide
// enough that a canvas on the edge does not swing between two ratios.
const DECLINE_BELOW = 0.9
const INCLINE_FROM = 0.97

// why: the monitor takes the refresh rate for the best frame rate it has
// seen, so a scene slow from its first frame would set its own bar; no
// display is slower than this.
const MIN_REFRESH_RATE = 60

/** The [decline, incline] frame rates for a display's refresh rate. */
export const frameRateBounds = (refreshRate: number): [number, number] => {
  const rate = Math.max(refreshRate, MIN_REFRESH_RATE)
  return [rate * DECLINE_BELOW, rate * INCLINE_FROM]
}

/** The pixel ratio a setting resolves to on a device of `deviceDpr`. */
export const resolveDpr = (setting: DprSetting, deviceDpr: number) =>
  typeof setting === 'number'
    ? setting
    : Math.min(Math.max(deviceDpr, setting[0]), setting[1])

/**
 * The pixel ratio for a monitor factor: `min` at 0, `max` at 1, linear in
 * between; a factor outside 0..1 is clamped.
 */
export const dprAt = (factor: number, min: number, max: number) => {
  const share = Math.min(Math.max(factor, 0), 1)
  return min + (Math.max(max, min) - min) * share
}

// why: a phone's screen is 2-3x; past 1.5 buffer px per CSS px its GPU
// pays for sharpness nobody sees at arm's length (task portfolio-lp-mobile,
// 15).
export const TOUCH_MAX_DPR = 1.5

/** `setting` as is with a fine pointer, capped at TOUCH_MAX_DPR on touch. */
export const touchDpr = (setting: DprSetting, fine: boolean): DprSetting => {
  if (fine) return setting
  if (typeof setting === 'number') return Math.min(setting, TOUCH_MAX_DPR)
  return [
    Math.min(setting[0], TOUCH_MAX_DPR),
    Math.min(setting[1], TOUCH_MAX_DPR)
  ]
}
