import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MAX_TILT,
  SOLUTION_MODELS,
  SPIN_SPEED,
  spinStep,
  tiltFor
} from './glass-motion.ts'

test('spin: an icon turns 0.3 rad per second', () => {
  assert.equal(SPIN_SPEED, 0.3)
  assert.ok(Math.abs(spinStep(0, 0.05, false) - 0.015) < 1e-12)
})

test('spin: under reduced motion the icon holds still', () => {
  assert.equal(spinStep(1.2, 0.05, true), 1.2)
})

test('spin: a long pause does not jump the icon', () => {
  assert.ok(spinStep(0, 10, false) <= SPIN_SPEED * 0.1 + 1e-12)
})

test('spin: the cards get atom, brick, cursor, flag, note, wave in order', () => {
  assert.deepEqual(
    [...SOLUTION_MODELS],
    ['atom', 'brick', 'cursor', 'flag', 'note', 'wave']
  )
})

test('tilt: never past 15 degrees, however fast the pointer', () => {
  assert.ok(Math.abs(MAX_TILT - (15 * Math.PI) / 180) < 1e-12)
  const fast = tiltFor(1e6, -1e6, false)
  assert.equal(fast.y, MAX_TILT)
  assert.equal(fast.x, -MAX_TILT)
})

test('tilt: leans towards the motion', () => {
  const right = tiltFor(600, 0, false)
  assert.ok(right.y > 0 && right.y < MAX_TILT)
  assert.equal(right.x, 0)
})

test('tilt: a still pointer and reduced motion both give 0 degrees', () => {
  assert.deepEqual(tiltFor(0, 0, false), { x: 0, y: 0 })
  assert.deepEqual(tiltFor(900, 900, true), { x: 0, y: 0 })
})
