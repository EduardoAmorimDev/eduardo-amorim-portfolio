'use client'
import { Canvas } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import { RenderGate } from '@/components/atoms/render-gate'
import { HERO_CAMERA } from './glass-motion'
import type { HoleBody } from './grid-motion'
import { HeroScene } from './hero-scene'
import { useHeroField } from './use-hero-field'

type HeroProps = {
  id?: string
  /** Laid over the scene, e.g. the hero copy. */
  children?: ReactNode
}

/**
 * The first screen: the gravitational grid, the black hole and the glass
 * logo, the lens that follows the mouse, and the copy over them all.
 */
export const Hero = ({ id, children }: HeroProps) => {
  const section = useRef<HTMLElement>(null)
  const grid = useRef<HTMLCanvasElement>(null)
  const lens = useRef<HTMLCanvasElement>(null)
  // why: the field writes the black hole's place here every frame and the
  // 3D scene reads it, so the hole and the well it digs never drift apart.
  const hole = useRef<HoleBody>({
    x: 0,
    y: 0,
    horizon: 0,
    scale: 1,
    strength: 1,
    lift: 0
  })
  useHeroField({ section, grid, lens, hole })

  return (
    <section
      id={id}
      ref={section}
      className="relative h-svh overflow-clip select-none"
    >
      {/* why: first in the DOM, so the transparent 3D canvas paints over it;
          it never takes the pointer, which the field hears on the window.
          The black hole draws it bent and hides it while it does. */}
      <canvas
        ref={grid}
        data-testid="hero-grid"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full opacity-50"
      />
      {/* why: no OrbitControls, so the camera stays put: the viewer can neither
          drag nor zoom. dpr: at least 1.5× even on 1× screens; MSAA alone left
          the thin glass edges stair-stepped. alpha: the sky stays transparent,
          showing the page background and the grid. */}
      {/* why: the black hole and the logo are decoration (criterion 42);
          the hero's meaning is its copy. */}
      <Canvas
        aria-hidden="true"
        className="isolate"
        data-testid="hero-scene"
        dpr={[1.5, 2]}
        gl={{ alpha: true }}
        camera={{ position: HERO_CAMERA.position, fov: HERO_CAMERA.fov }}
      >
        <RenderGate />
        <HeroScene hole={hole} grid={grid} />
      </Canvas>
      <canvas
        ref={lens}
        data-testid="hero-lens"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
      />
      {children}
    </section>
  )
}
