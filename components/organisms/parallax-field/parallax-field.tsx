'use client'
import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type ReactNode
} from 'react'
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
import { SKY_FADE, type SkyFade } from '@/lib/sky-fade'

import {
  MILKY_WAY,
  dustMotes,
  farStars,
  nearStars,
  type StarTint
} from './night-sky'

// invariant: a far star's own brightness is its colour's alpha
// (--star-peak), so the twinkle's opacity can stay a compositor animation.
const TINT: Record<StarTint, string> = {
  mist: 'bg-[rgb(from_var(--color-mist)_r_g_b/var(--star-peak))]',
  snow: 'bg-[rgb(from_var(--color-snow)_r_g_b/var(--star-peak))]',
  dawn: 'bg-[rgb(from_var(--color-dawn)_r_g_b/var(--star-peak))]',
  sky: 'bg-[rgb(from_var(--color-sky)_r_g_b/var(--star-peak))]'
}

// why: the page between the black hole and the Earth is a night sky (task
// earth-and-sky): stars scattered as by chance, mostly faint, a few bright,
// in their own tints, crowding along a faint Milky Way; brighter stars
// nearer, and blurred dust rushing past the edges in front.
const FAR = farStars()
const NEAR = nearStars()
const DUST = dustMotes()

// invariant: the band's glow is drawn in the layer's own percent space
// (the SVG stretches to it), so it lies over the stars that crowd into it.
const run = MILKY_WAY.end - MILKY_WAY.start
const across = Math.hypot(100, run)
// why: the glow fades out over 3.5 band halves either side, so the band
// reads as a broad haze rather than a beam.
const reach = (3.5 * MILKY_WAY.half * 100) / across
const centre = { x: 50, y: (MILKY_WAY.start + MILKY_WAY.end) / 2 }
const normal = { x: -run / across, y: 100 / across }
const bandEnds = {
  x1: centre.x - normal.x * reach,
  y1: centre.y - normal.y * reach,
  x2: centre.x + normal.x * reach,
  y2: centre.y + normal.y * reach
}

type FarStar = ReturnType<typeof farStars>[number]

// why: --star-peak is the star's own brightness, the alpha of its colour;
// the twinkle dims it to a quarter and back (app/globals.css).
const starStyle = ({
  top,
  left,
  size,
  peak,
  period,
  phase
}: Omit<FarStar, 'tint'>) => {
  const style: CSSProperties & { '--star-peak': number } = {
    top: `${top}%`,
    left: `${left}%`,
    width: size,
    height: size,
    '--star-peak': peak,
    animationDuration: `${period}s`,
    animationDelay: `-${phase}s`
  }
  return style
}

// why: a broad glow along the band, broken into clouds by fractal noise,
// as the Milky Way looks by eye; ids are per instance, as each decorated
// block draws its own.
const MilkyWay = () => {
  const id = useId()
  const glow = `${id}-glow`
  const clouds = `${id}-clouds`
  const mottle = `${id}-mottle`
  return (
    <svg
      data-milky-way
      data-band-start={MILKY_WAY.start}
      data-band-end={MILKY_WAY.end}
      data-band-half={MILKY_WAY.half}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full opacity-[0.12]"
    >
      <defs>
        <linearGradient id={glow} gradientUnits="userSpaceOnUse" {...bandEnds}>
          <stop
            offset="0"
            style={{ stopColor: 'var(--color-sky)', stopOpacity: 0 }}
          />
          <stop
            offset="0.25"
            style={{ stopColor: 'var(--color-sky)', stopOpacity: 0.2 }}
          />
          <stop
            offset="0.42"
            style={{ stopColor: 'var(--color-mist)', stopOpacity: 0.7 }}
          />
          <stop
            offset="0.5"
            style={{ stopColor: 'var(--color-mist)', stopOpacity: 1 }}
          />
          <stop
            offset="0.58"
            style={{ stopColor: 'var(--color-mist)', stopOpacity: 0.7 }}
          />
          <stop
            offset="0.75"
            style={{ stopColor: 'var(--color-sky)', stopOpacity: 0.2 }}
          />
          <stop
            offset="1"
            style={{ stopColor: 'var(--color-sky)', stopOpacity: 0 }}
          />
        </linearGradient>
        <filter id={clouds} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.09 0.06"
            numOctaves="4"
            seed="11"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.8 0 0 0 -0.35"
          />
        </filter>
        <mask id={mottle}>
          <rect width="100" height="100" filter={`url(#${clouds})`} />
        </mask>
      </defs>
      <rect
        width="100"
        height="100"
        fill={`url(#${glow})`}
        mask={`url(#${mottle})`}
      />
    </svg>
  )
}

const CONTENT: Record<ParallaxLayer, ReactNode> = {
  back: (
    <>
      <MilkyWay />
      {FAR.map(({ top, left, size, peak, tint, period, phase }, index) => (
        <span
          key={index}
          data-star="far"
          // why: only the brighter stars visibly twinkle, as in a real sky;
          // every twinkle is a layer of its own, so the faint ones hold still.
          data-twinkle={size > 1 ? '' : undefined}
          style={starStyle({ top, left, size, peak, period, phase })}
          className={`${TINT[tint]} ${size > 1 ? 'motion-safe:animate-twinkle' : ''} absolute rounded-full`}
        />
      ))}
    </>
  ),
  mid: NEAR.map(({ top, left, size }, index) => (
    <span
      key={index}
      data-star="near"
      style={{
        top: `${top}%`,
        left: `${left}%`,
        width: size,
        height: size
      }}
      className="bg-mist absolute rounded-full shadow-[0_0_8px_2px_rgb(from_var(--color-primary)_r_g_b/45%)]"
    />
  )),
  front: DUST.map(({ top, left, size }, index) => (
    <span
      key={index}
      data-dust
      style={{
        top: `${top}%`,
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

type ParallaxFieldProps = {
  /** Fades every layer at the container's edges (lib/sky-fade.ts). */
  fade?: SkyFade
}

/**
 * Decorative layers that drift at their own speed as the page scrolls
 * (lib/parallax.ts) and hold still under reduced motion. Must sit inside a
 * container that creates a stacking context (`relative isolate`).
 */
export const ParallaxField = ({ fade }: ParallaxFieldProps) => {
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
      {PARALLAX_LAYERS.map(name => {
        const layer = (
          <div
            key={name}
            data-parallax-layer={name}
            className={`absolute inset-x-0 top-0 will-change-transform ${DEPTH[name]}`}
            style={{ height: layerHeight(PARALLAX_SPEED[name]) }}
          >
            {CONTENT[name]}
          </div>
        )
        // why: the mask is drawn in the block's own box, not the drifting
        // layer's; its box takes the layer's depth, as a mask makes it a
        // stacking context of its own.
        return fade ? (
          <div
            key={name}
            className={`absolute inset-0 overflow-clip ${DEPTH[name]} ${SKY_FADE[fade]}`}
          >
            {layer}
          </div>
        ) : (
          layer
        )
      })}
    </div>
  )
}
