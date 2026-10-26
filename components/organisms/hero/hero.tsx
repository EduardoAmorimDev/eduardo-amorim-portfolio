'use client'
import { Canvas } from '@react-three/fiber'
import type { ReactNode } from 'react'
import { RenderGate } from '@/components/atoms/render-gate'
import { HeroGrid } from './hero-grid'
import { HeroScene } from './hero-scene'

type HeroProps = {
  id?: string
  /** Laid over the scene, e.g. the hero copy. */
  children?: ReactNode
}

/** The first screen: the line grid, the light and the glass icons. */
export const Hero = ({ id, children }: HeroProps) => (
  <section id={id} className="relative h-svh overflow-clip select-none">
    {/* why: first in the DOM, so the transparent canvas paints over it. */}
    <HeroGrid />
    {/* why: no OrbitControls, so the camera stays put: the viewer can neither
        drag nor zoom. dpr: at least 1.5× even on 1× screens; MSAA alone left
        the thin glass edges stair-stepped. alpha: the sky stays transparent,
        showing the page background and the grid. */}
    <Canvas
      className="isolate"
      data-testid="hero-scene"
      dpr={[1.5, 2]}
      gl={{ alpha: true }}
      camera={{ position: [0, 1, 7], fov: 40 }}
    >
      <RenderGate />
      <HeroScene />
    </Canvas>
    {children}
  </section>
)
