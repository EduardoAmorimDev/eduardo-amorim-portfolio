'use client'
import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { GlitchText } from '@/components/atoms/glitch-text'
import { RenderGate } from '@/components/atoms/render-gate'
import { useNearViewport } from '@/lib/use-near-viewport'
import { findVisitorPlace, type VisitorPlace } from '@/lib/visitor-place'
import { GlobeScene } from './globe-scene'

// why: the place is looked up as the section approaches, so a visitor who
// never scrolls this far never sends the request.
const LOOKUP_LEAD = '100% 0px'

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

  const city = place?.city

  return (
    <section
      id={id}
      ref={section}
      aria-labelledby={`${id}-title`}
      className="relative min-h-svh overflow-clip"
    >
      <Canvas
        aria-hidden="true"
        className="isolate"
        style={{ position: 'absolute', inset: 0 }}
        data-testid="globe-scene"
        dpr={[1.5, 2]}
        gl={{ alpha: true }}
        camera={{ position: [0, 0, 3.4], fov: 35 }}
      >
        <RenderGate />
        <GlobeScene place={place ?? null} />
      </Canvas>
      <div className="pointer-events-none relative z-10 flex min-h-svh flex-col justify-end px-6 pb-16 lg:px-16 landscape:justify-center landscape:pb-0">
        <div className="max-w-xl landscape:max-w-[46%]">
          <span className="text-caption text-foreground/60 font-semibold tracking-[0.3em] uppercase">
            Contato
          </span>
          <GlitchText
            as="h2"
            id={`${id}-title`}
            text="Até aqui, você viu onde podemos chegar."
            className="font-display text-title-md lg:text-title-lg pointer-events-auto mt-4"
          />
          <p className="text-subtitle text-foreground/80 pointer-events-auto mt-6">
            {place === null
              ? 'No momento, você está em algum lugar deste planeta.'
              : `No momento, você está aqui${city ? `, em ${city}` : ''}.`}
            <br />A escolha é sua.
          </p>
          {/* hazard: the button has no destination yet; WhatsApp, e-mail, a
              calendar or a form is still open (task Unresolved 1) and blocks
              the go-live. */}
          <button
            type="button"
            className="bg-primary text-body text-mist hover:bg-steel pointer-events-auto mt-8 inline-flex h-14 items-center rounded-full px-8 font-semibold transition-colors"
          >
            Entrar em contato
          </button>
        </div>
      </div>
    </section>
  )
}
