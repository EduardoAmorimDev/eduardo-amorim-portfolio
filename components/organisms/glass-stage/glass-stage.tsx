'use client'
import { View } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { StudioEnvironment } from '@/components/atoms/studio-environment'
import '@/lib/three-console'
import { GlassContext, createBackdrop } from './glass-material'

// why: the device's own ratio, up to 2: the canvas covers the whole window
// and is composited over the page on every frame a piece of glass moves, so
// drawing it at 1.5× on a 1× screen cost 2.25× the pixels for 64 px icons.
const DPR: [number, number] = [1, 2]

const StageRoot = () => {
  const rootScene = useThree(state => state.scene)
  // why: <Canvas> renders this only in the browser, after mount, which is
  // when a canvas and the theme's CSS variables are available.
  const backdrop = useMemo(() => createBackdrop(), [])
  useEffect(() => () => backdrop.dispose(), [backdrop])
  const shared = useMemo(() => ({ backdrop, rootScene }), [backdrop, rootScene])

  return (
    <GlassContext.Provider value={shared}>
      <StudioEnvironment />
      <View.Port />
    </GlassContext.Provider>
  )
}

/**
 * The one canvas every piece of glass on the page is drawn in (task
 * reach-and-seams, Decided 1): fixed over the whole window, above the page
 * and blind to the pointer. Each icon and the cursor is a drei `<View>`
 * that draws into it inside its own box; `frameloop="demand"` keeps it idle
 * until one of them asks for a frame.
 */
export const GlassStage = () => (
  <Canvas
    aria-hidden="true"
    data-testid="glass-stage"
    frameloop="demand"
    dpr={DPR}
    gl={{ alpha: true }}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 60,
      pointerEvents: 'none'
    }}
  >
    <StageRoot />
  </Canvas>
)
