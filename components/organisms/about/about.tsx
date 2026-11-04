import { Section } from '@/components/molecules/section'

// why: the visitor meets the person behind the work; written from his own
// bio (task swallow-and-copy, 16), so edit it there before here.
const ABOUT_PARAGRAPHS = [
  'Meu nome é Eduardo Amorim. Sou desenvolvedor front-end e construo aplicações web modernas com Next.js, React e TypeScript, com Tailwind, Material UI e as bibliotecas que encurtam o caminho entre a ideia e a tela. Testo com Cypress para que o que funciona hoje continue funcionando amanhã, e transito pelo back-end com Java, Spring e Quarkus. Minha obsessão é performance e experiência do usuário.',
  'Na Syonet, tive papel central na modernização do front-end: um sistema legado em AngularJS virou uma plataforma em React, moderna e de alta performance. Reestruturei componentes, melhorei a arquitetura e otimizei o desempenho para um sistema mais eficiente e escalável. O resultado foi uma experiência melhor, mais engajamento e impacto direto na receita da empresa.',
  'Além do código, atuo em mentorias e em decisões de arquitetura. Meu caminho é a liderança técnica: unir profundidade em desenvolvimento a visão estratégica para impulsionar inovação e crescimento.',
  'Fora do trabalho, sigo explorando novas tecnologias, aprendendo sempre e investindo com estratégia. No tempo livre, equilibro corpo e mente entre vôlei, musculação e xadrez.'
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
