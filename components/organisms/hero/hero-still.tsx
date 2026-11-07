'use client'
import { useState, type Ref } from 'react'
import { markHeroReady } from '@/lib/hero-ready'
import stills from '@/lib/stills.json'
import { SPILL } from './gargantua'

type HeroImage = (typeof stills.hero)[number]

const srcSet = ({ srcset }: HeroImage) =>
  srcset.map(({ src, w }) => `${src} ${w}w`).join(', ')

// invariant: the box is the hero plus its spill, so a picture covers it
// width-bound once the window is wider than the box allows; height-bound,
// it is drawn as wide as the box is tall times its own shape.
const sizes = (image: HeroImage) => {
  const shape = image.width / image.height
  const screens = 1 + SPILL
  const aspect = Math.round(shape * screens * 1000)
  return `(min-aspect-ratio: ${aspect}/1000) 100vw, ${Math.ceil(shape * screens * 100)}vh`
}

const media = (image: HeroImage) =>
  `(max-aspect-ratio: ${Math.round(image.maxAspect * 1000)}/1000)`

type HeroStillProps = {
  /** Fades the image in over the live scene it replaces. */
  fade: boolean
  /** Called once the image is on screen, or has failed to load. */
  onShown: () => void
  /** The box whose opacity the scroll sets (hero.tsx). */
  ref?: Ref<HTMLDivElement>
}

/**
 * The hero's black hole as an image: the live scene's still frame, rendered
 * by scripts/render-stills.mjs at sizes a dense screen draws without
 * enlarging it (task portfolio-lp-still-scenes, 1-2), one shape for each
 * kind of window.
 */
export const HeroStill = ({ fade, onShown, ref }: HeroStillProps) => {
  const [loaded, setLoaded] = useState(false)
  const [wide, ...narrow] = [...stills.hero].sort(
    (a, b) => b.maxAspect - a.maxAspect
  )
  // why: the narrowest first, as a <picture> takes the first source that
  // matches; the widest is the <img> itself, for any window left.
  const sources = narrow.reverse()

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-testid="hero-still"
      className="pointer-events-none absolute inset-x-0 top-0"
      style={{ height: `${(1 + SPILL) * 100}%` }}
    >
      {wide && (
        <picture>
          {sources.map(image => (
            <source
              key={image.name}
              media={media(image)}
              srcSet={srcSet(image)}
              sizes={sizes(image)}
              width={image.width}
              height={image.height}
            />
          ))}
          <img
            alt=""
            srcSet={srcSet(wide)}
            sizes={sizes(wide)}
            width={wide.width}
            height={wide.height}
            fetchPriority="high"
            decoding="async"
            draggable={false}
            onLoad={event => {
              // why: the veil lifts on the hero's first frame on screen,
              // which here is the image decoded (task 4).
              const ready = () => {
                markHeroReady()
                setLoaded(true)
              }
              event.currentTarget.decode().then(ready, ready)
            }}
            onError={() => {
              markHeroReady()
              onShown()
            }}
            onTransitionEnd={onShown}
            className={`size-full object-cover object-top transition-opacity duration-600 ${fade && !loaded ? 'opacity-0' : 'opacity-100'}`}
          />
        </picture>
      )}
    </div>
  )
}
