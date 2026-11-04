import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  PARALLAX_LAYERS,
  PARALLAX_SLABS,
  PARALLAX_SPEED,
  SLAB_MARGIN,
  layerHeight,
  layerScreenTop,
  layerShift,
  slabBox,
  slabIndex
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

test('every item lands in the slab that holds its top', () => {
  assert.equal(slabIndex(0, 10), 0)
  assert.equal(slabIndex(9.99, 10), 0)
  assert.equal(slabIndex(10, 10), 1)
  assert.equal(slabIndex(99.9, 10), 9)
  // why: a star drawn just past an edge still belongs to the edge slab.
  assert.equal(slabIndex(-2, 3), 0)
  assert.equal(slabIndex(104, 3), 2)
})

test('the slabs tile the layer and put their content back at its origin', () => {
  for (const layer of PARALLAX_LAYERS) {
    const count = PARALLAX_SLABS[layer]
    const margin = SLAB_MARGIN[layer]
    const share = 100 / count
    for (let index = 0; index < count; index++) {
      const box = slabBox(index, count, margin)
      assert.equal(box.top, `calc(${index * share}cqh - ${margin}px)`)
      assert.equal(box.height, `calc(${share}cqh + ${2 * margin}px)`)
      assert.equal(box.contentTop, `calc(${margin}px - ${index * share}cqh)`)
    }
  }
  assert.equal(SLAB_MARGIN.back, 0, 'the Milky Way is never drawn twice')
})
