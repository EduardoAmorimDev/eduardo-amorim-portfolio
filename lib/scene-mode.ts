import { captureTarget } from './capture'
import { currentTier, type PerformanceTier } from './performance-tier'
import { isFinePointer } from './use-fine-pointer'

/**
 * Whether the scenes that have a still (the hero, the reach and the globe)
 * are drawn live in 3D or shown as their images (task
 * portfolio-lp-device-gate): live only on a fine pointer in the `full`
 * tier, for the whole visit; null until the tier is known.
 */
export type SceneMode = 'live' | 'still'

/** The mode a pointer and a tier give; the still renderer always shoots live. */
export const modeFor = (
  finePointer: boolean,
  tier: PerformanceTier | null,
  capture: boolean
): SceneMode | null => {
  if (capture) return 'live'
  if (!tier) return null
  return finePointer && tier === 'full' ? 'live' : 'still'
}

/** The scenes' mode now, read in the browser. */
export const sceneMode = () =>
  modeFor(isFinePointer(), currentTier(), captureTarget() !== null)
