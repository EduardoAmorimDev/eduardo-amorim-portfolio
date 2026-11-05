'use client'
import { View } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, type ReactNode } from 'react'
import { StudioEnvironment } from '@/components/atoms/studio-environment'
import '@/lib/three-console'
import { useFinePointer } from '@/lib/use-fine-pointer'
import { useLiteMode } from '@/lib/use-lite-mode'
import { GlassContext, createBackdrop } from './glass-material'
import { STILL_SIZE } from '@/lib/canvas-size'

// why: the device's own ratio, up to 2: the canvas covers the whole window
// and is composited over the page on every frame a piece of glass moves, so
// drawing it at 1.5× on a 1× screen cost 2.25× the pixels for 64 px icons.
const DPR: [number, number] = [1, 2]

/**
 * What every canvas of glass shares: the backdrop the glass refracts and
 * the studio reflections, lent to each view's scene. Place it inside the
 * `<Canvas>`.
 */
export const GlassRoot = ({ children }: { children: ReactNode }) => {
  const rootScene = useThree(state => state.scene)
  // why: <Canvas> renders this only in the browser, after mount, which is
  // when a canvas and the theme's CSS variables are available.
  const backdrop = useMemo(() => createBackdrop(), [])
  useEffect(() => () => backdrop.dispose(), [backdrop])
  const shared = useMemo(() => ({ backdrop, rootScene }), [backdrop, rootScene])

  return (
    <GlassContext.Provider value={shared}>
      <StudioEnvironment />
      {children}
    </GlassContext.Provider>
  )
}

/**
 * The one canvas the glass is drawn in where the device has a fine pointer
 * (task reach-and-seams, Decided 1): fixed over the whole window, above the
 * page and blind to the pointer. Each icon and the cursor is a drei `<View>`
 * that draws into it inside its own box; `frameloop="demand"` keeps it idle
 * until one of them asks for a frame. On touch the icons are drawn by
 * GlassShelf instead (task portfolio-lp-mobile, Decided), and there is no
 * cursor, so this is not mounted.
 */
export const GlassStage = () => {
  const fine = useFinePointer()
  const lite = useLiteMode()
  if (!fine) return null
  return (
    <Canvas
      aria-hidden="true"
      data-testid="glass-stage"
      resize={STILL_SIZE}
      frameloop="demand"
      dpr={lite ? 1 : DPR}
      gl={{ alpha: true }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        pointerEvents: 'none'
      }}
    >
      <GlassRoot>
        <View.Port />
      </GlassRoot>
    </Canvas>
  )
}
