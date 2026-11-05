'use client'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MathUtils } from 'three'
import { AdaptiveDpr } from '@/components/atoms/adaptive-dpr'
import { touchDpr, type DprSetting } from '@/lib/adaptive-dpr'
import { RENDER_LEAD, RenderGate } from '@/components/atoms/render-gate'
import { VisibleScissor } from '@/components/atoms/visible-scissor'
import '@/lib/three-console'
import { useFinePointer } from '@/lib/use-fine-pointer'
import { useLiteMode } from '@/lib/use-lite-mode'
import { useNearViewport } from '@/lib/use-near-viewport'
import { ParallaxField } from '@/components/organisms/parallax-field'
import { SectionsBackdrop } from '@/components/organisms/sections-backdrop'
import { DeviceCopy } from './device-copy'
import { NotebookScene } from './notebook-scene'
import { CAMERA } from './stages'
import { useScrollProgress } from './use-scroll-progress'
import { STILL_SIZE } from '@/lib/canvas-size'

// why: the embedded pages start loading a screen before the section, well
// ahead of the first device, and are dropped a screen past it, so they cost
// nothing anywhere else on the page.
const SCREEN_LEAD = '100% 0px'
// why: share of a screen scrolled past the section over which the stage
// fades out; by then it has let go and moves with the real section, so the
// fade only swaps the picture of the page for the page itself.
const HANDOFF = 0.25
// why: share of a screen, either side of the stage's top reaching the
// window's top, over which its own ground and sky fade in over the block
// above's sky, whose glows sit where the stage's do once it is pinned.
const GROUND_FADE = 0.1
// why: crisp edges by default; a GPU that drops frames on the carousel
// draws fewer pixels, down to 0.75 per CSS px, which keeps the motion smooth.
// Touch keeps one ratio, under the 1.5 cap (portfolio-lp-mobile, 15).
const DPR = {
  full: [1.5, 2] as [number, number],
  reduced: 0.75,
  touch: 1.25
}

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
  const screenLive = useNearViewport(section, SCREEN_LEAD)
  // why: the stage's fades and hand-off only change while it is on screen.
  const onScreen = useNearViewport(section, RENDER_LEAD)
  const progress = useScrollProgress(section, screenLive)
  // why: once the real page has taken over, the hidden stage stops drawing.
  const [handedOff, setHandedOff] = useState(false)
  // why: touch caps the ratio (task portfolio-lp-mobile, 15); the full
  // ratio holds until the monitor steps, uncapped only before hydration.
  const fine = useFinePointer()
  const full = useMemo(() => touchDpr(DPR.full, fine !== false), [fine])
  const [stepped, setDpr] = useState<DprSetting | null>(null)
  // why: on touch one ratio for the visit; every step resized the canvas,
  // which clears it, and showed as a flicker (task
  // portfolio-lp-mobile-alcance, 3).
  const touch = fine === false
  // why: lite draws at the cheapest ratio, without the contact shadow
  // (task portfolio-lp-60fps, 6).
  const lite = useLiteMode()
  // invariant: touch keeps its one ratio in lite too; a step clears the
  // canvas (task portfolio-lp-mobile-alcance, 3).
  const dpr = touch ? DPR.touch : lite ? DPR.reduced : (stepped ?? full)

  useEffect(() => {
    const update = () => {
      const element = section.current
      const view = stage.current
      if (!element || !view) return
      const box = element.getBoundingClientRect()
      const past = window.innerHeight - box.bottom
      const fade = MathUtils.clamp(past / (window.innerHeight * HANDOFF), 0, 1)
      // why: the stage is clear while it enters, showing the block above's
      // sky (page.tsx, `under`), so no edge crosses the window; once pinned
      // it turns opaque, hiding the section pulled up beneath it.
      const ground = MathUtils.clamp(
        (GROUND_FADE - box.top / window.innerHeight) / (2 * GROUND_FADE),
        0,
        1
      )
      view.style.setProperty('--stage-ground', String(ground))
      view.style.opacity = String(1 - fade)
      // why: once gone, the stage must not catch the clicks meant for the
      // real section now in its place.
      view.style.visibility = fade >= 1 ? 'hidden' : 'visible'
      setHandedOff(fade >= 1)
      // why: while the opaque stage fills the window, the skies of the
      // blocks beneath it are unseen; CSS takes them out of the page, which
      // the compositor otherwise still drew every frame (task
      // portfolio-lp-60fps, 1).
      document.documentElement.toggleAttribute(
        'data-stage-covers',
        // invariant: not at the very end, where the hand-off begins and the
        // real section, its sky included, must already be drawn.
        ground >= 1 && fade === 0 && box.bottom - window.innerHeight > 1
      )
    }
    update()
    // why: off screen the stage is settled; no scroll reads it.
    if (!onScreen) return
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      document.documentElement.removeAttribute('data-stage-covers')
    }
  }, [onScreen])

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
      {/* why: select-none: <Html> puts real DOM behind a click-through
          canvas, so a double click would paint the screen selection blue.
          h-lvh: the window with the browser's bar tucked away, so no band of
          page shows under the pinned stage (task portfolio-lp-mobile, 11). */}
      {/* why: isolate, so the sky's negative layers stay inside the stage,
          over its opaque ground and under the canvas. */}
      <div
        ref={stage}
        className="pointer-events-auto sticky top-0 isolate h-lvh select-none"
      >
        {/* why: opaque once pinned, in the page's own colour, so the section
            pulled up beneath never shows through the transparent canvas. */}
        <div
          data-testid="notebook-ground"
          className="bg-background absolute inset-0 -z-30 opacity-(--stage-ground)"
        />
        <div
          data-testid="notebook-sky"
          className="absolute inset-0 -z-20 opacity-(--stage-ground)"
        >
          <SectionsBackdrop />
          <ParallaxField still />
        </div>
        {/* why: no OrbitControls, so only the scroll moves the devices.
            dpr ≥ 1.5 while the GPU keeps up: MSAA alone left the thin edges
            stair-stepped. alpha: the sky is the page background. isolate:
            keeps drei <Html>'s huge z-index inside the canvas box. */}
        <Canvas
          className="isolate"
          data-testid="notebook-scene"
          resize={STILL_SIZE}
          data-effects={lite ? 'lite' : 'full'}
          dpr={dpr}
          gl={{ alpha: true }}
          camera={{ position: [...CAMERA.position], fov: CAMERA.fov }}
        >
          {!touch && !lite && (
            <AdaptiveDpr min={DPR.reduced} max={full} onChange={setDpr} />
          )}
          <RenderGate active={!handedOff} />
          {/* why: the stage enters from below the projects' cards; only its
              rows on screen are drawn until it fills the window. */}
          <VisibleScissor />
          <NotebookScene
            progress={progress}
            screenLive={screenLive}
            shadows={!lite}
          />
        </Canvas>
        <DeviceCopy id={id} progress={progress} active={screenLive} />
      </div>
    </section>
  )
}
