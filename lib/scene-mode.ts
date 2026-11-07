import { isFinePointer } from './use-fine-pointer'
import { captureTarget } from './capture'

/**
 * Whether each scene that has a still (task portfolio-lp-still-scenes) is
 * drawn live in 3D or shown as its image: touch shows the image from the
 * start (1, 5); a fine pointer starts live and turns a scene still, for the
 * visit, once it draws under SCENE_BELOW_FPS (11). Never back to live.
 */
export type SceneName = 'hero' | 'reach'
export type SceneMode = 'live' | 'still'

const SCENES: readonly SceneName[] = ['hero', 'reach']

let modes: Record<SceneName, SceneMode> | null = null
const drawing = new Set<SceneName>()
const listeners = new Set<() => void>()

const read = () => {
  // invariant: decided once per visit, from the same pointer reading the
  // rest of the page uses (use-fine-pointer.ts).
  if (!modes) {
    const first = firstSceneMode()
    modes = { hero: first, reach: first }
  }
  return modes
}

/** The mode every scene started the visit in, read in the browser. */
export const firstSceneMode = (): SceneMode =>
  isFinePointer() || captureTarget() ? 'live' : 'still'

/** The scene's mode now, read in the browser. */
export const sceneMode = (scene: SceneName) => read()[scene]

/** Calls `listener` when a scene changes mode; returns the unsubscribe. */
export const onSceneModeChange = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Shows `scene` as its image for the rest of the visit. */
export const turnStill = (scene: SceneName) => {
  const current = read()
  // why: the still renderer (scripts/render-stills.mjs) draws the live
  // scene at sizes no GPU holds at 50 fps; it must not be swapped mid-shot.
  if (current[scene] === 'still' || captureTarget()) return
  modes = { ...current, [scene]: 'still' }
  drawing.delete(scene)
  for (const listener of listeners) listener()
}

/** Marks whether `scene` is drawing live on screen this moment. */
export const setSceneDrawing = (scene: SceneName, on: boolean) => {
  if (on && read()[scene] === 'live') drawing.add(scene)
  else drawing.delete(scene)
}

/** The live scenes drawing on screen now, the ones a slow frame is blamed on. */
export const drawingScenes = (): readonly SceneName[] =>
  SCENES.filter(scene => drawing.has(scene))

/** Whether any scene could still turn still, so is worth measuring. */
export const anyLiveScene = () => SCENES.some(scene => read()[scene] === 'live')
