import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BELOW_FPS,
  PAUSE_MS,
  RECENT_WINDOWS,
  SCENE_WINDOW_MS,
  SLOW_WINDOWS,
  STALL_MS,
  TIER_WINDOW_MS,
  WARM_UP_MS,
  createJudge,
  isSlowWindow,
  windowRate
} from './performance-tier.ts'

/** A window of `count` frames, each `ms` apart. */
const frames = (count: number, ms: number) =>
  Array.from({ length: count }, () => ms)

/** Feeds `seconds` of frames at `fps` to a judge; true once it turned. */
const feed = (
  judge: ReturnType<typeof createJudge>,
  seconds: number,
  fps: number
) => {
  let turned = false
  for (const ms of frames(Math.round(seconds * fps), 1000 / fps))
    turned = judge.push(ms) || turned
  return turned
}

test('a 2 s window under 50 fps is slow', () => {
  assert.equal(TIER_WINDOW_MS, 2000)
  assert.equal(BELOW_FPS, 50)
  assert.equal(isSlowWindow(frames(120, 1000 / 60)), false)
  assert.equal(isSlowWindow(frames(101, 1000 / 50.5)), false)
  assert.equal(isSlowWindow(frames(98, 1000 / 49)), true)
  // why: what a 6x slower CPU draws on this page, ~20 fps.
  assert.equal(isSlowWindow(frames(40, 50)), true)
})

test('one stall on a fast machine is not a slow window', () => {
  const hitch = [...frames(100, 1000 / 60), 300]
  assert.ok(STALL_MS < 300)
  assert.equal(isSlowWindow(hitch), false)
  assert.ok(Math.abs((windowRate(hitch) ?? 0) - 60) < 0.5)
})

test('a window of stalls is a device drawing a frame or two a second', () => {
  assert.equal(PAUSE_MS, 2000)
  assert.ok((windowRate([...frames(10, 1000 / 60), 1800]) ?? 99) < 10)
  assert.equal(isSlowWindow(frames(2, 1000)), true)
  assert.equal(isSlowWindow(frames(1, 1000), SCENE_WINDOW_MS), true)
})

test('a pause (the tab hidden) is never judged', () => {
  assert.equal(windowRate([5000, 3000]), null)
  assert.equal(isSlowWindow([30_000], SCENE_WINDOW_MS), false)
})

test('a scene judge turns after three slow 1 s windows of the last five', () => {
  assert.equal(SCENE_WINDOW_MS, 1000)
  assert.equal(SLOW_WINDOWS, 3)
  assert.equal(RECENT_WINDOWS, 5)
  const judge = createJudge(SCENE_WINDOW_MS)
  assert.equal(feed(judge, WARM_UP_MS / 1000, 20), false)
  assert.equal(feed(judge, 2, 40), false)
  assert.equal(feed(judge, 1, 40), true)
})

test('a scene that holds 50 fps never turns', () => {
  const judge = createJudge(SCENE_WINDOW_MS)
  assert.equal(feed(judge, 30, 55), false)
})

test('slow frames during the warm-up are not held against a scene', () => {
  const judge = createJudge(SCENE_WINDOW_MS)
  assert.equal(feed(judge, 1, 10), false)
  assert.equal(feed(judge, 10, 60), false)
})

test('spells of drawing add up to a window', () => {
  const judge = createJudge(SCENE_WINDOW_MS)
  feed(judge, 1, 60)
  // why: a scene at the edge of the window draws half a second at a time;
  // its slow spells still close windows and turn it.
  let turned = false
  for (let spell = 0; spell < 8 && !turned; spell++)
    turned = feed(judge, 0.5, 40)
  assert.equal(turned, true)
})
