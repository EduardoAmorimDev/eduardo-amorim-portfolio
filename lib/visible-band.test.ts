import assert from 'node:assert/strict'
import { test } from 'node:test'
import { visibleBand } from './visible-band.ts'

test('a canvas inside the window is drawn whole', () => {
  assert.deepEqual(visibleBand(100, 500, 900, 50), { y: 0, height: 500 })
})

test('a canvas taller than the window draws only its top screen', () => {
  // invariant: rows count from the bottom, so the 350 rows under the band
  // (the canvas past the window and its margin) are skipped.
  assert.deepEqual(visibleBand(0, 1350, 900, 100), { y: 350, height: 1000 })
})

test('a canvas scrolled half out draws only its bottom part', () => {
  assert.deepEqual(visibleBand(-1000, 1350, 900, 100), { y: 0, height: 450 })
})

test('a canvas wholly off screen draws nothing', () => {
  assert.equal(visibleBand(-2000, 1350, 900, 100).height, 0)
  assert.equal(visibleBand(1500, 1350, 900, 100).height, 0)
})
