import { Section } from '@/components/molecules/section'

// why: placeholders, not real brands; client logos need authorisation of
// brand use first (task Unresolved 2). Each is a geometric mark.
const LOGOS = [
  { name: 'Cliente A', mark: <circle cx="20" cy="20" r="12" /> },
  {
    name: 'Cliente B',
    mark: <rect x="8" y="8" width="24" height="24" rx="4" />
  },
  { name: 'Cliente C', mark: <polygon points="20,6 34,32 6,32" /> },
  { name: 'Cliente D', mark: <polygon points="20,5 35,20 20,35 5,20" /> },
  {
    name: 'Cliente E',
    mark: <polygon points="20,5 33,12.5 33,27.5 20,35 7,27.5 7,12.5" />
  },
  {
    name: 'Cliente F',
    mark: <path d="M8 20a12 12 0 0 1 24 0h-8a4 4 0 0 0-8 0z" />
  }
]

export const SocialProof = () => (
  <Section
    id="prova-social"
    eyebrow="Prova social"
    title="Lorem ipsum dolor sit amet"
    intro="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio praesent libero."
  >
    <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {LOGOS.map(({ name, mark }) => (
        <li
          key={name}
          className="border-foreground/10 flex h-20 items-center justify-center rounded-2xl border"
        >
          <svg
            role="img"
            aria-label={`Logo de exemplo: ${name}`}
            viewBox="0 0 120 40"
            className="fill-foreground/60 h-8"
          >
            {mark}
            <rect x="44" y="14" width="64" height="5" rx="2.5" />
            <rect x="44" y="23" width="40" height="4" rx="2" />
          </svg>
        </li>
      ))}
    </ul>
  </Section>
)
