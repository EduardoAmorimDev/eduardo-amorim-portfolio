'use client'
import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AdaptiveDpr } from '@/components/atoms/adaptive-dpr'
import type { DprSetting } from '@/lib/adaptive-dpr'
import { useNearViewport } from '@/lib/use-near-viewport'
import { RenderGate } from '@/components/atoms/render-gate'
import { VisibleScissor } from '@/components/atoms/visible-scissor'
import '@/lib/three-console'
import {
  onReducedMotionChange,
  prefersReducedMotion
} from '@/lib/media-preferences'
import { BLEED, Gargantua, isGone } from './gargantua'
import { STILL_SIZE } from '@/lib/canvas-size'

// why: a ray per screen pixel, up to 2 per CSS px, so a phone's 2-3x screen
// shows the disk's rings sharp, not stair-stepped as at 1; a GPU that cannot
// keep up traces fewer, larger pixels, down to 0.4, which the grain hides.
const DPR = { full: [1, 2] as [number, number], reduced: 0.4 }

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
  const [dpr, setDpr] = useState<DprSetting>(DPR.full)
  const section = useRef<HTMLElement>(null)
  // why: the canvas runs a screen past the hero, still on screen after its
  // image has faded out; it stops drawing then instead of tracing clear rays.
  const [gone, setGone] = useState(false)
  // why: a screen or more past the hero it is settled; no scroll reads it.
  const near = useNearViewport(section, '100% 0px')

  useEffect(() => {
    const update = () => {
      const element = section.current
      if (!element) return
      const { top, height } = element.getBoundingClientRect()
      setGone(isGone(-top / Math.max(height, 1), prefersReducedMotion()))
    }
    update()
    if (!near) return
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    const stop = onReducedMotionChange(update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      stop()
    }
  }, [near])

  return (
    // why: overflow-x only, so the canvas spills below the section; the next
    // block paints over the spill (later in the DOM), its sky and text on top.
    <section
      id={id}
      ref={section}
      className="bg-background relative h-svh overflow-x-clip select-none"
    >
      {/* why: decoration (criterion 42): the hero's meaning is its copy. The
          canvas runs BLEED screens past the section and fades out there, so
          the lens dissolves into the page's sky instead of ending on a line;
          the shader fades it (gargantua-shader.ts), as a CSS mask over a
          canvas that changes every frame cost the compositor a pass. */}
      <Canvas
        aria-hidden="true"
        className="isolate"
        data-testid="hero-scene"
        resize={STILL_SIZE}
        dpr={dpr}
        gl={{ antialias: false, alpha: true }}
        style={{
          position: 'absolute',
          inset: '0 0 auto 0',
          height: `calc(100% + ${BLEED * 100}svh)`,
          pointerEvents: 'none'
        }}
      >
        <AdaptiveDpr min={DPR.reduced} max={DPR.full} onChange={setDpr} />
        <RenderGate active={!gone} />
        {/* why: the canvas runs half a screen past the hero, and only its
            rows on screen are worth a ray each. */}
        <VisibleScissor />
        <Gargantua />
      </Canvas>
      {children}
    </section>
  )
}
