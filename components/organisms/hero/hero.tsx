'use client'
import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useState, type ReactNode } from 'react'
import { RenderGate } from '@/components/atoms/render-gate'
import '@/lib/three-console'
import { Gargantua } from './gargantua'

// why: the image is soft light, so one shader pass per CSS px suffices, and
// each pass traces a ray, the scene's whole cost; a GPU that cannot keep up
// traces fewer, larger pixels, which the film grain hides.
const DPR = { full: 1, reduced: 0.7 }

type HeroProps = {
  id?: string
  /** Laid over the scene, e.g. the hero copy. */
  children?: ReactNode
}

/**
 * The first screen: a ray-traced black hole with its lensed disk, filling
 * the screen, and the copy beside it (task hero-gargantua).
 */
export const Hero = ({ id, children }: HeroProps) => {
  const [dpr, setDpr] = useState(DPR.full)

  return (
    <section
      id={id}
      className="relative h-svh overflow-clip bg-black select-none"
    >
      {/* why: decoration (criterion 42): the hero's meaning is its copy. */}
      <Canvas
        aria-hidden="true"
        className="isolate"
        data-testid="hero-scene"
        dpr={dpr}
        gl={{ antialias: false }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(DPR.reduced)}
          onIncline={() => setDpr(DPR.full)}
          flipflops={3}
          onFallback={() => setDpr(DPR.reduced)}
        />
        <RenderGate />
        <Gargantua />
      </Canvas>
      {/* why: the frame melts into the page's ink at its foot, where the
          next section begins. */}
      <div
        aria-hidden="true"
        className="to-background pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-b from-transparent"
      />
      {children}
    </section>
  )
}
