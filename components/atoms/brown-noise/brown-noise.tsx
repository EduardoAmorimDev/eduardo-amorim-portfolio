'use client'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { brownNoise, heroPresence } from '@/lib/brown-noise'

const LOOP_SECONDS = 10
// why: the user, 2026-11-06: a third of the first cut's 0.35, then half.
const VOLUME = 0.06
const FADE_SECONDS = 0.6
// why: how fast the sound follows the scroll; short enough to feel tied to
// it, long enough that a flick of the wheel never steps the volume.
const SCROLL_FOLLOW_SECONDS = 0.1
// why: wind outside a house: a lowpass that opens and closes, and a level
// that swells, at rates that never line up, so the gusts never repeat.
const SWEEP = { hz: 220, depth: 80, rate: 0.09 }
const SWELL = { depth: 0.2, rate: 0.05 }
// why: the black hole's mass: two low tones a third of a hertz apart beat
// into one slow throb, well under the rumble.
const DRONE = { hz: [55, 55.3], level: 0.04 }

type Player = { context: AudioContext; master: GainNode; presence: GainNode }
type State = 'off' | 'on' | 'unavailable'

const presenceOf = (area: HTMLElement | null) => {
  if (!area) return 0
  const { top, height } = area.getBoundingClientRect()
  return heroPresence(top, height)
}

const createPlayer = (): Player => {
  const context = new AudioContext()
  const { sampleRate } = context
  const buffer = context.createBuffer(1, sampleRate * LOOP_SECONDS, sampleRate)
  buffer.copyToChannel(brownNoise(buffer.length, sampleRate), 0)
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const sweep = context.createBiquadFilter()
  sweep.type = 'lowpass'
  sweep.frequency.value = SWEEP.hz
  sweep.Q.value = 0.5
  const swell = context.createGain()
  swell.gain.value = 1 - SWELL.depth
  const master = context.createGain()
  master.gain.value = 0
  const presence = context.createGain()
  presence.gain.value = 0
  source.connect(sweep).connect(swell).connect(master).connect(presence)
  presence.connect(context.destination)

  const tone = (hz: number, level: number) => {
    const oscillator = context.createOscillator()
    oscillator.frequency.value = hz
    const gain = context.createGain()
    gain.gain.value = level
    oscillator.connect(gain)
    oscillator.start()
    return gain
  }
  tone(SWEEP.rate, SWEEP.depth).connect(sweep.frequency)
  tone(SWELL.rate, SWELL.depth).connect(swell.gain)
  DRONE.hz.forEach(hz => tone(hz, DRONE.level).connect(swell))
  source.start()
  return { context, master, presence }
}

// why: a ramp instead of a jump, so turning the sound on or off never clicks.
const fadeTo = ({ context, master }: Player, volume: number) => {
  const now = context.currentTime
  master.gain.cancelScheduledValues(now)
  master.gain.setValueAtTime(master.gain.value, now)
  master.gain.linearRampToValueAtTime(volume, now + FADE_SECONDS)
}

// why: squared, as the ear hears level on a log scale; a linear fade would
// hold loud and fall off only at the hero's very end.
const followPresence = ({ context, presence }: Player, share: number) =>
  presence.gain.setTargetAtTime(
    share * share,
    context.currentTime,
    SCROLL_FOLLOW_SECONDS
  )

type BrownNoiseProps = {
  /** The section the sound belongs to; it fades out as that leaves the top. */
  area: RefObject<HTMLElement | null>
}

/**
 * A button, in the corner of `area`, that plays a deep brown noise: the
 * black hole's rumble. It starts off: browsers only let a page make sound
 * after the visitor asks, and a sudden noise startles (WCAG 1.4.2). Off, or
 * with `area` scrolled away, the audio context is suspended to spare the CPU.
 */
export const BrownNoise = ({ area }: BrownNoiseProps) => {
  const [state, setState] = useState<State>('off')
  const player = useRef<Player | null>(null)
  const suspend = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      window.clearTimeout(suspend.current)
      void player.current?.context.close()
    },
    []
  )

  useEffect(() => {
    const current = player.current
    if (state !== 'on' || !current) return
    const update = () => {
      const share = presenceOf(area.current)
      followPresence(current, share)
      window.clearTimeout(suspend.current)
      if (share === 0)
        suspend.current = window.setTimeout(() => {
          void current.context.suspend()
        }, FADE_SECONDS * 1000)
      else if (current.context.state === 'suspended')
        current.context.resume().catch(() => setState('unavailable'))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [state, area])

  const turnOn = async () => {
    try {
      const current = (player.current ??= createPlayer())
      window.clearTimeout(suspend.current)
      await current.context.resume()
      followPresence(current, presenceOf(area.current))
      fadeTo(current, VOLUME)
      setState('on')
    } catch {
      setState('unavailable')
    }
  }

  const turnOff = () => {
    const current = player.current
    setState('off')
    if (!current) return
    fadeTo(current, 0)
    suspend.current = window.setTimeout(() => {
      void current.context.suspend()
    }, FADE_SECONDS * 1000)
  }

  const on = state === 'on'
  const label =
    state === 'unavailable' ? 'Ruído marrom indisponível' : 'Ruído marrom'

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      title={label}
      disabled={state === 'unavailable'}
      onClick={on ? turnOff : turnOn}
      className="glass-card text-foreground/80 hover:text-foreground absolute right-4 bottom-4 z-20 inline-flex size-11 items-center justify-center rounded-full transition-colors disabled:opacity-40"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        {on ? (
          <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
        ) : (
          <path d="m16 9.5 5 5m0-5-5 5" />
        )}
      </svg>
    </button>
  )
}
