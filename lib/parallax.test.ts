import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  PARALLAX_LAYERS,
  PARALLAX_SPEED,
  layerHeight,
  layerScreenTop,
  layerShift
} from './parallax.ts'

const TOLERANCE = 4

test('the layers are back, mid and front at 0.2x, 0.5x and 1.3x', () => {
  assert.deepEqual(PARALLAX_LAYERS, ['back', 'mid', 'front'])
  assert.deepEqual(PARALLAX_SPEED, { back: 0.2, mid: 0.5, front: 1.3 })
})

test('scrolling 400px moves each layer its speed times 400 on screen', () => {
  for (const layer of PARALLAX_LAYERS) {
    const speed = PARALLAX_SPEED[layer]
    for (const containerTop of [900, 300, 0, -1200, -5000]) {
      const before = layerScreenTop(speed, containerTop)
      const after = layerScreenTop(speed, containerTop - 400)
      const moved = before - after
      assert.ok(
        Math.abs(moved - speed * 400) <= TOLERANCE,
        `${layer} moved ${moved}px from ${containerTop}`
      )
    }
  }
})

test('the three layers move at different speeds', () => {
  const moved = PARALLAX_LAYERS.map(layer =>
    Math.round(
      layerScreenTop(PARALLAX_SPEED[layer], 0) -
        layerScreenTop(PARALLAX_SPEED[layer], -400)
    )
  )
  assert.deepEqual(moved, [80, 200, 520])
})

test('a layer sits unshifted when its container top meets the viewport top', () => {
  for (const layer of PARALLAX_LAYERS) {
    assert.equal(layerShift(PARALLAX_SPEED[layer], 0) + 0, 0, layer)
  }
})

test('a layer at speed 1 never shifts', () => {
  assert.equal(layerShift(1, -750) + 0, 0)
})

test('each layer is tall enough for its speed over the whole container', () => {
  assert.equal(layerHeight(0.2), 'calc(20% + 100svh)')
  assert.equal(layerHeight(1.3), 'calc(130% + 100svh)')
})
