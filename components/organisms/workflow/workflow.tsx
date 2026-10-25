import { Section } from '@/components/molecules/section'

// why: the first and last steps are named by the task (T9); the ones in
// between are still open (task Unresolved 10), so they stay lorem.
const STEPS = [
  'Discovery',
  'Lorem ipsum',
  'Dolor sit',
  'Amet consectetur',
  'Adipiscing elit',
  'Deploy'
]

export const Workflow = () => (
  <Section
    id="workflow"
    eyebrow="Workflow"
    title="Lorem ipsum dolor sit amet"
    intro="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec ullamcorper nulla non metus auctor."
  >
    <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {STEPS.map((title, index) => (
        <li key={title} className="border-foreground/10 rounded-3xl border p-6">
          <span
            data-step-number
            className="font-display text-title-md text-primary"
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="text-title-sm mt-3 font-semibold">{title}</h3>
          <p className="text-body-sm text-foreground/70 mt-2">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor.
          </p>
        </li>
      ))}
    </ol>
  </Section>
)
