import { Section } from '@/components/molecules/section'

// why: real quotes need the consent of who appears in them (LGPD, task
// Unresolved 2); names, roles and avatars are placeholders until then.
const TESTIMONIALS = ['A', 'B', 'C'].map(letter => ({
  name: `Pessoa ${letter}`,
  role: 'Cargo de exemplo',
  quote:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean lacinia bibendum nulla sed consectetur, vestibulum id ligula porta.'
}))

export const Testimonials = () => (
  <Section id="depoimentos" eyebrow="Depoimentos" title="Lorem ipsum dolor sit">
    <div className="mt-12 grid gap-6 lg:grid-cols-3">
      {TESTIMONIALS.map(({ name, role, quote }) => (
        <figure
          key={name}
          className="glass-card flex flex-col justify-between gap-8 rounded-3xl p-6"
        >
          <blockquote>
            <p className="text-body text-foreground/80">{quote}</p>
          </blockquote>
          <figcaption className="flex items-center gap-4">
            <svg
              role="img"
              aria-label={`Avatar de exemplo: ${name}`}
              viewBox="0 0 40 40"
              className="bg-steel/40 fill-mist/50 size-12 shrink-0 rounded-full"
            >
              <circle cx="20" cy="16" r="7" />
              <path d="M6 40a14 14 0 0 1 28 0z" />
            </svg>
            <div>
              <p className="text-body font-semibold">{name}</p>
              <p className="text-body-sm text-foreground/60">{role}</p>
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  </Section>
)
