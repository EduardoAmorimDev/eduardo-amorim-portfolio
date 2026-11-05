import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  LITE_BELOW_FPS,
  RECENT_WINDOWS,
  SLOW_WINDOWS,
  STALL_MS,
  TIER_WINDOW_MS,
  isSlowWindow,
  windowRate
} from './performance-tier.ts'

/** A window of `count` frames, each `ms` apart. */
const frames = (count: number, ms: number) =>
  Array.from({ length: count }, () => ms)

test('a 2 s window under 58 fps is slow', () => {
  assert.equal(TIER_WINDOW_MS, 2000)
  assert.equal(LITE_BELOW_FPS, 58)
  assert.equal(isSlowWindow(frames(120, 1000 / 60)), false)
  assert.equal(isSlowWindow(frames(117, 1000 / 58.5)), false)
  assert.equal(isSlowWindow(frames(114, 1000 / 57)), true)
  // why: what a 6x slower CPU draws on this page, ~20 fps.
  assert.equal(isSlowWindow(frames(40, 50)), true)
})

test('one stall on a fast machine does not turn it lite', () => {
  const hitch = [...frames(100, 1000 / 60), 300]
  assert.ok(STALL_MS < 300)
  assert.equal(isSlowWindow(hitch), false)
  assert.ok(Math.abs((windowRate(hitch) ?? 0) - 60) < 0.5)
})

test('a window that is mostly stalls is not judged at all', () => {
  assert.equal(windowRate([...frames(10, 1000 / 60), 1800]), null)
  assert.equal(isSlowWindow([5000, 3000]), false)
})

test('three slow windows among the last five turn the visit lite', () => {
  assert.equal(SLOW_WINDOWS, 3)
  assert.equal(RECENT_WINDOWS, 5)
})
