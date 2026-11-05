'use client'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GlitchText } from '@/components/atoms/glitch-text'
import { AdaptiveDpr } from '@/components/atoms/adaptive-dpr'
import { RenderGate } from '@/components/atoms/render-gate'
import '@/lib/three-console'
import { touchDpr, type DprSetting } from '@/lib/adaptive-dpr'
import { useFinePointer } from '@/lib/use-fine-pointer'
import { useLiteMode } from '@/lib/use-lite-mode'
import { useNearViewport } from '@/lib/use-near-viewport'
import { findVisitorPlace, type VisitorPlace } from '@/lib/visitor-place'
import { Bloom } from './bloom'
import { GlobeScene } from './globe-scene'
import { STILL_SIZE } from '@/lib/canvas-size'

// why: the place is looked up as the section approaches, so a visitor who
// never scrolls this far never sends the request.
const LOOKUP_LEAD = '100% 0px'
// why: crisp dots by default; the canvas is a screen and a half tall and
// drawn twice over by the bloom, so a GPU that drops frames on it draws
// fewer pixels, the dots keeping their CSS size and the glow its softness.
const DPR = { full: [1.5, 2] as [number, number], reduced: 0.6 }

type YouAreHereProps = { id: string }

/**
 * The page's ending: after the black hole of the hero ("where we can go"),
 * the Earth, with a pin on the visitor's place ("where you are"), and the
 * invitation to get in touch.
 */
export const YouAreHere = ({ id }: YouAreHereProps) => {
  const section = useRef<HTMLElement>(null)
  const near = useNearViewport(section, LOOKUP_LEAD)
  // invariant: undefined until looked up, null when it cannot be found.
  const [place, setPlace] = useState<VisitorPlace | null | undefined>()

  useEffect(() => {
    if (!near || place !== undefined) return
    const controller = new AbortController()
    void findVisitorPlace(controller.signal).then(found => {
      if (!controller.signal.aborted) setPlace(found)
    })
    return () => controller.abort()
  }, [near, place])

  // why: touch caps the ratio (task portfolio-lp-mobile, 15); the full
  // ratio holds until the monitor steps, uncapped only before hydration.
  const fine = useFinePointer()
  const full = useMemo(() => touchDpr(DPR.full, fine !== false), [fine])
  const [stepped, setDpr] = useState<DprSetting | null>(null)
  // why: lite draws at the cheapest ratio, without the bloom (task
  // portfolio-lp-60fps, 6).
  const lite = useLiteMode()
  const dpr = lite ? DPR.reduced : (stepped ?? full)

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
      className="relative min-h-svh overflow-x-clip"
    >
      {/* why: the Earth's light rises half a screen over the FAQ and fades
          into it, so the two read as one space; the canvas sits under the
          page's text and takes no events, the FAQ stays clickable, and the
          vapour follows the cursor on the window (globe-vapor.tsx). */}
      <Canvas
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
        data-effects={lite ? 'lite' : 'full'}
        dpr={dpr}
        gl={{ alpha: true }}
        camera={{ position: [0, 0, 3.4], fov: 35 }}
      >
        {!lite && (
          <AdaptiveDpr min={DPR.reduced} max={full} onChange={setDpr} />
        )}
        <RenderGate />
        <GlobeScene place={place ?? null} stageHeight={stageHeight} />
        {/* why: the Earth's light, spilled by its bright land, limb and
            vapour, rather than painted around it. */}
        {!lite && <Bloom strength={0.75} radius={0.45} threshold={0.45} />}
      </Canvas>
      <div className="pointer-events-none relative z-10 flex min-h-svh flex-col justify-end px-6 pb-16 lg:px-16 landscape:justify-center landscape:pb-0">
        <div className="max-w-xl landscape:max-w-[46%]">
          <span className="text-caption text-foreground/60 font-semibold tracking-[0.3em] uppercase">
            Contato
          </span>
          <GlitchText
            as="h2"
            id={`${id}-title`}
            text="Posso trazer um horizonte de possibilidades até você"
            className="font-display text-title-md lg:text-title-lg pointer-events-auto mt-4"
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
