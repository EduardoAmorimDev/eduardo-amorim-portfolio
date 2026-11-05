import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CAMERA,
  FLOAT,
  floatAt,
  laptopFloatAt,
  renderScale,
  restRenderScale
} from './stages.ts'

// why: a quarter cycle in, the bob is at its full height.
const PEAK = Math.PI / (2 * FLOAT.speed)

test('before the dive the laptop bobs like every device', () => {
  for (const elapsed of [0, 1.3, PEAK, 9.7])
    assert.equal(laptopFloatAt(elapsed, 0), floatAt(elapsed))
})

test('the bob settles as the camera dives', () => {
  assert.ok(Math.abs(laptopFloatAt(PEAK, 0.5) - FLOAT.height / 2) < 1e-9)
})

test('once dived the laptop holds still, so the picture stops changing', () => {
  for (const elapsed of [0, 1.3, PEAK, 9.7])
    assert.equal(Math.abs(laptopFloatAt(elapsed, 1)), 0)
})

test('a page at rest is drawn at the scale seen from the resting camera', () => {
  const distance = Math.hypot(...CAMERA.position)
  for (const unitsPerPx of [0.0005, 0.001, 0.0029, 0.01])
    for (const height of [664, 844, 900])
      assert.equal(
        restRenderScale(unitsPerPx, height),
        renderScale(unitsPerPx, distance, height)
      )
})
