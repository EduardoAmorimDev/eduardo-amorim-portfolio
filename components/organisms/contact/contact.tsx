import { Section } from '@/components/molecules/section'

// hazard: the button has no destination yet; WhatsApp, e-mail, a calendar or
// a form is still open (task Unresolved 1) and blocks the go-live.
export const Contact = () => (
  <Section
    id="contato"
    eyebrow="Contato"
    title="Lorem ipsum dolor sit amet"
    intro="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam porta sem malesuada magna mollis euismod."
  >
    <button
      type="button"
      className="bg-primary text-subtitle text-mist hover:bg-steel mt-10 inline-flex h-14 items-center rounded-full px-8 font-semibold transition-colors"
    >
      Lorem ipsum dolor
    </button>
  </Section>
)
