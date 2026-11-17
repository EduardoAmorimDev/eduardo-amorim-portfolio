import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import {
  CHECK_TIMEOUT_MS,
  FALLBACK_CORES,
  FULL_FPS,
  currentTier,
  decideTier,
  runCheck,
  startCheck,
  type DeviceReading,
  type GpuReading
} from './performance-tier.ts'

const desktop: DeviceReading = { finePointer: true, cores: 16 }
const phone: DeviceReading = { finePointer: false, cores: 8 }

test('a known gpu at 60 fps or more is full', () => {
  assert.equal(FULL_FPS, 60)
  for (const device of [desktop, phone]) {
    assert.equal(decideTier({ type: 'BENCHMARK', fps: 60 }, device), 'full')
    assert.equal(decideTier({ type: 'BENCHMARK', fps: 144 }, device), 'full')
  }
})

test('below 60 fps, blocklisted or without webgl is lite', () => {
  const lite: GpuReading[] = [
    { type: 'BENCHMARK', fps: 59 },
    { type: 'BENCHMARK', fps: 21 },
    { type: 'BENCHMARK' },
    { type: 'BLOCKLISTED' },
    { type: 'WEBGL_UNSUPPORTED' }
  ]
  for (const gpu of lite)
    for (const device of [desktop, phone])
      assert.equal(decideTier(gpu, device), 'lite', JSON.stringify(gpu))
})

test('an unknown gpu is full only on a fine pointer with 8 cores or more', () => {
  assert.equal(FALLBACK_CORES, 8)
  const unknown: GpuReading = { type: 'FALLBACK' }
  assert.equal(decideTier(unknown, { finePointer: true, cores: 8 }), 'full')
  assert.equal(decideTier(unknown, { finePointer: true, cores: 7 }), 'lite')
  assert.equal(decideTier(unknown, { finePointer: false, cores: 16 }), 'lite')
})

test('a check that throws is lite', async () => {
  const tier = await runCheck({
    measure: () => Promise.reject(new Error('benchmarks unreachable')),
    release: () => undefined,
    device: desktop
  })
  assert.equal(tier, 'lite')
})

test('a check that takes over 3000 ms is lite', async () => {
  assert.equal(CHECK_TIMEOUT_MS, 3000)
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    let answer: (reading: GpuReading) => void = () => undefined
    const pending = runCheck({
      measure: () =>
        new Promise<GpuReading>(resolve => {
          answer = resolve
        }),
      release: () => undefined,
      device: desktop
    })
    mock.timers.tick(CHECK_TIMEOUT_MS - 1)
    let settled = false
    void pending.then(() => {
      settled = true
    })
    await Promise.resolve()
    assert.equal(settled, false, 'still waiting at 2999 ms')
    mock.timers.tick(1)
    assert.equal(await pending, 'lite')
    // invariant: an answer after the deadline changes nothing.
    answer({ type: 'BENCHMARK', fps: 120 })
    assert.equal(await pending, 'lite')
  } finally {
    mock.timers.reset()
  }
})

test("the check's context is lost before the tier is told", async () => {
  const order: string[] = []
  await runCheck({
    measure: async () => {
      order.push('measure')
      return { type: 'BENCHMARK', fps: 90 }
    },
    release: () => order.push('release'),
    device: desktop
  }).then(tier => order.push(`tier ${tier}`))
  assert.deepEqual(order, ['measure', 'release', 'tier full'])

  const failed: string[] = []
  await runCheck({
    measure: () => Promise.reject(new Error('no gpu')),
    release: () => failed.push('release'),
    device: desktop
  }).then(tier => failed.push(`tier ${tier}`))
  assert.deepEqual(failed, ['release', 'tier lite'])
})

test('the tier is decided once', async () => {
  assert.equal(currentTier(), null)
  let measured = 0
  const steps = () => ({
    measure: async (): Promise<GpuReading> => {
      measured += 1
      return { type: 'BENCHMARK', fps: 75 }
    },
    release: () => undefined,
    device: desktop
  })
  const first = await startCheck(steps)
  const again = await startCheck(() => 'lite')
  assert.equal(first, 'full')
  assert.equal(again, 'full')
  assert.equal(currentTier(), 'full')
  assert.equal(measured, 1)
})
