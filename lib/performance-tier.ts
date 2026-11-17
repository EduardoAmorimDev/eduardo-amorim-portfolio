import type { TierResult } from 'detect-gpu'

/**
 * The visit's performance tier (task portfolio-lp-device-gate): decided once,
 * on load, from the GPU detect-gpu identifies and its benchmark table, and
 * never changed during the visit. `full` draws the 3D scenes where the
 * pointer is fine; `lite` draws no WebGL anywhere and stills the page's
 * effects. Null until the check has answered (`<html>` has no
 * `data-performance` then).
 */
export type PerformanceTier = 'full' | 'lite'

// why: the user's bar: a device that cannot run the site at 60 fps gets
// the light version (task, criterion 1).
export const FULL_FPS = 60
// why: a GPU detect-gpu has no benchmark for (Safari on any Mac, a GPU
// newer than its data) passes on a desktop with this many cores (task,
// criterion 2, Unresolved 1).
export const FALLBACK_CORES = 8
// why: past this the visit is lite rather than kept waiting (criterion 3).
export const CHECK_TIMEOUT_MS = 3000
// invariant: served by the site itself (scripts/copy-gpu-benchmarks.mjs),
// so no request leaves for a CDN (criterion 1).
export const BENCHMARKS_URL = '/detect-gpu/benchmarks'

/** What the check reads of detect-gpu's answer. */
export type GpuReading = Pick<TierResult, 'type' | 'fps'>

/** What the check reads of the device itself. */
export type DeviceReading = { finePointer: boolean; cores: number }

/** The tier a GPU reading and a device give; the same inputs, the same tier. */
export const decideTier = (
  gpu: GpuReading,
  device: DeviceReading
): PerformanceTier => {
  if (gpu.type === 'BENCHMARK')
    return (gpu.fps ?? 0) >= FULL_FPS ? 'full' : 'lite'
  if (gpu.type === 'FALLBACK')
    return device.finePointer && device.cores >= FALLBACK_CORES
      ? 'full'
      : 'lite'
  return 'lite'
}

/** What one run of the check needs, injected so it runs without a browser. */
export type CheckSteps = {
  /** Reads the GPU, e.g. detect-gpu's getGPUTier. */
  measure: () => Promise<GpuReading>
  /** Frees the WebGL context the measure used. */
  release: () => void
  device: DeviceReading
  timeoutMs?: number
}

/**
 * Runs the check once: the tier from the reading, `lite` if it throws or
 * takes over `timeoutMs`. The context is released before the tier resolves,
 * so no scene mounts while it is alive (criterion 6).
 */
export const runCheck = async ({
  measure,
  release,
  device,
  timeoutMs = CHECK_TIMEOUT_MS
}: CheckSteps): Promise<PerformanceTier> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<null>(resolve => {
    timer = setTimeout(() => resolve(null), timeoutMs)
  })
  try {
    const reading = await Promise.race([measure(), late])
    return reading ? decideTier(reading, device) : 'lite'
  } catch {
    return 'lite'
  } finally {
    clearTimeout(timer)
    release()
  }
}

let tier: PerformanceTier | null = null
let started: Promise<PerformanceTier> | null = null
const listeners = new Set<() => void>()

/** The tier now; null until the check has answered. */
export const currentTier = () => tier

/** Calls `listener` when the tier is decided; returns the unsubscribe. */
export const onTierChange = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const publish = (next: PerformanceTier) => {
  tier = next
  if (typeof document !== 'undefined')
    document.documentElement.dataset.performance = next
  for (const listener of listeners) listener()
}

/**
 * Decides the tier for the visit, once: later calls get the same promise
 * and never run the check again (criterion 4).
 */
export const startCheck = (steps: () => CheckSteps | PerformanceTier) => {
  started ??= (async () => {
    const plan = steps()
    const next = typeof plan === 'string' ? plan : await runCheck(plan)
    publish(next)
    return next
  })()
  return started
}
