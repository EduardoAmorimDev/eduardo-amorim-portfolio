'use client'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useLiteMode } from '@/lib/use-lite-mode'
import { useNearViewport } from '@/lib/use-near-viewport'

// why: a quarter screen of lead, so a scene starts drawing again before it
// scrolls into view and its last paused frame is never seen.
export const RENDER_LEAD = '25% 0px'
// why: lite draws a scene every other frame, halving its main-thread cost
// while the page itself keeps scrolling at full rate (task
// portfolio-lp-60fps, 6); motion is timed, so it keeps its pace.
export const LITE_FRAME_EVERY = 2

type RenderGateProps = {
  /** False stops the loop even on screen, e.g. while the scene is hidden. */
  active?: boolean
}

/**
 * Stops its `<Canvas>`'s render loop while the canvas is off screen, so a
 * scene nobody sees costs no GPU time, and in lite draws only every
 * LITE_FRAME_EVERY frames. Place it inside the `<Canvas>`.
 */
export const RenderGate = ({ active = true }: RenderGateProps) => {
  const canvas = useRef(useThree(state => state.gl.domElement))
  const get = useThree(state => state.get)
  const near = useNearViewport(canvas, RENDER_LEAD)
  const lite = useLiteMode()

  useEffect(() => {
    const { clock, setFrameloop, advance } = get()
    const running = near && active
    // hazard: setFrameloop restarts the clock at 0, which would snap every
    // animation driven by elapsedTime back to its first pose; carrying the
    // time over resumes them where they stopped.
    const elapsed = clock.elapsedTime
    setFrameloop(running && !lite ? 'always' : 'never')
    clock.elapsedTime = elapsed
    if (!running || !lite) return
    // invariant: in 'never', advance takes the clock's own time in seconds;
    // each step adds the time since the last one to the clock as it stands,
    // since r3f's own frames (a resize) set it in ms, and adding to a stale
    // value ran it backwards, the frame time negative, the poses NaN.
    let last = performance.now()
    let frame = 0
    let count = 0
    const tick = (now: number) => {
      if (count++ % LITE_FRAME_EVERY === 0) {
        advance(get().clock.elapsedTime + Math.max(now - last, 0) / 1000)
        last = now
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [get, near, active, lite])

  return null
}
