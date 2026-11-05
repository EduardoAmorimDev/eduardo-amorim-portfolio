'use client'
import { useFrame, useThree } from '@react-three/fiber'
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject
} from 'react'
import {
  MathUtils,
  Matrix4,
  Quaternion,
  type Group,
  type PerspectiveCamera
} from 'three'
import {
  asViewerDevice,
  handheldFrame,
  isLandscape,
  PHONE,
  TABLET
} from './devices'
import { Handheld } from './handheld'
import { Laptop, LAPTOP_FRAME } from './laptop'
import {
  CAMERA,
  CAMERA_REST,
  deviceOrder,
  divingFloatAt,
  ease,
  fitIn,
  isSideLayout,
  local,
  offstage,
  slotOf,
  SMOOTHING,
  STAGES,
  stageLift,
  stageViewport,
  type Device,
  type Frame,
  type ScreenView
} from './stages'

// why: the room each handheld needs at rest, for its own page, with a
// margin; the tablet's is square and holds its 45° diagonal (~3.44) mid-turn.
const PHONE_FRAME: Frame = { width: 1.6, height: 3 }
const TABLET_FRAME: Frame = { width: 3.6, height: 3.6 }
// why: the phone starts this far behind the stage, edge-on to the viewer,
// and turns a quarter (90°) to face the camera as it comes.
const PHONE_START = { z: -5, spin: -Math.PI / 2 }
// why: like the laptop's crooked start, each handheld arrives leaning
// (radians, on top of the camera tilt and the phone's spin) and straightens
// as it reaches its rest.
const PHONE_LEAN = { x: 0.45, z: 0.3 }
const TABLET_LEAN = { x: 0.4, y: -0.6, z: -0.2 }
// why: the open lid rises well above the laptop's pivot, so at full size
// it would touch the heading; lowering it centres the open laptop instead.
const LAPTOP_DROP = 0.45
// hazard: runs before the devices (-1) and every <Html> (0), so they all read
// this frame's progress and poses instead of the previous frame's.
const BEFORE_DEVICES = -2
// hazard: the dive reads where the last device's screen is this frame, so it
// runs after the devices have posed (-1) and before <Html> (0) reads the camera.
const AFTER_DEVICES = -0.5

const lookAtMatrix = new Matrix4()

/**
 * Compiles every material of the scene, the hidden devices' included, as
 * soon as it mounts. Place it after the last thing to load.
 */
const Precompile = () => {
  const gl = useThree(state => state.gl)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  useEffect(() => {
    // why: three compiles a material's shader the first time its object is
    // drawn, so the tablet and the laptop, hidden until they enter, stalled
    // the carousel mid-motion; compiled here, while the section is still a
    // screen away, they enter without a hitch.
    gl.compileAsync(scene, camera).catch(() => undefined)
  }, [gl, scene, camera])
  return null
}

type DeviceCarouselProps = {
  progress: RefObject<number>
  screenUrl?: string
  /** The visitor's own device, which comes last and is dived into. */
  viewer: Device
}

/**
 * The phone, the tablet and the laptop, swapped across the stage by the
 * scroll, the visitor's own device last; at the end the camera dives into
 * that device's screen until its page fills the window.
 */
export const DeviceCarousel = ({
  progress,
  screenUrl,
  viewer
}: DeviceCarouselProps) => {
  const phone = useRef<Group>(null)
  const tablet = useRef<Group>(null)
  const laptop = useRef<Group>(null)
  // why: damped once here and shared, so the three devices stay in step
  // while two of them cross the stage together.
  const smoothed = useRef(0)
  const laptopProgress = useRef(0)
  const dive = useRef(0)
  const screenView = useRef<ScreenView | null>(null)
  const [landscape, setLandscape] = useState(false)
  const size = useThree(state => state.size)
  const { width, height } = size
  const viewport = stageViewport(size)
  const side = isSideLayout(size)
  const order = useMemo(() => deviceOrder(viewer), [viewer])
  // why: the last device's page is the window, so its body takes the
  // window's proportion and, on a landscape window, lies on its side.
  const lastOnSide = isLandscape(size)
  const phoneSpec = useMemo(
    () =>
      viewer === 'phone' ? asViewerDevice(PHONE, { width, height }) : PHONE,
    [viewer, width, height]
  )
  const tabletSpec = useMemo(
    () =>
      viewer === 'tablet' ? asViewerDevice(TABLET, { width, height }) : TABLET,
    [viewer, width, height]
  )
  const phoneOnSide = viewer === 'phone' && lastOnSide
  const phoneFrame = handheldFrame(PHONE_FRAME, PHONE, phoneSpec, phoneOnSide)
  const tabletFrame = handheldFrame(TABLET_FRAME, TABLET, tabletSpec, false)
  const phoneFit = fitIn(viewport, phoneFrame, side)
  const tabletFit = fitIn(viewport, tabletFrame, side)
  const laptopDrop = -LAPTOP_DROP * fitIn(viewport, LAPTOP_FRAME, side)

  useFrame(({ clock }, delta) => {
    if (!phone.current || !tablet.current || !laptop.current) return
    // hazard: a frame time that ran backwards turned this NaN for good and
    // every device vanished; such a frame holds the pose, and a value that
    // is not a number rejoins the scroll.
    const step = Number.isFinite(delta) && delta > 0 ? delta : 0
    const damped = MathUtils.damp(
      smoothed.current,
      progress.current,
      SMOOTHING,
      step
    )
    smoothed.current = Number.isFinite(damped) ? damped : progress.current
    const p = smoothed.current
    dive.current = ease(p, STAGES.zoom)
    // why: the last device holds still as the camera dives into it.
    const bob = (device: Device) =>
      divingFloatAt(clock.elapsedTime, device === viewer ? dive.current : 0)
    // why: the camera sits above the stage looking down at it; tilting the
    // handhelds back by that angle makes their glass face the viewer.
    const tilt = -Math.atan2(CAMERA.position[1], CAMERA.position[2])

    // why: the phone always comes from behind the stage, facing the viewer
    // as it lands; only the first device is on stage from the start.
    const phoneSlot = slotOf(order, 'phone')
    const phoneIn = ease(p, phoneSlot.in)
    const phoneOut = phoneSlot.out ? ease(p, phoneSlot.out) : 0
    phone.current.position.set(
      -phoneOut * offstage(viewport, phoneFrame, side),
      bob('phone'),
      MathUtils.lerp(PHONE_START.z, 0, phoneIn)
    )
    const phoneLean = 1 - phoneIn
    phone.current.rotation.set(
      tilt + PHONE_LEAN.x * phoneLean,
      MathUtils.lerp(PHONE_START.spin, 0, phoneIn),
      PHONE_LEAN.z * phoneLean + (phoneOnSide ? Math.PI / 2 : 0)
    )
    phone.current.visible =
      (order[0] === 'phone' || phoneIn > 0) && phoneOut < 1

    const tabletSlot = slotOf(order, 'tablet')
    const tabletIn = ease(p, tabletSlot.in)
    const tabletOut = tabletSlot.out ? ease(p, tabletSlot.out) : 0
    // why: it turns while it rests on stage, unless it is last, where it
    // keeps the window's orientation all along.
    const turn = tabletSlot.turn ? ease(p, tabletSlot.turn) : Number(lastOnSide)
    const tabletOff = offstage(viewport, tabletFrame, side)
    tablet.current.position.set(
      (1 - tabletIn) * tabletOff - tabletOut * tabletOff,
      bob('tablet'),
      0
    )
    const tabletLean = 1 - tabletIn
    tablet.current.rotation.set(
      tilt + TABLET_LEAN.x * tabletLean,
      TABLET_LEAN.y * tabletLean,
      TABLET_LEAN.z * tabletLean + (turn * Math.PI) / 2
    )
    tablet.current.visible = tabletIn > 0 && tabletOut < 1
    // why: the page swaps orientation halfway through the turn, when it is
    // equally crooked either way; setState only fires on the crossing.
    const nextLandscape = turn >= 0.5
    if (nextLandscape !== landscape) setLandscape(nextLandscape)

    const laptopSlot = slotOf(order, 'laptop')
    const laptopIn = ease(p, laptopSlot.in)
    const laptopOut = laptopSlot.out ? ease(p, laptopSlot.out) : 0
    const laptopOff = offstage(viewport, LAPTOP_FRAME, side)
    laptop.current.position.x =
      (1 - laptopIn) * laptopOff - laptopOut * laptopOff
    laptop.current.visible = laptopIn > 0 && laptopOut < 1
    laptopProgress.current = local(p, laptopSlot.own)
  }, BEFORE_DEVICES)

  useFrame(({ camera }) => {
    const view = screenView.current
    if (!view) return
    const depth = dive.current
    // invariant: the camera only ever leaves its resting pose for the dive,
    // so at dive 0 it is exactly where the scene was laid out from.
    if (depth === 0) {
      camera.position.copy(CAMERA_REST.position)
      camera.quaternion.copy(CAMERA_REST.quaternion)
      return
    }
    // why: at this distance the page, laid out at the window's size, fills
    // the field of view exactly, pixel for pixel with the real section.
    const fov = MathUtils.degToRad((camera as PerspectiveCamera).fov)
    const distance = view.pageHeight / (2 * Math.tan(fov / 2))
    const eye = view.centre.clone().addScaledVector(view.normal, distance)
    const facing = new Quaternion().setFromRotationMatrix(
      lookAtMatrix.lookAt(eye, view.centre, view.up)
    )
    camera.position.lerpVectors(CAMERA_REST.position, eye, depth)
    camera.quaternion.slerpQuaternions(CAMERA_REST.quaternion, facing, depth)
    camera.updateMatrixWorld()
  }, AFTER_DEVICES)

  return (
    <group position-y={stageLift(viewport, side)}>
      <group ref={phone}>
        <group scale={phoneFit}>
          <Handheld
            spec={phoneSpec}
            screenUrl={screenUrl}
            landscape={phoneOnSide}
            viewRef={viewer === 'phone' ? screenView : undefined}
          />
        </group>
      </group>
      <group ref={tablet}>
        <group scale={tabletFit}>
          <Handheld
            spec={tabletSpec}
            screenUrl={screenUrl}
            landscape={landscape}
            viewRef={viewer === 'tablet' ? screenView : undefined}
          />
        </group>
      </group>
      <group ref={laptop} position-y={laptopDrop}>
        <Suspense fallback={null}>
          <Laptop
            progress={laptopProgress}
            dive={dive}
            screenUrl={screenUrl}
            side={side}
            last={viewer === 'laptop'}
            viewRef={screenView}
          />
          <Precompile />
        </Suspense>
      </group>
    </group>
  )
}
