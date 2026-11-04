import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DPR_STEP, dprAt, frameRateBounds, resolveDpr } from './adaptive-dpr.ts'

test('a 60 Hz display declines under 54 fps and inclines from 58.2', () => {
  const [decline, incline] = frameRateBounds(60)
  assert.ok(Math.abs(decline - 54) < 1e-9)
  assert.ok(Math.abs(incline - 58.2) < 1e-9)
})

test('the bounds follow a faster display', () => {
  const [decline, incline] = frameRateBounds(120)
  assert.ok(Math.abs(decline - 108) < 1e-9)
  assert.ok(incline > decline && incline < 120)
})

test('a scene slow from its first frame is still held to 60 Hz', () => {
  const [decline] = frameRateBounds(15)
  assert.ok(Math.abs(decline - 54) < 1e-9)
})

test('a fixed ratio resolves to itself; a range clamps the device', () => {
  assert.equal(resolveDpr(0.7, 2), 0.7)
  assert.equal(resolveDpr([1.5, 2], 1), 1.5)
  assert.equal(resolveDpr([1.5, 2], 1.75), 1.75)
  assert.equal(resolveDpr([1.5, 2], 3), 2)
})

test('the factor maps min to max, clamped outside 0..1', () => {
  assert.equal(dprAt(0, 0.5, 1), 0.5)
  assert.equal(dprAt(1, 0.5, 1), 1)
  assert.equal(dprAt(0.5, 1, 2), 1.5)
  assert.equal(dprAt(-0.25, 1, 2), 1)
  assert.equal(dprAt(1.25, 1, 2), 2)
})

test('a max under min holds at min', () => {
  assert.equal(dprAt(1, 1, 0.75), 1)
})

test('the ratio moves in four steps from max to min', () => {
  assert.equal(1 / DPR_STEP, 4)
})
