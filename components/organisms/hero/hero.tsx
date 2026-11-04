'use client'
import { Canvas } from '@react-three/fiber'
import { useState, type ReactNode } from 'react'
import { AdaptiveDpr } from '@/components/atoms/adaptive-dpr'
import { RenderGate } from '@/components/atoms/render-gate'
import '@/lib/three-console'
import { BLEED, Gargantua } from './gargantua'

// why: the image is soft light, so one shader pass per CSS px suffices, and
// each pass traces a ray, the scene's whole cost; a GPU that cannot keep up
// traces fewer, larger pixels, down to 0.4, which the film grain hides.
const DPR = { full: 1, reduced: 0.4 }

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
    // why: overflow-x only, so the canvas spills below the section; the next
    // block paints over the spill (later in the DOM), its sky and text on top.
    <section
      id={id}
      className="bg-background relative h-svh overflow-x-clip select-none"
    >
      {/* why: decoration (criterion 42): the hero's meaning is its copy. The
          canvas runs BLEED screens past the section and fades out there, so
          the lens dissolves into the page's sky instead of ending on a line. */}
      <Canvas
        aria-hidden="true"
        className="isolate [mask-image:linear-gradient(to_bottom,black_calc(100%-75svh),transparent)]"
        data-testid="hero-scene"
        dpr={dpr}
        gl={{ antialias: false }}
        style={{
          position: 'absolute',
          inset: '0 0 auto 0',
          height: `calc(100% + ${BLEED * 100}svh)`,
          pointerEvents: 'none'
        }}
      >
        <AdaptiveDpr min={DPR.reduced} max={DPR.full} onChange={setDpr} />
        <RenderGate />
        <Gargantua />
      </Canvas>
      {children}
    </section>
  )
}
