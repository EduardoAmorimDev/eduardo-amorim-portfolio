'use client'
import { useEffect, useMemo, useState, type RefObject } from 'react'
import { GlitchText } from '@/components/atoms/glitch-text'
import { deviceOrder, slotOf, STAGES, type Device } from './stages'

const midpoint = ([start, end]: readonly [number, number]) => (start + end) / 2

// why: each chapter tells what its own device stands for, wherever in the
// carousel that device comes (task portfolio-lp-device-last, 5).
const CHAPTERS = {
  phone: {
    name: 'Apps',
    title: 'No bolso do seu cliente',
    body: 'Aplicativos e PWAs que vivem na tela inicial, avisam na hora certa e abrem até com sinal fraco. Seu cliente chega até você com um toque.'
  },
  tablet: {
    name: 'Sites e landing pages',
    title: 'A vitrine que nunca fecha',
    body: 'Sites e landing pages rápidos, fáceis de achar no Google e feitos para converter, em qualquer tela que o cliente tiver na mão.'
  },
  laptop: {
    name: 'Sistemas',
    title: 'E a operação inteira, por dentro',
    body: 'ERPs, CRMs, painéis e web apps sob medida: o que sua equipe usa todo dia, do estoque ao atendimento, no navegador de qualquer máquina.'
  }
} as const satisfies Record<Device, Record<string, string>>

// why: each device's text takes over halfway through the swap that brings
// that device in, while both devices share the stage; side by side, the
// chapters alternate around the centred device like a story told in turns.
// They are numbered in the order the devices come on stage.
const stepsFor = (viewer: Device) => {
  const order = deviceOrder(viewer)
  return order.map((device, index) => ({
    device,
    ...CHAPTERS[device],
    from: index === 0 ? 0 : midpoint(slotOf(order, device).in),
    side: index % 2 === 0 ? ('left' as const) : ('right' as const),
    label: `${String(index + 1).padStart(2, '0')} · ${CHAPTERS[device].name}`
  }))
}
type Step = ReturnType<typeof stepsFor>[number]

// why: the copy steps aside as the camera dives into the last screen.
const NO_STEP = -1
const stepAt = (p: number, steps: readonly Step[]) =>
  p >= STAGES.zoom[0]
    ? NO_STEP
    : steps.reduce(
        (current, step, index) => (p >= step.from ? index : current),
        0
      )

// invariant: each column stays inside the 30% of the width the stage leaves
// on its side of the centred device (COPY_ROOM in stages.ts).
const SIDE_CLASS = {
  left: 'lg:landscape:left-[4%] lg:landscape:text-left',
  right: 'lg:landscape:right-[4%] lg:landscape:text-left'
}

type DeviceCopyProps = {
  id: string
  progress: RefObject<number>
  /** Whether the section is near; the scroll is only watched while it is. */
  active: boolean
  /** The visitor's own device, whose chapter comes last. */
  viewer: Device
}

/**
 * The section's story, reach: a heading, and one short chapter per device
 * (apps, sites and landing pages, systems), beside it on wide landscape
 * screens and under it otherwise, cross-fading as the carousel swaps devices.
 */
export const DeviceCopy = ({
  id,
  progress,
  active,
  viewer
}: DeviceCopyProps) => {
  const [step, setStep] = useState(0)
  const steps = useMemo(() => stepsFor(viewer), [viewer])

  useEffect(() => {
    if (!active) return
    let frame = 0
    // why: the progress is a ref the scroll writes without re-rendering;
    // polling it per frame, and setting state only when the step changes,
    // keeps React out of the scroll.
    const watch = () => {
      setStep(stepAt(progress.current, steps))
      frame = requestAnimationFrame(watch)
    }
    watch()
    return () => cancelAnimationFrame(frame)
  }, [active, progress, steps])

  const shown = (visible: boolean) =>
    visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'

  return (
    <div
      data-testid="notebook-copy"
      className="pointer-events-none absolute inset-0 z-10 px-6 text-center select-text"
    >
      <div
        className={`pt-10 transition-[opacity,translate] duration-500 lg:pt-14 ${shown(step !== NO_STEP)}`}
      >
        <span className="text-caption text-foreground/60 font-semibold tracking-[0.2em] uppercase">
          Alcance
        </span>
        <GlitchText
          as="h2"
          id={`${id}-title`}
          text="Vá onde o concorrente não foi"
          className="font-display text-title-sm lg:text-title-md mx-auto mt-2 max-w-3xl"
        />
      </div>
      {steps.map((chapter, index) => (
        // why: the outer box places the chapter (it centres itself with a
        // translate when side by side), the inner one fades it, so the two
        // translates never fight. Its bottom clears the browser's bar
        // (100dvh) on a stage as tall as 100lvh (task portfolio-lp-mobile).
        <div
          key={chapter.device}
          aria-current={index === step ? 'step' : undefined}
          className={`absolute inset-x-6 bottom-[calc(2.5rem+100lvh-100dvh)] mx-auto max-w-xl lg:landscape:inset-x-auto lg:landscape:top-1/2 lg:landscape:bottom-auto lg:landscape:w-[24%] lg:landscape:max-w-sm lg:landscape:-translate-y-1/2 ${SIDE_CLASS[chapter.side]}`}
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
