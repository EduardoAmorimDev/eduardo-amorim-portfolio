import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CAMERA,
  deviceOrder,
  divingFloatAt,
  FLOAT,
  floatAt,
  renderScale,
  restRenderScale,
  viewerDevice
} from './stages.ts'

// why: a quarter cycle in, the bob is at its full height.
const PEAK = Math.PI / (2 * FLOAT.speed)

test('before the dive the last device bobs like every device', () => {
  for (const elapsed of [0, 1.3, PEAK, 9.7])
    assert.equal(divingFloatAt(elapsed, 0), floatAt(elapsed))
})

test('the bob settles as the camera dives', () => {
  assert.ok(Math.abs(divingFloatAt(PEAK, 0.5) - FLOAT.height / 2) < 1e-9)
})

test('once dived the last device holds still, so the picture stops changing', () => {
  for (const elapsed of [0, 1.3, PEAK, 9.7])
    assert.equal(Math.abs(divingFloatAt(elapsed, 1)), 0)
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

// why: the task's own widths (.tasks/portfolio-lp-device-last.md, 1): the
// edges of Tailwind's md (768) and lg (1024), and a common size inside each.
test("the window width picks the visitor's device", () => {
  const cases = {
    phone: [0, 390, 767],
    tablet: [768, 820, 1023],
    laptop: [1024, 1440, 1920]
  } as const
  for (const [device, widths] of Object.entries(cases))
    for (const width of widths)
      assert.equal(viewerDevice(width), device, `${width} px`)
})

test("the visitor's device comes last, the others in today's order", () => {
  assert.deepEqual(deviceOrder('laptop'), ['phone', 'tablet', 'laptop'])
  assert.deepEqual(deviceOrder('tablet'), ['phone', 'laptop', 'tablet'])
  assert.deepEqual(deviceOrder('phone'), ['tablet', 'laptop', 'phone'])
})
