# Landing page — costuras suaves, vidro nas soluções, alcance, timeline, convite e cursor

Sources:

- `.tasks/portfolio-lp-reach-and-seams.md` - os 28 critérios, o copy de "Alcance" (redação
  delegada), o copy do contato (literal do usuário) e o cursor de vidro (segunda mensagem)
- `a7cf52c^` - os sete `.glb` de vidro e os parâmetros de `MeshTransmissionMaterial`
- `.tasks/portfolio-lp-earth-and-sky.md` - Unresolved 1 (destino do botão), herdado

Profile: `light` (o repositório não declara outro). Handoff: um lote só (ver abaixo).

## Out of scope

- Destino do botão `Vamos conversar` - Unresolved 1
- Copy dos cards de Soluções e dos passos intermediários do Workflow - continuam lorem
- Linha da timeline que se preenche com o scroll - não pedido
- Uso do `logo.glb` - volta como arquivo, sem uso

## Landing

Toca `components/organisms/hero` (canvas que sangra meia tela, shader enquadrado pela tela
visível), `components/organisms/notebook` (céu no palco, copy), `components/organisms/solutions`,
`components/organisms/workflow`, `components/organisms/you-are-here`, `app/page.tsx`,
`app/globals.css` e um organismo novo `components/organisms/glass-stage` (canvas fixo, ícones e
cursor). Reaproveita `SectionsBackdrop`, `ParallaxField`, `StudioEnvironment`, `useNearViewport`,
`media-preferences` e os helpers de pixel de `e2e/page-helpers.ts`.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Um canvas fixo para todo o vidro (task, Decided 1) | `<Canvas frameloop="demand">` `position: fixed; inset: 0; pointer-events: none; z-index: 60`, `aria-hidden`, com `View.Port`; `<View>` do drei em cada ícone e no cursor | um `<Canvas>` por ícone e outro para o cursor: 7 contextos WebGL a mais |
| Cursor renderizado ao vivo (task, Decided 2) | `<View>` de 96×96 px centrado no ponteiro, câmera ortográfica a 32 px por unidade, ponta do modelo (-0.315, 0.5) na origem | `cursor: url(png)` - estático |
| A hero sangra abaixo da seção | canvas com `height: calc(100% + 50svh)`, máscara `linear-gradient(to bottom, black calc(100% - 75svh), transparent)`; o shader recebe `uResolution` da tela visível e `uBleed` (px de buffer abaixo dela) | aumentar o canvas sem corrigir o shader: o buraco negro desceria 25svh |

- Nothing else in this change is hard to reverse.

## Checks

Comando base: `npx playwright test e2e/reach-and-seams.spec.ts -g "<nome>"` (abreviado `RS "<nome>"`).

### S1 - A hero se dissolve no céu · 4 files · 30 KB · ~8k

**C1** - Fim da hero a 50% da viewport: |média das 8 linhas acima − 8 abaixo| ≤ 3
Proof: `RS "no seam under the hero"`

**C2** - O canvas da hero tem pixels não-pretos 25svh abaixo da seção e sua opacidade cai a 0 em 50svh
Proof: `RS "the black hole spills under the hero"`

**C3** - O fundo da `<section id="hero">` é `--color-ink`
Proof: `RS "the hero ground is ink"`

**C4** - Estrelas do primeiro bloco aparecem na faixa de dissolução (o bloco pinta por cima do canvas)
Proof: `RS "the sky lies over the spill"`

**C5** - Um clique em `#prova-social` na faixa de dissolução chega ao bloco, não ao canvas
Proof: `RS "the spill takes no clicks"`

**C6** - O enquadramento da primeira tela não muda
Proof: `npx playwright test e2e/hero.spec.ts`

### S2 - O palco do notebook continua o céu · 4 files · 40 KB · ~10k

**C7** - Topo do palco a 50% da viewport: |média acima − abaixo| ≤ 3
Proof: `RS "no seam over the notebook"`

**C8** - O palco fixo tem estrelas e os dois `sections-glow`
Proof: `RS "the notebook stage has the sky"`

**C9** - `#cases` não aparece pelo palco antes do hand-off
Proof: `RS "the stage hides the cases until the hand-off"`

### S3 - O notebook fala de alcance · 2 files · 15 KB · ~4k

**C10** - Rótulo `Alcance`, `h2` `Vá onde o concorrente não foi`
Proof: `npx playwright test e2e/notebook.spec.ts -g "heading"`

**C11** - Os três capítulos com o texto literal da task, um por aparelho
Proof: `npx playwright test e2e/notebook.spec.ts -g "chapter"`

### S4 - Ícones de vidro nas Soluções · 6 files · 30 KB · ~8k

**C12** - Os sete `.glb` iguais aos de `a7cf52c^`
Proof: `git diff --quiet a7cf52c^ -- public/models/glass`

**C13** - Com os modelos carregados, cada card tem um ícone de 64×64 na ordem atom, brick, cursor, flag, note, wave, sem o glifo SVG
Proof: `RS "glass icons on the solution cards"`

**C14** - O vidro usa os parâmetros de `a7cf52c^`
Proof: `grep -n "ior={1.45}" components/organisms/glass-stage/glass-material.tsx` (e os demais na mesma linha de leitura do diff)

**C15** - Giro de 0,3 rad/s; parado sob movimento reduzido
Proof: `npm test -- --test-name-pattern "spin"` (`components/organisms/glass-stage/glass-motion.test.ts`)

**C16** - Sem modelo (carregando ou falha), o card mostra o glifo SVG, título e texto
Proof: `RS "a missing model leaves the glyph"`

**C17** - Um único `<canvas>` para ícones e cursor; parado e longe de `#solucoes`, não desenha
Proof: `RS "one canvas for all the glass"`, `RS "the glass canvas rests"`

### S5 - Workflow como timeline · 2 files · 8 KB · ~2k

**C18** - 6 `<li>` sem `glass-card`, marcador `01`–`06`, ligados por uma linha
Proof: `RS "workflow is a timeline"`

**C19** - ≥1024px: linha central, ímpares à esquerda e pares à direita; abaixo, linha à esquerda
Proof: `RS "timeline alternates on wide screens"`

### S6 - O convite final · 3 files · 20 KB · ~5k

**C20** - `h2`, parágrafo fixo (cidade, aproximado, nulo), `A escolha é sua...` e o botão
Proof: `npx playwright test e2e/sections.spec.ts -g "contato"` (inclui a busca pendente)

**C21** - Anel em `--color-primary` de 100% a 125% em 2 s, botão sem mudar de tamanho; sem anel sob movimento reduzido
Proof: `RS "the call pulses"`, `RS "no pulse under reduced motion"`

### S7 - O cursor de vidro · 4 files · 25 KB · ~7k

**C22** - Mouse fino: `cursor: none`, ponta a ≤ 2 px do ponteiro parado, 32 px (±4) de altura
Proof: `RS "the glass cursor follows the pointer"`

**C23** - Inclinação ≤ 15° com movimento, 0° parado e sob movimento reduzido
Proof: `npm test -- --test-name-pattern "tilt"`

**C24** - 1,2× sobre `button`, `a[href]`, `summary`; 1× fora
Proof: `RS "the glass cursor grows over controls"`, `RS "the glass cursor counts buttons and links as controls"`

**C25** - Sem `(hover: hover) and (pointer: fine)` ou sem modelo, cursor nativo e nada desenhado
Proof: `RS "touch keeps the native cursor"`

**C26** - Some fora da janela e sobre um `<iframe>` que recebe o ponteiro, volta ao reentrar (as telas dos aparelhos não recebem o ponteiro - emenda na task)
Proof: `RS "the glass cursor hides over a frame that takes the pointer and off the window"`

**C27** - Não intercepta cliques; o vapor do globo segue o ponteiro
Proof: `RS "the glass cursor lets clicks through"`, `RS "pointer moves still reach the window under the glass"`

**C28** - Foco e ordem de tabulação inalterados
Proof: `RS "keyboard focus is the same with the glass cursor"`

## Swept

- validation: n/a - nenhuma entrada
- failure modes: C16, C25
- idempotency: n/a
- authorization: n/a - página pública
- concurrency: n/a
- data lifecycle: n/a
- dependency failure: C20 - o texto não depende de `/api/onde-estou`
- state transitions: n/a
- observability: C17

## Handoff

Um lote só: S1–S7 somam ~44k de leitura, bem abaixo de 150k.
