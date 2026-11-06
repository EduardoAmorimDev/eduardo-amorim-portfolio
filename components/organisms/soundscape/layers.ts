import { breath, murmurEnvelope, swing, type Random } from '@/lib/soundscape'

/**
 * One of the page's sounds. `output` carries it at full level, for the mix
 * to set; `play` starts or stops its scheduled movement (the blade's
 * swings, the planet's breaths), so a silent layer queues nothing.
 */
export type Layer = { output: GainNode; play: (on: boolean) => void }

/** How long each noise loop runs before it repeats. */
export const LOOP_SECONDS = 10
// why: events are written into the audio clock a little ahead, so a late
// timer never lands one in the past and drops it.
const LEAD_SECONDS = 0.05

const still = () => undefined

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
  return { output, play: still }
}

// why: the blade's hum, the preview the user chose (2026-11-06), taken an
// octave and more lower ("agudo demais"): 55 Hz, the black hole's own A, so
// the hero hands over in tune; its harmonics carry it on small speakers.
const BLADE = [
  { hz: 55, level: 1 },
  { hz: 110, level: 0.7 },
  { hz: 165, level: 0.4 },
  { hz: 220, level: 0.2 }
]
// why: at rest the hum is dark and low; a swing opens the filter, lifts
// the level and drops the pitch 3%, as a blade moved past the ear, yet
// never past 700 Hz, so it stays deep.
const BLADE_REST = { hz: 300, level: 0.6 }
const BLADE_SWUNG = { hz: 700, level: 1, pitch: 0.97 }

/**
 * Space, down the body of the page: the hum of a source of light, a blade
 * held still that swings now and then with a "vwoom". Pure tones, none of
 * the black hole's rumble, so the two never blur.
 */
export const space = (context: AudioContext, random: Random): Layer => {
  const output = gain(context, 0)
  const body = filter(context, 'lowpass', BLADE_REST.hz, 1.5)
  const swell = gain(context, BLADE_REST.level)
  body.connect(swell).connect(output)
  const tones = BLADE.map(({ hz, level }) => {
    const oscillator = context.createOscillator()
    oscillator.frequency.value = hz
    oscillator.connect(gain(context, level)).connect(body)
    oscillator.start()
    return { oscillator, hz }
  })

  const move = () => {
    const { rise, fall, next } = swing(random)
    const at = context.currentTime + LEAD_SECONDS
    const back = at + rise
    tones.forEach(({ oscillator, hz }) => {
      oscillator.frequency.setTargetAtTime(hz * BLADE_SWUNG.pitch, at, rise / 3)
      oscillator.frequency.setTargetAtTime(hz, back, fall / 3)
    })
    swell.gain.setTargetAtTime(BLADE_SWUNG.level, at, rise / 3)
    swell.gain.setTargetAtTime(BLADE_REST.level, back, fall / 3)
    body.frequency.setTargetAtTime(BLADE_SWUNG.hz, at, rise / 3)
    body.frequency.setTargetAtTime(BLADE_REST.hz, back, fall / 3)
    return next
  }

  return { output, play: repeat(move, 1 + random() * 2) }
}

// why: the air's band closes to 500 Hz between breaths and opens to 750 Hz
// at their crest, brighter as a wave breaks, yet twice lowpassed, so the
// hiss stays out (under 1% of the power above 1.5 kHz).
const AIR_HZ = { low: 500, high: 750, ceiling: 650 }
const AIR_REST = 0.3
// why: the city is heard from above: nothing of it passes 1 kHz, twice
// lowpassed, so it adds no hiss to the air.
const CITY_CEILING_HZ = 1000
// why: four knots of people talking, each in its own band and place, their
// talk looping at lengths that never line up (7, 9, 11 and 13 s).
const CROWDS = [
  { hz: 450, pan: -0.6, seconds: 7 },
  { hz: 650, pan: -0.2, seconds: 9 },
  { hz: 850, pan: 0.3, seconds: 11 },
  { hz: 550, pan: 0.7, seconds: 13 }
]
// why: the talk's level is a slow signal; 3 kHz holds it, at a sixteenth
// of the samples a full rate would cost.
const TALK_RATE = 3000

/** The city below: the roar of its traffic and the murmur of its crowds. */
const city = (
  context: AudioContext,
  white: AudioBuffer,
  into: AudioNode,
  random: Random
) => {
  const below = filter(context, 'lowpass', CITY_CEILING_HZ)
  below.connect(filter(context, 'lowpass', CITY_CEILING_HZ)).connect(into)

  const noise = () => {
    const source = context.createBufferSource()
    source.buffer = white
    source.loop = true
    source.start(0, random() * white.duration)
    return source
  }

  const traffic = gain(context, 0.5)
  tone(context, 0.07, 0.12).connect(traffic.gain)
  noise()
    .connect(filter(context, 'bandpass', 250, 0.6))
    .connect(filter(context, 'lowpass', 500))
    .connect(traffic)
    .connect(below)

  CROWDS.forEach(({ hz, pan, seconds }) => {
    const talk = context.createBuffer(1, TALK_RATE * seconds, TALK_RATE)
    talk.copyToChannel(murmurEnvelope(talk.length, TALK_RATE, random), 0)
    const level = context.createBufferSource()
    level.buffer = talk
    level.loop = true
    const voices = gain(context, 0)
    level.connect(voices.gain)
    level.start()
    noise()
      .connect(filter(context, 'bandpass', hz, 1.2))
      .connect(voices)
      .connect(new StereoPannerNode(context, { pan }))
      .connect(below)
  })
}

/**
 * The planet, at the contact: the Earth glowing in its atmosphere, where
 * the page comes home. The rumble, warm, under an open band of air that
 * breathes in long, uneven waves as the globe's vapour drifts, and beneath
 * it a city heard from above: its traffic's roar and its crowds' murmur.
 */
export const planet = (
  context: AudioContext,
  rumble: Float32Array<ArrayBuffer>,
  noise: Float32Array<ArrayBuffer>,
  random: Random
): Layer => {
  const output = gain(context, 0)

  loop(context, rumble)
    .connect(filter(context, 'lowpass', 300))
    .connect(gain(context, 0.5))
    .connect(output)

  const white = context.createBuffer(1, noise.length, context.sampleRate)
  white.copyToChannel(noise, 0)
  const opening = filter(context, 'lowpass', AIR_HZ.low)
  const air = gain(context, AIR_REST)
  const wind = context.createBufferSource()
  wind.buffer = white
  wind.loop = true
  wind
    .connect(filter(context, 'highpass', 120))
    .connect(opening)
    .connect(filter(context, 'lowpass', AIR_HZ.ceiling))
    .connect(air)
    .connect(output)
  wind.start()

  const breathe = () => {
    const { rise, fall, crest } = breath(random)
    const at = context.currentTime + LEAD_SECONDS
    air.gain.setTargetAtTime(crest, at, rise / 3)
    opening.frequency.setTargetAtTime(AIR_HZ.high, at, rise / 3)
    air.gain.setTargetAtTime(AIR_REST, at + rise, fall / 3)
    opening.frequency.setTargetAtTime(AIR_HZ.low, at + rise, fall / 3)
    return rise + fall
  }

  const streets = gain(context, 0.5)
  streets.connect(output)
  city(context, white, streets, random)

  return { output, play: repeat(breathe, 0.5) }
}
