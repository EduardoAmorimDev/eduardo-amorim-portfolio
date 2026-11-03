import { GlitchText } from '@/components/atoms/glitch-text'

/**
 * The hero's eyebrow, title, subtitle and CTA: editorial, on the left beside
 * the black hole on wide screens, under it on tall ones. Only the text and
 * the button take the pointer.
 */
export const HeroCopy = () => (
  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end px-6 pb-14 lg:px-16 landscape:justify-center landscape:pb-0">
    <div className="max-w-xl landscape:max-w-[46%]">
      <span className="text-caption text-foreground/60 motion-safe:animate-rise block font-semibold tracking-[0.3em] uppercase [--rise-delay:0.9s]">
        Lorem ipsum
      </span>
      <GlitchText
        as="h1"
        text="Lorem ipsum dolor sit amet"
        className="font-display text-hero motion-safe:animate-rise pointer-events-auto mt-4 [--rise-delay:1.05s]"
      />
      <p className="text-subtitle text-foreground/70 motion-safe:animate-rise pointer-events-auto mt-6 max-w-md [--rise-delay:1.25s]">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore.
      </p>
      {/* why: the CTA's real destination is still open (task Unresolved 1);
          until then it leads to the contact section. */}
      <a
        href="#contato"
        className="bg-primary text-body text-mist hover:bg-steel motion-safe:animate-rise pointer-events-auto mt-8 inline-flex h-12 items-center rounded-full px-7 font-semibold transition-colors [--rise-delay:1.4s]"
      >
        Lorem ipsum dolor
      </a>
    </div>
  </div>
)
