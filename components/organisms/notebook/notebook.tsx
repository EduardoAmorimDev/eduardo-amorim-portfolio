'use client'
import { Canvas } from '@react-three/fiber'
import { useRef } from 'react'
import { RenderGate } from '@/components/atoms/render-gate'
import { useNearViewport } from '@/lib/use-near-viewport'
import { NotebookScene } from './notebook-scene'
import { useScrollProgress } from './use-scroll-progress'

// why: the embedded site starts loading a screen before the notebook, well
// ahead of the screen turning on, and is dropped a screen past it, so it
// costs nothing anywhere else on the page.
const SCREEN_LEAD = '100% 0px'

type NotebookProps = { id?: string }

/** The laptop that straightens, opens and turns on as the page scrolls. */
export const Notebook = ({ id }: NotebookProps) => {
  const section = useRef<HTMLElement>(null)
  const progress = useScrollProgress(section)
  const screenLive = useNearViewport(section, SCREEN_LEAD)

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
          <RenderGate />
          <NotebookScene progress={progress} screenLive={screenLive} />
        </Canvas>
      </div>
    </section>
  )
}
