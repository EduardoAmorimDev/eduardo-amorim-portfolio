'use client'
import { Canvas } from '@react-three/fiber'
import { useRef } from 'react'
import { HeroScene } from './hero-scene'
import { useScrollProgress } from './use-scroll-progress'

export const LaptopHero = () => {
  const section = useRef<HTMLElement>(null)
  const progress = useScrollProgress(section)

  return (
    // why: the section is 3 screens tall to give the scroll room to drive the
    // animation; the sticky child keeps the canvas pinned while it does.
    // select-none: <Html> puts real DOM behind a click-through canvas, so a
    // double click would select it and paint the screen in selection blue.
    <section ref={section} className="relative h-[300vh]">
      <div className="sticky top-0 h-svh select-none">
        {/* why: no OrbitControls, so the camera stays put: the viewer can
            neither drag nor zoom; only the scroll moves the laptop.
            dpr: at least 1.5× even on 1× screens; MSAA alone left the thin
            glass edges stair-stepped, and the browser's downscale smooths them. */}
        <Canvas dpr={[1.5, 2]} camera={{ position: [0, 1, 7], fov: 40 }}>
          <HeroScene progress={progress} />
        </Canvas>
      </div>
    </section>
  )
}
