'use client'
import { useState, type MouseEvent, type PointerEvent } from 'react'
import { Section } from '@/components/molecules/section'

const QUESTIONS = [
  'Lorem ipsum dolor sit amet?',
  'Consectetur adipiscing elit sed do?',
  'Eiusmod tempor incididunt ut labore?',
  'Ut enim ad minim veniam quis?',
  'Duis aute irure dolor in reprehenderit?'
]

// why: only a mouse hovers; touch and pen taps go through the click alone.
const isMouse = (event: PointerEvent) => event.pointerType === 'mouse'

/**
 * A question that opens while the mouse is over it and stays open once
 * clicked (pinned); clicking a pinned one closes it. <details> keeps the
 * expanded state announced to screen readers; Enter and Space reach the
 * same click handler from the keyboard.
 */
const Question = ({ question }: { question: string }) => {
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)

  // hazard: the native toggle would close a question the hover had already
  // opened, so the click is taken over and only flips the pin.
  const onClick = (event: MouseEvent) => {
    event.preventDefault()
    if (pinned) setHovered(false)
    setPinned(!pinned)
  }

  return (
    <details
      open={pinned || hovered}
      data-pinned={pinned}
      className="group"
      onPointerEnter={event => isMouse(event) && setHovered(true)}
      onPointerLeave={event => isMouse(event) && setHovered(false)}
    >
      <summary
        onClick={onClick}
        className="text-subtitle flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-semibold [&::-webkit-details-marker]:hidden"
      >
        {question}
        <span
          aria-hidden="true"
          className="text-title-sm text-primary transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <p className="text-body text-foreground/70 pb-6">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam id dolor
        id nibh ultricies vehicula ut id elit.
      </p>
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
