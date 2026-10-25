'use client'
import { Canvas } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import { HeroGrid } from './hero-grid'
import { HeroScene } from './hero-scene'
import { useScrollProgress } from './use-scroll-progress'

type LaptopHeroProps = {
  id?: string
  /** Laid over the pinned scene, e.g. the hero copy. */
  children?: ReactNode
}

export const LaptopHero = ({ id, children }: LaptopHeroProps) => {
  const section = useRef<HTMLElement>(null)
  const progress = useScrollProgress(section)

  return (
    // why: the section is 3 screens tall to give the scroll room to drive the
    // animation; the sticky child keeps the canvas pinned while it does.
    // select-none: <Html> puts real DOM behind a click-through canvas, so a
    // double click would select it and paint the screen in selection blue.
    <section id={id} ref={section} className="relative h-[300vh]">
      <div className="sticky top-0 h-svh select-none">
        {/* why: first in the DOM, so the transparent canvas paints over it. */}
        <HeroGrid />
        {/* why: no OrbitControls, so the camera stays put: the viewer can
            neither drag nor zoom; only the scroll moves the laptop.
            dpr: at least 1.5× even on 1× screens; MSAA alone left the thin
            glass edges stair-stepped, and the browser's downscale smooths them.
            alpha: the sky stays transparent, showing the theme and the grid. */}
        <Canvas
          className="isolate"
          data-testid="hero-scene"
          dpr={[1.5, 2]}
          gl={{ alpha: true }}
          camera={{ position: [0, 1, 7], fov: 40 }}
        >
          <HeroScene progress={progress} />
        </Canvas>
        {/* why: drei's <Html> gives the canvas a z-index in the millions;
            `isolate` above keeps it inside the canvas box, so these children
            paint over the scene. */}
        {children}
      </div>
    </section>
  )
}
