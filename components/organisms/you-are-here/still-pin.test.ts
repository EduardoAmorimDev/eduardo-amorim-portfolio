import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MathUtils, Vector3 } from 'three'
import { PIN_ALTITUDE } from './globe-layout.ts'
import {
  PIN_MAX_ANGLE,
  coverPoint,
  onShot,
  pinOnStill,
  stillGlobe,
  type StillShot
} from './still-pin.ts'

// invariant: the shots render-stills.mjs takes (GLOBE), each a window of
// its shape plus the half screen the canvas rises above the section.
const PHONE: StillShot = { width: 430, height: 1398, lift: 1 / 3 }
const WIDE: StillShot = { width: 1800, height: 1350, lift: 1 / 3 }

// why: the boxes the image is laid in on a 390x844 phone and a 1440x900
// desktop: the section, a window tall, plus half a window above it.
const CASES = [
  { name: '390x844', shot: PHONE, box: { width: 390, height: 844 * 1.5 } },
  { name: '1440x900', shot: WIDE, box: { width: 1440, height: 900 * 1.5 } }
]

/**
 * The place the camera looks straight at through the globe's centre, found
 * from the ray rather than from the pose: the point of the pin's sphere
 * nearest the camera, turned back into the body's latitude and longitude.
 */
const facingPlace = (shot: StillShot) => {
  const { camera, placed, body } = stillGlobe(shot)
  const centre = placed.getWorldPosition(new Vector3())
  const radius = placed.scale.x * PIN_ALTITUDE
  const nearest = camera.position
    .clone()
    .sub(centre)
    .normalize()
    .multiplyScalar(radius)
    .add(centre)
  const local = body.worldToLocal(nearest).normalize()
  return {
    latitude: MathUtils.radToDeg(Math.asin(local.y)),
    longitude: MathUtils.radToDeg(Math.atan2(local.x, local.z)),
    centre: onShot(centre, camera)
  }
}

for (const { name, shot, box } of CASES)
  test(`the place facing the camera lands on the globe's centre at ${name}`, () => {
    const place = facingPlace(shot)
    const pin = pinOnStill(place.latitude, place.longitude, shot)
    assert.ok(pin, 'a pin on the place facing the camera')
    const at = coverPoint(pin, shot, box)
    const centre = coverPoint(place.centre, shot, box)
    const off = Math.hypot(at.x - centre.x, at.y - centre.y)
    assert.ok(off <= 4, `${off.toFixed(2)} px from the globe's centre`)
  })

test('a place past 75 degrees has no pin', () => {
  assert.equal(PIN_MAX_ANGLE, 75)
  for (const { shot } of CASES) {
    const place = facingPlace(shot)
    // invariant: the antipode is 180 degrees from the place facing the camera.
    const antipode = {
      latitude: -place.latitude,
      longitude:
        place.longitude > 0 ? place.longitude - 180 : place.longitude + 180
    }
    assert.equal(pinOnStill(antipode.latitude, antipode.longitude, shot), null)
    // why: 60 degrees north of the facing place is on the near side.
    const near = Math.min(place.latitude + 60, 89)
    assert.ok(pinOnStill(near, place.longitude, shot), 'a pin 60 degrees away')
    const far = place.latitude + 80
    const beyond =
      far > 90
        ? { latitude: 180 - far, longitude: place.longitude + 180 }
        : { latitude: far, longitude: place.longitude }
    assert.equal(
      pinOnStill(beyond.latitude, beyond.longitude, shot),
      null,
      'no pin 80 degrees away'
    )
  }
})
