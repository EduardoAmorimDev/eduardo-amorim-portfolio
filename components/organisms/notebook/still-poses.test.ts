import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deviceOrder, type Device } from './stages.ts'
import { stillPose } from './still-poses.ts'

const posesAt = (progress: number, viewer: Device, landscape = false) =>
  stillPose({
    progress,
    order: deviceOrder(viewer),
    viewer,
    landscape,
    offstage: () => 5
  })

const shown = (progress: number, viewer: Device, landscape = false) =>
  posesAt(progress, viewer, landscape)
    .filter(pose => pose.visible)
    .map(pose => pose.shot)

test("on a phone the images come tablet, laptop, phone (the visitor's last)", () => {
  assert.deepEqual(shown(0.1, 'phone'), ['tablet'])
  assert.deepEqual(shown(0.215, 'phone'), ['tabletLandscape'])
  assert.deepEqual(shown(0.37, 'phone'), ['laptop'])
  assert.deepEqual(shown(0.75, 'phone'), ['phone'])
})

test('on a tablet the tablet comes last, in the window orientation', () => {
  assert.deepEqual(shown(0.75, 'tablet'), ['tablet'])
  assert.deepEqual(shown(0.75, 'tablet', true), ['tabletLandscape'])
})

test('only the last device zooms, and only in the zoom window', () => {
  const before = posesAt(0.79, 'phone').find(pose => pose.shot === 'phone')
  const end = posesAt(0.96, 'phone')
  assert.equal(before?.dive, 0)
  assert.equal(end.find(pose => pose.shot === 'phone')?.dive, 1)
  for (const pose of end.filter(pose => pose.shot !== 'phone'))
    assert.equal(pose.dive, 0)
})

test('the last device rests square to the window before the zoom', () => {
  const rest = posesAt(0.75, 'phone').find(pose => pose.shot === 'phone')
  const values = rest
    ? [rest.x, rest.scale, rest.rotateX, rest.rotateY, rest.rotateZ]
    : []
  assert.deepEqual(
    values.map(value => Math.abs(value)),
    [0, 1, 0, 0, 0]
  )
})
