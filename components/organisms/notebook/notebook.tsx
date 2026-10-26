'use client'
import { Canvas } from '@react-three/fiber'
import { useRef } from 'react'
import { NotebookScene } from './notebook-scene'
import { useScrollProgress } from './use-scroll-progress'

type NotebookProps = { id?: string }

/** The laptop that straightens, opens and turns on as the page scrolls. */
export const Notebook = ({ id }: NotebookProps) => {
  const section = useRef<HTMLElement>(null)
  const progress = useScrollProgress(section)

  return (
    // why: the section is 3 screens tall to give the scroll room to drive the
    // animation; the sticky child keeps the canvas pinned while it does.
    // select-none: <Html> puts real DOM behind a click-through canvas, so a
    // double click would select it and paint the screen in selection blue.
    <section
      id={id}
      ref={section}
      aria-label="Notebook"
      className="relative h-[300vh]"
    >
      <div className="sticky top-0 h-svh select-none">
        {/* why: no OrbitControls, so only the scroll moves the laptop.
            dpr ≥ 1.5: MSAA alone left the thin edges stair-stepped. alpha:
            the sky is the page background. isolate: keeps drei <Html>'s
            huge z-index inside the canvas box. */}
        <Canvas
          className="isolate"
          data-testid="notebook-scene"
          dpr={[1.5, 2]}
          gl={{ alpha: true }}
          camera={{ position: [0, 1, 7], fov: 40 }}
        >
          <NotebookScene progress={progress} />
        </Canvas>
      </div>
    </section>
  )
}
