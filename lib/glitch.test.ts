import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BURST, IDLE_GLITCH, clipPath, requestBurst } from './glitch.ts'

// why: the checklist's own numbers (C29–C31), fixed here so a change to the
// module's constants cannot move the bar the tests hold it to.
const MAX_BURST_MS = 600
const FRAMES_WITH_COPIES = 6
const BANDS = 3
const MAX_SHIFT_PX = 8
const MAX_SHAKE_PX = 2

const withCopies = BURST.filter(frame => frame.copies !== null)

test('a burst is six frames with copies, then a clean one, within 600 ms', () => {
  assert.equal(withCopies.length, FRAMES_WITH_COPIES)
  assert.equal(BURST.length, FRAMES_WITH_COPIES + 1)
  assert.equal(BURST[0]?.at, 0, 'starts at once')
  const last = BURST[BURST.length - 1]
  assert.ok(last, 'the burst has frames')
  assert.equal(last.copies, null, 'the last frame is clean')
  assert.ok(last.at <= MAX_BURST_MS, `ends at ${last.at} ms`)
  for (let index = 1; index < BURST.length; index++)
    assert.ok(
      (BURST[index]?.at ?? 0) > (BURST[index - 1]?.at ?? 0),
      'frames run forward in time'
    )
})

test('every copy is cut into three bands and shifted at most 8px', () => {
  for (const frame of withCopies) {
    assert.equal(frame.copies?.length, 2, `frame at ${frame.at}`)
    for (const copy of frame.copies ?? []) {
      assert.ok(copy.x !== 0, 'a copy is shifted')
      assert.ok(Math.abs(copy.x) <= MAX_SHIFT_PX, `shift ${copy.x}`)
      assert.equal(copy.bands.length, BANDS)
      let previous = 0
      for (const { from, to } of copy.bands) {
        assert.ok(from >= previous, `bands do not overlap at ${from}%`)
        assert.ok(to > from, `band ${from}–${to}% is not empty`)
        assert.ok(to <= 100, `band ends inside the heading at ${to}%`)
        previous = to
      }
    }
  }
})

test('the text shakes at most 2px and settles at 0', () => {
  for (const frame of BURST)
    assert.ok(Math.abs(frame.shake) <= MAX_SHAKE_PX, `shake ${frame.shake}`)
  assert.ok(
    withCopies.some(frame => frame.shake !== 0),
    'the text does shake'
  )
  assert.equal(BURST[BURST.length - 1]?.shake, 0)
})

test('clipPath keeps exactly the three bands', () => {
  assert.equal(
    clipPath({
      x: 1,
      bands: [
        { from: 10, to: 20 },
        { from: 40, to: 50 },
        { from: 70, to: 90 }
      ]
    }),
    'polygon(0% 10%, 100% 10%, 100% 20%, 0% 20%, 0% 40%, 100% 40%, 100% 50%, 0% 50%, 0% 70%, 100% 70%, 100% 90%, 0% 90%)'
  )
})

test('the first trigger starts a burst at once', () => {
  assert.equal(requestBurst(IDLE_GLITCH, 5000)?.start, 5000)
})

test('a trigger while a burst runs is ignored', () => {
  const first = requestBurst(IDLE_GLITCH, 0)
  assert.ok(first)
  assert.equal(requestBurst(first.history, 100), null)
  assert.equal(requestBurst(first.history, first.history.busyUntil - 1), null)
})

test('a trigger right after a burst starts at once', () => {
  const first = requestBurst(IDLE_GLITCH, 0)
  assert.ok(first)
  const now = first.history.busyUntil + 1
  assert.equal(requestBurst(first.history, now)?.start, now)
})
