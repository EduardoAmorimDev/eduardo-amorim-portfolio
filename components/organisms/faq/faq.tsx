'use client'
import { useEffect, useState, type MouseEvent, type PointerEvent } from 'react'
import { Section } from '@/components/molecules/section'
import { prefersReducedMotion } from '@/lib/media-preferences'

const QUESTIONS = [
  'Lorem ipsum dolor sit amet?',
  'Consectetur adipiscing elit sed do?',
  'Eiusmod tempor incididunt ut labore?',
  'Ut enim ad minim veniam quis?',
  'Duis aute irure dolor in reprehenderit?'
]

// why: only a mouse hovers; touch and pen taps go through the click alone.
const isMouse = (event: PointerEvent) => event.pointerType === 'mouse'

// why: the answer's height, its fade and the "+" all run this long; a
// closing question stays open until then, so its content never vanishes
// mid-animation (task cosmos, criteria 4–5).
const TRANSITION_MS = 300

/**
 * `opening` lays the answer out collapsed for a frame, so the browser has a
 * start to transition from; `closing` keeps <details> open while it shrinks.
 */
type Phase = 'closed' | 'opening' | 'open' | 'closing'

/**
 * A question that opens while the mouse is over it and stays open once
 * clicked (pinned); clicking a pinned one closes it. <details> keeps the
 * expanded state announced to screen readers; Enter and Space reach the
 * same click handler from the keyboard. Opening and closing animate, except
 * under reduced motion.
 */
const Question = ({ question }: { question: string }) => {
  const [pinned, setPinned] = useState(false)
  const [phase, setPhase] = useState<Phase>('closed')

  const show = (expanded: boolean) => {
    const still = prefersReducedMotion()
    setPhase(current => {
      if (expanded) return current === 'closed' && !still ? 'opening' : 'open'
      return current === 'closed' || still ? 'closed' : 'closing'
    })
  }

  useEffect(() => {
    if (phase === 'opening') {
      // why: two frames; the first paints the answer collapsed, the second
      // starts the transition from there.
      let inner = 0
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setPhase('open'))
      })
      return () => {
        cancelAnimationFrame(outer)
        cancelAnimationFrame(inner)
      }
    }
    if (phase === 'closing') {
      const timer = window.setTimeout(() => setPhase('closed'), TRANSITION_MS)
      return () => window.clearTimeout(timer)
    }
  }, [phase])

  // hazard: the native toggle would close a question the hover had already
  // opened, so the click is taken over and only flips the pin.
  const onClick = (event: MouseEvent) => {
    event.preventDefault()
    setPinned(!pinned)
    show(!pinned)
  }

  return (
    <details
      open={phase !== 'closed'}
      data-pinned={pinned}
      data-state={phase}
      className="group"
      onPointerEnter={event => isMouse(event) && show(true)}
      onPointerLeave={event => isMouse(event) && show(pinned)}
    >
      <summary
        onClick={onClick}
        className="text-subtitle hover:text-foreground/70 flex list-none items-center justify-between gap-6 py-5 font-semibold transition-colors [&::-webkit-details-marker]:hidden"
      >
        {question}
        <span
          aria-hidden="true"
          className="text-title-sm text-primary transition-transform duration-300 ease-[ease-out] group-data-[state=open]:rotate-45 motion-reduce:transition-none"
        >
          +
        </span>
      </summary>
      {/* why: a grid row from 0fr to 1fr animates to the answer's own height,
          whatever it is, with no measuring. */}
      <div
        data-answer
        className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-[ease-out] group-data-[state=open]:grid-rows-[1fr] group-data-[state=open]:opacity-100 motion-reduce:transition-none"
      >
        <div className="overflow-hidden">
          <p className="text-body text-foreground/70 pb-6">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam id
            dolor id nibh ultricies vehicula ut id elit.
          </p>
        </div>
      </div>
    </details>
  )
}

export const Faq = () => (
  <Section
    id="faq"
    eyebrow="Perguntas frequentes"
    title="Lorem ipsum dolor"
    intro="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas sed diam eget risus varius."
  >
    <div className="divide-foreground/10 border-foreground/10 mt-12 divide-y border-y">
      {QUESTIONS.map(question => (
        <Question key={question} question={question} />
      ))}
    </div>
  </Section>
)
