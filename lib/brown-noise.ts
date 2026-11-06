// why: each white step moves the level 2% of the way and the level leaks back
// as much, so energy falls ~6 dB per octave (brown) without drifting off.
const STEP = 0.02
// why: lifts the integrator's ~0.06 RMS to ~0.2, loud but clear of clipping.
const GAIN = 3.5

const clamp = (value: number) => Math.min(1, Math.max(-1, value))

/**
 * A loop of brown noise, `length` samples in [-1, 1]: white noise run through
 * a leaky integrator. `random` returns values in [0, 1), like Math.random.
 */
export const brownNoise = (
  length: number,
  random: () => number = Math.random
) => {
  const white = Float32Array.from({ length }, () => random() * 2 - 1)
  const loop = new Float32Array(length)
  let level = 0
  // why: the first pass leaves the integrator where the loop ends, so the
  // second starts from there and the seam is one more ordinary step: no click.
  for (let pass = 0; pass < 2; pass++)
    white.forEach((sample, index) => {
      level = (level + STEP * sample) / (1 + STEP)
      loop[index] = clamp(level * GAIN)
    })
  return loop
}
