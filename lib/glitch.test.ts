import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BURST,
  GLITCH,
  IDLE_GLITCH,
  burstStart,
  clipPath,
  fitsRate,
  requestBurst,
  type GlitchHistory
} from './glitch.ts'

// why: replays triggers through the same policy the heading uses and returns
// every moment the text changed on screen.
const replay = (triggers: readonly number[]) => {
  let history: GlitchHistory = IDLE_GLITCH
  const changes: number[] = []
  for (const now of triggers) {
    const burst = requestBurst(history, now)
    if (!burst) continue
    history = burst.history
    changes.push(...BURST.map(frame => burst.start + frame.at))
  }
  return changes
}

const maxChangesInAnyWindow = (changes: readonly number[]) => {
  const sorted = [...changes].sort((a, b) => a - b)
  return Math.max(
    0,
    ...sorted.map(
      start =>
        sorted.filter(time => time >= start && time < start + GLITCH.windowMs)
          .length
    )
  )
}

// why: a fixed-seed generator keeps the random trigger test reproducible.
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32
  return seed / 2 ** 32
}

test('a burst ends within 600 ms and leaves the text clean', () => {
  const last = BURST[BURST.length - 1]
  assert.ok(last, 'the burst has frames')
  assert.ok(last.at <= GLITCH.maxBurstMs, `ends at ${last.at} ms`)
  assert.equal(last.copies, null)
  assert.equal(BURST[0]?.at, 0, 'starts at once')
})

test('a burst changes the text at most 3 times', () => {
  assert.ok(BURST.length <= GLITCH.maxChangesPerWindow)
})

test('every copy shifts at most 4px sideways and is cut to a band', () => {
  for (const frame of BURST) {
    for (const slice of frame.copies ?? []) {
      assert.ok(Math.abs(slice.x) <= GLITCH.maxShiftPx, `shift ${slice.x}`)
      assert.ok(slice.x !== 0, 'a copy is shifted')
      assert.ok(slice.top + slice.bottom > 0, 'a copy is sliced')
      assert.ok(slice.top + slice.bottom < 100, 'a slice is not empty')
    }
  }
})

test('frames with copies show one copy each side', () => {
  for (const frame of BURST.slice(0, -1)) {
    assert.ok(frame.copies, `frame at ${frame.at} shows copies`)
  }
})

test('clipPath keeps the band between the top and bottom insets', () => {
  assert.equal(clipPath({ x: 1, top: 12, bottom: 52 }), 'inset(12% 0 52% 0)')
})

test('fitsRate rejects four changes inside one second', () => {
  assert.equal(fitsRate([0, 100, 200]), true)
  assert.equal(fitsRate([0, 100, 200, 999]), false)
  assert.equal(fitsRate([0, 100, 200, 1000]), true)
})

test('the first trigger starts a burst at once', () => {
  const burst = requestBurst(IDLE_GLITCH, 5000)
  assert.equal(burst?.start, 5000)
})

test('a trigger while a burst runs is ignored', () => {
  const first = requestBurst(IDLE_GLITCH, 0)
  assert.ok(first)
  assert.equal(requestBurst(first.history, 100), null)
})

test('a trigger right after a burst is deferred until the rate allows it', () => {
  const first = requestBurst(IDLE_GLITCH, 0)
  assert.ok(first)
  const second = requestBurst(first.history, first.history.busyUntil + 1)
  assert.ok(second, 'deferred, not dropped')
  assert.ok(second.start > first.history.busyUntil + 1)
  const changes = [...first.history.changes, ...second.history.changes]
  assert.ok(fitsRate([...new Set(changes)]))
})

test('a trigger long after the last burst starts at once', () => {
  const first = requestBurst(IDLE_GLITCH, 0)
  assert.ok(first)
  assert.equal(requestBurst(first.history, 10_000)?.start, 10_000)
})

test('burstStart never returns a time before now', () => {
  assert.ok(burstStart([0, 160, 320], 400) >= 400)
  assert.equal(burstStart([], 7), 7)
})

test('hovering non-stop for 10 s never changes the text more than 3 times in any second', () => {
  const triggers = Array.from({ length: 1000 }, (_, index) => index * 10)
  const changes = replay(triggers)
  assert.ok(changes.length > 3, 'bursts keep coming while triggered')
  assert.ok(maxChangesInAnyWindow(changes) <= GLITCH.maxChangesPerWindow)
})

test('random triggers never change the text more than 3 times in any second', () => {
  const random = seeded(42)
  for (let run = 0; run < 50; run++) {
    let now = 0
    const triggers = Array.from({ length: 200 }, () => (now += random() * 700))
    const changes = replay(triggers)
    assert.ok(
      maxChangesInAnyWindow(changes) <= GLITCH.maxChangesPerWindow,
      `run ${run}`
    )
  }
})
