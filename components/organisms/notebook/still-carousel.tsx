'use client'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { MathUtils } from 'three'
import stills from '@/lib/stills.json'
import { isLandscape, LAPTOP_FRAME, PHONE_FRAME, TABLET_FRAME } from './devices'
import {
  CAMERA,
  deviceOrder,
  divingFloatAt,
  fitIn,
  isSideLayout,
  offstage,
  stageLift,
  stageViewport,
  type Device,
  type Frame
} from './stages'
import { stillPose, type Shot, type StillPose } from './still-poses'

type StillImage = (typeof stills.devices)['phone']
type Size = { width: number; height: number }

// why: the zoom ends a little past covering the stage with the screen, so
// the glass's rounded corners and rim are out of the window by then.
const OVERSCAN = 1.08
// why: the floor the devices stand on, shot without them, holding still.
const FLOOR = {
  wide: stills.floor.find(floor => floor.name === 'wide'),
  tall: stills.floor.find(floor => floor.name === 'tall')
}
const SHOTS: readonly Shot[] = ['phone', 'tablet', 'tabletLandscape', 'laptop']
const DEVICE_OF: Record<Shot, Device> = {
  phone: 'phone',
  tablet: 'tablet',
  tabletLandscape: 'tablet',
  laptop: 'laptop'
}
const FRAMES: Record<Device, Frame> = {
  phone: PHONE_FRAME,
  tablet: TABLET_FRAME,
  laptop: LAPTOP_FRAME
}
// why: the camera's distance to the stage; as the CSS perspective, in px,
// a device turned in depth foreshortens as it did in 3D.
const CAMERA_DISTANCE = Math.hypot(...CAMERA.position)

type Sources = { srcset: readonly { src: string; w: number }[] }

const srcSet = ({ srcset }: Sources) =>
  srcset.map(({ src, w }) => `${src} ${w}w`).join(', ')

/**
 * A shot's size on stage at rest, in CSS px, where its screen sits, and how
 * much it grows for the zoom to end with that screen covering the stage.
 */
const layoutOf = (shot: Shot, stage: Size) => {
  const image: StillImage = stills.devices[shot]
  const viewport = stageViewport(stage)
  const fit = fitIn(viewport, FRAMES[DEVICE_OF[shot]], isSideLayout(stage))
  const pxPerUnit = stage.height / viewport.height
  const width = image.unitsWide * fit * pxPerUnit
  // why: display px per image px, which turns the screen's box in the
  // image into its box on stage.
  const scale = width / image.width
  const screen = { w: image.screen.w * scale, h: image.screen.h * scale }
  return {
    image,
    width,
    scale,
    zoomEnd:
      Math.max(stage.width / screen.w, stage.height / screen.h, 1) * OVERSCAN,
    // why: the screen's centre from the image's, in px on stage at rest.
    screenOffset: {
      x: (image.screen.x + image.screen.w / 2 - image.width / 2) * scale,
      y: (image.screen.y + image.screen.h / 2 - image.height / 2) * scale
    }
  }
}

/** The CSS transform of a pose, about the stage's centre. */
const transformOf = (pose: StillPose, pxPerUnit: number) =>
  `translate(-50%, -50%) translate3d(${pose.x * pxPerUnit}px, ${-pose.y * pxPerUnit}px, 0) scale(${pose.scale}) rotateY(${pose.rotateY}rad) rotateX(${pose.rotateX}rad) rotateZ(${pose.rotateZ}rad)`

type StillCarouselProps = {
  progress: RefObject<number>
  viewer: Device
  /** Whether the stage is on screen; off it nothing moves. */
  active: boolean
  /** Fades the stage in over the live scene it replaces. */
  fade: boolean
  /** Called once the stage has faded in. */
  onShown: () => void
}

/**
 * The reach's carousel as images (task portfolio-lp-still-scenes, 5-8):
 * the phone, the tablet and the laptop as rendered by scripts/
 * render-stills.mjs, moved by the scroll through the windows the 3D
 * carousel uses, the visitor's own device last; the zoom ends with that
 * device's screen covering the window. Only CSS transforms change per frame.
 */
export const StillCarousel = ({
  progress,
  viewer,
  active,
  fade,
  onShown
}: StillCarouselProps) => {
  const root = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<Size | null>(null)
  const [shown, setShown] = useState(!fade)
  const [failed, setFailed] = useState<readonly Shot[]>([])
  const shots = useRef<Partial<Record<Shot, HTMLImageElement | null>>>({})
  const order = useMemo(() => deviceOrder(viewer), [viewer])

  useEffect(() => {
    const element = root.current
    if (!element) return
    const measure = () =>
      setStage({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    // why: one frame at opacity 0 first, so the fade has a start to run from.
    const frame = requestAnimationFrame(() => setShown(true))
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  const layouts = useMemo(
    () =>
      stage && {
        phone: layoutOf('phone', stage),
        tablet: layoutOf('tablet', stage),
        tabletLandscape: layoutOf('tabletLandscape', stage),
        laptop: layoutOf('laptop', stage)
      },
    [stage]
  )

  // why: the last device's image is drawn as large as its zoom ends, so
  // the browser picks a source sharp enough for it (task 7).
  const lastShot: Shot =
    viewer === 'tablet' && stage && isLandscape(stage)
      ? 'tabletLandscape'
      : viewer

  useEffect(() => {
    if (!active || !stage || !layouts) return
    const viewport = stageViewport(stage)
    const side = isSideLayout(stage)
    const pxPerUnit = stage.height / viewport.height
    const lift = stageLift(viewport, side)
    const landscape = isLandscape(stage)
    let smoothed = progress.current
    let last = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const step = Math.max(now - last, 0) / 1000
      last = now
      smoothed = MathUtils.damp(smoothed, progress.current, 4, step)
      const poses = stillPose({
        progress: smoothed,
        order,
        viewer,
        landscape,
        offstage: device => offstage(viewport, FRAMES[device], side)
      })
      for (const pose of poses) {
        const image = shots.current[pose.shot]
        const layout = layouts[pose.shot]
        if (!image) continue
        image.style.visibility = pose.visible ? 'visible' : 'hidden'
        if (!pose.visible) continue
        const bob = divingFloatAt(now / 1000, pose.dive)
        const placed = { ...pose, y: pose.y + lift + bob }
        if (pose.dive > 0) {
          // why: the camera's dive, as the image growing about its screen
          // until the screen covers the stage, its centre on the stage's.
          const grow = layout.zoomEnd ** pose.dive
          const restX = placed.x * pxPerUnit + layout.screenOffset.x
          const restY = -placed.y * pxPerUnit + layout.screenOffset.y
          const centreX = restX * (1 - pose.dive)
          const centreY = restY * (1 - pose.dive)
          placed.x = (centreX - layout.screenOffset.x * grow) / pxPerUnit
          placed.y = -(centreY - layout.screenOffset.y * grow) / pxPerUnit
          placed.scale = pose.scale * grow
        }
        image.style.transform = transformOf(placed, pxPerUnit)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, stage, layouts, order, viewer, progress])

  const perspective = stage
    ? (stage.height / stageViewport(stage).height) * CAMERA_DISTANCE
    : 1000

  return (
    <div
      ref={root}
      aria-hidden="true"
      data-testid="notebook-still"
      onTransitionEnd={event => {
        if (event.target === event.currentTarget) onShown()
      }}
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-600 ${shown ? 'opacity-100' : 'opacity-0'}`}
      style={{ perspective: `${perspective}px` }}
    >
      {FLOOR.wide && (
        <picture>
          {FLOOR.tall && (
            <source
              media="(orientation: portrait)"
              srcSet={srcSet(FLOOR.tall)}
              sizes="100vw"
            />
          )}
          <img
            alt=""
            srcSet={srcSet(FLOOR.wide)}
            sizes="100vw"
            decoding="async"
            draggable={false}
            className="absolute inset-0 size-full object-cover"
          />
        </picture>
      )}
      {layouts &&
        SHOTS.map(shot => {
          const layout = layouts[shot]
          if (failed.includes(shot)) return null
          const drawn = layout.width * (shot === lastShot ? layout.zoomEnd : 1)
          return (
            <picture key={shot}>
              <img
                ref={element => {
                  shots.current[shot] = element
                }}
                alt=""
                data-shot={shot}
                srcSet={srcSet(layout.image)}
                sizes={`${Math.ceil(drawn)}px`}
                width={layout.image.width}
                height={layout.image.height}
                decoding="async"
                draggable={false}
                onError={() => setFailed(current => [...current, shot])}
                className="absolute top-1/2 left-1/2 max-w-none origin-center will-change-transform"
                style={{
                  width: layout.width,
                  height: 'auto',
                  visibility: 'hidden',
                  zIndex: shot === 'phone' ? 0 : 1
                }}
              />
            </picture>
          )
        })}
    </div>
  )
}
