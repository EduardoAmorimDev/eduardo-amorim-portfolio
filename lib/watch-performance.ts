import {
  SCENE_WINDOW_MS,
  TIER_WINDOW_MS,
  createJudge,
  currentTier,
  turnLite
} from './performance-tier'
import {
  anyLiveScene,
  drawingScenes,
  turnStill,
  type SceneName
} from './scene-mode'

/**
 * Measures every frame and blames a slow one on the live scenes drawing in
 * it, which turn still (task portfolio-lp-still-scenes, 11); with none
 * drawing, on the page, which turns lite (16). Stops once nothing is left
 * to judge. Returns the stop.
 */
export const watchPerformance = () => {
  const page = createJudge(TIER_WINDOW_MS)
  const scenes: Record<SceneName, ReturnType<typeof createJudge>> = {
    hero: createJudge(SCENE_WINDOW_MS),
    reach: createJudge(SCENE_WINDOW_MS)
  }
  let frame = 0
  let last = 0
  const tick = (now: number) => {
    if (currentTier() === 'lite' && !anyLiveScene()) return
    const interval = last ? now - last : 0
    last = now
    // invariant: a judge only hears the frames it is blamed for, so its
    // warm-up is the first second that scene draws (its models loading,
    // its shaders compiling) and its windows add up drawing time alone; a
    // scene at the edge of the window, drawing in short spells, is judged.
    const drawing = drawingScenes()
    if (interval > 0) {
      if (drawing.length > 0) {
        for (const scene of drawing)
          if (scenes[scene].push(interval)) turnStill(scene)
      } else if (currentTier() === 'full' && page.push(interval)) turnLite()
    }
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}
