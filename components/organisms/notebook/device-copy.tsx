'use client'
import { useEffect, useState, type RefObject } from 'react'
import { GlitchText } from '@/components/atoms/glitch-text'
import { STAGES } from './stages'

const midpoint = ([start, end]: readonly [number, number]) => (start + end) / 2

// why: each device's text takes over halfway through the swap that brings
// that device in, while both devices share the stage.
const STEPS = [
  {
    from: 0,
    label: '01 · No celular',
    title: 'Começa na palma da mão',
    body: 'O primeiro contato quase sempre acontece aqui, entre uma tarefa e outra. Por isso o layout nasce no celular: uma coluna, botões no alcance do polegar e nada que obrigue a dar zoom.'
  },
  {
    from: midpoint(STAGES.phoneOut),
    label: '02 · No tablet',
    title: 'Ganha espaço sem perder o ritmo',
    body: 'Em pé ou deitado, o mesmo site se reorganiza: as colunas se abrem, as imagens crescem e a leitura segue fluida, sem cortes nem rolagem para o lado.'
  },
  {
    from: midpoint(STAGES.tabletOut),
    label: '03 · No notebook',
    title: 'E se abre por inteiro',
    body: 'Na tela grande, a experiência completa: mais respiro, mais detalhe e cada seção no seu lugar. O mesmo código, do primeiro toque ao último clique.'
  }
] as const

const stepAt = (p: number) =>
  STEPS.reduce((current, step, index) => (p >= step.from ? index : current), 0)

type DeviceCopyProps = {
  id: string
  progress: RefObject<number>
  /** Whether the section is near; the scroll is only watched while it is. */
  active: boolean
}

/**
 * The section's story: a heading that stays, and one short chapter per
 * device that cross-fades as the carousel swaps devices.
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

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between px-6 pt-10 pb-10 text-center select-text lg:pt-14 lg:pb-14">
      <div>
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
      {/* why: the chapters share one grid cell, so the block keeps the
          tallest one's height and the text never jumps as they swap. */}
      <div className="mx-auto grid w-full max-w-xl">
        {STEPS.map((chapter, index) => (
          <div
            key={chapter.label}
            aria-current={index === step ? 'step' : undefined}
            className={`col-start-1 row-start-1 transition-[opacity,translate] duration-500 ${
              index === step
                ? 'translate-y-0 opacity-100'
                : 'translate-y-3 opacity-0'
            }`}
          >
            <span className="text-caption text-foreground/60 font-semibold tracking-[0.2em] uppercase">
              {chapter.label}
            </span>
            <h3 className="font-display text-title-sm mt-2">{chapter.title}</h3>
            <p className="text-body-sm lg:text-body text-foreground/70 mt-2">
              {chapter.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
