import { GlitchText } from '@/components/atoms/glitch-text'

/**
 * The hero's title, subtitle and CTA, laid over the 3D scene. Only the text
 * and the button take the pointer, so the glass icons around them stay
 * hoverable.
 */
export const HeroCopy = () => (
  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-6 pb-10 lg:px-16 lg:pb-16">
    <GlitchText
      as="h1"
      text="Lorem ipsum dolor sit amet"
      className="font-display text-title-lg lg:text-display pointer-events-auto w-fit max-w-xl"
    />
    <p className="text-subtitle text-foreground/80 pointer-events-auto mt-4 w-fit max-w-md">
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
