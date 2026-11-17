import { MathUtils, Object3D, PerspectiveCamera, Vector3 } from 'three'
import {
  GLOBE_CAMERA,
  PIN_ALTITUDE,
  STILL_POSE,
  aimAt,
  globeLayout
} from './globe-layout.ts'
import { toSphere } from './land-dots.ts'

/** The window the globe's still was shot in: its canvas, in CSS px. */
export type StillShot = {
  width: number
  height: number
  /** Share of the canvas's height that rose above the section. */
  lift: number
}

/** A point as a share of a box's width and height, from its top left. */
export type Share = { x: number; y: number }

// why: past this angle from the viewer, a place sits on the globe's edge or
// behind it, where a pin would float on nothing (task
// portfolio-lp-device-gate, 9).
export const PIN_MAX_ANGLE = 75

/**
 * The globe of the still, as the live scene lays it out for that shot:
 * the camera, and the body turned to STILL_POSE inside its placed group.
 */
export const stillGlobe = (shot: StillShot) => {
  const { distance, fov } = GLOBE_CAMERA
  const camera = new PerspectiveCamera(fov, shot.width / shot.height, 0.1, 100)
  camera.position.set(0, 0, distance)
  camera.updateMatrixWorld()
  // invariant: R3F's viewport, the canvas in scene units at the origin's
  // depth, which the scene lays the globe out in.
  const height = 2 * distance * Math.tan(MathUtils.degToRad(fov / 2))
  const layout = globeLayout(
    { width: (height * shot.width) / shot.height, height },
    shot.lift
  )
  const placed = new Object3D()
  placed.position.set(layout.x, layout.y, 0)
  placed.scale.setScalar(layout.scale)
  const body = new Object3D()
  const aim = aimAt(STILL_POSE.latitude, STILL_POSE.longitude)
  body.rotation.set(aim.x, aim.y, 0)
  placed.add(body)
  placed.updateMatrixWorld(true)
  return { camera, placed, body }
}

/** Where a scene point lands on the shot, as a share of its box. */
export const onShot = (point: Vector3, camera: PerspectiveCamera): Share => {
  const projected = point.clone().project(camera)
  return { x: (projected.x + 1) / 2, y: (1 - projected.y) / 2 }
}

/**
 * Where the pin on a place lands on the globe's still, as a share of the
 * shot; null when the place is turned more than PIN_MAX_ANGLE away from
 * the camera.
 */
export const pinOnStill = (
  latitude: number,
  longitude: number,
  shot: StillShot
): Share | null => {
  const { camera, placed, body } = stillGlobe(shot)
  const point = body.localToWorld(
    new Vector3(...toSphere(latitude, longitude, PIN_ALTITUDE))
  )
  const centre = placed.getWorldPosition(new Vector3())
  const normal = point.clone().sub(centre).normalize()
  const toCamera = camera.position.clone().sub(point).normalize()
  const limit = Math.cos(MathUtils.degToRad(PIN_MAX_ANGLE))
  if (normal.dot(toCamera) < limit) return null
  return onShot(point, camera)
}

/**
 * A share of an image laid in a box with `object-fit: cover`, centred, as
 * CSS px from the box's top left.
 */
export const coverPoint = (
  share: Share,
  image: { width: number; height: number },
  box: { width: number; height: number }
) => {
  const scale = Math.max(box.width / image.width, box.height / image.height)
  return {
    x: share.x * image.width * scale - (image.width * scale - box.width) / 2,
    y: share.y * image.height * scale - (image.height * scale - box.height) / 2
  }
}

/** The globe's radius on the still, as a share of the shot's width. */
export const stillRadius = (shot: StillShot) => {
  const { camera, placed } = stillGlobe(shot)
  const centre = onShot(placed.getWorldPosition(new Vector3()), camera)
  const edge = onShot(placed.localToWorld(new Vector3(1, 0, 0)), camera)
  return Math.abs(edge.x - centre.x)
}
