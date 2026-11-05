import { useSyncExternalStore } from 'react'
import { currentTier, onTierChange } from './performance-tier'

const lite = () => currentTier() === 'lite'
const never = () => false

/** Whether the visit has turned lite (lib/performance-tier.ts). */
export const useLiteMode = () => useSyncExternalStore(onTierChange, lite, never)
