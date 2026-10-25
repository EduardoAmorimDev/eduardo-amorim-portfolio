import type { ReactNode } from 'react'
import { GlitchText } from '@/components/atoms/glitch-text'

type SectionProps = {
  /** Public anchor of the section in the URL (e.g. `#contato`). */
  id: string
  /** Short label above the title; a span, so it never counts as a paragraph. */
  eyebrow: string
  title: string
  intro?: string
  children?: ReactNode
}

/** A landing page section: label, glitching `<h2>`, optional intro, content. */
export const Section = ({
  id,
  eyebrow,
  title,
  intro,
  children
}: SectionProps) => (
  <section
    id={id}
    aria-labelledby={`${id}-title`}
    className="mx-auto w-full max-w-6xl px-6 py-24 lg:px-16 lg:py-32"
  >
    <span className="text-caption text-foreground/60 font-semibold tracking-[0.2em] uppercase">
      {eyebrow}
    </span>
    <GlitchText
      as="h2"
      id={`${id}-title`}
      text={title}
      className="font-display text-title-md lg:text-title-lg mt-3 max-w-3xl"
    />
    {intro && (
      <p className="text-body text-foreground/70 mt-4 max-w-2xl">{intro}</p>
    )}
    {children}
  </section>
)
