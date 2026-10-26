'use client'
import { Html, useGLTF } from '@react-three/drei'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { MathUtils, Mesh, type Group, type Object3D } from 'three'

// why: the model comes from canvas-lab (assets/laptop.glb) and is built in
// metres; these names are its contract with the animation below.
const MODEL_URL = '/models/laptop.glb'
const NODES = { base: 'Base', lidPivot: 'LidPivot', screen: 'Screen' }
// why: the model is ~0.3 m wide; scaling it to ~3 units keeps the lights,
// camera and floor in friendly numbers.
const MODEL_SCALE = 10
// why: the room the laptop needs in its widest pose (crooked and half open,
// plus the Float bobbing), with a margin; it shrinks when the view is smaller.
const FRAME = { width: 4.2, height: 3.4 }

// why: the visible display of the model, in metres; same values as
// SCREEN_SIZE in canvas-lab/src/models/laptop-nodes.js.
const SCREEN_SIZE = { width: 0.287, height: 0.197 }
// why: the site renders at a desktop width, so it shows its desktop layout;
// the height follows the screen's aspect ratio.
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

// why: higher values follow the scroll more tightly; lower values glide,
// which hides the discrete steps of a mouse wheel.
const SMOOTHING = 4
// why: replaces drei's <Float> (same motion: ±0.06 units, ~12.6 s per cycle)
// so the bobbing runs in this frame callback, before <Html> reads it.
const FLOAT = { height: 0.06, speed: 0.5 }
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

type LaptopProps = {
  progress: RefObject<number>
  /** Page shown live on the laptop's screen; without one it stays black. */
  screenUrl?: string
}

export const Laptop = ({ progress, screenUrl }: LaptopProps) => {
  const { scene } = useGLTF(MODEL_URL, false)
  const body = useRef<Group>(null)
  const page = useRef<HTMLIFrameElement>(null)
  const smoothed = useRef(0)

  // why: read-only here (portal target and screen position); the lid is
  // animated through `parts` below, because a hook's value cannot be mutated.
  const anchor = useMemo(() => findParts(scene), [scene])
  const parts = useRef<ReturnType<typeof findParts>>(null)
  // why: viewport is how many scene units fit on screen at the camera's
  // target; the selector re-renders only on resize, never per frame.
  const viewport = useThree(state => state.viewport)
  // invariant: never above 1, so large screens keep the original size; the
  // smaller ratio wins, covering portrait phones and short landscape screens.
  const fit = Math.min(
    1,
    viewport.width / FRAME.width,
    viewport.height / FRAME.height
  )

  useFrame(({ clock }, delta) => {
    if (!body.current) return
    // why: looked up once, on the first frame, and kept in a ref: refs are
    // React's place for mutable values, so animating the model through them
    // is allowed (mutating a hook's return value is not).
    parts.current ??= findParts(body.current)
    // invariant: absolute values, not `*=`, so re-running (every frame, a
    // remount, the cached model) never thins the base twice.
    parts.current.base.scale.y = BASE.thinning
    parts.current.lid.position.y = BASE.height * BASE.thinning + BASE.hingeGap
    // why: damping the progress once, and deriving every motion from it, keeps
    // all the moving parts in step with each other.
    smoothed.current = MathUtils.damp(
      smoothed.current,
      progress.current,
      SMOOTHING,
      delta
    )
    const p = smoothed.current

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
    body.current.position.y =
      Math.sin(clock.elapsedTime * FLOAT.speed) * FLOAT.height
    parts.current.lid.rotation.x = LID_OPEN * open
    // why: fading the page in over the black backing reads as the screen
    // turning on.
    if (page.current) page.current.style.opacity = String(power)
  }, BEFORE_HTML)

  const { x, y, z } = anchor.screen.position

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
        <Html
          transform
          occlude="blending"
          distanceFactor={DISTANCE_FACTOR}
          position={[x, y - SCREEN_GAP, z - PAGE_DROP]}
          rotation-x={Math.PI / 2}
          pointerEvents="none"
        >
          <div
            className="bg-ink"
            style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
          >
            {/* why: pointer-events none and tabIndex -1 keep the page a
                picture: the wheel scrolls the portfolio (driving the
                animation) instead of the embedded site, and focus skips it.
                scrolling="no" hides the embedded page's scrollbar, which a
                cross-origin site cannot be styled to hide. */}
            {screenUrl && (
              <iframe
                ref={page}
                src={screenUrl}
                title="Preview of the Kune landing page"
                width={PAGE_WIDTH}
                height={PAGE_HEIGHT}
                tabIndex={-1}
                aria-hidden
                sandbox="allow-scripts allow-same-origin"
                scrolling="no"
                className="pointer-events-none border-0 opacity-0"
                // why: rounding the page, not its black backing, keeps the
                // corners black like the glass instead of see-through.
                style={{ borderRadius: PAGE_RADIUS }}
              />
            )}
          </div>
        </Html>,
        anchor.lid
      )}
    </group>
  )
}

useGLTF.preload(MODEL_URL, false)
