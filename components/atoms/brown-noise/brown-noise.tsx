'use client'
import { useEffect, useRef, useState } from 'react'
import { brownNoise } from '@/lib/brown-noise'

const LOOP_SECONDS = 10
const VOLUME = 0.35
const FADE_SECONDS = 0.6

type Player = { context: AudioContext; gain: GainNode }
type State = 'off' | 'on' | 'unavailable'

const createPlayer = (): Player => {
  const context = new AudioContext()
  const { sampleRate } = context
  const buffer = context.createBuffer(1, sampleRate * LOOP_SECONDS, sampleRate)
  buffer.copyToChannel(brownNoise(buffer.length), 0)
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  const gain = context.createGain()
  gain.gain.value = 0
  source.connect(gain).connect(context.destination)
  source.start()
  return { context, gain }
}

// why: a ramp instead of a jump, so turning the sound on or off never clicks.
const fadeTo = ({ context, gain }: Player, volume: number) => {
  const now = context.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(volume, now + FADE_SECONDS)
}

/**
 * A button that plays brown noise in the background. It starts off: browsers
 * only let a page make sound after the visitor asks, and a sudden noise
 * startles (WCAG 1.4.2). Off, the audio context is suspended, sparing the CPU.
 */
export const BrownNoise = () => {
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

  const turnOn = async () => {
    try {
      const current = (player.current ??= createPlayer())
      window.clearTimeout(suspend.current)
      await current.context.resume()
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
      className="glass-card text-foreground/80 hover:text-foreground fixed right-4 bottom-4 z-50 inline-flex size-11 items-center justify-center rounded-full transition-colors disabled:opacity-40"
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
