import { Section } from '@/components/molecules/section'
import {
  GlassIcon,
  GlassShelf,
  SOLUTION_MODELS
} from '@/components/organisms/glass-stage'
import { SOLUTION_ICONS } from './solution-icons'

const SOLUTIONS = SOLUTION_MODELS.map((model, index) => ({
  model,
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
        {SOLUTIONS.map(({ model, title, text }) => (
          <li key={title} className="glass-card rounded-3xl p-6">
            <GlassIcon model={model}>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                data-flat-icon={model}
                className="bg-primary/15 stroke-primary size-16 rounded-2xl fill-none stroke-2 p-4 [stroke-linecap:round] [stroke-linejoin:round]"
              >
                {SOLUTION_ICONS[model]}
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
