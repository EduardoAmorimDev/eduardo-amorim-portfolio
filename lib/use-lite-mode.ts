import { useSyncExternalStore } from 'react'
import { currentTier, onTierChange } from './performance-tier'

const lite = () => currentTier() === 'lite'
const never = () => false
const tier = () => currentTier()
const unknown = () => null

/** Whether the visit is lite (lib/performance-tier.ts). */
export const useLiteMode = () => useSyncExternalStore(onTierChange, lite, never)

/** The visit's tier; null on the server and until the check answers. */
export const useTier = () => useSyncExternalStore(onTierChange, tier, unknown)
