'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useRef, useState, type RefObject } from 'react'
import {
  MathUtils,
  Matrix4,
  Quaternion,
  type Group,
  type PerspectiveCamera
} from 'three'
import { Handheld, PHONE, TABLET } from './handheld'
import { Laptop, LAPTOP_FRAME, type ScreenView } from './laptop'
import {
  CAMERA,
  CAMERA_REST,
  ease,
  fitIn,
  floatAt,
  isSideLayout,
  local,
  offstage,
  SMOOTHING,
  STAGES,
  stageLift,
  stageViewport,
  type Frame
} from './stages'

// why: the room each handheld needs at rest, with a margin; the tablet's
// frame is square and holds its 45° diagonal (~3.44) mid-turn.
const PHONE_FRAME: Frame = { width: 1.6, height: 3 }
const TABLET_FRAME: Frame = { width: 3.6, height: 3.6 }
// why: the phone starts this far behind the stage, a turn and a bit away
// from facing the viewer, and spins towards the camera as it comes.
const PHONE_START = { z: -5, spin: -(Math.PI * 2 + Math.PI / 6) }
// why: like the laptop's crooked start, each handheld arrives leaning
// (radians, on top of the camera tilt and the phone's spin) and straightens
// as it reaches its rest.
const PHONE_LEAN = { x: 0.45, z: 0.3 }
const TABLET_LEAN = { x: 0.4, y: -0.6, z: -0.2 }
// why: the open lid rises well above the laptop's pivot, so at full size
// it would touch the heading; lowering it centres the open laptop instead.
const LAPTOP_DROP = 0.45
// hazard: runs before the laptop (-1) and every <Html> (0), so they all read
// this frame's progress and poses instead of the previous frame's.
const BEFORE_DEVICES = -2
// hazard: the dive reads where the laptop's screen is this frame, so it runs
// after the laptop has posed (-1) and before <Html> (0) reads the camera.
const AFTER_LAPTOP = -0.5

const lookAtMatrix = new Matrix4()

type DeviceCarouselProps = {
  progress: RefObject<number>
  screenUrl?: string
}

/**
 * Phone, then tablet, then laptop, swapped across the stage by the scroll;
 * at the end the camera dives into the laptop's screen until its page fills
 * the window.
 */
export const DeviceCarousel = ({
  progress,
  screenUrl
}: DeviceCarouselProps) => {
  const phone = useRef<Group>(null)
  const tablet = useRef<Group>(null)
  const laptop = useRef<Group>(null)
  // why: damped once here and shared, so the three devices stay in step
  // while two of them cross the stage together.
  const smoothed = useRef(0)
  const laptopProgress = useRef(0)
  const screenView = useRef<ScreenView | null>(null)
  const [landscape, setLandscape] = useState(false)
  const size = useThree(state => state.size)
  const viewport = stageViewport(size)
  const side = isSideLayout(size)
  const phoneFit = fitIn(viewport, PHONE_FRAME, side)
  const tabletFit = fitIn(viewport, TABLET_FRAME, side)
  const laptopDrop = -LAPTOP_DROP * fitIn(viewport, LAPTOP_FRAME, side)

  useFrame(({ clock }, delta) => {
    if (!phone.current || !tablet.current || !laptop.current) return
    smoothed.current = MathUtils.damp(
      smoothed.current,
      progress.current,
      SMOOTHING,
      delta
    )
    const p = smoothed.current
    const bob = floatAt(clock.elapsedTime)
    // why: the camera sits above the stage looking down at it; tilting the
    // handhelds back by that angle makes their glass face the viewer.
    const tilt = -Math.atan2(CAMERA.position[1], CAMERA.position[2])

    const phoneIn = ease(p, STAGES.phoneIn)
    const phoneOut = ease(p, STAGES.phoneOut)
    phone.current.position.set(
      -phoneOut * offstage(viewport, PHONE_FRAME, side),
      bob,
      MathUtils.lerp(PHONE_START.z, 0, phoneIn)
    )
    const phoneLean = 1 - phoneIn
    phone.current.rotation.set(
      tilt + PHONE_LEAN.x * phoneLean,
      MathUtils.lerp(PHONE_START.spin, 0, phoneIn),
      PHONE_LEAN.z * phoneLean
    )
    phone.current.visible = phoneOut < 1

    const tabletIn = phoneOut
    const tabletOut = ease(p, STAGES.tabletOut)
    const turn = ease(p, STAGES.tabletTurn)
    const tabletOff = offstage(viewport, TABLET_FRAME, side)
    tablet.current.position.set(
      (1 - tabletIn) * tabletOff - tabletOut * tabletOff,
      bob,
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

    const laptopIn = tabletOut
    laptop.current.position.x =
      (1 - laptopIn) * offstage(viewport, LAPTOP_FRAME, side)
    laptop.current.visible = laptopIn > 0
    laptopProgress.current = local(p, STAGES.laptop)
  }, BEFORE_DEVICES)

  useFrame(({ camera }) => {
    const view = screenView.current
    if (!view) return
    const dive = ease(smoothed.current, STAGES.zoom)
    // invariant: the camera only ever leaves its resting pose for the dive,
    // so at dive 0 it is exactly where the scene was laid out from.
    if (dive === 0) {
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
    camera.position.lerpVectors(CAMERA_REST.position, eye, dive)
    camera.quaternion.slerpQuaternions(CAMERA_REST.quaternion, facing, dive)
    camera.updateMatrixWorld()
  }, AFTER_LAPTOP)

  return (
    <group position-y={stageLift(viewport, side)}>
      <group ref={phone}>
        <group scale={phoneFit}>
          <Handheld spec={PHONE} screenUrl={screenUrl} />
        </group>
      </group>
      <group ref={tablet}>
        <group scale={tabletFit}>
          <Handheld spec={TABLET} screenUrl={screenUrl} landscape={landscape} />
        </group>
      </group>
      <group ref={laptop} position-y={laptopDrop}>
        <Suspense fallback={null}>
          <Laptop
            progress={laptopProgress}
            screenUrl={screenUrl}
            side={side}
            viewRef={screenView}
          />
        </Suspense>
      </group>
    </group>
  )
}
