import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  GLASS_LAYOUT,
  MOTION,
  anchorToWorld,
  motionTarget
} from './glass-motion.ts'

const centre = { x: 0, y: 0 }

test('anchors map the edges of the view to its half width and height', () => {
  const view = { width: 10, height: 4 }
  assert.deepEqual(anchorToWorld([1, -1], view), { x: 5, y: -2 })
  assert.deepEqual(anchorToWorld([0, 0], view), { x: 0, y: 0 })
})

test('every layout anchor stays inside the view', () => {
  for (const { name, anchor } of GLASS_LAYOUT) {
    assert.ok(Math.abs(anchor[0]) < 1 && Math.abs(anchor[1]) < 1, name)
  }
})

test('the hero shows the logo alone', () => {
  assert.deepEqual(
    GLASS_LAYOUT.map(({ name }) => name),
    ['logo']
  )
})

// why: the task keeps the icons' motion as it was (T4); the literals are the
// values shipped before it, so a change to the constants fails here.
test('motion constants keep their values', () => {
  assert.deepEqual(MOTION, {
    parallaxTilt: 0.12,
    parallaxShift: 0.08,
    hoverTilt: 0.3,
    hoverScale: 1.06,
    bob: 0.05,
    sway: 0.12,
    speed: 0.5
  })
})

test('with the pointer centred and nothing hovered, only the idle motion is left', () => {
  const target = motionTarget(centre, null, 0, 0)
  assert.equal(target.rotationX, -0)
  assert.equal(target.rotationY, 0)
  assert.equal(target.scale, 1)
})

test('a pointer up and to the right leans the icon towards it by the parallax tilt', () => {
  const target = motionTarget({ x: 1, y: 1 }, null, 0, 0)
  assert.equal(target.rotationX, -MOTION.parallaxTilt)
  assert.equal(target.rotationY, MOTION.parallaxTilt)
  assert.equal(target.shiftX, MOTION.parallaxShift)
})

test('hovering leans towards the hovered point, not the canvas pointer, and grows', () => {
  const target = motionTarget({ x: 1, y: 1 }, { x: -1, y: 0 }, 0, 0)
  assert.equal(target.rotationY, -MOTION.hoverTilt)
  assert.equal(target.rotationX, -0)
  assert.equal(target.scale, MOTION.hoverScale)
})

test('a hover point outside the icon is clamped to the maximum tilt', () => {
  const target = motionTarget(centre, { x: 5, y: -5 }, 0, 0)
  assert.equal(target.rotationY, MOTION.hoverTilt)
  assert.equal(target.rotationX, MOTION.hoverTilt)
})

test('the idle sway never exceeds its amplitude', () => {
  for (let time = 0; time < 30; time += 0.37) {
    const { rotationY, shiftY } = motionTarget(centre, null, time, 1.3)
    assert.ok(Math.abs(rotationY) <= MOTION.sway + 1e-12)
    assert.ok(Math.abs(shiftY) <= MOTION.bob + 1e-12)
  }
})
