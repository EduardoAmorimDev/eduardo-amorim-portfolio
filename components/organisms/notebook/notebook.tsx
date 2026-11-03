'use client'
import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { MathUtils } from 'three'
import { RenderGate } from '@/components/atoms/render-gate'
import '@/lib/three-console'
import { useNearViewport } from '@/lib/use-near-viewport'
import { DeviceCopy } from './device-copy'
import { NotebookScene } from './notebook-scene'
import { CAMERA } from './stages'
import { useScrollProgress } from './use-scroll-progress'

// why: the embedded pages start loading a screen before the section, well
// ahead of the first device, and are dropped a screen past it, so they cost
// nothing anywhere else on the page.
const SCREEN_LEAD = '100% 0px'
// why: share of a screen scrolled past the section over which the stage
// fades out; by then it has let go and moves with the real section, so the
// fade only swaps the picture of the page for the page itself.
const HANDOFF = 0.25

type NotebookProps = { id: string }

/**
 * Phone, tablet, then a laptop that opens, carried across the stage by the
 * scroll, each beside a chapter of the story; the camera then dives into the
 * laptop's screen, whose page is the projects section that follows, and the
 * real section takes over unnoticed; scrolling back plays it all in reverse.
 */
export const Notebook = ({ id }: NotebookProps) => {
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const progress = useScrollProgress(section)
  const screenLive = useNearViewport(section, SCREEN_LEAD)
  // why: once the real page has taken over, the hidden stage stops drawing.
  const [handedOff, setHandedOff] = useState(false)

  useEffect(() => {
    const update = () => {
      const element = section.current
      const view = stage.current
      if (!element || !view) return
      const past = window.innerHeight - element.getBoundingClientRect().bottom
      const fade = MathUtils.clamp(past / (window.innerHeight * HANDOFF), 0, 1)
      view.style.opacity = String(1 - fade)
      // why: once gone, the stage must not catch the clicks meant for the
      // real section now in its place.
      view.style.visibility = fade >= 1 ? 'hidden' : 'visible'
      setHandedOff(fade >= 1)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    // why: 7 screens tall to give the scroll room for the carousel and the
    // dive; the sticky child pins the stage. z-10: the next block is pulled
    // up under the last screen (page.tsx) and the stage covers it until the
    // hand-off; the section lets the pointer through to it after that.
    <section
      id={id}
      ref={section}
      aria-labelledby={`${id}-title`}
      className="pointer-events-none relative z-10 h-[700vh]"
    >
      {/* why: opaque, in the page's own colour, so the section pulled up
          beneath never shows through the transparent canvas. */}
      {/* why: select-none: <Html> puts real DOM behind a click-through
          canvas, so a double click would paint the screen selection blue. */}
      <div
        ref={stage}
        className="bg-background pointer-events-auto sticky top-0 h-svh select-none"
      >
        {/* why: no OrbitControls, so only the scroll moves the devices.
            dpr ≥ 1.5: MSAA alone left the thin edges stair-stepped. alpha:
            the sky is the page background. isolate: keeps drei <Html>'s
            huge z-index inside the canvas box. */}
        <Canvas
          className="isolate"
          data-testid="notebook-scene"
          dpr={[1.5, 2]}
          gl={{ alpha: true }}
          camera={{ position: [...CAMERA.position], fov: CAMERA.fov }}
        >
          <RenderGate active={!handedOff} />
          <NotebookScene progress={progress} screenLive={screenLive} />
        </Canvas>
        <DeviceCopy id={id} progress={progress} active={screenLive} />
      </div>
    </section>
  )
}
