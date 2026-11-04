import assert from 'node:assert/strict'
import { test } from 'node:test'
import { globeLayout } from './globe-layout.ts'

const close = (actual: number, expected: number, what: string) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${what}: ${actual}`)

test('without lift the globe is laid out in the whole canvas', () => {
  const wide = globeLayout({ width: 4, height: 2 }, 0)
  close(wide.x, 0.8, 'wide x')
  close(wide.y, 0, 'wide y')
  close(wide.scale, 0.6, 'wide scale')
  const tall = globeLayout({ width: 1, height: 2 }, 0)
  close(tall.x, 0, 'tall x')
  close(tall.y, 0.4, 'tall y')
  close(tall.scale, 0.4, 'tall scale')
})

test('a lifted canvas centres a wide globe on the section, right of centre', () => {
  // why: a third of a 3-unit canvas rises above a 2-unit section.
  const { x, y, scale } = globeLayout({ width: 4, height: 3 }, 1 / 3)
  close(x, 0.8, 'x is 20% of the width')
  close(y, -0.5, "y is the section's middle")
  close(scale, 0.6, 'sized from the section')
})

test('a lifted canvas puts a tall globe 20% above the section middle', () => {
  const { x, y, scale } = globeLayout({ width: 1, height: 3 }, 1 / 3)
  close(x, 0, 'x')
  close(y, -0.5 + 0.4, 'y')
  close(scale, 0.4, 'scale')
})
