'use client'
import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNearViewport } from '@/lib/use-near-viewport'
import { RenderGate } from '@/components/atoms/render-gate'
import { VisibleScissor } from '@/components/atoms/visible-scissor'
import '@/lib/three-console'
import {
  onReducedMotionChange,
  prefersReducedMotion
} from '@/lib/media-preferences'
import { firstSceneMode } from '@/lib/scene-mode'
import { useSceneMode } from '@/lib/use-scene-mode'
import { BLEED, Gargantua, isGone, stillOpacity } from './gargantua'
import { HeroStill } from './hero-still'
import { STILL_SIZE } from '@/lib/canvas-size'
import { useCanvasRecovery } from '@/lib/use-canvas-recovery'

// why: a ray per screen pixel, up to 2 per CSS px, for the whole visit: a
// GPU that cannot keep up gets the image instead of coarser pixels (task
// portfolio-lp-still-scenes, 11 and 14).
const DPR: [number, number] = [1, 2]

type HeroProps = {
  id?: string
  /** Laid over the scene, e.g. the hero copy. */
  children?: ReactNode
}

/**
 * The first screen: a ray-traced black hole with its lensed disk, filling
 * the screen, and the copy beside it (task hero-gargantua); on touch, or
 * once the device cannot draw it at 50 fps, its still image (task
 * portfolio-lp-still-scenes).
 */
export const Hero = ({ id, children }: HeroProps) => {
  const recovery = useCanvasRecovery()
  const mode = useSceneMode('hero')
  // why: the scene swapped mid-visit stays until its image has faded in
  // over it, so the black hole never blinks out (task 11).
  const [imageShown, setImageShown] = useState(false)
  const swapped = mode === 'still' && firstSceneMode() === 'live'
  const live = mode === 'live' || (swapped && !imageShown)
  const still = useRef<HTMLDivElement>(null)
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
      const scrolled = -top / Math.max(height, 1)
      const reduced = prefersReducedMotion()
      setGone(isGone(scrolled, reduced))
      if (still.current)
        still.current.style.opacity = String(stillOpacity(scrolled, reduced))
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
  }, [near, mode])

  return (
    // why: overflow-x only, so the canvas spills below the section; the next
    // block paints over the spill (later in the DOM), its sky and text on top.
    <section
      id={id}
      ref={section}
      data-scene={mode ?? undefined}
      className="bg-background relative h-svh overflow-x-clip select-none"
    >
      {/* why: decoration (criterion 42): the hero's meaning is its copy. The
          canvas runs BLEED screens past the section and fades out there, so
          the lens dissolves into the page's sky instead of ending on a line;
          the shader fades it (gargantua-shader.ts), as a CSS mask over a
          canvas that changes every frame cost the compositor a pass. */}
      {live && (
        <Canvas
          key={recovery.key}
          onCreated={recovery.onCreated}
          aria-hidden="true"
          className="isolate"
          data-testid="hero-scene"
          resize={STILL_SIZE}
          dpr={DPR}
          gl={{ antialias: false, alpha: true }}
          style={{
            position: 'absolute',
            inset: '0 0 auto 0',
            height: `calc(100% + ${BLEED * 100}svh)`,
            pointerEvents: 'none'
          }}
        >
          <RenderGate active={!gone && mode === 'live'} scene="hero" />
          {/* why: the canvas runs half a screen past the hero, and only its
            rows on screen are worth a ray each. */}
          <VisibleScissor />
          <Gargantua />
        </Canvas>
      )}
      {/* why: after the canvas, so a swapped scene's image fades in over
          its last frame; the copy still lies over both. */}
      {mode === 'still' && (
        <HeroStill
          ref={still}
          fade={swapped}
          onShown={() => setImageShown(true)}
        />
      )}
      {children}
    </section>
  )
}
