import { Section } from '@/components/molecules/section'

// why: real cases in production are still to be chosen (task Unresolved 2);
// the stack tags are lorem too, so no product name ships by accident.
const CASES = ['A', 'B', 'C'].map(letter => ({
  name: `Case ${letter}`,
  title: `Lorem ipsum dolor ${letter}`,
  text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum.',
  stack: ['Lorem', 'Ipsum', 'Dolor']
}))

export const Cases = () => (
  <Section
    id="cases"
    eyebrow="Cases"
    title="Lorem ipsum dolor sit"
    intro="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras mattis consectetur purus sit amet."
  >
    <div className="mt-12 grid gap-6 lg:grid-cols-3">
      {CASES.map(({ name, title, text, stack }) => (
        <article key={name} className="glass-card overflow-hidden rounded-3xl">
          <svg
            role="img"
            aria-label={`Imagem de exemplo: ${name}`}
            viewBox="0 0 160 100"
            className="bg-steel/30 aspect-16/10 w-full"
          >
            <rect
              x="16"
              y="16"
              width="128"
              height="68"
              rx="6"
              className="fill-ink/60"
            />
            <rect
              x="26"
              y="28"
              width="56"
              height="6"
              rx="3"
              className="fill-primary"
            />
            <rect
              x="26"
              y="40"
              width="88"
              height="4"
              rx="2"
              className="fill-mist/40"
            />
            <rect
              x="26"
              y="50"
              width="72"
              height="4"
              rx="2"
              className="fill-mist/40"
            />
            <circle cx="122" cy="62" r="12" className="fill-primary/60" />
          </svg>
          <div className="p-6">
            <h3 className="text-title-sm font-semibold">{title}</h3>
            <p className="text-body-sm text-foreground/70 mt-2">{text}</p>
            <ul aria-label="Stack" className="mt-4 flex flex-wrap gap-2">
              {stack.map(tag => (
                <li
                  key={tag}
                  className="border-foreground/15 text-caption rounded-full border px-3 py-1"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </div>
  </Section>
)
