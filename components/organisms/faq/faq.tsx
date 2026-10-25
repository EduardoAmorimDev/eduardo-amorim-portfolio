import { Section } from '@/components/molecules/section'

const QUESTIONS = [
  'Lorem ipsum dolor sit amet?',
  'Consectetur adipiscing elit sed do?',
  'Eiusmod tempor incididunt ut labore?',
  'Ut enim ad minim veniam quis?',
  'Duis aute irure dolor in reprehenderit?'
]

// why: <details> opens and closes natively, by mouse and keyboard, and
// announces its state to screen readers without any script.
export const Faq = () => (
  <Section
    id="faq"
    eyebrow="Perguntas frequentes"
    title="Lorem ipsum dolor"
    intro="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas sed diam eget risus varius."
  >
    <div className="divide-foreground/10 border-foreground/10 mt-12 divide-y border-y">
      {QUESTIONS.map(question => (
        <details key={question} className="group">
          <summary className="text-subtitle flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-semibold [&::-webkit-details-marker]:hidden">
            {question}
            <span
              aria-hidden="true"
              className="text-title-sm text-primary transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="text-body text-foreground/70 pb-6">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam id
            dolor id nibh ultricies vehicula ut id elit.
          </p>
        </details>
      ))}
    </div>
  </Section>
)
