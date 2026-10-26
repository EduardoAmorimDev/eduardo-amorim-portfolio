# Landing page do portfólio — correções visuais

Profile: `light` (o `AGENTS.md` do repositório não declara perfil) · handoff: `on`, budget 150k.
Base da feature: `cb1895a`. Branch: `feat/landing/portfolio-lp-visual`.

Sources:

- `.tasks/portfolio-lp-corrections.md` — a tarefa: 28 critérios (citados como `T1`–`T28`), fora de
  escopo, Decided, Unresolved. Nada em `Unresolved` é decidido aqui.
- `.tasks/portfolio-lp-visual.md` — a tarefa anterior; o que esta não substitui continua valendo.
- Conversa com o usuário — respostas transcritas em `Sources` da tarefa (ícones `cursor`, `atom`,
  `logo` na Hero; parallax inalterado; luz = a bola azul da Hero; glitch e pendências no
  recomendado). Não há design binding; o perfil `light` não compara telas.

## Out of scope

- Trocar as formas SVG do parallax, ou mudar o parallax de qualquer outra forma — "deixa assim".
- Seletor de tema ou tema claro.
- Apagar `note.glb`, `flag.glb`, `wave.glb`, `brick.glb` — deixam de ser carregados.
- Destino real dos CTAs e conteúdo real — Unresolved 1 da tarefa.

## Landing

`components/organisms/laptop-hero/` se divide em dois organismos que seguem o padrão atual
(`<Canvas>` + drei, matemática pura testada à parte): `components/organisms/hero/` (malha, luz,
ícones, texto por cima) e `components/organisms/notebook/` (notebook, piso, holofotes, sombra). O
`<Environment>` de `Lightformer`s, que o vidro e o alumínio precisam, passa a ser um átomo usado
pelas duas cenas, em vez de copiado. `app/page.tsx` repete o bloco `relative isolate` (fundo +
parallax) antes e depois de `#notebook`. Reusa `readColorToken`, `prefersReducedMotion`,
`useScrollProgress`, `glass-motion.ts` e `lib/glitch.ts`.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| None | - | - |

- Nada aqui é difícil de reverter: nada persistido, nenhuma dependência nova (Decided da tarefa),
  nenhum padrão novo; o `id` `notebook` é uma âncora decidida na tarefa (T1).

## Checks

### S1 - Seções e ordem (T1) · 3 files · 12 KB · ~3k

**C1** - `<main>` tem dez `<section>` com os `id` `hero`, `prova-social`, `sobre`, `solucoes`,
`notebook`, `cases`, `workflow`, `depoimentos`, `faq`, `contato`, nesta ordem
Proof: `npx playwright test e2e/sections.spec.ts -g "main has the ten sections in order"`

**C2** - Toda seção, exceto `hero` e `notebook`, tem um `<h2>` e um parágrafo lorem ipsum
Proof: `npx playwright test e2e/sections.spec.ts -g "every section but hero and notebook has an h2 and lorem text"`

**C3** - `#notebook` não tem texto visível e tem `aria-label="Notebook"`
Proof: `npx playwright test e2e/notebook.spec.ts -g "notebook is labelled and shows no text"`

### S2 - Hero: malha, luz azul, ícones e texto (T2–T10) · 14 files · 70 KB · ~18k

**C4** - Em 1440×900, com a rolagem em 0, `#hero` tem 900 px de altura
Proof: `npx playwright test e2e/hero.spec.ts -g "hero is one screen tall"`

**C5** - `#hero` não contém o notebook (nenhum `iframe` da tela do notebook em `#hero`)
Proof: `npx playwright test e2e/hero.spec.ts -g "hero has no laptop"`

**C6** - O `<h1>`, o subtítulo e o CTA cabem inteiros na primeira tela, sobre a cena, em 1440×900
e em 375×667
Proof: `npx playwright test e2e/sections.spec.ts -g "hero copy fits the first screen"`

**C7** - O CTA da Hero rola até `#contato`
Proof: `npx playwright test e2e/sections.spec.ts -g "hero CTA scrolls to contato"`

**C8** - Os ícones de vidro da Hero são exatamente `cursor`, `atom` e `logo`
Proof: `node --test components/organisms/hero/glass-motion.test.ts` (teste "the hero shows exactly the cursor, atom and logo icons")

**C9** - A página carrega `cursor.glb`, `atom.glb` e `logo.glb` e nunca `note.glb`, `flag.glb`,
`wave.glb` nem `brick.glb`
Proof: `npx playwright test e2e/hero.spec.ts -g "only the cursor, atom and logo models are loaded"`

**C10** - Os ícones se movem como hoje: `MOTION` (inclinação 0,12, deslocamento 0,08, inclinação
no hover 0,3, escala no hover 1,06) e `ORBIT` (0,55 / −0,42 / 0,32 e 0,25 rad/s) com os valores
de hoje, e `motionTarget` inclina e cresce no hover
Proof: `node --test components/organisms/hero/glass-motion.test.ts` (testes "motion and orbit constants keep their values", "hovering leans towards the hovered point, not the canvas pointer, and grows", "each ring tumbles at its own speed and direction")

**C11** - A malha da Hero continua: retas a cada 48 px, curva ≤ 12 px a até 160 px do ponteiro,
retas além disso, e volta a ficar reta em até 800 ms após o ponteiro parar ou sair
Proof: `npx playwright test e2e/hero-grid.spec.ts -g "grid is straight and 48px apart at rest"`
Proof: `npx playwright test e2e/hero-grid.spec.ts -g "lines near a moving pointer bend at most 12px"`
Proof: `npx playwright test e2e/hero-grid.spec.ts -g "lines beyond 160px stay straight"`
Proof: `npx playwright test e2e/hero-grid.spec.ts -g "lines straighten within 800ms"`
Proof: `npx playwright test e2e/hero-grid.spec.ts -g "grid never takes the pointer from the 3D canvas"`

**C12** - A malha interativa ocupa só a caixa de `#hero` e existe uma única vez na página
Proof: `npx playwright test e2e/hero.spec.ts -g "the hero grid covers the hero and nothing else"`

**C13** - Nenhum elemento fora de `#hero` tem fundo de linhas (`sections-grid` não existe e nenhum
`background-image` com `linear-gradient` de 1 px aparece fora da Hero)
Proof: `npx playwright test e2e/glitch.spec.ts -g "no section but the hero has a grid"`

**C14** - Cada bloco de seções depois da Hero continua com um brilho radial `primary` e um `steel`,
desfocados
Proof: `npx playwright test e2e/glitch.spec.ts -g "sections background has a primary and a steel glow"`

**C15** - A luz aparece na metade esquerda do alto da Hero: núcleo com luminância ≥ 0,9 e halo
entre 0,15 e 0,9 a 40 px do centro
Proof: `npx playwright test e2e/hero-light.spec.ts -g "a glowing light core with a halo sits at the top left of the hero"`

**C16** - Sem movimento reduzido, o centro do núcleo fica sempre a até 40 px do repouso e duas
capturas com 2 s de intervalo diferem em pelo menos 2 px
Proof: `npx playwright test e2e/hero-light.spec.ts -g "the light drifts slowly near its rest point"`
Proof: `node --test components/organisms/hero/light-drift.test.ts`

**C17** - Com `prefers-reduced-motion: reduce`, duas capturas do núcleo com 2 s de intervalo
diferem em no máximo 1 px
Proof: `npx playwright test e2e/reduced-motion.spec.ts -g "the light holds still under reduced motion"`

**C18** - Em `#notebook`, o alto da tela (acima do notebook) não tem núcleo nem halo: luminância
máxima < 0,1
Proof: `npx playwright test e2e/hero-light.spec.ts -g "the notebook shows no light core or halo"`

### S3 - Notebook como seção própria (T11–T13) · 6 files · 30 KB · ~8k

**C19** - `#notebook` tem três telas de altura e, no meio da rolagem por ela, o canvas da cena
está preso no topo da tela
Proof: `npx playwright test e2e/notebook.spec.ts -g "notebook is three screens tall and holds its scene"`

**C20** - Com o topo de `#notebook` no topo da tela, a tela do notebook está apagada (opacidade
≤ 0,05); ao fim da seção, ligada (opacidade ≥ 0,9)
Proof: `npx playwright test e2e/notebook.spec.ts -g "scrolling through the notebook powers the laptop on"`

**C21** - Enquanto `#notebook` ocupa a tela, nenhuma camada do parallax nem brilho das seções a
alcança, e não há malha em `#notebook`
Proof: `npx playwright test e2e/notebook.spec.ts -g "nothing floats over the notebook"`

**C22** - A cena do notebook mantém o piso: ele começa iluminado perto do notebook e se dissolve
em `ink`, sem borda
Proof: `npx playwright test e2e/theme.spec.ts -g "dark scheme notebook sky and floor are ink"`

**C23** - Com `prefers-reduced-motion: reduce`, o notebook ainda liga ao fim de `#notebook`
Proof: `npx playwright test e2e/reduced-motion.spec.ts -g "laptop still opens with the scroll under reduced motion"`

### S4 - Parallax inalterado (T14) · 3 files · 14 KB · ~4k

**C24** - As camadas se movem a 0,2×, 0,5× e 1,3× da rolagem
Proof: `npx playwright test e2e/parallax.spec.ts -g "layers move at 0.2x, 0.5x and 1.3x of the scroll"`

**C25** - A frente são barras arredondadas desfocadas (≥ 8 px) em `primary`, `steel` e `mist`
junto às bordas
Proof: `npx playwright test e2e/parallax.spec.ts -g "front layer is blurred code bars near the side edges"`

**C26** - O meio tem o octaedro e o cubo arredondado brilhantes
Proof: `npx playwright test e2e/parallax.spec.ts -g "middle layer has a glowing octahedron and rounded cube"`

**C27** - Com `prefers-reduced-motion: reduce`, as camadas rolam junto com o conteúdo
Proof: `npx playwright test e2e/reduced-motion.spec.ts -g "parallax layers stay put under reduced motion"`

### S5 - Glitch mais rico (T15–T19) · 5 files · 25 KB · ~6k

**C28** - Um título que entra na tela, ou recebe o ponteiro, roda uma única rajada de no máximo
600 ms
Proof: `npx playwright test e2e/glitch.spec.ts -g "a heading glitches once when it scrolls into view"`
Proof: `npx playwright test e2e/glitch.spec.ts -g "hovering a heading triggers one burst"`

**C29** - A rajada tem 6 quadros com cópias e um quadro final limpo
Proof: `node --test lib/glitch.test.ts` (teste "a burst is six frames with copies, then a clean one, within 600 ms")
Proof: `npx playwright test e2e/glitch.spec.ts -g "a burst paints six frames of copies"`

**C30** - Em cada quadro, uma cópia `primary` e uma `mist`, cada uma recortada em 3 faixas
horizontais e deslocada entre 1 e 8 px na horizontal
Proof: `node --test lib/glitch.test.ts` (teste "every copy is cut into three bands and shifted between 1 and 8px")
Proof: `npx playwright test e2e/glitch.spec.ts -g "a burst shows a primary and a mist copy, shifted at most 8px and cut in three bands"`

**C31** - Durante a rajada o texto principal treme até 2 px na horizontal; ao fim, título e cópias
ficam sem deslocamento
Proof: `node --test lib/glitch.test.ts` (teste "the text shakes at most 2px and settles at 0")
Proof: `npx playwright test e2e/glitch.spec.ts -g "the heading trembles during a burst and settles"`

**C32** - Nenhuma rajada se repete sozinha
Proof: `npx playwright test e2e/glitch.spec.ts -g "no burst repeats on its own"`

**C33** - Um gatilho durante uma rajada não inicia outra
Proof: `node --test lib/glitch.test.ts` (teste "a trigger while a burst runs is ignored")

**C34** - Sem o limite de 3 mudanças por segundo: um gatilho logo após o fim de uma rajada começa
na hora
Proof: `node --test lib/glitch.test.ts` (teste "a trigger right after a burst starts at once")

**C35** - As cópias têm `aria-hidden="true"` e cada título é lido uma vez
Proof: `npx playwright test e2e/glitch.spec.ts -g "copies are hidden from assistive tech"`

**C36** - Com `prefers-reduced-motion: reduce`, nenhuma rajada dispara
Proof: `npx playwright test e2e/reduced-motion.spec.ts -g "no glitch under reduced motion"`

### S6 - FAQ abre no hover, fixa no clique (T20–T26) · 2 files · 10 KB · ~3k

**C37** - Ao carregar, as 5 perguntas estão fechadas
Proof: `npx playwright test e2e/faq.spec.ts -g "faq shows five closed questions"`

**C38** - O mouse sobre uma pergunta fechada mostra a resposta
Proof: `npx playwright test e2e/faq.spec.ts -g "hovering a question opens it"`

**C39** - O mouse saindo de uma pergunta não fixada a fecha em até 300 ms
Proof: `npx playwright test e2e/faq.spec.ts -g "leaving an unpinned question closes it within 300ms"`

**C40** - Clicar numa pergunta aberta pelo hover a mantém aberta depois que o mouse sai
Proof: `npx playwright test e2e/faq.spec.ts -g "clicking a question keeps it open after the pointer leaves"`

**C41** - Clicar numa pergunta fixada a fecha, mesmo com o mouse ainda sobre ela
Proof: `npx playwright test e2e/faq.spec.ts -g "clicking a pinned question closes it"`

**C42** - Com uma pergunta fixada, passar o mouse em outra abre a outra e mantém a fixada aberta
Proof: `npx playwright test e2e/faq.spec.ts -g "hovering another question keeps the pinned one open"`

**C43** - Com o foco numa pergunta, Enter abre e fixa; Espaço fecha
Proof: `npx playwright test e2e/faq.spec.ts -g "Enter and Space toggle a question from the keyboard"`

**C44** - A árvore de acessibilidade marca a pergunta como expandida quando aberta e não
expandida quando fechada
Proof: `npx playwright test e2e/faq.spec.ts -g "a question exposes whether it is expanded"`

**C45** - Em tela de toque, tocar alterna aberta/fechada, e a pergunta tocada continua aberta sem
hover
Proof: `npx playwright test e2e/faq.spec.ts -g "a tap toggles a question without hover"`

### S7 - Só tema escuro (T27–T28) · 5 files · 22 KB · ~6k

**C46** - Em `light` e `dark`, todas as seções pintam fundo `ink` e texto `mist`
Proof: `npx playwright test e2e/theme.spec.ts -g "sections paint ink and mist"`

**C47** - Em `light` e `dark`, as cópias do glitch são `primary` e `mist`
Proof: `npx playwright test e2e/theme.spec.ts -g "glitch copies are primary and mist"`

**C48** - Em `light` e `dark`, a malha da Hero é desenhada em `mist`
Proof: `npx playwright test e2e/theme.spec.ts -g "hero grid is drawn in mist"`

**C49** - Em `light` e `dark`, o `color-scheme` calculado do `<html>` é `dark`
Proof: `npx playwright test e2e/theme.spec.ts -g "the document declares a dark color scheme"`

**C50** - Em `light`, o céu e o piso da cena do notebook são `ink`, como no escuro
Proof: `npx playwright test e2e/theme.spec.ts -g "light scheme notebook sky and floor are ink"`

**C51** - Trocar o esquema do sistema com a página aberta não muda o fundo, o texto, a malha nem
as cópias do glitch
Proof: `npx playwright test e2e/theme.spec.ts -g "switching the system scheme changes no colour"`

**C52** - Em 375×667, a página não tem rolagem horizontal (`scrollWidth` ≤ 375 do topo ao fim)
Proof: `npx playwright test e2e/sections.spec.ts -g "no horizontal scroll at 375px"`

### Gate

**C53** - Tipos, lint e todos os testes passam
Proof: `npx tsc --noEmit`
Proof: `npm run lint`
Proof: `npm test`
Proof: `npm run test:e2e`

## Swept

- validation: not in scope - não há campo de entrada
- failure modes: existing - `findParts` lança erro se faltar nó no GLB; sem WebGL as cenas não renderizam; inalterado
- idempotency: not in scope - nada é gravado nem enviado
- authorization: not in scope - página pública
- concurrency: C33 (gatilho durante rajada); C40 (clique em pergunta aberta pelo hover e saída do mouse); C42 (hover em outra com uma fixada)
- data lifecycle: not in scope - nada persistido
- dependency failure: existing - iframe de `SCREEN_URL` fica preto se falhar (os testes abortam a requisição); agora em `#notebook`
- state transitions: C37–C45 (FAQ); C28–C31 (título limpo ↔ rajada)
- observability: not in scope - página estática; FPS medido à mão

## Handoff

S1–S7 somam ~48k tokens de leitura (162 KB de `app/`, `components/`, `e2e/` e `lib/` ÷ 4, mais
a tarefa), abaixo de 150k: um lote só, sem handoff. O Verifier roda depois, sobre
`cb1895a..HEAD`, com todos os checks.

Tests superseded (removidos ou reescritos, cada um com o check que o substitui):

- `e2e/theme.spec.ts` "light scheme paints white background and ink text", "light scheme glitch
  copies are primary and steel", "light scheme grids are drawn in steel", "switching scheme live
  repaints the sections", "switching scheme live repaints the 3D scene" → C46–C51
- `e2e/hero-light.spec.ts` "floor facing the light is brighter than the far side", "laptop side
  facing the light is brighter", "light scheme shows a primary-tinted halo against white" → C15,
  C18 (a luz não ilumina mais o notebook; não há tema claro); "scrolling through the hero powers
  the laptop on" → C20
- `e2e/glitch.spec.ts` "sections background is an 80px grid at most 6% opaque" (claro e escuro)
  → C13
- `lib/glitch.test.ts` "the rate limit is 3 changes per 1000 ms", "a burst changes the text at
  most 3 times", "fitsRate rejects four changes inside one second", "a trigger right after a
  burst is deferred until the rate allows it", "burstStart never returns a time before now",
  "hovering non-stop for 10 s never changes…", "random triggers never change…" → C29, C34
- `e2e/sections.spec.ts` "main has the nine sections in order" → C1
- Renomeados, reescritos ou movidos (rodada 2, a partir do relatório do Verifier):
  `e2e/theme.spec.ts` "dark scheme paints ink background and mist text" → C46; "3D scene sky
  matches the theme background" e "far floor fades into the theme background" (claro e escuro)
  → C22, C50, agora sobre `#notebook`; `e2e/hero-light.spec.ts` "a glowing light core with a
  halo sits above the laptop" → C15 ("…sits at the top left of the hero"); `e2e/glitch.spec.ts`
  "a burst shows a primary and a mist copy, shifted at most 4px and sliced" → C30;
  `e2e/sections.spec.ts` "every section but hero has an h2 and lorem text" → C2, "faq shows
  five closed questions" e "faq question opens and closes" movidos sem mudança para
  `e2e/faq.spec.ts` → C37; `lib/color-tokens.test.ts` "THEME_COLORS lists exactly the
  variables of the light theme" → renomeado "…the colour variables of the theme";
  `lib/glitch.test.ts` "a burst ends within 600 ms and leaves the text clean", "frames with
  copies show one copy each side" → C29; "every copy shifts at most 4px sideways and is cut to
  a band", "clipPath keeps the band between the top and bottom insets" → C30 ("clipPath keeps
  exactly the three bands"); "a trigger long after the last burst starts at once" → C34
- `e2e/hero-grid.spec.ts` "grid never takes the pointer from the 3D canvas": a asserção "o alvo é
  o `<div>` que segura o canvas" vinha do `<Html>` do notebook, que deixava o canvas sem ponteiro;
  sem o notebook na Hero, o alvo é o próprio canvas. Passa a afirmar "o alvo está dentro da cena"
  (`scene.contains(target)`), com o mesmo "não é a malha" de antes → C11

Build (mesmo lote, sem handoff): a primeira rodada do e2e teve 3 falhas, todas nos testes novos
ou nessa asserção: corrida ao instalar o observador do FAQ antes do mouse sair (C39), nome
acessível lido com o "+" `aria-hidden` (C44) e a asserção acima. Corrigidos nos testes; o código
não mudou por causa deles.

Rodada 2 (achados do Verifier em `332a61e`): C22 ganhou a asserção de que o piso próximo fica
≥ 0,005 de luminância acima de `ink` (medido ~0,016 contra ~0,0056), e não só "mais perto de
ink que de branco"; C30 ganhou o limite inferior de 1 px no unitário e no e2e; o comentário de
`light-drift.ts` cita T8 em vez de T6; a lista acima foi completada.
