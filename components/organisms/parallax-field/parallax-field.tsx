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

const BAR_COLORS = ['bg-primary', 'bg-steel', 'bg-mist'] as const

// why: each group reads as a few lines of code: indent and length vary per
// line, in % of the group so every bar stays inside its edge band.
const CODE_LINES = [
  { indent: 0, width: 70 },
  { indent: 18, width: 60 },
  { indent: 18, width: 82 },
  { indent: 36, width: 44 },
  { indent: 0, width: 52 }
]

const Octahedron = () => (
  <svg
    viewBox="0 0 100 120"
    data-shape="octahedron"
    className="motion-safe:animate-float w-20 drop-shadow-[0_0_24px_var(--color-primary)] lg:w-28"
  >
    <polygon points="50,4 92,60 50,72" className="fill-primary" />
    <polygon points="50,4 8,60 50,72" className="fill-primary/70" />
    <polygon points="8,60 50,72 50,116" className="fill-steel" />
    <polygon points="92,60 50,72 50,116" className="fill-steel/70" />
  </svg>
)

const RoundedCube = () => (
  <svg
    viewBox="0 0 100 100"
    data-shape="rounded-cube"
    className="motion-safe:animate-float w-16 [stroke-width:10] drop-shadow-[0_0_20px_var(--color-steel)] [stroke-linejoin:round] lg:w-24"
  >
    <polygon
      points="50,12 86,30 50,48 14,30"
      className="fill-mist/80 stroke-mist/80"
    />
    <polygon
      points="14,30 50,48 50,88 14,70"
      className="fill-steel stroke-steel"
    />
    <polygon
      points="86,30 50,48 50,88 86,70"
      className="fill-primary stroke-primary"
    />
  </svg>
)

// why: a fixed low-discrepancy draw per index, so every dot gets its own
// twinkle period (3 to 8 s) and phase, the same on the server and the client.
const draw = (index: number, step: number) => (index * step) % 1

const BACK = spread(28).map((top, index) => {
  const period = 3 + 5 * draw(index, 0.618034)
  return {
    top,
    left: (index * 37 + 11) % 96,
    ring: index % 7 === 3,
    period,
    phase: period * draw(index, 0.414214)
  }
})

const MID = spread(8).map((top, index) => ({
  top,
  left: index % 2 === 0 ? 1 + (index % 3) : 90 + (index % 3) * 0.5,
  octahedron: index % 2 === 0
}))

const FRONT = spread(12).map((top, index) => ({
  top,
  side: index % 2 === 0 ? 'left-[2%]' : 'right-[2%]'
}))

const CONTENT: Record<ParallaxLayer, ReactNode> = {
  back: BACK.map(({ top, left, ring, period, phase }) =>
    ring ? (
      <span
        key={`${top}`}
        data-ring
        style={{ top: `${top * 100}%`, left: `${left}%` }}
        className="border-steel/30 motion-safe:animate-ring-pulse absolute size-40 rounded-full border"
      />
    ) : (
      <span
        key={`${top}`}
        data-dot
        style={{
          top: `${top * 100}%`,
          left: `${left}%`,
          animationDuration: `${period.toFixed(2)}s`,
          animationDelay: `-${phase.toFixed(2)}s`
        }}
        className="bg-steel/60 motion-safe:animate-twinkle absolute size-1.5 rounded-full"
      />
    )
  ),
  mid: MID.map(({ top, left, octahedron }) => (
    <div
      key={`${top}`}
      data-mid-shape
      className="motion-safe:animate-sway absolute"
      style={{ top: `${top * 100}%`, left: `${left}%` }}
    >
      {octahedron ? <Octahedron /> : <RoundedCube />}
    </div>
  )),
  front: FRONT.map(({ top, side }, group) => (
    <div
      key={`${top}`}
      data-code-bars
      className={`absolute w-[11%] space-y-3 opacity-70 blur-[10px] ${side}`}
      style={{ top: `${top * 100}%` }}
    >
      {CODE_LINES.map(({ indent, width }, line) => (
        <span
          key={line}
          data-code-bar
          className={`block h-3 rounded-full ${BAR_COLORS[(group + line) % BAR_COLORS.length]}`}
          style={{ marginLeft: `${indent}%`, width: `${width}%` }}
        />
      ))}
    </div>
  ))
}

// why: back and mid sit behind the sections, the blurred front bars over
// them; all three are decoration only.
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
