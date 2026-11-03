'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import {
  PARALLAX_LAYERS,
  PARALLAX_SPEED,
  layerHeight,
  layerShift,
  type ParallaxLayer
} from '@/lib/parallax'
import {
  onReducedMotionChange,
  prefersReducedMotion
} from '@/lib/media-preferences'

// why: fractions of the layer's height; enough items to keep each layer
// populated over all eight sections at its own speed.
const spread = (count: number) =>
  Array.from({ length: count }, (_, index) => (index + 0.5) / count)

// why: a fixed low-discrepancy draw per index, so every star gets its own
// place, size, twinkle period and phase, the same on the server and client.
const draw = (index: number, step: number) => (index * step) % 1

// why: the page between the black hole and the Earth is a trip through
// space (task hero-gargantua): fine stars far back, brighter ones nearer,
// and blurred dust rushing past the edges in front.
const BACK = spread(90).map((top, index) => {
  const period = 3 + 5 * draw(index, 0.618034)
  return {
    top,
    left: 100 * draw(index, 0.7548777),
    size: 1 + Math.round(draw(index, 0.5698403)),
    opacity: 0.25 + 0.5 * draw(index, 0.3247179),
    period,
    phase: period * draw(index, 0.414214)
  }
})

const MID = spread(18).map((top, index) => ({
  top,
  left: 100 * draw(index, 0.4142135),
  size: 2 + Math.round(draw(index, 0.2360679))
}))

const FRONT = spread(10).map((top, index) => ({
  top,
  left:
    index % 2 === 0 ? 2 + 6 * draw(index, 0.618) : 88 + 8 * draw(index, 0.31),
  size: 6 + Math.round(10 * draw(index, 0.7071067))
}))

const CONTENT: Record<ParallaxLayer, ReactNode> = {
  back: BACK.map(({ top, left, size, opacity, period, phase }) => (
    <span
      key={`${top}`}
      data-star="far"
      style={{
        top: `${top * 100}%`,
        left: `${left}%`,
        width: size,
        height: size,
        opacity,
        animationDuration: `${period.toFixed(2)}s`,
        animationDelay: `-${phase.toFixed(2)}s`
      }}
      className="bg-mist motion-safe:animate-twinkle absolute rounded-full"
    />
  )),
  mid: MID.map(({ top, left, size }) => (
    <span
      key={`${top}`}
      data-star="near"
      style={{
        top: `${top * 100}%`,
        left: `${left}%`,
        width: size,
        height: size
      }}
      className="bg-mist absolute rounded-full shadow-[0_0_8px_2px_rgb(from_var(--color-primary)_r_g_b/45%)]"
    />
  )),
  front: FRONT.map(({ top, left, size }) => (
    <span
      key={`${top}`}
      data-dust
      style={{
        top: `${top * 100}%`,
        left: `${left}%`,
        width: size,
        height: size
      }}
      className="bg-mist/20 absolute rounded-full blur-[6px]"
    />
  ))
}

// why: back and mid sit behind the sections, the blurred dust over them;
// all three are decoration only.
const DEPTH: Record<ParallaxLayer, string> = {
  back: '-z-10',
  mid: '-z-10',
  front: 'z-10'
}

/**
 * Decorative layers that drift at their own speed as the page scrolls
 * (lib/parallax.ts) and hold still under reduced motion. Must sit inside a
 * container that creates a stacking context (`relative isolate`).
 */
export const ParallaxField = () => {
  const field = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = field.current
    if (!container) return
    const layers = PARALLAX_LAYERS.flatMap(name => {
      const element = container.querySelector<HTMLElement>(
        `[data-parallax-layer="${name}"]`
      )
      return element ? [{ element, speed: PARALLAX_SPEED[name] }] : []
    })

    // why: transforms are written straight to the DOM on every scroll event
    // (Lenis emits one per frame), so scrolling never re-renders React.
    // Under reduced motion every layer scrolls with the content (T29).
    const update = () => {
      const { top } = container.getBoundingClientRect()
      const still = prefersReducedMotion()
      for (const { element, speed } of layers)
        element.style.transform = still
          ? ''
          : `translate3d(0, ${layerShift(speed, top)}px, 0)`
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    const stopMotion = onReducedMotionChange(update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      stopMotion()
    }
  }, [])

  return (
    <div
      ref={field}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-clip"
    >
      {PARALLAX_LAYERS.map(name => (
        <div
          key={name}
          data-parallax-layer={name}
          className={`absolute inset-x-0 top-0 will-change-transform ${DEPTH[name]}`}
          style={{ height: layerHeight(PARALLAX_SPEED[name]) }}
        >
          {CONTENT[name]}
        </div>
      ))}
    </div>
  )
}
