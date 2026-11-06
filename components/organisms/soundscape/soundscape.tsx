'use client'
import { useEffect, useRef, useState } from 'react'
import { entryShare, heroPresence, layerMix } from '@/lib/soundscape'
import { blackHole, planet, rumbleFor, space, type Layer } from './layers'

// why: the user, 2026-11-06: the black hole at 0.05. Space and the planet
// are set to match it as the ear weighs loudness (A-weighted, in Chromium),
// not by raw level, which the rumble's bass would skew.
const VOLUME = { blackHole: 0.05, space: 0.015, planet: 0.055 }
const FADE_SECONDS = 0.6
// why: how fast the mix follows the scroll; short enough to feel tied to
// it, long enough that a flick of the wheel never steps the volume.
const SCROLL_FOLLOW_SECONDS = 0.1

type Layers = Record<keyof typeof VOLUME, Layer>
type Player = { context: AudioContext; master: GainNode; layers: Layers }
type State = 'off' | 'on' | 'unavailable'

const createPlayer = (): Player => {
  const context = new AudioContext()
  const rumble = rumbleFor(context)
  const layers: Layers = {
    blackHole: blackHole(context, rumble),
    space: space(context, Math.random),
    planet: planet(context, rumble, Math.random)
  }
  const master = context.createGain()
  master.gain.value = 0
  master.connect(context.destination)
  Object.values(layers).forEach(({ output }) => output.connect(master))
  return { context, master, layers }
}

const topOf = (id: string) =>
  document.getElementById(id)?.getBoundingClientRect()

const mixAt = (heroId: string, planetId: string) => {
  const hero = topOf(heroId)
  const earth = topOf(planetId)
  return layerMix(
    hero ? heroPresence(hero.top, hero.height) : 0,
    earth ? entryShare(earth.top, window.innerHeight) : 0
  )
}

// why: a ramp instead of a jump, so turning the sound on or off never clicks.
const fadeTo = ({ context, master }: Player, volume: number) => {
  const now = context.currentTime
  master.gain.cancelScheduledValues(now)
  master.gain.setValueAtTime(master.gain.value, now)
  master.gain.linearRampToValueAtTime(volume, now + FADE_SECONDS)
}

type SoundscapeProps = {
  /** The hero section, where the black hole rumbles. */
  heroId: string
  /** The section where the planet's office plays, at the page's end. */
  planetId: string
}

/**
 * The page's sound, behind a toggle fixed in the corner: the black hole in
 * the hero, space down the page, an office on the planet at its end, each
 * crossfading into the next as the visitor scrolls. It starts off: browsers
 * only let a page make sound after the visitor asks, and a sudden noise
 * startles (WCAG 1.4.2). Off, the audio context is suspended.
 */
export const Soundscape = ({ heroId, planetId }: SoundscapeProps) => {
  const [state, setState] = useState<State>('off')
  const player = useRef<Player | null>(null)
  const suspend = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      window.clearTimeout(suspend.current)
      const current = player.current
      if (!current) return
      Object.values(current.layers).forEach(layer => layer.play(false))
      void current.context.close()
    },
    []
  )

  useEffect(() => {
    const current = player.current
    if (state !== 'on' || !current) return
    const update = () => {
      const mix = mixAt(heroId, planetId)
      const now = current.context.currentTime
      for (const name of Object.keys(VOLUME) as (keyof Layers)[]) {
        const { output, play } = current.layers[name]
        output.gain.setTargetAtTime(
          mix[name] * VOLUME[name],
          now,
          SCROLL_FOLLOW_SECONDS
        )
        play(mix[name] > 0)
      }
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [state, heroId, planetId])

  const turnOn = async () => {
    try {
      const current = (player.current ??= createPlayer())
      window.clearTimeout(suspend.current)
      await current.context.resume()
      fadeTo(current, 1)
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
      Object.values(current.layers).forEach(layer => layer.play(false))
      void current.context.suspend()
    }, FADE_SECONDS * 1000)
  }

  const on = state === 'on'
  const label =
    state === 'unavailable' ? 'Som ambiente indisponível' : 'Som ambiente'

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
