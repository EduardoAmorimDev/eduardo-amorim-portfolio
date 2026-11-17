'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import stills from '@/lib/stills.json'
import type { VisitorPlace } from '@/lib/visitor-place'
import {
  coverPoint,
  pinOnStill,
  stillRadius,
  type StillShot
} from './still-pin'

/** One shape of the globe's still in lib/stills.json. */
type GlobeImage = {
  name: string
  maxAspect: number
  width: number
  height: number
  shot: StillShot
  srcset: { src: string; w: number }[]
}

const IMAGES: readonly GlobeImage[] = stills.globe

// invariant: the box is the section plus the half screen the live canvas
// rises above it (you-are-here.tsx), so the image covers it as the canvas
// did.
const SCREENS = 1.5

const srcSet = ({ srcset }: GlobeImage) =>
  srcset.map(({ src, w }) => `${src} ${w}w`).join(', ')

// invariant: as the hero's (hero-still.tsx): width-bound once the window
// is wider than the box allows, else as wide as the box is tall.
const sizes = (image: GlobeImage) => {
  const shape = image.shot.width / image.shot.height
  const aspect = Math.round(shape * SCREENS * 1000)
  return `(min-aspect-ratio: ${aspect}/1000) 100vw, ${Math.ceil(shape * SCREENS * 100)}vh`
}

const media = (image: GlobeImage) =>
  `(max-aspect-ratio: ${Math.round(image.maxAspect * 1000)}/1000)`

// why: the narrowest first, as a <picture> takes the first source that
// matches; the widest is the <img> itself, for any window left.
const [WIDE, ...NARROW] = [...IMAGES].sort((a, b) => b.maxAspect - a.maxAspect)
const SOURCES = NARROW.reverse()

/** The shape the <picture> shows in a window of this aspect. */
const shapeFor = (aspect: number) =>
  SOURCES.find(image => aspect <= image.maxAspect) ?? WIDE

type Box = { width: number; height: number; aspect: number }

type GlobeStillProps = {
  /** Where to put the pin; null while unknown or when it cannot be found. */
  place: VisitorPlace | null
}

/**
 * The Earth as an image where no WebGL is drawn (task
 * portfolio-lp-device-gate, 8-10): the live globe's still, shot by
 * scripts/render-stills.mjs in STILL_POSE, with the visitor's pin laid
 * over it where the place faces the viewer.
 */
export const GlobeStill = ({ place }: GlobeStillProps) => {
  const root = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<Box | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = root.current
    if (!element) return
    const measure = () =>
      setBox({
        width: element.clientWidth,
        height: element.clientHeight,
        aspect: window.innerWidth / Math.max(window.innerHeight, 1)
      })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const pin = useMemo(() => {
    if (!place || !box) return null
    const image = shapeFor(box.aspect)
    if (!image) return null
    const share = pinOnStill(place.latitude, place.longitude, image.shot)
    if (!share) return null
    const at = coverPoint(share, image.shot, box)
    const scale = Math.max(
      box.width / image.shot.width,
      box.height / image.shot.height
    )
    // why: the live pin's sizes, in globe radii (globe-scene.tsx).
    const radius = stillRadius(image.shot) * image.shot.width * scale
    return { ...at, dot: radius * 0.036, ring: radius * 0.068 }
  }, [place, box])

  return (
    <div
      ref={root}
      aria-hidden="true"
      data-testid="globe-still"
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-[5] [mask-image:linear-gradient(to_bottom,transparent,black_50svh)]"
      style={{ top: '-50svh' }}
    >
      {WIDE && !failed && (
        <picture>
          {SOURCES.map(image => (
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
            srcSet={srcSet(WIDE)}
            sizes={sizes(WIDE)}
            width={WIDE.width}
            height={WIDE.height}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setFailed(true)}
            className="size-full object-cover"
          />
        </picture>
      )}
      {pin && !failed && (
        <div
          data-testid="globe-pin"
          className="absolute"
          style={{ left: pin.x, top: pin.y }}
        >
          <span
            className="bg-mist absolute -translate-1/2 rounded-full"
            style={{ width: pin.dot, height: pin.dot }}
          />
          <span
            data-pin-ring
            className="border-sky motion-safe:animate-pin-pulse absolute -translate-1/2 rounded-full border motion-reduce:scale-[1.77] motion-reduce:opacity-60"
            style={{ width: pin.ring, height: pin.ring }}
          />
        </div>
      )}
    </div>
  )
}
