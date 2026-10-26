# Landing page do portfólio — Hero cósmica e refinamentos

Profile: `light` (o `AGENTS.md` do repositório não declara perfil) · handoff: `on`, budget 150k.
Base da feature: `c625ce9`. Branch: `main`, por pedido explícito do usuário ("eles vão ser feitos
na main e commitados nela mesmo"), exceção à regra de branch protegida de
`~/Documents/docs/commit-convention.md`. Sem push.

Sources:

- `.tasks/portfolio-lp-cosmos.md` — os 42 critérios, o limite (`Out of scope`), o `Swept` e o
  `Impact`; é o registro de decisão. Os números entre parênteses abaixo são os critérios dela.
- `.tasks/portfolio-lp-corrections.md` — critérios 20–26 (regras do FAQ), que continuam valendo
  (critério 7).
- Referências visuais transcritas na tarefa (Corn Revolution, as duas capturas de tela): estilo,
  não binding; os valores que decidem algo já estão nos critérios.

## Out of scope

- Fallback sem WebGL — Unresolved 2 da tarefa, `open`; nada aqui o decide.
- Conteúdo real e destino dos CTAs — Unresolved 1, herdado.
- Lente como cursor personalizado, corpos novos no fundo, troca das formas SVG, lente
  gravitacional física, DPR adaptativo — `Out of scope` da tarefa.
- Remover `cursor.glb` e `atom.glb` de `public/models/glass/` — deixam de ser requisitados (14),
  mas apagar arquivos publicados não foi pedido.

## Landing

Toca a Hero (`components/organisms/hero/`, `components/molecules/hero-copy/`), o glitch
(`lib/glitch.ts`, `components/atoms/glitch-text/`), o FAQ, o fundo das seções
(`sections-backdrop`, `parallax-field`), os cards e `app/globals.css`. Reusa `RenderGate` e
`useNearViewport` para a pausa fora da tela, `readColorToken`/`readThemeColor` para as cores e
`prefersReducedMotion`/`onReducedMotionChange` para o movimento reduzido. Nenhuma dependência
nova.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| None | - | - |

- Nada aqui é difícil de reverter: nada persiste, nenhum contrato é consumido por fora e nenhuma
  dependência entra (critério 41).

Decisões reversíveis, registradas antes do código:

- **Malha e lente em canvas 2D; buraco negro em WebGL.** A malha e a lente ficam em dois
  `<canvas>` 2D (`hero-grid` abaixo da cena, `hero-lens` acima dela), e o buraco negro é um quad
  com shader na cena R3F, com uma `pointLight` no mesmo ponto que ilumina o `logo` (31). Um único
  laço de quadros 2D simula os corpos (caminho do buraco negro, poço do ponteiro, lente) e
  publica a posição do buraco negro num `ref` compartilhado que a cena lê. Rejeitado: malha em
  WebGL, que perde a leitura exata de pixels do canvas 2D usada pelas provas de 16–21, e em que a
  largura de linha não passa de 1 px fixo. Rejeitado também: buraco negro em 2D, que ainda
  exigiria uma luz na cena para o `logo` e ficaria atrás do vidro sem profundidade.
- **Perspectiva analítica em espaço de tela.** A malha é o plano inclinado 30° projetado por uma
  câmera pinhole com distância focal `1,6 × altura da Hero`. As verticais ficam retas, convergindo
  para o alto (topo/base ≈ 0,69). Os poços deslocam os pontos já projetados, em px de tela. O do
  ponteiro aperta as verticais na direção dele e afunda as horizontais para baixo. O do buraco
  negro puxa tudo para o centro. Rejeitado: afundar o plano em 3D e projetar, porque os limites
  dos critérios estão em px de tela.
- **Caminho do buraco negro: B-spline quadrática por waypoints aleatórios** dentro da caixa de
  margem. Cada trecho fica no triângulo dos seus pontos de controle, então o corpo nunca sai da
  margem de 10% (29), em qualquer tamanho de janela. Cada trecho dura de 4 a 10 s, a velocidade
  vai de 20 a 60 px/s, e o passo de cada quadro usa um `dt` limitado a 1/15 s. Rejeitado: desvio
  de paredes por direção (*steering*), que não garante a margem a 375 px de largura, onde a caixa
  útil tem ~156 px.
- **Acordeão por `grid-template-rows` 0fr→1fr**, com `data-state` (`opening` | `open` |
  `closing` | `closed`). O `<details>` fica `open` até o fim da transição de fechamento.
  Rejeitado: `::details-content` com `interpolate-size`, que só anima no Chromium; nos demais
  navegadores o acordeão continuaria saltando.
- **Glitch por `setTimeout` por título**, armado enquanto ≥ 50% do título está visível e
  desarmado ao sair.
- **Fundo vivo em CSS** (`@keyframes` com `motion-safe:`). O período e a fase de cada ponto vêm de
  uma sequência determinística pelo índice, para a página renderizar igual no servidor e no
  cliente. Rejeitado: `Math.random` no render, que quebra a hidratação.
- **Vidro dos cards numa utilidade só** (`@utility glass-card` em `globals.css`), reusada pelos
  quatro organismos.
- **Código que fica morto sai:** `HeroLight`, `light-drift.ts` e a maquinaria de anéis do `atom`
  (`ORBIT`, `tumbleAngle`, `cageAngle`, `orbitIndex`, `OrbitPart`). Os testes deles saem junto
  (ver *Tests superseded*).

## Checks

Medidas em CSS px, em 1440×900, salvo quando indicado. Os testes e2e que dependem de tempo usam
`page.clock`, que é instalado parado antes do `goto` e avançado com `runFor`. Os de unidade rodam
com `node --test`.

### S1 - Textos sem interação; botões com hover e ponteiro · 5 files · ~4k

- **C1** (1) Todo `h1`–`h3`, `p`, `li`, `span`, `blockquote` e `figcaption` fora de um controle
  acionável tem `cursor: default` e `user-select: none` computados. Proof:
  `e2e/interaction.spec.ts` "text takes the default cursor and no selection".
- **C2** (1) Depois de um clique triplo num parágrafo de `#sobre`, `getSelection().toString()` é
  `""`. Proof: `e2e/interaction.spec.ts` "a triple click selects no text".
- **C3** (2) Todo `button`, `a[href]` e `summary` da página (e os descendentes deles) tem
  `cursor: pointer`. Proof: `e2e/interaction.spec.ts` "every control shows the pointer cursor".
- **C4** (2) Com o mouse sobre cada `button`, `a[href]` e `summary`, a cor de fundo ou a do texto
  computada difere da de repouso. Proof: `e2e/interaction.spec.ts` "every control changes on
  hover".
- **C5** (3) Passar o mouse sobre o `h1` e sobre um `h2` e esperar 1 s não liga `data-glitch="on"`.
  Proof: `e2e/glitch.spec.ts` "hovering a heading sets off no glitch".

### S2 - Acordeões com transição · 3 files · ~3k

- **C6** (4) Ao abrir uma pergunta por hover, clique, Enter e toque, a resposta faz transições de
  `grid-template-rows` (`0fr` → `1fr`) e de `opacity` (0 → 1), e o `+` faz uma de `rotate`
  (0 → 45°). As três duram 300 ms com `ease-out`. Proof: `e2e/faq.spec.ts` "an opening answer
  grows and fades in over 300ms, whatever opens it".
- **C7** (5) Ao fechar, a resposta faz `1fr` → `0fr` e opacidade 1 → 0, e o `+` volta a 0°, em
  300 ms com `ease-out`. No meio da transição, o `<details>` continua `open` e a resposta tem
  altura > 0. Proof: `e2e/faq.spec.ts` "a closing answer shrinks and fades out before it hides".
- **C8** (6) Sob movimento reduzido, abrir e fechar não criam nenhuma transição
  (`getAnimations()` vazio) e chegam ao estado final de imediato. Proof:
  `e2e/reduced-motion.spec.ts` "faq answers open and close without animation".
- **C9** (7) As regras 20–26 da tarefa anterior continuam. O fechamento começa (`data-state`
  `closing`) em até 300 ms depois de o mouse sair. Proofs: em `e2e/faq.spec.ts`, "faq shows
  five closed questions", "faq question opens and closes", "hovering a question opens it",
  "leaving an unpinned question starts closing within 300ms", "clicking a question keeps it open
  after the pointer leaves", "clicking a pinned question closes it", "hovering another question
  keeps the pinned one open", "Enter and Space toggle a question from the keyboard", "a question
  exposes whether it is expanded" e "a tap toggles a question without hover".

### S3 - Glitch sutil e aleatório · 5 files · ~7k

- **C10** (8) A espera antes de cada rajada é `5000 + 7000 × r` ms, com `r` uniforme em [0, 1);
  vai de 5 s a 12 s. Proof: `lib/glitch.test.ts` "the wait before a burst is drawn uniformly from
  5 to 12 s".
- **C11** (8) Um título com ≥ 50% na tela tem a primeira rajada entre 5 s e 12 s depois de
  entrar, e a seguinte entre 5 s e 12 s depois do fim da anterior. Proof: `e2e/glitch.spec.ts`
  "a visible heading bursts 5 to 12 s after entering and after each burst".
- **C12** (8) Dois títulos na tela ao mesmo tempo sorteiam esperas próprias: as primeiras rajadas
  não começam no mesmo instante. Proof: `e2e/glitch.spec.ts` "each heading draws its own wait".
- **C13** (9) Entrar na tela, passar o mouse e clicar não disparam rajada: nos 4,9 s seguintes,
  nenhum `data-glitch="on"`. Proof: `e2e/glitch.spec.ts` "entering, hovering or clicking a
  heading starts no burst".
- **C14** (10) `BURST` tem no máximo 3 quadros com cópias e depois um limpo, termina em ≤ 300 ms,
  desloca cada cópia de 1 a 3 px e tem `shake` 0 em todos os quadros. Proof: `lib/glitch.test.ts`
  "a burst is at most three frames of copies, then a clean one, within 300ms" e "copies shift
  1 to 3px and the text never moves".
- **C15** (10) Uma rajada real pinta no máximo 3 quadros distintos com cópias, cada uma deslocada
  no máximo 3 px, e o título fica com `transform` `none` durante toda ela. Proof:
  `e2e/glitch.spec.ts` "a burst paints at most three frames, shifted at most 3px, and the heading
  never moves".
- **C16** (11) Um título com menos de metade na tela não dispara rajada em 15 s. Proof:
  `e2e/glitch.spec.ts` "a heading less than half on screen never bursts".
- **C17** (11) Sob movimento reduzido, nenhum título dispara rajada em 15 s na tela. Proof:
  `e2e/reduced-motion.spec.ts` "no glitch under reduced motion".

### S4 - Composição da Hero · 6 files · ~7k

- **C18** (12) Em 1440×900 e em 375×667, os centros horizontais do `<h1>`, do subtítulo e do CTA
  ficam a ≤ 2 px do centro da janela. Na vertical, o subtítulo fica abaixo do `<h1>` e o CTA
  abaixo do subtítulo. Proof: `e2e/hero.spec.ts` "the hero copy is centred at 1440x900" e "...
  at 375x667".
- **C19** (12) O centro vertical do `<h1>` fica entre 40% e 55% da altura da Hero, nos dois
  tamanhos. Proof: os mesmos dois testes de C18.
- **C20** (13) `<h1>`, subtítulo e CTA cabem inteiros na primeira tela, nos dois tamanhos. Proof:
  `e2e/sections.spec.ts` "hero copy fits the first screen at 1440x900" e "... at 375x667".
- **C21** (14) Entre os modelos de vidro, só `logo.glb` é requisitado, mesmo rolando até o fim da
  página. Proof: `e2e/hero.spec.ts` "only the logo model is loaded".
- **C22** (15) Em 1440×900, sob movimento reduzido, com o texto e a malha escondidos, os pixels
  do `logo` (fora da caixa do buraco negro em repouso) não cruzam a caixa do `<h1>` nem a do CTA.
  Proof: `e2e/hero.spec.ts` "the logo clears the title and the CTA".
- **C23** (15) O `logo` continua inclinando na direção do ponteiro e crescendo 1,06× no hover.
  Proof: `components/organisms/hero/glass-motion.test.ts` "a pointer up and to the right leans
  the icon towards it by the parallax tilt" e "hovering leans towards the hovered point, not the
  canvas pointer, and grows".

### S5 - Malha gravitacional em perspectiva · 9 files · ~9k

- **C24** (16) A malha cobre a Hero: o canvas tem a caixa da Hero (±1 px), e os quatro cantos
  (quadrados de 64 px) têm tinta. Proof: `e2e/hero.spec.ts` "the hero grid covers the hero and
  nothing else" e `e2e/hero-grid.spec.ts` "the grid reaches every corner".
- **C25** (16) Longe dos corpos, o espaço entre verticais vizinhas no alto é ≤ 0,8× o de baixo e é
  48 px (±0,5) na altura do meio da Hero. Proof: `e2e/hero-grid.spec.ts` "the grid recedes:
  verticals closer at the top and 48px apart at the middle".
- **C26** (16) A geometria em repouso é a de uma perspectiva de 30°: verticais retas convergindo
  para o alto, e espaçamento 48 px na linha do meio. Proof:
  `components/organisms/hero/grid-motion.test.ts` "a 30° tilt: straight verticals, 48px apart at
  the middle, closer at the top".
- **C27** (17) A mais de 180 px do ponteiro e a mais de 280 px do buraco negro, os pontos medidos
  de cada linha ficam a ≤ 1 px da reta ajustada a eles. Proof: `e2e/hero-grid.spec.ts` "lines far
  from the pointer and the black hole stay straight".
- **C28** (17) Fora dos raios, o deslocamento calculado é exatamente 0. Proof:
  `components/organisms/hero/grid-motion.test.ts` "no displacement beyond either well".
- **C29** (18) Com o ponteiro a meio e a um quarto do espaço entre duas verticais, as verticais
  mais próximas de cada lado se curvam na direção dele, e a mais próxima desvia de 6 a 20 px.
  Proof: `e2e/hero-grid.spec.ts` "the pointer pulls the nearest verticals 6 to 20px towards it".
- **C30** (18) As horizontais dentro do raio de 180 px se curvam para baixo. Proof:
  `e2e/hero-grid.spec.ts` "horizontals near the pointer sag downwards".
- **C31** (18) Depois de o ponteiro saltar 96 px e parar, em 150 ms a depressão está no novo ponto:
  as duas verticais vizinhas desviam de 6 a 20 px na direção dele, com diferença ≤ 1,5 px entre si.
  2 s depois, com o ponteiro parado, continua igual. Proof: `e2e/hero-grid.spec.ts` "the well
  follows the pointer within 150ms and stays while it rests".
- **C32** (19) 800 ms depois de o ponteiro sair da Hero, nenhuma linha fora do poço do buraco
  negro desvia mais de 1 px. Proof: `e2e/hero-grid.spec.ts` "the well fades within 800ms after
  the pointer leaves".
- **C33** (20) O poço do buraco negro, em 1440×900, desloca cada ponto na direção do centro, nunca
  mais que 48 px, e nada além de 280 px; nunca leva um ponto para além do centro. Proof:
  `components/organisms/hero/grid-motion.test.ts` "the hole pulls towards its centre, by at most
  48px, within 280px".
- **C34** (20) Na página, as verticais a até 280 px do buraco negro se curvam na direção do
  centro dele. Proof: `e2e/hero-grid.spec.ts` "lines near the black hole bend towards it".
- **C35** (21) O canvas da malha tem alfa 0 em todo pixel dentro do horizonte de eventos. Proof:
  `e2e/hero-grid.spec.ts` "no grid line inside the event horizon".
- **C36** (22) Sob movimento reduzido, duas leituras da malha com 2 s de intervalo, com o mouse
  varrendo a Hero entre elas, são idênticas. Proof: `e2e/reduced-motion.spec.ts` "the grid holds
  still under reduced motion".
- **C37** (23) A malha só existe dentro de `#hero`, com `pointer-events: none`. O ponto no meio da
  Hero cai na cena 3D. Os centros do `<h1>` e do CTA respondem com eles mesmos a
  `elementFromPoint`. Proof: `e2e/hero-grid.spec.ts` "the grid and the lens never take the
  pointer".

### S6 - Lente redonda com constelações · 5 files · ~3k

- **C38** (24) Com o mouse sobre a Hero, 100 ms depois de um salto de 96 px, o anel da lente
  (canvas `hero-lens`) está centrado a ≤ 2 px do ponteiro, com raio 120 (±1,5) px, em `mist`, com
  alfa ≤ 0,3. Proof: `e2e/lens.spec.ts` "a 120px lens with a faint mist ring follows the mouse
  within 100ms".
- **C39** (25) Dentro do círculo há de 6 a 10 estrelas: manchas de alfa alto com 2 a 4 px de
  caixa (2–3 px mais a suavização). Fora do raio, nenhum pixel tem tinta. Proof:
  `e2e/lens.spec.ts` "the lens shows 6 to 10 stars and nothing outside its circle".
- **C40** (25) As estrelas têm 2 a 3 px de diâmetro, as linhas 1 px, e cada estrela deriva no
  máximo 10 px/s, sem nunca sair do círculo. Proof: `components/organisms/hero/lens.test.ts`
  "stars are 2 to 3px, lines 1px, and each drifts at most 10px/s inside the circle".
- **C41** (26) Com a lente sobre o `<h1>`, os pixels do miolo das letras dentro do círculo
  apagam (luminância < 0,3), e pixels de traço `mist` aparecem dentro dele. Os pixels do miolo
  fora do círculo continuam acesos. Proof: `e2e/lens.spec.ts` "inside the lens the title is an
  outline; outside it stays solid".
- **C42** (26) O nome acessível do `<h1>` é o texto, uma vez. O contorno fica fora do título, com
  `aria-hidden`. Proof: `e2e/a11y.spec.ts` "decorations are hidden and each title is read once".
- **C43** (27) 300 ms depois de o mouse sair da Hero, o canvas da lente está todo transparente e
  o contorno do título está recortado a raio 0. Proof: `e2e/lens.spec.ts` "the lens is gone
  within 300ms of leaving".
- **C44** (27) Toque e caneta não abrem a lente. Proof: `e2e/lens.spec.ts` "touch and pen open no
  lens".
- **C45** (27) Sob movimento reduzido, o mouse não abre a lente. Proof:
  `e2e/reduced-motion.spec.ts` "no lens under reduced motion".

### S7 - Buraco negro · 8 files · ~7k

- **C46** (28) A bola de luz e o halo deixam de existir: nenhum `HeroLight` nem `lightDrift` no
  código. Proof: `! grep -rnE "HeroLight|lightDrift|light-drift" components app lib e2e`.
- **C47** (28) Há um horizonte de eventos: uma região `ink` fechada, cercada de brilho, com
  86–106 px de largura em 1440×900. Proof: `e2e/black-hole.spec.ts` "a 96px event horizon".
- **C48** (28) Um anel de fótons fino e brilhante abraça o horizonte: a até 8 px da borda,
  em toda a volta fora da faixa do disco, a luminância passa de 0,5. Proof:
  `e2e/black-hole.spec.ts` "a thin bright photon ring hugs the horizon".
- **C49** (28) O disco de acreção atravessa o horizonte na horizontal:
  - na linha do centro, os pixels dentro do horizonte acendem;
  - a faixa acesa mede de 340 a 460 px de ponta a ponta;
  - a 150 px do centro, ela tem ≤ 30 px de espessura.

  Proof: `e2e/black-hole.spec.ts` "an edge-on disk about 400px wide crosses the horizon".
- **C50** (28) A parte de trás do disco forma um arco por cima e outro por baixo: na coluna do
  centro, há brilho logo acima e logo abaixo do horizonte. Proof: `e2e/black-hole.spec.ts` "the
  back of the disk arches over and under the horizon".
- **C51** (28) O buraco negro é frio: na caixa dele, todo pixel aceso tem o azul ≥ o vermelho e
  ≥ o verde − 2. Proof: `e2e/black-hole.spec.ts` "the black hole is drawn in cool blues only".
- **C52** (28) O tamanho segue os ícones: o horizonte tem 96 px em 1440×900 e, em janelas mais
  estreitas, encolhe pelo mesmo fator de ajuste dos ícones. Em 375×667, o horizonte medido fica a
  ±10% do previsto. Proof: `components/organisms/hero/black-hole.test.ts` "the horizon is 96px at
  1440x900 and shrinks with the icons" e `e2e/black-hole.spec.ts` "the horizon shrinks on a
  narrow screen".
- **C53** (29) A velocidade fica entre 20 e 60 px/s em todo quadro, e o buraco negro nunca para.
  Proof: `components/organisms/hero/black-hole-path.test.ts` "the speed stays within 20 to
  60px/s and never stops".
- **C54** (29) Cada trecho do caminho dura de 4 a 10 s, e a direção muda entre trechos. Proof:
  `black-hole-path.test.ts` "the path turns every 4 to 10 s".
- **C55** (29) Nenhum quadro move o buraco negro mais de 4 px, nem com quadros longos. Proof:
  `black-hole-path.test.ts` "no frame moves it more than 4px".
- **C56** (29) O corpo inteiro fica dentro da Hero com 10% de margem, em 1440×900 e 375×667.
  Proof: `black-hole-path.test.ts` "the whole body stays 10% inside the hero".
- **C57** (29) Cada carga sorteia um caminho novo. Proof: `black-hole-path.test.ts` "every load
  draws a new path". Na página, duas capturas com 2 s de intervalo mostram o horizonte em
  posições ≥ 30 px distantes. Proof: `e2e/black-hole.spec.ts` "the black hole wanders".
- **C58** (29) Sob movimento reduzido, o horizonte fica a ≤ 4 px do ponto (50%, 32%) da Hero e
  não se move em 2 s. Proof: `e2e/reduced-motion.spec.ts` "the black hole rests at the centre,
  32% down".
- **C59** (30) Em todo raio, o disco dá ao menos uma volta a cada 20 s. Proof:
  `black-hole.test.ts` "the disk turns at least once every 20 s at every radius". Na página, o
  padrão do disco muda em relação ao horizonte em 1 s. Proof: `e2e/black-hole.spec.ts` "the
  disk's pattern turns".
- **C60** (31) Sob movimento reduzido, a metade do `logo` voltada para o buraco negro é mais
  clara que a oposta. Proof: `e2e/black-hole.spec.ts` "the black hole lights the logo's facing
  side".
- **C61** (32) O `<h1>`, o subtítulo e o CTA ficam por cima de todo canvas da Hero: o centro de
  cada um devolve ele mesmo a `elementFromPoint`, e cada um muda > 5% dos próprios pixels quando
  escondido. Proof: `e2e/hero.spec.ts` "the hero copy lies over the black hole" e
  `e2e/sections.spec.ts` "hero copy fits the first screen at 1440x900".

### S8 - Fundo vivo · 5 files · ~3k

- **C62** (33) Cada `sections-glow` tem uma animação infinita de deslocamento, com 30–45 s,
  primeiro quadro-chave igual ao último e nenhum deslocamento maior que 8vmax. Proof:
  `e2e/backdrop.spec.ts` "each glow drifts on a closed path of at most 8vmax".
- **C63** (33) Cada brilho tem uma animação de opacidade, com 8–12 s, entre a opacidade atual
  − 0,1 e + 0,1. Proof: `e2e/backdrop.spec.ts` "each glow breathes ±0.1 around its opacity".
- **C64** (34) Cada ponto da camada de trás cintila de 0,25 a 1, com período de 3 a 8 s. Os
  pontos têm ao menos 5 períodos distintos e atrasos distintos. Proof: `e2e/backdrop.spec.ts`
  "back-layer dots twinkle out of step".
- **C65** (35) Os anéis pulsam de 0,95 a 1,05 de escala em 12 s. Proof: `e2e/backdrop.spec.ts`
  "rings pulse".
- **C66** (35) As formas do meio giram de −6° a +6° em 14 s, além da flutuação. Proof:
  `e2e/backdrop.spec.ts` "mid shapes sway as they float".
- **C67** (36) O parallax segue com 0,2×, 0,5× e 1,3×. Proof: `e2e/parallax.spec.ts` "layers move
  at 0.2x, 0.5x and 1.3x of the scroll".
- **C68** (36) Sob movimento reduzido, nada do fundo tem animação, e o parallax fica parado.
  Proof: `e2e/reduced-motion.spec.ts` "the sections' background holds still" e "parallax layers
  stay put under reduced motion".

### S9 - Vidro fosco e luzes · 5 files · ~2k

- **C69** (37) Os 18 cards (6 de `#solucoes`, 3 de `#cases`, 3 de `#depoimentos` e 6 de
  `#workflow`) têm:
  - fundo `rgba(242, 247, 255, 0.05)`;
  - `backdrop-filter: blur(16px)`;
  - borda de 1 px em `rgba(242, 247, 255, 0.1)`;
  - sombra interna `0 1px 0` em `rgba(242, 247, 255, 0.2)`.

  Proof: `e2e/cards.spec.ts` "cards are frosted glass".
- **C70** (38) Com o brilho `steel` parado atrás de um card, a luminância média do card fica
  ≥ 0,01 acima da que tem com o brilho levado para longe. Proof: `e2e/cards.spec.ts` "a glow
  behind a card shows through it".

### Desempenho

- **C71** (39) Com o topo de `#sobre` e depois o de `#faq` no topo da janela, em 1 s, o canvas
  WebGL da Hero faz 0 draw calls. Os canvas 2D `hero-grid` e `hero-lens` fazem 0 chamadas de
  desenho (`stroke`, `fill`, `clearRect`, `fillRect`). Proof: `e2e/offscreen.spec.ts` "no scene
  draws while both are off screen".
- **C72** (40) Depois de 2 s fora da tela, o horizonte volta a ≤ 12 px de onde estava. Proof:
  `e2e/offscreen.spec.ts` "the black hole resumes where it stopped".
- **C73** (41) Nenhuma dependência nova. Proof: `git diff --exit-code c625ce9 -- package.json
  package-lock.json`.

### Acessibilidade

- **C74** (42) Os canvas `hero-grid` e `hero-lens`, o contorno do título e as cópias do glitch
  têm `aria-hidden="true"`. Cada `h1`/`h2` tem como nome acessível o próprio texto, uma vez.
  Proof: `e2e/a11y.spec.ts` "decorations are hidden and each title is read once".

### Gate

- **C75** `npx tsc --noEmit`, `npm run lint`, `npm test` e `npm run test:e2e` passam. Proof: os
  quatro comandos, exit 0.

## Swept

| Dimension | Landing |
| --- | --- |
| validation | n/a — o único insumo é o ponteiro; fora da Hero ele é ignorado (C32, C43) |
| failure modes | Unresolved 2 (sem WebGL), fora daqui; `logo` que não carrega: existing — `Suspense` sem fallback, e a malha, a lente e o buraco negro seguem |
| idempotency and retry | n/a — nada é enviado nem gravado |
| authorization | n/a — página pública |
| concurrency and ordering | C14 e C11: uma rajada não se sobrepõe à outra, porque a próxima só é armada no fim da anterior. C72: pausar e retomar não fazem o buraco negro saltar |
| data lifecycle | n/a — nada persiste; o caminho é novo a cada carga (C57) |
| external-dependency failure | n/a — nenhum recurso externo novo |
| state transitions | C6, C7 e C9 (acordeão); C31, C32, C38 e C43 (lente e poço ao entrar e sair) |
| observability | n/a — o projeto não tem telemetria; o custo fora da tela é C71 |

## Handoff

Os nove slices somam ~44k tokens de leitura (pelo `wc -c` dos arquivos tocados ÷ 4), abaixo de
150k. Por isso tudo vai num lote só, sem handoff. O Verifier roda depois sobre `c625ce9..HEAD`,
com todos os checks.

Tests superseded (o `Impact` da tarefa os lista; cada um é substituído pelo check entre
parênteses):

- `e2e/hero-grid.spec.ts`, os 6 testes (por C24–C37).
- `e2e/hero-light.spec.ts`:
  - os dois testes da luz (por C46–C51, C57 e C58);
  - "the notebook shows no light core or halo", que vira "the notebook shows no black hole" em
    `e2e/black-hole.spec.ts`, com a mesma asserção.
- `e2e/light-helpers.ts`, substituído por `e2e/black-hole-helpers.ts`.
- `components/organisms/hero/light-drift.test.ts` e `grid-motion.test.ts`, os atuais (por C26,
  C28, C33 e C53–C57).
- `glass-motion.test.ts`:
  - "the hero shows exactly the cursor, atom and logo icons" (por C21);
  - os testes de anéis e gaiola do `atom`, que saem com o código morto;
  - os demais continuam.
- `e2e/hero.spec.ts` "only the cursor, atom and logo models are loaded" (por C21).
- `e2e/glitch.spec.ts`:
  - "a heading glitches once when it scrolls into view", "hovering a heading triggers one
    burst" e "no burst repeats on its own" (por C11 e C13);
  - "a burst shows a primary and a mist copy, shifted at most 8px…", "a burst paints six frames
    of copies" e "the heading trembles during a burst" (por C15).
- `lib/glitch.test.ts`, os testes de 6 quadros, 8 px e tremor (por C14).
- `e2e/reduced-motion.spec.ts`:
  - "hero grid stays straight under reduced motion" (por C36);
  - "the light holds still under reduced motion" (por C58);
  - "no glitch under reduced motion", reescrito com o relógio falso (C17).
- `e2e/offscreen.spec.ts` "the hero light resumes where it stopped" (por C72).
- `e2e/theme.spec.ts` "hero grid is drawn in mist": passa a exigir `mist` em todo pixel com
  alfa ≥ 128, porque as linhas inclinadas da perspectiva não têm pixel 100% opaco.
- `e2e/faq.spec.ts` "leaving an unpinned question closes it within 300ms" vira "leaving an
  unpinned question starts closing within 300ms" (critério 7).
