'use client'
import { useEffect, useState, type RefObject } from 'react'
import { GlitchText } from '@/components/atoms/glitch-text'
import { STAGES } from './stages'

const midpoint = ([start, end]: readonly [number, number]) => (start + end) / 2

// why: each device's text takes over halfway through the swap that brings
// that device in, while both devices share the stage. `side` must match
// TEXT_SIDE in device-carousel.tsx: the device rests on the other side.
const STEPS = [
  {
    from: 0,
    side: 'left',
    label: '01 · No celular',
    title: 'Começa na palma da mão',
    body: 'O primeiro contato quase sempre acontece aqui, entre uma tarefa e outra. Por isso o layout nasce no celular: uma coluna, botões no alcance do polegar e nada que obrigue a dar zoom.'
  },
  {
    from: midpoint(STAGES.phoneOut),
    side: 'right',
    label: '02 · No tablet',
    title: 'Ganha espaço sem perder o ritmo',
    body: 'Em pé ou deitado, o mesmo site se reorganiza: as colunas se abrem, as imagens crescem e a leitura segue fluida, sem cortes nem rolagem para o lado.'
  },
  {
    from: midpoint(STAGES.tabletOut),
    side: 'left',
    label: '03 · No notebook',
    title: 'E se abre por inteiro',
    body: 'Na tela grande, a experiência completa: mais respiro, mais detalhe e cada seção no seu lugar. O mesmo código, do primeiro toque ao último clique.'
  }
] as const

// why: the copy steps aside as the camera dives into the laptop's screen.
const NO_STEP = -1
const stepAt = (p: number) =>
  p >= STAGES.zoom[0]
    ? NO_STEP
    : STEPS.reduce(
        (current, step, index) => (p >= step.from ? index : current),
        0
      )

const SIDE_CLASS = {
  left: 'lg:landscape:left-[6%] lg:landscape:text-left',
  right: 'lg:landscape:right-[6%] lg:landscape:text-left'
}

type DeviceCopyProps = {
  id: string
  progress: RefObject<number>
  /** Whether the section is near; the scroll is only watched while it is. */
  active: boolean
}

/**
 * The section's story: a heading, and one short chapter per device, beside
 * it on wide landscape screens and under it otherwise, cross-fading as the
 * carousel swaps devices.
 */
export const DeviceCopy = ({ id, progress, active }: DeviceCopyProps) => {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!active) return
    let frame = 0
    // why: the progress is a ref the scroll writes without re-rendering;
    // polling it per frame, and setting state only when the step changes,
    // keeps React out of the scroll.
    const watch = () => {
      setStep(stepAt(progress.current))
      frame = requestAnimationFrame(watch)
    }
    watch()
    return () => cancelAnimationFrame(frame)
  }, [active, progress])

  const shown = (visible: boolean) =>
    visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'

  return (
    <div className="pointer-events-none absolute inset-0 z-10 px-6 text-center select-text">
      <div
        className={`pt-10 transition-[opacity,translate] duration-500 lg:pt-14 ${shown(step !== NO_STEP)}`}
      >
        <span className="text-caption text-foreground/60 font-semibold tracking-[0.2em] uppercase">
          Responsividade
        </span>
        <GlitchText
          as="h2"
          id={`${id}-title`}
          text="Um projeto, todas as telas"
          className="font-display text-title-sm lg:text-title-md mx-auto mt-2 max-w-3xl"
        />
      </div>
      {STEPS.map((chapter, index) => (
        // why: the outer box places the chapter (it centres itself with a
        // translate when side by side), the inner one fades it, so the two
        // translates never fight over the same property.
        <div
          key={chapter.label}
          aria-current={index === step ? 'step' : undefined}
          className={`absolute inset-x-6 bottom-10 mx-auto max-w-xl lg:landscape:inset-x-auto lg:landscape:top-1/2 lg:landscape:bottom-auto lg:landscape:w-[36%] lg:landscape:max-w-md lg:landscape:-translate-y-1/2 ${SIDE_CLASS[chapter.side]}`}
        >
          <div
            className={`transition-[opacity,translate] duration-500 ${shown(index === step)}`}
          >
            <span className="text-caption text-foreground/60 font-semibold tracking-[0.2em] uppercase">
              {chapter.label}
            </span>
            <h3 className="font-display text-title-sm lg:landscape:text-title-md mt-2">
              {chapter.title}
            </h3>
            <p className="text-body-sm lg:text-body text-foreground/70 mt-2">
              {chapter.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
