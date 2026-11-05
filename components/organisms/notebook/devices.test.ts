import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  asViewerDevice,
  bodySize,
  handheldFrame,
  PHONE,
  TABLET
} from './devices.ts'

// why: the stage room each handheld had before this task, for its own page.
const PHONE_ROOM = { width: 1.6, height: 3 }
const TABLET_ROOM = { width: 3.6, height: 3.6 }
// why: the windows of the task (.tasks/portfolio-lp-device-last.md, 7, 9),
// and two that match no device's own page.
const WINDOWS = [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 820, height: 1180 },
  { width: 700, height: 1000 }
]

test("the visitor's handheld lays its page out at the window", () => {
  for (const spec of [PHONE, TABLET])
    for (const view of WINDOWS)
      assert.deepEqual(asViewerDevice(spec, view).page, view)
})

test('a landscape window gives the upright page its sides swapped', () => {
  assert.deepEqual(asViewerDevice(TABLET, { width: 1000, height: 700 }).page, {
    width: 700,
    height: 1000
  })
})

test("a handheld's body follows its page's proportion", () => {
  for (const spec of [PHONE, TABLET])
    for (const view of WINDOWS) {
      const viewer = asViewerDevice(spec, view)
      const { width, height } = bodySize(viewer)
      const glass = {
        width: width - 2 * viewer.bezel,
        height: height - 2 * viewer.bezel
      }
      assert.ok(
        Math.abs(glass.height / glass.width - view.height / view.width) < 1e-9,
        `${spec.title} at ${view.width}x${view.height}`
      )
    }
})

test('a handheld at its own page keeps the room it had', () => {
  assert.deepEqual(handheldFrame(PHONE_ROOM, PHONE, PHONE, false), PHONE_ROOM)
  assert.deepEqual(
    handheldFrame(TABLET_ROOM, TABLET, TABLET, false),
    TABLET_ROOM
  )
})

test('a longer body gets more room, turned with it', () => {
  const long = asViewerDevice(PHONE, { width: 360, height: 900 })
  const room = handheldFrame(PHONE_ROOM, PHONE, long, false)
  const growth = bodySize(long).height / bodySize(PHONE).height
  assert.ok(Math.abs(room.height - PHONE_ROOM.height * growth) < 1e-9)
  assert.ok(Math.abs(room.width - PHONE_ROOM.width * growth) < 1e-9)
  assert.deepEqual(handheldFrame(PHONE_ROOM, PHONE, long, true), {
    width: room.height,
    height: room.width
  })
})
