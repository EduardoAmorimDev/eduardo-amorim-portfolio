import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  GRID,
  bendEnergy,
  bendShift,
  bentLine,
  gridLines
} from './grid-motion.ts'

const LENGTH = 900
const pointer = { along: 300, across: 480 }

/** Largest distance any point of the line moved from where it rests. */
const maxShift = (rest: number, energy: number) =>
  Math.max(
    ...bentLine(rest, LENGTH, pointer, energy).map(point =>
      Math.abs(point.across - rest)
    )
  )

test('lines are 48px apart across the whole side', () => {
  assert.equal(GRID.spacing, 48)
  const lines = gridLines(LENGTH)
  assert.equal(lines[0], GRID.offset)
  for (let index = 1; index < lines.length; index++)
    assert.equal(lines[index] - lines[index - 1], 48)
  const last = lines.at(-1) ?? -Infinity
  assert.ok(last < LENGTH && last + 48 >= LENGTH, 'no gap at the far edge')
})

test('with no pointer, or once the bend has faded, every line is straight', () => {
  for (const rest of gridLines(LENGTH)) {
    for (const line of [
      bentLine(rest, LENGTH, null, 1),
      bentLine(rest, LENGTH, pointer, 0)
    ])
      assert.ok(line.every(point => point.across === rest))
  }
})

test('every line within 160px of a moving pointer bends, by at most 12px', () => {
  assert.equal(GRID.radius, 160)
  assert.equal(GRID.maxShift, 12)
  for (let across = -159; across <= 159; across += 1) {
    if (across === 0) continue
    const shift = maxShift(pointer.across + across, 1)
    assert.ok(shift > 0, `line ${across}px away bends`)
    assert.ok(shift <= 12 + 1e-9, `line ${across}px away: ${shift}px`)
  }
})

test('no point anywhere moves more than 12px', () => {
  for (let across = -200; across <= 200; across += 0.5)
    for (let along = -200; along <= 200; along += 0.5)
      assert.ok(Math.abs(bendShift(across, along, 1)) <= 12 + 1e-9)
})

test('the strongest bend reaches the full 12px', () => {
  const peak = Math.max(
    ...Array.from({ length: 1601 }, (_, i) => bendShift(i / 10, 0, 1))
  )
  assert.ok(peak > 11.99 && peak <= 12 + 1e-9, `peak ${peak}`)
})

test('lines beyond 160px of the pointer stay straight', () => {
  for (const across of [160, 168, 216, 400, -160, -168, -500])
    assert.equal(maxShift(pointer.across + across, 1), 0, `${across}px away`)
  for (let along = -400; along <= 400; along += 7)
    assert.equal(bendShift(10, 170 + Math.abs(along), 1), 0)
})

test('lines bend away from the pointer, on both sides', () => {
  assert.ok(bendShift(40, 0, 1) > 0)
  assert.ok(bendShift(-40, 0, 1) < 0)
})

test('the bend fades after the pointer stops and is gone within 800ms', () => {
  assert.equal(GRID.settleMs, 800)
  assert.ok(GRID.fadeMs <= GRID.settleMs)
  assert.equal(bendEnergy(0), 1)
  assert.equal(bendEnergy(-5), 1)
  let previous = 1
  for (let since = 10; since <= 2000; since += 10) {
    const energy = bendEnergy(since)
    assert.ok(energy <= previous, `fades monotonically at ${since}ms`)
    previous = energy
  }
  assert.equal(bendEnergy(GRID.settleMs), 0)
  assert.equal(maxShift(pointer.across + 40, bendEnergy(GRID.settleMs)), 0)
})

test('a bent line still spans the whole side, end to end', () => {
  const line = bentLine(pointer.across + 40, LENGTH, pointer, 1)
  assert.equal(line[0]?.along, 0)
  assert.equal(line.at(-1)?.along, LENGTH)
})
