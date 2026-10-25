import { Section } from '@/components/molecules/section'

export const About = () => (
  <Section id="sobre" eyebrow="Sobre" title="Lorem ipsum dolor sit">
    <div className="mt-12 grid items-center gap-10 md:grid-cols-[2fr_3fr]">
      <div
        role="img"
        aria-label="Foto de exemplo"
        className="border-foreground/10 from-primary/40 to-steel/30 flex aspect-4/5 items-end justify-center overflow-hidden rounded-3xl border bg-linear-to-br"
      >
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="fill-mist/30 w-3/5"
        >
          <circle cx="50" cy="38" r="18" />
          <path d="M14 100a36 36 0 0 1 72 0z" />
        </svg>
      </div>
      <div className="text-body text-foreground/80 space-y-5">
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </p>
        <p>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
          proident, sunt in culpa qui officia deserunt mollit anim id est
          laborum lorem.
        </p>
      </div>
    </div>
  </Section>
)
