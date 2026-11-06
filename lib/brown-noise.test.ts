import assert from 'node:assert/strict'
import { test } from 'node:test'
import { brownNoise } from './brown-noise.ts'

// why: a fixed sequence keeps every run on the same noise.
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32
  return seed / 2 ** 32
}

const RATE = 48_000
const LENGTH = RATE * 2
const loop = brownNoise(LENGTH, RATE, seeded(7))
const steps = Array.from(loop.slice(1), (sample, index) =>
  Math.abs(sample - (loop[index] ?? 0))
)
const energy = (values: ArrayLike<number>) =>
  Array.from(values).reduce((sum, value) => sum + value * value, 0)

// why: a one-pole highpass at 1 kHz keeps what the ear hears as hiss.
const hiss = (values: Float32Array) => {
  const rc = 1 / (2 * Math.PI * 1000)
  const alpha = rc / (rc + 1 / RATE)
  let out = 0
  let previous = values[0] ?? 0
  const passed = Array.from(values, sample => {
    out = alpha * (out + sample - previous)
    previous = sample
    return out
  })
  return energy(passed) / energy(values)
}

test('the loop has the length asked and never clips', () => {
  assert.equal(loop.length, LENGTH)
  assert.ok(loop.every(sample => sample >= -1 && sample <= 1))
})

test('the loop plays at the level the volume was set for', () => {
  const rms = Math.sqrt(energy(loop) / LENGTH)
  assert.ok(Math.abs(rms - 0.2) < 0.01, `rms ${rms}`)
})

test('the noise is a rumble: almost nothing is left above 1 kHz', () => {
  // invariant: the bare brown noise of the first cut kept ~12% here.
  const share = hiss(loop)
  assert.ok(share < 0.01, `hiss ${share}`)
})

test('the seam where the loop wraps is no bigger than any other step', () => {
  const seam = Math.abs((loop[0] ?? 0) - (loop[LENGTH - 1] ?? 0))
  assert.ok(seam <= Math.max(...steps))
})
