// why: a slow figure-eight (1:2 Lissajous) in world units at the light's
// depth; on 1440×900 the widest reach is ~30 px from rest (task T6 allows
// 40), and any 2 s of it moves the light by 20 px or more, so it never
// looks parked.
export const DRIFT = {
  /** Half widths of the figure-eight, in world units. */
  x: 0.19,
  y: 0.14,
  /** Seconds per sweep: one across, two up and down. */
  periodX: 10,
  periodY: 5
} as const

/** Offset of the light from its resting point at `time` seconds. */
export const lightDrift = (time: number) => ({
  x: DRIFT.x * Math.sin((2 * Math.PI * time) / DRIFT.periodX),
  y: DRIFT.y * Math.sin((2 * Math.PI * time) / DRIFT.periodY)
})
