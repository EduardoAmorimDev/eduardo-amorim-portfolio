// why: each white step moves the level 2% of the way and the level leaks back
// as much, so energy falls ~6 dB per octave (brown) without drifting off.
const STEP = 0.02
// why: two lowpass poles at 180 Hz drop the hiss the bare brown noise kept
// (the user, 2026-11-06: "chuviscado"); left is a rumble, a train from inside.
const RUMBLE_HZ = 180
const RUMBLE_POLES = 2
// why: the level the first cut played at, so the volume keeps its meaning.
const TARGET_RMS = 0.2

const clamp = (value: number) => Math.min(1, Math.max(-1, value))

/**
 * A loop of deep brown noise, `length` samples in [-1, 1] at `sampleRate`:
 * white noise through a leaky integrator, then lowpassed to a rumble. `random`
 * returns values in [0, 1), like Math.random.
 */
export const brownNoise = (
  length: number,
  sampleRate: number,
  random: () => number = Math.random
) => {
  const white = Float32Array.from({ length }, () => random() * 2 - 1)
  const loop = new Float32Array(length)
  const pull = 1 - Math.exp((-2 * Math.PI * RUMBLE_HZ) / sampleRate)
  const poles = new Array<number>(RUMBLE_POLES).fill(0)
  let level = 0
  // why: the first pass leaves every filter where the loop ends, so the second
  // starts from there and the seam is one more ordinary step: no click.
  for (let pass = 0; pass < 2; pass++)
    white.forEach((sample, index) => {
      level = (level + STEP * sample) / (1 + STEP)
      loop[index] = poles.reduce((input, pole, at) => {
        const output = pole + pull * (input - pole)
        poles[at] = output
        return output
      }, level)
    })
  const rms = Math.sqrt(loop.reduce((sum, x) => sum + x * x, 0) / length)
  const gain = rms > 0 ? TARGET_RMS / rms : 0
  return loop.map(sample => clamp(sample * gain))
}

/**
 * How much of the hero is still on screen, from its top's distance to the
 * viewport top (negative once scrolled past) and its height: 1 at rest, 0
 * once its bottom has left the top of the screen.
 */
export const heroPresence = (top: number, height: number) =>
  height > 0 ? Math.min(1, Math.max(0, 1 + top / height)) : 0
