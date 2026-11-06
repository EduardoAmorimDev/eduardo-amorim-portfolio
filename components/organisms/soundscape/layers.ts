import { brownNoise } from '@/lib/brown-noise'
import { pick, type Random } from '@/lib/soundscape'

/**
 * One of the page's sounds. `output` carries it at full level, for the mix
 * to set; `play` starts or stops its scheduled events (the stars, the
 * signals), so a silent layer queues nothing.
 */
export type Layer = { output: GainNode; play: (on: boolean) => void }

const LOOP_SECONDS = 10
// why: events are written into the audio clock a little ahead, so a late
// timer never lands one in the past and drops it.
const LEAD_SECONDS = 0.05

const gain = (context: AudioContext, level: number) => {
  const node = context.createGain()
  node.gain.value = level
  return node
}

const filter = (
  context: AudioContext,
  type: BiquadFilterType,
  hz: number,
  q = 0.7
) => {
  const node = context.createBiquadFilter()
  node.type = type
  node.frequency.value = hz
  node.Q.value = q
  return node
}

/** A steady sine, its level `level`, running from now on. */
const tone = (context: AudioContext, hz: number, level: number) => {
  const oscillator = context.createOscillator()
  oscillator.frequency.value = hz
  const node = gain(context, level)
  oscillator.connect(node)
  oscillator.start()
  return node
}

const loop = (context: AudioContext, samples: Float32Array<ArrayBuffer>) => {
  const buffer = context.createBuffer(1, samples.length, context.sampleRate)
  buffer.copyToChannel(samples, 0)
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.start()
  return source
}

/**
 * Calls `step` after `first` seconds, then again after the seconds each call
 * returns, while on. Turning it on twice, or off twice, changes nothing.
 */
const repeat = (step: () => number, first: number) => {
  let timer: number | undefined
  const run = () => {
    timer = window.setTimeout(run, step() * 1000)
  }
  return (on: boolean) => {
    if (on && timer === undefined) timer = window.setTimeout(run, first * 1000)
    if (!on && timer !== undefined) {
      window.clearTimeout(timer)
      timer = undefined
    }
  }
}

/** A chord of sines, each a slightly detuned pair that breathes slowly. */
const pad = (
  context: AudioContext,
  notes: readonly number[],
  level: number,
  random: Random
) => {
  const bus = filter(context, 'lowpass', 800)
  notes.forEach(hz => {
    const breath = gain(context, level)
    tone(context, 0.05 + random() * 0.08, level * 0.8).connect(breath.gain)
    for (const cents of [-4, 4])
      tone(context, hz * 2 ** (cents / 1200), 1).connect(breath)
    breath.connect(bus)
  })
  return bus
}

/** A long echo, darkened on every repeat, as a voice in a vast room. */
const echo = (context: AudioContext, seconds: number, damp: number) => {
  const input = context.createDelay(1)
  input.delayTime.value = seconds
  const feedback = gain(context, 0.45)
  const output = filter(context, 'lowpass', damp)
  input.connect(output).connect(feedback).connect(input)
  return { input, output }
}

type Strike = {
  hz: number
  /** When, on the audio clock. */
  at: number
  level: number
  attack: number
  decay: number
}

/** A sine struck at `at`: a soft attack, then a decay of `decay` seconds. */
const ring = (
  context: AudioContext,
  into: readonly AudioNode[],
  { hz, at, level, attack, decay }: Strike
) => {
  const oscillator = context.createOscillator()
  oscillator.frequency.value = hz
  const envelope = gain(context, 0)
  envelope.gain.setValueAtTime(0, at)
  envelope.gain.linearRampToValueAtTime(level, at + attack)
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  oscillator.connect(envelope)
  into.forEach(node => envelope.connect(node))
  oscillator.start(at)
  oscillator.stop(at + attack + decay + 0.05)
}

/**
 * The hero's black hole: a deep brown-noise rumble, lowpassed further by a
 * filter that opens and closes like wind outside, a level that swells, and
 * two low tones a third of a hertz apart beating into one slow throb.
 */
export const blackHole = (
  context: AudioContext,
  rumble: Float32Array<ArrayBuffer>
): Layer => {
  const output = gain(context, 0)
  const sweep = filter(context, 'lowpass', 220, 0.5)
  const swell = gain(context, 0.8)
  loop(context, rumble).connect(sweep).connect(swell).connect(output)
  tone(context, 0.09, 80).connect(sweep.frequency)
  tone(context, 0.05, 0.2).connect(swell.gain)
  tone(context, 55, 0.04).connect(swell)
  tone(context, 55.3, 0.04).connect(swell)
  return { output, play: () => undefined }
}

// why: an open A chord in fifths and ninths, no third: wide and unresolved,
// the way the dark between the stars feels.
const SPACE_CHORD = [110, 164.81, 246.94, 369.99]
// why: the stars' notes, a pentatonic over the chord so any two agree, kept
// under 1.4 kHz: higher, they read as hiss (the user, 2026-11-06).
const STAR_HZ = [659.25, 783.99, 880, 1046.5, 1318.5] as const

/**
 * Space, between the hero and the contact: the black hole's rumble opened a
 * little, wandering like a wind with no air to carry it, a chord that
 * breathes, and a soft star now and then ringing into a long echo, as the
 * page's sky twinkles. Pure sines and lowpassed noise: no hiss.
 */
export const space = (
  context: AudioContext,
  rumble: Float32Array<ArrayBuffer>,
  random: Random
): Layer => {
  const output = gain(context, 0)

  const wind = filter(context, 'lowpass', 300, 2)
  loop(context, rumble)
    .connect(wind)
    .connect(gain(context, 0.6))
    .connect(output)
  tone(context, 0.03, 150).connect(wind.frequency)

  pad(context, SPACE_CHORD, 0.03, random).connect(output)

  const hall = echo(context, 0.48, 1200)
  hall.output.connect(output)
  const star = () => {
    ring(context, [output, hall.input], {
      hz: pick(STAR_HZ, random),
      at: context.currentTime + LEAD_SECONDS,
      level: 0.03 + random() * 0.03,
      attack: 0.03,
      decay: 3
    })
    return 3 + random() * 5
  }

  return { output, play: repeat(star, random() * 2) }
}

// why: D major with its ninth: the first resolved chord on the page, home
// after the open fifths of space.
const PLANET_CHORD = [146.83, 220, 293.66, 369.99, 329.63]
// why: the Earth's own resonance (Schumann, 7.83 Hz), felt as a slow pulse.
const EARTH_PULSE_HZ = 7.83
// why: a ground station's signal, an octave over the chord's root and fifth.
const SIGNAL_HZ = [587.33, 880] as const

/** The rest of a planet's noise heard through glass: low, nothing sharp. */
const murmurFor = (context: AudioContext, random: Random) =>
  Float32Array.from(
    { length: context.sampleRate * LOOP_SECONDS },
    () => random() * 2 - 1
  )

/**
 * The planet, at the contact section: the Earth heard from close orbit. Its
 * warm hum pulsing at the planet's own resonance, the murmur of its cities
 * and crowds as through a window, a chord that resolves, and now and then a
 * ground station's soft signal: the systems at work below.
 */
export const planet = (
  context: AudioContext,
  rumble: Float32Array<ArrayBuffer>,
  random: Random
): Layer => {
  const output = gain(context, 0)

  const hum = gain(context, 0.5)
  loop(context, rumble)
    .connect(filter(context, 'lowpass', 300))
    .connect(hum)
    .connect(output)
  tone(context, EARTH_PULSE_HZ, 0.1).connect(hum.gain)

  // why: two lowpasses at 700 Hz, 24 dB per octave, leave the crowd and the
  // traffic their body and drop the hiss white noise would carry.
  const crowd = gain(context, 0.35)
  loop(context, murmurFor(context, random))
    .connect(filter(context, 'highpass', 150))
    .connect(filter(context, 'lowpass', 700))
    .connect(filter(context, 'lowpass', 700))
    .connect(crowd)
    .connect(output)
  tone(context, 0.11, 0.12).connect(crowd.gain)
  tone(context, 0.17, 0.08).connect(crowd.gain)

  pad(context, PLANET_CHORD, 0.025, random).connect(output)

  const air = echo(context, 0.36, 1000)
  air.output.connect(output)
  const signal = () => {
    const hz = pick(SIGNAL_HZ, random)
    const start = context.currentTime + LEAD_SECONDS
    for (let blip = 0; blip < 3; blip++)
      ring(context, [output, air.input], {
        hz,
        at: start + blip * 0.16,
        level: 0.02,
        attack: 0.01,
        decay: 0.25
      })
    return 5 + random() * 5
  }

  return { output, play: repeat(signal, 1 + random() * 2) }
}

/** The rumble the black hole, space and the planet's hum are made of. */
export const rumbleFor = (context: AudioContext) =>
  brownNoise(context.sampleRate * LOOP_SECONDS, context.sampleRate)
