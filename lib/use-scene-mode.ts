import { useSyncExternalStore } from 'react'
import { onSceneModeChange, sceneMode, type SceneName } from './scene-mode'

const unknown = () => null

/**
 * Whether `scene` is drawn live or shown as its image (lib/scene-mode.ts);
 * null on the server, which cannot tell a touch screen from a mouse.
 */
export const useSceneMode = (scene: SceneName) =>
  useSyncExternalStore(onSceneModeChange, () => sceneMode(scene), unknown)
