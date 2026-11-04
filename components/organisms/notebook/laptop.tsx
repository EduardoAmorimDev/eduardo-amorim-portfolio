'use client'
import { Html, useGLTF } from '@react-three/drei'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState, type RefObject } from 'react'
import { MathUtils, Mesh, Vector3, type Group, type Object3D } from 'three'
import { useStaticPage } from '@/lib/use-static-page'
import { ScaledPage } from './scaled-page'
import {
  fitIn,
  laptopFloatAt,
  isShown,
  renderScale,
  ZOOM_SETTLE,
  stageViewport,
  type Frame
} from './stages'

// why: the model comes from canvas-lab (assets/laptop.glb) and is built in
// metres; these names are its contract with the animation below.
const MODEL_URL = '/models/laptop.glb'
const NODES = { base: 'Base', lidPivot: 'LidPivot', screen: 'Screen' }
// why: the model is ~0.3 m wide; scaling it to ~3 units keeps the lights,
// camera and floor in friendly numbers.
const MODEL_SCALE = 10
// why: the room the laptop needs in its widest pose (crooked and half open,
// plus the bobbing), with a margin; it shrinks when the view is smaller.
export const LAPTOP_FRAME: Frame = { width: 4.2, height: 3.4 }

// why: the visible display of the model, in metres; same values as
// SCREEN_SIZE in canvas-lab/src/models/laptop-nodes.js.
const SCREEN_SIZE = { width: 0.287, height: 0.197 }
// why: the glass in the page's CSS px; the height follows its aspect ratio.
const PAGE_WIDTH = 1280
const PAGE_HEIGHT = Math.round(
  (PAGE_WIDTH * SCREEN_SIZE.height) / SCREEN_SIZE.width
)
// why: the page is drawn slightly larger than the glass so no dark edge of
// the Screen mesh shows around it.
const SCREEN_BLEED = 1.0375
// invariant: with `transform`, drei maps 1 CSS px to distanceFactor / 400
// units, so this makes the PAGE_WIDTH-px page as wide as the screen × bleed.
const DISTANCE_FACTOR = (SCREEN_SIZE.width / PAGE_WIDTH) * 400 * SCREEN_BLEED
// why: the Screen mesh faces its local -y; lifting the page a hair off the
// glass towards the viewer keeps the two from flickering (z-fighting).
const SCREEN_GAP = 0.00001
// why: seen from the camera's raised viewpoint, the lid's top edge shows its
// thickness and the hinge hides the bottom bezel, so the page sits 1 mm
// (~2-3 px on screen) towards the hinge to look centred. Larger = lower.
const PAGE_DROP = 0.001
// why: in the page's own CSS px; the page is shown at ~0.35× on a 1440 px
// wide window, so 10 px reads as ~3-4 px on screen.
const PAGE_RADIUS = 10
// invariant: with `transform`, one CSS px of the page is this many units in
// the lid's own space.
const UNITS_PER_PX = DISTANCE_FACTOR / 400

// why: the "crooked" pose it starts in, still facing the viewer; every angle
// eases to 0 so it ends square to the camera.
const START_POSE = {
  x: MathUtils.degToRad(30),
  y: MathUtils.degToRad(-30),
  z: MathUtils.degToRad(10)
}
// invariant: on LidPivot 0 is closed and negative opens; a little past
// upright makes up for the camera's elevation, so the screen faces the viewer.
const LID_OPEN = MathUtils.degToRad(-99)
// why: canvas-lab builds the base 15.5 mm tall, from y = 0, with the lid's
// hinge 0.6 mm above its top (laptop-model.js); `thinning` squashes the base
// to 70% (~11 mm) and the hinge comes down with it so the lid still rests on it.
const BASE = { height: 0.0155, hingeGap: 0.0006, thinning: 0.7 }

// why: overlapping scroll windows make the laptop open while it straightens,
// instead of one motion waiting for the other to finish.
const STRAIGHTEN = [0, 0.75] as const
const OPEN = [0.1, 0.85] as const
const POWER_ON = [0.6, 0.95] as const

// hazard: <Html> places the page in its own useFrame (priority 0), reading
// the lid's transform at that moment. Running first (-1) gives it this
// frame's pose; otherwise the page trails the lid by a frame while moving.
const BEFORE_HTML = -1

// hazard: a model without these nodes cannot animate; fail loudly instead of
// rendering a laptop that silently never opens.
const findParts = (root: Object3D) => {
  const base = root.getObjectByName(NODES.base)
  const lid = root.getObjectByName(NODES.lidPivot)
  const screen = root.getObjectByName(NODES.screen)
  if (!base || !lid || !(screen instanceof Mesh)) {
    throw new Error(`${MODEL_URL} is missing Base, LidPivot or Screen.`)
  }
  return { base, lid, screen }
}

/**
 * Where the page on the laptop's glass sits in the world, for a camera to
 * dive into it: the centre of the viewport-sized part of the page (its top,
 * where the page is taller than the window), the way it faces, its up, and
 * that part's height.
 */
export type ScreenView = {
  centre: Vector3
  normal: Vector3
  up: Vector3
  pageHeight: number
}

type LaptopProps = {
  /** The laptop's own progress (0..1), already damped by the carousel. */
  progress: RefObject<number>
  /** Page shown live on the laptop's screen; without one it stays black. */
  screenUrl?: string
  /** Whether the copy sits beside the stage, which leaves it half the width. */
  side: boolean
  /** Filled every frame with where the page sits, once the model has loaded. */
  viewRef: RefObject<ScreenView | null>
  /** How far the camera has dived into the screen (0..1). */
  dive: RefObject<number>
}

export const Laptop = ({
  progress,
  screenUrl,
  side,
  viewRef,
  dive
}: LaptopProps) => {
  const { scene } = useGLTF(MODEL_URL, false)
  const body = useRef<Group>(null)
  const page = useRef<HTMLIFrameElement>(null)

  // why: read-only here (portal target and screen position); the lid is
  // animated through `parts` below, because a hook's value cannot be mutated.
  const anchor = useMemo(() => findParts(scene), [scene])
  const parts = useRef<ReturnType<typeof findParts>>(null)
  // why: the selector re-renders only on resize, never per frame.
  const size = useThree(state => state.size)
  const fit = fitIn(stageViewport(size), LAPTOP_FRAME, side)
  // why: the page is laid out at the window's width, so it is the very
  // layout of the real section below. A window wider than the glass gets a
  // taller page that covers it, top-aligned, with no black bands (task
  // swallow-and-copy, 11); a narrower one keeps the whole window-sized page
  // in view, pillarboxed, as the dive must end on exactly that page.
  const covers = size.width / size.height >= PAGE_WIDTH / PAGE_HEIGHT
  const pageScale = covers ? PAGE_WIDTH / size.width : PAGE_HEIGHT / size.height
  const frameHeight = covers ? PAGE_HEIGHT / pageScale : size.height
  // why: how far the window-sized top of the page sits above the glass's
  // centre, in the page's px, for the dive to end on it.
  const windowLift = covers ? (PAGE_HEIGHT - size.height * pageScale) / 2 : 0
  // why: the page is drawn at about its size on screen (renderScale), which
  // reaches 1 as the camera ends its dive, for the hand-off to the page.
  const [zoom, setZoom] = useState(1)
  const html = useStaticPage(screenUrl)
  const backing = useRef<HTMLDivElement>(null)
  const pending = useRef({ zoom: 1, since: 0 })
  const shown = useRef(true)
  const pagePosition = useMemo(() => {
    const { x, y, z } = anchor.screen.position
    return new Vector3(x, y - SCREEN_GAP, z - PAGE_DROP)
  }, [anchor])

  useFrame(({ camera, clock }) => {
    if (!body.current) return
    // why: looked up once, on the first frame, and kept in a ref: refs are
    // React's place for mutable values, so animating the model through them
    // is allowed (mutating a hook's return value is not).
    parts.current ??= findParts(body.current)
    // invariant: absolute values, not `*=`, so re-running (every frame, a
    // remount, the cached model) never thins the base twice.
    parts.current.base.scale.y = BASE.thinning
    parts.current.lid.position.y = BASE.height * BASE.thinning + BASE.hingeGap
    const p = progress.current

    // why: smoothstep maps p inside the window to 0..1 with an ease-in-out
    // curve, and clamps outside it, so each motion starts and stops softly.
    const straighten = MathUtils.smoothstep(p, ...STRAIGHTEN)
    const open = MathUtils.smoothstep(p, ...OPEN)
    const power = MathUtils.smoothstep(p, ...POWER_ON)

    body.current.rotation.set(
      MathUtils.lerp(START_POSE.x, 0, straighten),
      MathUtils.lerp(START_POSE.y, 0, straighten),
      MathUtils.lerp(START_POSE.z, 0, straighten)
    )
    // why: bobbing here, not with drei's <Float>, so it runs before <Html>
    // reads the lid's pose this frame.
    body.current.position.y = laptopFloatAt(clock.elapsedTime, dive.current)
    parts.current.lid.rotation.x = LID_OPEN * open
    // why: fading the page in over the black backing reads as the screen
    // turning on.
    if (page.current) page.current.style.opacity = String(power)

    const { lid } = parts.current
    lid.updateWorldMatrix(true, false)
    const centre = lid.localToWorld(pagePosition.clone())
    // invariant: the page faces the lid's local -y with its top towards +z
    // (the +90° on X below); transformDirection also normalises.
    const normal = new Vector3(0, -1, 0).transformDirection(lid.matrixWorld)
    const up = new Vector3(0, 0, 1).transformDirection(lid.matrixWorld)
    const lidScale = lid.getWorldScale(new Vector3()).x
    centre.addScaledVector(up, windowLift * UNITS_PER_PX * lidScale)
    viewRef.current = {
      centre,
      normal,
      up,
      pageHeight: size.height * pageScale * UNITS_PER_PX * lidScale
    }
    // why: off stage the page is display:none, so the browser stops drawing
    // it; it stays loaded, and shows at once when the laptop comes in.
    const onStage = isShown(body.current)
    if (backing.current && onStage !== shown.current) {
      backing.current.style.display = onStage ? '' : 'none'
      shown.current = onStage
    }
    if (onStage) {
      const next = renderScale(
        UNITS_PER_PX * lidScale,
        camera.position.distanceTo(centre),
        size.height
      )
      const now = clock.elapsedTime
      if (next !== pending.current.zoom)
        pending.current = { zoom: next, since: now }
      else if (next !== zoom && now - pending.current.since >= ZOOM_SETTLE)
        setZoom(next)
    }
  }, BEFORE_HTML)

  return (
    // why: the model's origin is the bottom centre of its base; lowering it
    // inside the group puts the group's pivot, the point the straightening
    // rotates around, near the middle of the open laptop.
    <group ref={body} scale={fit}>
      <primitive object={scene} scale={MODEL_SCALE} position={[0, -0.6, 0]} />

      {/* why: createPortal mounts the page inside the model's LidPivot, so it
          inherits the lid's rotation and opens with it, like a real screen. */}
      {createPortal(
        // why: <Html transform> places real DOM in 3D with CSS matrices.
        // occlude="blending" hides it per pixel behind the 3D geometry (the
        // closed lid), instead of all-or-nothing. +90° on X turns the page,
        // which faces +z, to face the screen's -y.
        // hazard: once the sticky parent stops sticking, Chrome paints this
        // CSS-3D page ~55 px off its own layout box; a compositing layer of
        // its own (will-change) keeps the paint on the laptop.
        <Html
          transform
          wrapperClass="will-change-transform"
          occlude="blending"
          // invariant: dividing by the zoom keeps the zoomed page as wide as
          // the glass; the hole is sized from the page, not measured.
          distanceFactor={DISTANCE_FACTOR / zoom}
          geometry={
            <planeGeometry
              args={[PAGE_WIDTH * UNITS_PER_PX, PAGE_HEIGHT * UNITS_PER_PX]}
            />
          }
          position={pagePosition}
          rotation-x={Math.PI / 2}
          pointerEvents="none"
        >
          <ScaledPage
            ref={backing}
            width={PAGE_WIDTH}
            height={PAGE_HEIGHT}
            scale={zoom}
            radius={PAGE_RADIUS}
            className="bg-ink overflow-hidden"
          >
            {/* why: rounding the black backing keeps the glass's corners;
                the page itself stays square, like the real one it becomes. */}
            {/* why: pointer-events none and tabIndex -1 keep the page a
                picture: the wheel scrolls the portfolio (driving the
                animation) instead of the embedded site, and focus skips it.
                scrolling="no" hides the embedded page's scrollbar. */}
            {screenUrl && html && (
              <iframe
                ref={page}
                // invariant: srcdoc wins over src, which only names the page
                // this is a script-free copy of (use-static-page.ts).
                srcDoc={html}
                src={screenUrl}
                title="Preview of the projects section on a laptop"
                width={size.width}
                height={frameHeight}
                tabIndex={-1}
                aria-hidden
                // why: a picture of the section, never a page that runs.
                sandbox="allow-same-origin"
                scrolling="no"
                className="pointer-events-none absolute border-0 opacity-0"
                style={{
                  left: (PAGE_WIDTH - size.width) / 2,
                  top: (PAGE_HEIGHT - frameHeight) / 2,
                  transform: `scale(${pageScale})`
                }}
              />
            )}
          </ScaledPage>
        </Html>,
        anchor.lid
      )}
    </group>
  )
}

useGLTF.preload(MODEL_URL, false)
