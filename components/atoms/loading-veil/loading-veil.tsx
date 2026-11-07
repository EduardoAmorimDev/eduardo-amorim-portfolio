'use client'
import { useEffect, useState } from 'react'
import { onHeroReady } from '@/lib/hero-ready'

// why: a slow phone still gets the page within this, the hero drawn or not.
const MAX_WAIT_MS = 6000
// invariant: matches the veil's opacity transition (duration-600 below).
const FADE_MS = 600

type Phase = 'loading' | 'lifting' | 'gone'

const BRACKETS = [
  { path: 'M31 48H48V79H79V95H31Z', drift: 'motion-safe:animate-bracket-left' },
  { path: 'M48 31H95V79H79V48H48Z', drift: 'motion-safe:animate-bracket-right' }
]

/**
 * The first screen while the black hole's scene starts: the ink of the
 * page and the brand's two brackets, breathing apart and back in a halo. It lifts once
 * the hero has drawn its first frame and the fonts are in, or after
 * MAX_WAIT_MS; server-rendered, it covers the page before any script runs.
 */
export const LoadingVeil = () => {
  const [phase, setPhase] = useState<Phase>('loading')

  useEffect(() => {
    let hero = false
    let fonts = false
    const lift = () =>
      setPhase(current => (current === 'loading' ? 'lifting' : current))
    const check = () => {
      if (hero && fonts) lift()
    }
    const stopHero = onHeroReady(() => {
      hero = true
      check()
    })
    document.fonts.ready.then(
      () => {
        fonts = true
        check()
      },
      // why: a font that fails to load must not hold the veil for good.
      () => {
        fonts = true
        check()
      }
    )
    const timeout = window.setTimeout(lift, MAX_WAIT_MS)
    return () => {
      stopHero()
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'lifting') return
    const timeout = window.setTimeout(() => setPhase('gone'), FADE_MS)
    return () => window.clearTimeout(timeout)
  }, [phase])

  if (phase === 'gone') return null

  return (
    <div
      data-loading-veil={phase}
      // why: Lenis would scroll the page behind the veil; it lets this be.
      data-lenis-prevent
      role="status"
      className={`bg-background animate-veil-timeout fixed inset-0 z-70 flex items-center justify-center transition-opacity duration-600 ${phase === 'lifting' ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <span className="sr-only">Carregando</span>
      {/* invariant: the favicon's two brackets (logo.glb's BracketLeft and
          BracketRight), at its own proportions on a 128 grid. Each is its
          own element, moved whole, so the compositor drifts it and its glow
          is painted once, never again on every frame. */}
      <div aria-hidden="true" className="relative size-28">
        <div className="motion-safe:animate-veil-halo absolute -inset-1/2 rounded-full bg-[radial-gradient(circle,rgb(from_var(--color-primary)_r_g_b/40%),transparent_60%)] will-change-[opacity,scale]" />
        {BRACKETS.map(({ path, drift }) => (
          <svg
            key={path}
            viewBox="0 0 128 128"
            className={`text-mist absolute inset-0 size-full drop-shadow-[0_0_8px_rgb(from_var(--color-primary)_r_g_b/70%)] will-change-[translate] ${drift}`}
          >
            <path d={path} fill="currentColor" />
          </svg>
        ))}
      </div>
    </div>
  )
}
