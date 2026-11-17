import { useSyncExternalStore } from 'react'
import { onTierChange } from './performance-tier'
import { sceneMode } from './scene-mode'

const unknown = () => null

/**
 * Whether the scenes are drawn live or shown as their images
 * (lib/scene-mode.ts); null on the server and until the tier is known.
 */
export const useSceneMode = () =>
  useSyncExternalStore(onTierChange, sceneMode, unknown)
