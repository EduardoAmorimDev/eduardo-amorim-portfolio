import assert from 'node:assert/strict'
import { test } from 'node:test'
import { brownNoise } from './brown-noise.ts'

// why: a fixed sequence keeps every run on the same noise.
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32
  return seed / 2 ** 32
}

const LENGTH = 48_000
const loop = brownNoise(LENGTH, seeded(7))
const steps = Array.from(loop.slice(1), (sample, index) =>
  Math.abs(sample - (loop[index] ?? 0))
)
const mean = (values: ArrayLike<number>) =>
  Array.from(values).reduce((sum, value) => sum + Math.abs(value), 0) /
  values.length

test('the loop has the length asked and never clips', () => {
  assert.equal(loop.length, LENGTH)
  assert.ok(loop.every(sample => sample >= -1 && sample <= 1))
})

test('the noise is audible, not silence', () => {
  assert.ok(mean(loop) > 0.05)
})

test('the noise is brown: each step is small beside the level', () => {
  // invariant: white noise steps about 1.3x its own level; brown, far less.
  assert.ok(mean(steps) < 0.5 * mean(loop))
})

test('the seam where the loop wraps is no bigger than any other step', () => {
  const seam = Math.abs((loop[0] ?? 0) - (loop[LENGTH - 1] ?? 0))
  assert.ok(seam <= Math.max(...steps))
})
