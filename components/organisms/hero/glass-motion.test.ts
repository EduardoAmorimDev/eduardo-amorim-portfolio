import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  GLASS_LAYOUT,
  MOTION,
  ORBIT,
  anchorToWorld,
  cageAngle,
  motionTarget,
  orbitIndex,
  tumbleAngle
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

test('the hero shows exactly the cursor, atom and logo icons', () => {
  assert.deepEqual(
    GLASS_LAYOUT.map(({ name }) => name),
    ['cursor', 'atom', 'logo']
  )
})

// why: the task keeps the icons' motion as it was (T4); the literals are the
// values shipped before it, so a change to the constants fails here.
test('motion and orbit constants keep their values', () => {
  assert.deepEqual(MOTION, {
    parallaxTilt: 0.12,
    parallaxShift: 0.08,
    hoverTilt: 0.3,
    hoverScale: 1.06,
    bob: 0.05,
    sway: 0.12,
    speed: 0.5
  })
  assert.deepEqual(ORBIT, { tumble: [0.55, -0.42, 0.32], cage: 0.25 })
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

test('atom rings are found by name, with their ring number', () => {
  assert.equal(orbitIndex('Orbit2'), 2)
  for (const name of ['Nucleus', 'Stud', 'Orbit', 'Electron1', 'OrbitPivot1']) {
    assert.equal(orbitIndex(name), null, name)
  }
})

test('each ring tumbles at its own speed and direction', () => {
  assert.equal(tumbleAngle(0, 1), 0)
  assert.equal(tumbleAngle(2, 1), 2 * ORBIT.tumble[0])
  const speeds = [1, 2, 3].map(index => tumbleAngle(1, index))
  assert.equal(new Set(speeds).size, 3, 'three distinct speeds')
  assert.ok(
    speeds.some(speed => speed < 0),
    'at least one turns the other way'
  )
})

test('a ring past the speed list reuses a speed instead of returning NaN', () => {
  assert.equal(tumbleAngle(1, 4), tumbleAngle(1, 1))
  assert.ok(Number.isFinite(tumbleAngle(1, 0)))
})

test('the cage turns steadily about the vertical axis', () => {
  assert.equal(cageAngle(0), 0)
  assert.equal(cageAngle(4), 4 * ORBIT.cage)
})
