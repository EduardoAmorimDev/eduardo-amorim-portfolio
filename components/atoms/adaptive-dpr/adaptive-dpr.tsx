'use client'
import {
  PerformanceMonitor,
  type PerformanceMonitorApi
} from '@react-three/drei'
import { useCallback, useMemo, useRef } from 'react'
import {
  DPR_STEP,
  dprAt,
  frameRateBounds,
  resolveDpr,
  type DprSetting
} from '@/lib/adaptive-dpr'

// why: six quarter-second samples, five of which must agree, decide a step
// in 1.5 s: soon enough that a heavy scene stops juddering quickly, slow
// enough that one hitch (a page loading) changes nothing.
const SAMPLES = { iterations: 6, ms: 250, threshold: 0.75 }
// why: after this many steps either way the canvas stops measuring and
// keeps a ratio, so a scene on the edge never resizes over and over.
const FLIPFLOPS = 6

type AdaptiveDprProps = {
  /** The cheapest pixel ratio the scene may fall to. */
  min: number
  /** The sharpest, where it starts; the Canvas `dpr` until a first change. */
  max: DprSetting
  // hazard: r3f resets the ratio to the Canvas `dpr` prop whenever the
  // Canvas renders, so the ratio lives in the owner's state, set from here.
  /** Receives each new ratio, for the Canvas `dpr` prop. */
  onChange: (dpr: number) => void
}

/**
 * Lowers its `<Canvas>`'s pixel ratio, step by step, while the page draws
 * under the display's refresh rate, and raises it back once it keeps up.
 * Measures only while the canvas renders. Place it inside the `<Canvas>`.
 */
export const AdaptiveDpr = ({
  min,
  max,
  onChange: setDpr
}: AdaptiveDprProps) => {
  const top = useMemo(() => resolveDpr(max, window.devicePixelRatio), [max])
  // why: the factor before the last step and after it; the monitor reports
  // the change before it gives up, so the fallback compares the two.
  const steps = useRef({ before: 1, after: 1 })
  const apply = useCallback(
    ({ factor }: PerformanceMonitorApi) => {
      steps.current = { before: steps.current.after, after: factor }
      setDpr(dprAt(factor, min, top))
    },
    [setDpr, min, top]
  )
  // hazard: the monitor gives up on its last step, which may be a rise it
  // cannot hold; that one is taken back, so the frame rate is kept.
  const settle = useCallback(
    ({ factor }: PerformanceMonitorApi) => {
      if (factor > steps.current.before)
        setDpr(dprAt(factor - DPR_STEP, min, top))
    },
    [setDpr, min, top]
  )

  return (
    <PerformanceMonitor
      {...SAMPLES}
      factor={1}
      step={DPR_STEP}
      flipflops={FLIPFLOPS}
      bounds={frameRateBounds}
      onChange={apply}
      onFallback={settle}
    />
  )
}
