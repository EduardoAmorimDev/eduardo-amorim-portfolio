import { Section } from '@/components/molecules/section'

// why: the visitor meets the person behind the work; written from his own
// bio (task swallow-and-copy, 16), so edit it there before here.
const ABOUT_PARAGRAPHS = [
  'Meu nome é Eduardo Amorim. Sou engenheiro full stack, desenvolvo produtos de ponta a ponta, com diversas tecnologias e bibliotecas que encurtam o caminho entre ideia e produto. Sou apaixonado por performance e experiência do usuário.',
  'Além do código, atuo em mentorias, decisões técnicas e de produto. Meu objetivo é ser um profissional com cada vez mais profundidade técnica, visão estratégica e entendimento de qualquer negócio, possibilitando assim, a inovação e o crescimento, por onde quer que passe.'
]

export const About = () => (
  <Section id="sobre" eyebrow="Sobre" title="A cara por trás do resultado">
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
        {ABOUT_PARAGRAPHS.map(paragraph => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
      </div>
    </div>
  </Section>
)
