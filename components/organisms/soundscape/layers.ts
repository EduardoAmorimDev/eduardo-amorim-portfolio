import { brownNoise } from '@/lib/brown-noise'
import {
  keyClick,
  phrase,
  pick,
  typingRun,
  type Random
} from '@/lib/soundscape'

/**
 * One of the page's sounds. `output` carries it at full level, for the mix
 * to set; `play` starts or stops its scheduled events (the twinkles, the
 * voices), so a silent layer queues nothing.
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

/** A steady tone, its level `level`, running from now on. */
const tone = (
  context: AudioContext,
  hz: number,
  level: number,
  type: OscillatorType = 'sine'
) => {
  const oscillator = context.createOscillator()
  oscillator.type = type
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

const together =
  (...plays: ((on: boolean) => void)[]) =>
  (on: boolean) =>
    plays.forEach(play => play(on))

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
const PAD_HZ = [110, 164.81, 246.94, 369.99]
// why: the stars' notes, a pentatonic over the pad, so any two agree.
const STAR_HZ = [1318.5, 1568, 1760, 2093, 2637] as const

/**
 * Space, between the hero and the contact: a cosmic wind (noise through a
 * slowly wandering bandpass), a pad that breathes, and stars that ring out
 * now and then into a long echo, as the page's sky twinkles.
 */
export const space = (context: AudioContext, random: Random): Layer => {
  const output = gain(context, 0)

  const white = Float32Array.from(
    { length: context.sampleRate * LOOP_SECONDS },
    () => random() * 2 - 1
  )
  const wind = filter(context, 'bandpass', 600, 0.9)
  loop(context, white).connect(wind).connect(gain(context, 0.5)).connect(output)
  tone(context, 0.03, 350).connect(wind.frequency)

  const pad = filter(context, 'lowpass', 900)
  pad.connect(output)
  PAD_HZ.forEach(hz => {
    const breath = gain(context, 0.03)
    tone(context, 0.07 + random() * 0.08, 0.025).connect(breath.gain)
    for (const cents of [-4, 4])
      tone(context, hz * 2 ** (cents / 1200), 1).connect(breath)
    breath.connect(pad)
  })

  const echo = context.createDelay(1)
  echo.delayTime.value = 0.48
  const feedback = gain(context, 0.4)
  const damp = filter(context, 'lowpass', 2500)
  echo.connect(damp).connect(feedback).connect(echo)
  damp.connect(output)

  const twinkle = () => {
    const at = context.currentTime + LEAD_SECONDS
    const oscillator = context.createOscillator()
    oscillator.frequency.value = pick(STAR_HZ, random)
    const envelope = gain(context, 0)
    envelope.gain.setValueAtTime(0, at)
    envelope.gain.linearRampToValueAtTime(0.05 + random() * 0.05, at + 0.01)
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + 2.4)
    oscillator.connect(envelope)
    envelope.connect(output)
    envelope.connect(echo)
    oscillator.start(at)
    oscillator.stop(at + 2.5)
    return 1.5 + random() * 4
  }

  return { output, play: repeat(twinkle, random() * 2) }
}

const VOICES = 5
const TYPISTS = 2
// why: a desktop's two-note notification, a fifth up: the systems at work.
const CHIME_HZ = [1046.5, 1568]

/** A voice in the murmur: a buzz shaped into vowels by two formant filters. */
const voice = (context: AudioContext, into: AudioNode, random: Random) => {
  const pitch = 95 + random() * 130
  const source = context.createOscillator()
  source.type = 'sawtooth'
  source.frequency.value = pitch
  const first = filter(context, 'bandpass', 700, 6)
  const second = filter(context, 'bandpass', 1200, 8)
  const level = gain(context, 0)
  source.connect(first).connect(level)
  source.connect(second).connect(gain(context, 0.6)).connect(level)
  level.connect(into)
  source.start()

  const speak = () => {
    const { syllables, pause } = phrase(random, pitch)
    let at = context.currentTime + LEAD_SECONDS
    for (const { seconds, formants, pitch: hz } of syllables) {
      first.frequency.setTargetAtTime(formants[0], at, 0.03)
      second.frequency.setTargetAtTime(formants[1], at, 0.03)
      source.frequency.setTargetAtTime(hz, at, 0.05)
      level.gain.setTargetAtTime(1, at, 0.02)
      level.gain.setTargetAtTime(0.15, at + seconds * 0.7, 0.03)
      at += seconds
    }
    level.gain.setTargetAtTime(0, at, 0.05)
    return at - context.currentTime + pause
  }
  return repeat(speak, random() * 3)
}

/** A typist: runs of key clicks, each a little different in tone. */
const typist = (
  context: AudioContext,
  into: AudioNode,
  click: AudioBuffer,
  random: Random
) => {
  const type = () => {
    const { gaps, pause } = typingRun(random)
    let at = context.currentTime + LEAD_SECONDS
    for (const gap of gaps) {
      const key = context.createBufferSource()
      key.buffer = click
      key.playbackRate.value = 0.8 + random() * 0.4
      key
        .connect(filter(context, 'bandpass', 2000 + random() * 2000, 1.5))
        .connect(gain(context, 0.5 + random() * 0.5))
        .connect(into)
      key.start(at)
      at += gap
    }
    return at - context.currentTime + pause
  }
  return repeat(type, random() * 4)
}

/**
 * The planet, at the contact section: an office on Earth. People talking too
 * far off to make out, keys typing, a notification now and then, over the
 * room's air conditioning and the mains' hum.
 */
export const planet = (
  context: AudioContext,
  rumble: Float32Array<ArrayBuffer>,
  random: Random
): Layer => {
  const output = gain(context, 0)

  loop(context, rumble)
    .connect(filter(context, 'lowpass', 400))
    .connect(gain(context, 0.35))
    .connect(output)
  tone(context, 60, 0.006).connect(output)
  tone(context, 120, 0.004).connect(output)

  const murmur = filter(context, 'lowpass', 2200)
  murmur.connect(gain(context, 0.12)).connect(output)
  const voices = Array.from({ length: VOICES }, () =>
    voice(context, murmur, random)
  )

  const keys = gain(context, 0.25)
  keys.connect(output)
  const samples = keyClick(Math.round(context.sampleRate * 0.025), random)
  const click = context.createBuffer(1, samples.length, context.sampleRate)
  click.copyToChannel(samples, 0)
  const typists = Array.from({ length: TYPISTS }, () =>
    typist(context, keys, click, random)
  )

  const chime = () => {
    let at = context.currentTime + LEAD_SECONDS
    for (const hz of CHIME_HZ) {
      const oscillator = context.createOscillator()
      oscillator.frequency.value = hz
      const envelope = gain(context, 0)
      envelope.gain.setValueAtTime(0, at)
      envelope.gain.linearRampToValueAtTime(0.04, at + 0.01)
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.6)
      oscillator.connect(envelope).connect(output)
      oscillator.start(at)
      oscillator.stop(at + 0.65)
      at += 0.14
    }
    return 10 + random() * 15
  }

  return {
    output,
    play: together(...voices, ...typists, repeat(chime, 4 + random() * 6))
  }
}

/** The rumble both the black hole and the planet's room are made of. */
export const rumbleFor = (context: AudioContext) =>
  brownNoise(context.sampleRate * LOOP_SECONDS, context.sampleRate)
