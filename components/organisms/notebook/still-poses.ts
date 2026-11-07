import { MathUtils } from 'three'
import { CAMERA, ease, slotOf, STAGES, type Device } from './stages.ts'

/** An image of the still carousel: a device, the tablet in either turn. */
export type Shot = 'phone' | 'tablet' | 'tabletLandscape' | 'laptop'

/**
 * Where a shot is on stage: x and y in scene units from the stage's centre
 * (y up, before the stage's lift and bob), its scale for depth, its turn in
 * radians as CSS reads it, and how far the zoom into it has gone (0..1).
 */
export type StillPose = {
  shot: Shot
  visible: boolean
  x: number
  y: number
  scale: number
  rotateX: number
  rotateY: number
  rotateZ: number
  dive: number
}

type PoseInput = {
  /** The section's progress (0..1), already damped. */
  progress: number
  order: readonly Device[]
  viewer: Device
  /** Whether the window is landscape, which the last tablet keeps. */
  landscape: boolean
  /** Distance from the centre at which `device` is wholly off stage. */
  offstage: (device: Device) => number
}

// invariant: the 3D carousel's own poses (device-carousel.tsx), so the
// images move as the models did.
const PHONE_START = { z: -5, spin: -Math.PI / 2 }
const PHONE_LEAN = { x: 0.45, z: 0.3 }
const TABLET_LEAN = { x: 0.4, y: -0.6, z: -0.2 }
const DISTANCE = Math.hypot(...CAMERA.position)

// why: CSS turns about an axis whose y points down, so a turn that tips the
// top towards the viewer in the scene is the opposite sign in CSS.
const css = (x: number, y: number, z: number) => ({
  rotateX: -x,
  rotateY: y,
  rotateZ: -z
})

/**
 * Every shot's pose at `progress` (task portfolio-lp-still-scenes, 5-6):
 * the 3D carousel's slots and windows, each device sliding, the phone
 * coming from the depth and the tablet turning, its image swapped for the
 * landscape one half way through the turn, as the 3D page was.
 */
export const stillPose = ({
  progress: p,
  order,
  viewer,
  landscape,
  offstage
}: PoseInput): StillPose[] => {
  const dive = ease(p, STAGES.zoom)
  const diveOf = (device: Device) => (device === viewer ? dive : 0)

  const phone = slotOf(order, 'phone')
  const phoneIn = ease(p, phone.in)
  const phoneOut = phone.out ? ease(p, phone.out) : 0
  const phoneLean = 1 - phoneIn
  const depth = MathUtils.lerp(PHONE_START.z, 0, phoneIn)

  const tablet = slotOf(order, 'tablet')
  const tabletIn = ease(p, tablet.in)
  const tabletOut = tablet.out ? ease(p, tablet.out) : 0
  const turn = tablet.turn ? ease(p, tablet.turn) : Number(landscape)
  const tabletLean = 1 - tabletIn
  const tabletShown = tabletIn > 0 && tabletOut < 1
  const tabletOff = offstage('tablet')
  const tabletPose = (shot: 'tablet' | 'tabletLandscape', quarter: number) => ({
    shot,
    visible: tabletShown && (shot === 'tablet' ? turn < 0.5 : turn >= 0.5),
    x: (1 - tabletIn) * tabletOff - tabletOut * tabletOff,
    y: 0,
    scale: 1,
    ...css(
      TABLET_LEAN.x * tabletLean,
      TABLET_LEAN.y * tabletLean,
      TABLET_LEAN.z * tabletLean + (quarter * Math.PI) / 2
    ),
    dive: diveOf('tablet')
  })

  const laptop = slotOf(order, 'laptop')
  const laptopIn = ease(p, laptop.in)
  const laptopOut = laptop.out ? ease(p, laptop.out) : 0
  const laptopOff = offstage('laptop')

  return [
    {
      shot: 'phone',
      visible: (order[0] === 'phone' || phoneIn > 0) && phoneOut < 1,
      x: -phoneOut * offstage('phone'),
      y: 0,
      scale: DISTANCE / (DISTANCE - depth),
      ...css(
        PHONE_LEAN.x * phoneLean,
        MathUtils.lerp(PHONE_START.spin, 0, phoneIn),
        PHONE_LEAN.z * phoneLean
      ),
      dive: diveOf('phone')
    },
    tabletPose('tablet', turn),
    // invariant: the landscape image is the tablet already turned a
    // quarter, so it is turned back by what is left of the turn.
    tabletPose('tabletLandscape', turn - 1),
    {
      shot: 'laptop',
      visible: laptopIn > 0 && laptopOut < 1,
      x: (1 - laptopIn) * laptopOff - laptopOut * laptopOff,
      y: 0,
      scale: 1,
      ...css(0, 0, 0),
      dive: diveOf('laptop')
    }
  ]
}
