import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BURST,
  IDLE_GLITCH,
  burstWait,
  clipPath,
  requestBurst
} from './glitch.ts'

// why: the checklist's own numbers (C10, C14), fixed here so a change to the
// module's constants cannot move the bar the tests hold it to.
const MAX_BURST_MS = 300
const MAX_FRAMES_WITH_COPIES = 3
const BANDS = 3
const MIN_SHIFT_PX = 1
const MAX_SHIFT_PX = 3
const MIN_WAIT_MS = 5000
const MAX_WAIT_MS = 12000

const withCopies = BURST.filter(frame => frame.copies !== null)

test('a burst is at most three frames of copies, then a clean one, within 300ms', () => {
  assert.ok(withCopies.length >= 1, 'the burst shows copies')
  assert.ok(withCopies.length <= MAX_FRAMES_WITH_COPIES, `${withCopies.length}`)
  assert.equal(BURST.length, withCopies.length + 1)
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

test('copies shift 1 to 3px and the text never moves', () => {
  for (const frame of BURST)
    assert.deepEqual(
      Object.keys(frame).sort(),
      ['at', 'copies'],
      'a frame carries no shift of the heading itself'
    )
  for (const frame of withCopies) {
    assert.equal(frame.copies?.length, 2, `frame at ${frame.at}`)
    for (const copy of frame.copies ?? []) {
      assert.ok(Math.abs(copy.x) >= MIN_SHIFT_PX, `shift ${copy.x}`)
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

test('the wait before a burst is drawn uniformly from 5 to 12 s', () => {
  assert.equal(burstWait(0), MIN_WAIT_MS)
  assert.ok(Math.abs(burstWait(1) - MAX_WAIT_MS) < 1e-9)
  // invariant: uniform means linear in the draw: equal steps of the draw
  // give equal steps of the wait.
  const step = burstWait(0.1) - burstWait(0)
  for (let draw = 0.1; draw < 0.95; draw += 0.1)
    assert.ok(Math.abs(burstWait(draw + 0.1) - burstWait(draw) - step) < 1e-6)
  for (let draw = 0; draw < 1; draw += 0.01) {
    const wait = burstWait(draw)
    assert.ok(wait >= MIN_WAIT_MS && wait < MAX_WAIT_MS, `${draw} → ${wait}`)
  }
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

test('the first request starts a burst at once', () => {
  assert.equal(requestBurst(IDLE_GLITCH, 5000)?.start, 5000)
})

test('a request while a burst runs is ignored', () => {
  const first = requestBurst(IDLE_GLITCH, 0)
  assert.ok(first)
  assert.equal(requestBurst(first.history, 100), null)
  assert.equal(requestBurst(first.history, first.history.busyUntil - 1), null)
})

test('a request right after a burst starts at once', () => {
  const first = requestBurst(IDLE_GLITCH, 0)
  assert.ok(first)
  const now = first.history.busyUntil + 1
  assert.equal(requestBurst(first.history, now)?.start, now)
})
