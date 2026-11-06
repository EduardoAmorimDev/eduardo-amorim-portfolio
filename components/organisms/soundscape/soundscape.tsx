'use client'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { entryShare, heroPresence, layerMix } from '@/lib/soundscape'
import { blackHole, planet, rumbleFor, space, type Layer } from './layers'

// why: the user, 2026-11-06: the black hole at 0.05. Space and the planet
// are set to match it as the ear weighs loudness (A-weighted, in Chromium),
// not by raw level, which the rumble's bass would skew.
const VOLUME = { blackHole: 0.05, space: 0.012, planet: 0.019 }
const FADE_SECONDS = 0.6
// why: how fast the mix follows the scroll; short enough to feel tied to
// it, long enough that a flick of the wheel never steps the volume.
const SCROLL_FOLLOW_SECONDS = 0.1

type Layers = Record<keyof typeof VOLUME, Layer>
type Player = {
  context: AudioContext
  master: GainNode
  /** Resolves once the layers are built; `layers` holds them from then on. */
  ready: Promise<Layers>
  layers?: Layers
}
// invariant: 'waiting' is on, held while the browser forbids sound until
// the visitor's first gesture.
type State = 'waiting' | 'on' | 'off' | 'unavailable'
// why: the events a browser counts as the visitor's activation: a mouse's
// press, a touch's release, a key. A scroll is none of them.
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const

// why: the layers' samples cost tens of ms, more on a phone; they are built
// once the browser is idle, after it has answered the visitor's gesture.
const whenIdle = <T,>(build: () => T) =>
  new Promise<T>((resolve, reject) => {
    const run = () => {
      try {
        resolve(build())
      } catch (error) {
        reject(error)
      }
    }
    // hazard: Safari has no requestIdleCallback; a timeout still lets the
    // browser answer the gesture first.
    if (typeof window.requestIdleCallback === 'function')
      window.requestIdleCallback(run, { timeout: 500 })
    else window.setTimeout(run, 0)
  })

const createPlayer = (): Player => {
  const context = new AudioContext()
  const master = context.createGain()
  master.gain.value = 0
  master.connect(context.destination)
  const ready = whenIdle(() => {
    const rumble = rumbleFor(context)
    const layers: Layers = {
      blackHole: blackHole(context, rumble),
      space: space(context, Math.random),
      planet: planet(context, rumble, Math.random)
    }
    Object.values(layers).forEach(({ output }) => output.connect(master))
    return layers
  })
  return { context, master, ready }
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
  /** The section where the Earth plays, at the page's end. */
  planetId: string
}

/**
 * The page's sound, behind a toggle fixed in the corner: the black hole in
 * the hero, a blade of light down the page, the Earth and its cities at the end, each
 * crossfading into the next as the visitor scrolls. It plays on entry
 * (the user, 2026-11-06) where the browser allows it; where it does not,
 * most do for a first visit, at the first click, tap or key. The toggle
 * mutes it, always in reach (WCAG 1.4.2). Off, the context is suspended.
 */
export const Soundscape = ({ heroId, planetId }: SoundscapeProps) => {
  const [state, setState] = useState<State>('waiting')
  const player = useRef<Player | null>(null)
  const suspend = useRef<number | undefined>(undefined)
  const button = useRef<HTMLButtonElement>(null)
  // why: a turn off can land while a turn on still awaits the context; the
  // latest wish wins, so a late resume never fades the sound back in.
  const wanted = useRef(true)

  // hazard: React's dev mode mounts twice; the closed player is dropped and
  // the entry probed again, or the remount would inherit a dead context.
  useEffect(
    () => () => {
      window.clearTimeout(suspend.current)
      const current = player.current
      player.current = null
      if (!current) return
      Object.values(current.layers ?? {}).forEach(layer => layer.play(false))
      void current.context.close()
    },
    []
  )

  useEffect(() => {
    const current = player.current
    const layers = current?.layers
    if (state !== 'on' || !current || !layers) return
    const update = () => {
      const mix = mixAt(heroId, planetId)
      const now = current.context.currentTime
      for (const name of Object.keys(VOLUME) as (keyof Layers)[]) {
        const { output, play } = layers[name]
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
    wanted.current = true
    try {
      const current = (player.current ??= createPlayer())
      window.clearTimeout(suspend.current)
      await current.context.resume()
      current.layers ??= await current.ready
      if (!wanted.current) return
      fadeTo(current, 1)
      setState('on')
    } catch {
      setState('unavailable')
    }
  }

  const turnOff = () => {
    wanted.current = false
    const current = player.current
    setState('off')
    if (!current) return
    fadeTo(current, 0)
    suspend.current = window.setTimeout(() => {
      Object.values(current.layers ?? {}).forEach(layer => layer.play(false))
      void current.context.suspend()
    }, FADE_SECONDS * 1000)
  }

  // invariant: never against the visitor's mute, even when a resume asked
  // for on entry is granted only later.
  const start = useEffectEvent(() => {
    if (wanted.current) void turnOn()
  })

  // why: on entry the sound asks to play; a browser that allows it (its
  // policy, or a visitor who allowed this site) grants it at once, the rest
  // hold or refuse it until a gesture. Without Web Audio the context throws,
  // and the first gesture's turn on reports it as unavailable.
  useEffect(() => {
    try {
      const current = (player.current ??= createPlayer())
      current.context.resume().then(
        () => start(),
        () => undefined
      )
    } catch {
      return
    }
  }, [])

  // why: the first gesture anywhere starts the sound, but the toggle's own,
  // which mutes it instead.
  useEffect(() => {
    if (state !== 'waiting') return
    const onGesture = (event: Event) => {
      if (
        event.target instanceof Node &&
        button.current?.contains(event.target)
      )
        return
      start()
    }
    GESTURES.forEach(gesture =>
      window.addEventListener(gesture, onGesture, {
        capture: true,
        passive: true
      })
    )
    return () =>
      GESTURES.forEach(gesture =>
        window.removeEventListener(gesture, onGesture, { capture: true })
      )
  }, [state])

  const on = state === 'on' || state === 'waiting'
  const label =
    state === 'unavailable' ? 'Som ambiente indisponível' : 'Som ambiente'

  return (
    <button
      ref={button}
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
