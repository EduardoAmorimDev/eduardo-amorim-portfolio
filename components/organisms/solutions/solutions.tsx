import { Section } from '@/components/molecules/section'
import {
  GlassIcon,
  GlassShelf,
  SOLUTION_MODELS
} from '@/components/organisms/glass-stage'

// why: each card's glyph stands in for its glass icon until the model has
// loaded, and for good where it cannot (task reach-and-seams, 16).
const ICONS = [
  <circle key="circle" cx="12" cy="12" r="7" />,
  <rect key="square" x="5" y="5" width="14" height="14" rx="3" />,
  <polygon key="triangle" points="12,4 20,19 4,19" />,
  <polygon key="diamond" points="12,3 21,12 12,21 3,12" />,
  <polygon key="hexagon" points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" />,
  <path key="arc" d="M4 15a8 8 0 0 1 16 0" />
]

const SOLUTIONS = ICONS.map((icon, index) => ({
  icon,
  model: SOLUTION_MODELS[index % SOLUTION_MODELS.length],
  title: `Lorem ipsum ${index + 1}`,
  text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.'
}))

export const Solutions = () => (
  <Section
    id="solucoes"
    eyebrow="Soluções"
    title="Lorem ipsum dolor sit amet"
    intro="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla quis sem at nibh elementum imperdiet."
  >
    <GlassShelf>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SOLUTIONS.map(({ icon, model, title, text }) => (
          <li key={title} className="glass-card rounded-3xl p-6">
            <GlassIcon model={model}>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="bg-primary/15 stroke-primary size-16 rounded-2xl fill-none stroke-2 p-4"
              >
                {icon}
              </svg>
            </GlassIcon>
            <h3 className="text-title-sm mt-5 font-semibold">{title}</h3>
            <p className="text-body-sm text-foreground/70 mt-2">{text}</p>
          </li>
        ))}
      </ul>
    </GlassShelf>
  </Section>
)
