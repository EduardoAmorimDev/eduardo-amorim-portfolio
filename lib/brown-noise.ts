// why: each white step moves the level 2% of the way and the level leaks back
// as much, so energy falls ~6 dB per octave (brown) without drifting off.
const STEP = 0.02
// why: two lowpass poles at 180 Hz drop the hiss the bare brown noise kept
// (the user, 2026-11-06: "chuviscado"); left is a rumble, a train from inside.
const RUMBLE_HZ = 180
// why: the level the first cut played at, so the volume keeps its meaning.
const TARGET_RMS = 0.2

const clamp = (value: number) => Math.min(1, Math.max(-1, value))

// hazard: these run on the main thread at the visitor's first gesture, a
// million samples; plain loops, as a callback per sample cost ~140 ms.

/** `length` samples of white noise in [-1, 1). */
export const whiteNoise = (
  length: number,
  random: () => number = Math.random
) => {
  const samples = new Float32Array(length)
  for (let at = 0; at < length; at++) samples[at] = random() * 2 - 1
  return samples
}

/**
 * A loop of deep brown noise, `length` samples in [-1, 1] at `sampleRate`:
 * white noise through a leaky integrator, then two lowpass poles to a
 * rumble. `random` returns values in [0, 1), like Math.random.
 */
export const brownNoise = (
  length: number,
  sampleRate: number,
  random: () => number = Math.random
) => {
  const white = whiteNoise(length, random)
  const loop = new Float32Array(length)
  const pull = 1 - Math.exp((-2 * Math.PI * RUMBLE_HZ) / sampleRate)
  let level = 0
  let first = 0
  let second = 0
  // why: the first pass leaves every filter where the loop ends, so the second
  // starts from there and the seam is one more ordinary step: no click.
  for (let pass = 0; pass < 2; pass++)
    for (let at = 0; at < length; at++) {
      level = (level + STEP * (white[at] ?? 0)) / (1 + STEP)
      first += pull * (level - first)
      second += pull * (first - second)
      loop[at] = second
    }
  let power = 0
  for (let at = 0; at < length; at++) power += (loop[at] ?? 0) ** 2
  const rms = Math.sqrt(power / Math.max(length, 1))
  const gain = rms > 0 ? TARGET_RMS / rms : 0
  for (let at = 0; at < length; at++) loop[at] = clamp((loop[at] ?? 0) * gain)
  return loop
}
