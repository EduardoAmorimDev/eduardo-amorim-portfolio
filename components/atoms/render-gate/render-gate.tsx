'use client'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { setSceneDrawing, type SceneName } from '@/lib/scene-mode'
import { useNearViewport } from '@/lib/use-near-viewport'

// why: a quarter screen of lead, so a scene starts drawing again before it
// scrolls into view and its last paused frame is never seen.
export const RENDER_LEAD = '25% 0px'

type RenderGateProps = {
  /** False stops the loop even on screen, e.g. while the scene is hidden. */
  active?: boolean
  /** The scene this canvas draws, whose slow frames turn it still. */
  scene?: SceneName
}

/**
 * Stops its `<Canvas>`'s render loop while the canvas is off screen, so a
 * scene nobody sees costs no GPU time; on screen it draws every frame, on
 * every device (task portfolio-lp-still-scenes, 15). Place it inside the
 * `<Canvas>`.
 */
export const RenderGate = ({ active = true, scene }: RenderGateProps) => {
  const canvas = useRef(useThree(state => state.gl.domElement))
  const get = useThree(state => state.get)
  const near = useNearViewport(canvas, RENDER_LEAD)

  useEffect(() => {
    const { clock, setFrameloop } = get()
    const running = near && active
    // hazard: setFrameloop restarts the clock at 0, which would snap every
    // animation driven by elapsedTime back to its first pose; carrying the
    // time over resumes them where they stopped.
    const elapsed = clock.elapsedTime
    setFrameloop(running ? 'always' : 'never')
    clock.elapsedTime = elapsed
    if (!scene) return
    setSceneDrawing(scene, running)
    return () => setSceneDrawing(scene, false)
  }, [get, near, active, scene])

  return null
}
