'use client'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useNearViewport } from '@/lib/use-near-viewport'

// why: a quarter screen of lead, so a scene starts drawing again before it
// scrolls into view and its last paused frame is never seen.
export const RENDER_LEAD = '25% 0px'

/**
 * Stops its `<Canvas>`'s render loop while the canvas is off screen, so a
 * scene nobody sees costs no GPU time. Place it inside the `<Canvas>`.
 */
export const RenderGate = () => {
  const canvas = useRef(useThree(state => state.gl.domElement))
  const get = useThree(state => state.get)
  const near = useNearViewport(canvas, RENDER_LEAD)

  useEffect(() => {
    const { clock, setFrameloop } = get()
    // hazard: setFrameloop restarts the clock at 0, which would snap every
    // animation driven by elapsedTime back to its first pose; carrying the
    // time over resumes them where they stopped.
    const elapsed = clock.elapsedTime
    setFrameloop(near ? 'always' : 'never')
    clock.elapsedTime = elapsed
  }, [get, near])

  return null
}
