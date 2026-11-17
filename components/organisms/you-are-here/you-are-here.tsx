'use client'
import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { GlitchText } from '@/components/atoms/glitch-text'
import { RenderGate } from '@/components/atoms/render-gate'
import '@/lib/three-console'
import { captureTarget } from '@/lib/capture'
import { useSceneMode } from '@/lib/use-scene-mode'
import { useNearViewport } from '@/lib/use-near-viewport'
import { findVisitorPlace, type VisitorPlace } from '@/lib/visitor-place'
import { Bloom } from './bloom'
import { GLOBE_CAMERA } from './globe-layout'
import { GlobeScene } from './globe-scene'
import { GlobeStill } from './globe-still'
import { STILL_SIZE } from '@/lib/canvas-size'
import { useCanvasRecovery } from '@/lib/use-canvas-recovery'

// why: the place is looked up as the section approaches, so a visitor who
// never scrolls this far never sends the request.
const LOOKUP_LEAD = '100% 0px'
// why: crisp dots on every device, for the whole visit: the ratio never
// steps down with the GPU (task portfolio-lp-still-scenes, 14).
const DPR: [number, number] = [1.5, 2]
// why: the still renderer shoots a phone's globe at 3x (scripts/
// render-stills.mjs), past the 2 the page ever draws at.
const CAPTURE_DPR: [number, number] = [1.5, 6]

type YouAreHereProps = { id: string }

/**
 * The page's ending: after the black hole of the hero ("where we can go"),
 * the Earth, with a pin on the visitor's place ("where you are"), and the
 * invitation to get in touch.
 */
export const YouAreHere = ({ id }: YouAreHereProps) => {
  const section = useRef<HTMLElement>(null)
  const recovery = useCanvasRecovery()
  const near = useNearViewport(section, LOOKUP_LEAD)
  // why: the still is shot pinless, in its own pose (globe-layout.ts).
  const posed = captureTarget() === 'globe'
  // why: the 3D globe on a fine pointer in the full tier, its image
  // everywhere else (task portfolio-lp-device-gate, 7, 8, 11, 12).
  const mode = useSceneMode()
  // invariant: undefined until looked up, null when it cannot be found.
  const [place, setPlace] = useState<VisitorPlace | null | undefined>()

  useEffect(() => {
    if (!near || posed || place !== undefined) return
    const controller = new AbortController()
    void findVisitorPlace(controller.signal).then(found => {
      if (!controller.signal.aborted) setPlace(found)
    })
    return () => controller.abort()
  }, [near, posed, place])

  // why: the scene lays the globe out in the section alone, though its
  // canvas rises above it (globe-layout.ts).
  const [stageHeight, setStageHeight] = useState(0)
  useEffect(() => {
    const element = section.current
    if (!element) return
    const observer = new ResizeObserver(() =>
      setStageHeight(element.clientHeight)
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      id={id}
      ref={section}
      aria-labelledby={`${id}-title`}
      data-scene={mode ?? undefined}
      className="relative min-h-svh overflow-x-clip"
    >
      {/* why: the Earth's light rises half a screen over the FAQ and fades
          into it, so the two read as one space; the canvas sits under the
          page's text and takes no events, the FAQ stays clickable, and the
          vapour follows the cursor on the window (globe-vapor.tsx). */}
      {mode === 'live' && (
        <Canvas
          key={recovery.key}
          onCreated={recovery.onCreated}
          aria-hidden="true"
          className="pointer-events-none -z-[5] [mask-image:linear-gradient(to_bottom,transparent,black_50svh)]"
          style={{
            position: 'absolute',
            top: '-50svh',
            right: 0,
            bottom: 0,
            left: 0,
            height: 'auto',
            pointerEvents: 'none'
          }}
          data-testid="globe-scene"
          resize={STILL_SIZE}
          dpr={posed ? CAPTURE_DPR : DPR}
          gl={{ alpha: true }}
          camera={{
            position: [0, 0, GLOBE_CAMERA.distance],
            fov: GLOBE_CAMERA.fov
          }}
        >
          <RenderGate />
          <GlobeScene
            place={place ?? null}
            stageHeight={stageHeight}
            posed={posed}
          />
          {/* why: the Earth's light, spilled by its bright land, limb and
              vapour, rather than painted around it. */}
          <Bloom strength={0.75} radius={0.45} threshold={0.45} />
        </Canvas>
      )}
      {mode === 'still' && <GlobeStill place={place ?? null} />}
      <div className="pointer-events-none relative z-10 flex min-h-svh flex-col justify-end px-6 pb-16 lg:px-16 landscape:justify-center landscape:pb-0">
        <div className="max-w-xl landscape:max-w-[46%]">
          <span className="text-caption text-foreground/60 font-semibold tracking-[0.3em] uppercase">
            Contato
          </span>
          {/* why: on short phones the globe's white light sits behind the
              title, where white letters vanished; a soft halo in the page's
              ink cuts them out of it and is unseen on the dark sky. */}
          <GlitchText
            as="h2"
            id={`${id}-title`}
            text="Posso trazer um horizonte de possibilidades até você"
            className="font-display text-title-md lg:text-title-lg pointer-events-auto mt-4 [text-shadow:0_0_24px_rgb(from_var(--color-ink)_r_g_b/90%),0_0_6px_rgb(from_var(--color-ink)_r_g_b/80%)]"
          />
          {/* why: the text is the same wherever the visitor is; the place
              only moves the pin on the globe (task reach-and-seams, 20). */}
          <p className="text-subtitle text-foreground/80 pointer-events-auto mt-6">
            Você viu onde podemos chegar. Já sabemos nosso ponto de partida.
          </p>
          <p className="text-body text-foreground/60 pointer-events-auto mt-8">
            A escolha é sua...
          </p>
          {/* hazard: the button has no destination yet; WhatsApp, e-mail, a
              calendar or a form is still open (task earth-and-sky,
              Unresolved 1) and blocks the go-live. */}
          <button
            type="button"
            className="bg-primary text-body text-mist hover:bg-steel pointer-events-auto relative mt-4 inline-flex h-14 items-center rounded-full px-8 font-semibold transition-colors"
          >
            <span
              aria-hidden="true"
              data-call-pulse
              className="border-primary motion-safe:animate-call-pulse pointer-events-none absolute inset-0 rounded-full border-2 opacity-0"
            />
            Vamos conversar
          </button>
        </div>
      </div>
    </section>
  )
}
