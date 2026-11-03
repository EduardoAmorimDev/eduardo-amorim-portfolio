'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useRef, useState, type RefObject } from 'react'
import { MathUtils, type Group } from 'three'
import { Handheld, PHONE, TABLET } from './handheld'
import { Laptop, LAPTOP_FRAME } from './laptop'
import {
  ease,
  fitIn,
  floatAt,
  local,
  offstage,
  SMOOTHING,
  STAGES,
  stageLift,
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
// as it reaches the centre.
const PHONE_LEAN = { x: 0.45, z: 0.3 }
const TABLET_LEAN = { x: 0.4, y: -0.6, z: -0.2 }
// why: the open lid rises well above the laptop's pivot, so at full size
// it would touch the heading; lowering it centres the open laptop instead.
const LAPTOP_DROP = 0.45
// hazard: runs before the laptop (-1) and every <Html> (0), so they all read
// this frame's progress and poses instead of the previous frame's.
const BEFORE_DEVICES = -2

type DeviceCarouselProps = {
  progress: RefObject<number>
  screenUrl?: string
}

/** Phone, then tablet, then laptop, swapped across the stage by the scroll. */
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
  const [landscape, setLandscape] = useState(false)
  const viewport = useThree(state => state.viewport)
  const phoneFit = fitIn(viewport, PHONE_FRAME)
  const tabletFit = fitIn(viewport, TABLET_FRAME)
  const laptopDrop = -LAPTOP_DROP * fitIn(viewport, LAPTOP_FRAME)

  useFrame(({ camera, clock }, delta) => {
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
    const tilt = -Math.atan2(camera.position.y, camera.position.z)

    const phoneIn = ease(p, STAGES.phoneIn)
    const phoneOut = ease(p, STAGES.phoneOut)
    phone.current.position.set(
      -phoneOut * offstage(viewport, PHONE_FRAME),
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
    const tabletSide = offstage(viewport, TABLET_FRAME)
    tablet.current.position.set(
      (1 - tabletIn) * tabletSide - tabletOut * tabletSide,
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
      (1 - laptopIn) * offstage(viewport, LAPTOP_FRAME)
    laptop.current.visible = laptopIn > 0
    laptopProgress.current = local(p, STAGES.laptop)
  }, BEFORE_DEVICES)

  return (
    <group position-y={stageLift(viewport)}>
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
          <Laptop progress={laptopProgress} screenUrl={screenUrl} />
        </Suspense>
      </group>
    </group>
  )
}
