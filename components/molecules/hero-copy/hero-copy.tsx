import { GlitchText } from '@/components/atoms/glitch-text'

const TITLE = 'Lorem ipsum dolor sit amet'
// why: shared by the title and its outline, so both wrap into the same lines.
const TITLE_TYPE = 'font-display text-hero'

/**
 * The hero's title, subtitle and CTA, centred over the 3D scene. The title
 * has an outline twin the lens reveals (use-hero-field.ts): inside the lens
 * the solid title is masked out and the outline shows instead. Only the text
 * and the button take the pointer, so the glass logo around them stays
 * hoverable.
 */
export const HeroCopy = () => (
  // why: the top padding sets the block a little low, so the title's centre
  // lands between 40% and 55% of the hero with the CTA still on screen.
  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 pt-[10svh] text-center lg:px-16">
    <div className="relative w-full max-w-7xl">
      <div data-lens="solid" className="lens-solid">
        <GlitchText
          as="h1"
          text={TITLE}
          className={`${TITLE_TYPE} pointer-events-auto w-full`}
        />
      </div>
      <span
        aria-hidden="true"
        data-lens="outline"
        className={`${TITLE_TYPE} lens-outline pointer-events-none absolute inset-0`}
      >
        {TITLE}
      </span>
    </div>
    <p className="text-subtitle text-foreground/80 pointer-events-auto mt-4 max-w-md">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
      tempor incididunt ut labore.
    </p>
    {/* why: the CTA's real destination is still open (task Unresolved 1);
        until then it leads to the contact section. */}
    <a
      href="#contato"
      className="bg-primary text-body text-mist hover:bg-steel pointer-events-auto mt-6 inline-flex h-12 items-center rounded-full px-6 font-semibold transition-colors"
    >
      Lorem ipsum dolor
    </a>
  </div>
)
