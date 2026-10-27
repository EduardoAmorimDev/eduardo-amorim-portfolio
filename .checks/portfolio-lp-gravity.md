# Landing page do portfólio — Hero com gravidade em perspectiva e laptop contido

Profile: `light` (o `AGENTS.md` do repositório não declara perfil) · handoff: `on`, budget 150k.
Base da feature: `3de27ef` (o commit da tarefa). Branch: `feat/hero-gravity`, criada a partir de
`main`; sem push.

Sources:

- `.tasks/portfolio-lp-gravity.md` — os 29 critérios, o limite (`Out of scope`), o `Swept` e o
  `Impact`. É o registro de decisão; os números entre parênteses abaixo são os critérios dela.
- `.tasks/portfolio-lp-cosmos.md` — os critérios que esta não substitui continuam valendo (19, 21,
  22, 27, 28 em parte, 30, 39–42).
- `/home/joao-eduardo/Downloads/malha.png` — referência da perspectiva e do peso, não binding. Os
  valores que decidem algo já estão transcritos nos critérios 1, 4–8 da tarefa.

## Out of scope

- Corpos novos na malha, lente gravitacional física, mudança da densidade da malha, cursor
  personalizado, troca do site do laptop — `Out of scope` da tarefa.
- Fallback sem WebGL e destino dos CTAs — herdados, ainda em aberto.

## Landing

Toca a Hero (`components/organisms/hero/`: `grid-motion.ts`, `use-hero-field.ts`, `lens.ts`,
`black-hole.ts`, `black-hole-mesh.tsx`, `black-hole-path.ts`), `components/molecules/hero-copy/`,
`app/globals.css` e `components/organisms/notebook/laptop.tsx`. Reusa o laço de quadros 2D da
Hero, `RenderGate`, `useNearViewport`, `readColorToken`, `prefersReducedMotion` e os
auxiliares de pixel de `e2e/`. Nenhuma dependência nova.

| One-way door | Literal shape | Alternative rejected |
| ------------ | ------------- | -------------------- |
| None         | -             | -                    |

- Nada aqui é difícil de reverter: nada persiste, nenhum contrato é consumido por fora e nenhuma
  dependência entra (29).

Decisões reversíveis, registradas antes do código:

- **A malha continua em canvas 2D, agora com projeção 3D de verdade.** A folha é inclinada 50° em
  relação ao plano da tela, vista por uma pinhole com foco de `3 × altura da Hero`. A célula fica
  com altura/largura `cos 50° ≈ 0,64` no meio da Hero, `≈ 0,51` no topo e `≈ 0,77` embaixo. O
  espaço entre verticais no topo fica em `≈ 0,67` do de baixo, como na referência (0,5 · 0,64 ·
  0,78 e 0,7). Os corpos ficam em coordenadas da folha: o ponto da tela é desprojetado para `(u,
v)`. A partir dali:
  - as horizontais afundam ao longo da normal da folha, por uma profundidade `D(r)`, e são
    reprojetadas;
  - as verticais recebem só o puxão lateral em `u`;
  - o raio e as amplitudes ficam em px da folha, que valem px da tela na linha do meio.
    Assim o poço encolhe e achata com a profundidade sem regra extra.
    Rejeitado: malha em WebGL, que perde a leitura exata de pixels do canvas 2D usada pelas provas.
    Rejeitado também: deslocar em px de tela, como hoje, que não acompanha a perspectiva (critério
    3 da tarefa).
- **Separação por família mantida.** As horizontais só afundam e as verticais só são puxadas de
  lado, pelo mesmo motivo registrado em `portfolio-lp-cosmos`: as verticais inclinadas pela
  perspectiva sairiam assimétricas. O afundamento 3D também empurra os pontos para o centro de
  fuga, ~2 px, o que poderia virar uma vertical "para longe" do ponteiro.
- **Tamanho do buraco negro pela escala da folha.** `horizon(y) = horizonRadius(w, h) · s(y) /
s(rest.y)`, com `s(y) = 1 − (cy − y)·tan(tilt)/foco`, a largura de uma célula sobre 48. A caixa
  do caminho usa o horizonte do pé da Hero, o maior, para manter a margem de 10%.
- **Disco inclinado no mesmo quad voltado à câmera.** O shader passa a desenhar a elipse do disco
  (razão `sen i`), com a metade próxima à frente do horizonte e a distante só fora dele. Desenha
  ainda o arco de cima (forte) e o de baixo (fino e fraco), com brilho Doppler `1 − 0,45·x/r`, o
  lado esquerdo vindo na direção de quem olha. A inclinação `i` e o giro do eixo no plano da tela
  vêm de uma função pura, `diskPose(seconds, still)`, em `black-hole.ts`. Rejeitado: geometria 3D
  (esfera e anel com malha). Ela não faz os arcos de lente e brigaria com o quad que já carrega a
  luz do `logo`.
- **Lente: máscara linear de 80 a 160 px**, por uma `radial-gradient`:
  - no canvas, com `destination-in` depois de desenhar estrelas e linhas;
  - no título, como `mask-image` no sólido e no contorno.
    Sem anel. Abre só com o ponteiro dentro da caixa do `<h1>`. Rejeitado: alfa por estrela, que
    deixaria as linhas com uma opacidade só ao longo do comprimento.
- **H1 por token fluido:** `--text-hero: clamp(4.5rem, 10.9375vw, 9.84375rem)`, com
  `line-height` 0,89, em `@theme`. Dá 157,5 px em 1440, 112 px em 1024 e 72 px em 375. Rejeitado:
  um tamanho por breakpoint, que salta (critério 23).
- **Laptop: `wrapperClass="will-change-transform"` no `<Html>` do drei.** Medido antes de
  decidir, com o canvas escondido e uma página sintética:
  - o DOM da página é pintado 55 px acima do próprio `getBoundingClientRect` logo que o `sticky`
    solta (Δ = 50 px) e assim continua;
  - com a raiz do `<Html>` numa camada própria, o erro fica em −2 px, igual ao do fim da seção.
    Rejeitados:
  - `transform: translateZ(0)` no `sticky`, que não muda nada (−55 px);
  - `contain: paint` no `sticky`, que corrige depois mas erra 53 px enquanto ele está grudado.

Decisões reversíveis descobertas no build. Ficaram registradas depois do código, não antes; é
um desvio do processo, anotado aqui:

- **`logo` mais alto** (`GLASS_LAYOUT.anchor` de `[0.62, 0.62]` para `[0.62, 0.74]`). Com o título
  2,5× maior, em 375×667 o `logo` cruzava a caixa do `<h1>` (C47). Rejeitado: encolher o `logo`
  em telas estreitas, que muda o critério 15 da tarefa anterior por tamanho.
- **Estrelas a até 130 px do centro** (`LENS.inset` 30). Espalhadas até 150 px, quase todas
  ficariam na parte apagada da lente. Rejeitado: concentrar a máscara, que contradiz C36.
- **Horizonte lido pela calota.** O disco inclinado cobre a parte de baixo do horizonte. Por isso
  `horizonIn` (`e2e/black-hole-helpers.ts`) aceita uma calota de 0,6–0,8 de altura por largura e
  a lê como o disco inteiro, pela largura e pelo topo. Só vale a região com o anel de fótons
  claro (> 0,5) por cima: com a razão afrouxada, o buraco do próprio `logo` chegou a ser
  escolhido em 375×667. Rejeitado: medir o horizonte só pelo anel de fótons, que o disco também
  cruza embaixo.
- **Inclinação lida no lado claro do disco.** A borda externa esmaece, e mais no lado que se
  afasta (brilho Doppler). Medir a altura pelos dois lados dava 0,18 para uma inclinação de 15°
  (0,26). Rejeitado: endurecer a borda do disco só para a medida.
- **Horizontais rastreadas coluna a coluna** (`traceRow` em `e2e/hero-grid.spec.ts`). As
  verticais, inclinadas pela perspectiva, também cruzam uma coluna em trechos curtos. Na leitura
  por coluna, elas somavam cruzamentos e deslocavam o centro onde encontram uma horizontal.
  Rejeitado: casar por índice numa coluna só, que quebra com um cruzamento a mais.
- **Título lido sem a cena 3D** (`captureWithoutScene` em `e2e/lens.spec.ts`). Os arcos novos do
  buraco negro são tão claros quanto as letras e se mexem atrás do título entre duas capturas.

## Checks

Medidas em CSS px, em 1440×900, salvo quando indicado. Os testes e2e que dependem de tempo usam
`page.clock` parado (`gotoStopped`) e avançado com `runFor`. Os de unidade rodam com `node --test`
(`npm test`). As provas e2e rodam com `npx playwright test <arquivo> -g "<nome>"`.

### S1 - Malha em perspectiva · 5 files · ~44 KB · ~11k (com S2)

- **C1** (1) Na linha do meio da Hero, longe dos corpos, a altura de uma célula na tela é de 0,55 a
  0,7 vez a largura dela, e a largura é 48 px (±0,5). Proof: `e2e/hero-grid.spec.ts` "cells at the
  middle are 48px wide and 0.55 to 0.7 as tall".
- **C2** (1) No topo da Hero, a altura de uma célula é no máximo 0,55 vez a largura. Proof:
  `e2e/hero-grid.spec.ts` "cells at the top are at most 0.55 as tall as wide".
- **C3** (1) O espaço entre verticais vizinhas no topo é no máximo 0,75 vez o de baixo. Proof:
  `e2e/hero-grid.spec.ts` "verticals at the top are at most 0.75 as far apart as at the bottom".
- **C4** (2) Os quatro cantos de 64×64 px da Hero têm tinta da malha. Proof:
  `e2e/hero-grid.spec.ts` "the grid reaches every corner".
- **C5** (3) Fora do raio de cada poço, nenhuma linha se desvia mais de 1 px da reta: nem as
  verticais, nem as horizontais, seguidas coluna a coluna à direita de 1100 px, sem trecho de
  8 px fora da reta. Proof: `e2e/hero-grid.spec.ts` "lines far from the pointer and the black
  hole stay straight".

### S2 - Os corpos pesam na malha · (mesmos arquivos de S1)

- **C6** (4) Com o buraco negro em repouso, toda horizontal que passa pelo poço desce na tela.
  Medido logo além do horizonte (56 px do centro, onde nenhuma linha é cortada), dos dois lados:
  - toda horizontal entre 140,9 px acima e 163,9 px abaixo do centro desce mais de 0,5 px.
    São as bordas do poço nessa coluna: o círculo de 280 px da folha em volta do ponto de
    repouso, projetado na folha plana (50°, foco de 3 × a altura da Hero). Acima ele é mais
    achatado, porque a folha está mais longe;
  - a que passa mais perto do centro desce de 40 a 80 px.

  Reformulado três vezes, a partir dos achados do Verifier:
  - a primeira versão ("toda horizontal a menos de 280 px") media 280 px na tela, além do poço;
  - a segunda cortava em 90 px e deixava de fora 4 das 11 linhas do poço;
  - a terceira usava 120/148 px, ajustados às linhas e não à geometria, e deixava de fora a
    linha a −120,5 px.

  Proof: `e2e/hero-grid.spec.ts` "horizontals through the black hole's
  well sink, 40 to 80px at its centre".

- **C7** (4) As verticais de cada lado do buraco negro se curvam na direção dele. Proof:
  `e2e/hero-grid.spec.ts` "lines near the black hole bend towards it".
- **C8** (5) O poço do buraco negro, a 25% da altura, curva uma faixa no máximo 0,85 vez tão
  larga quanto a 75%. Proof: `components/organisms/hero/grid-motion.test.ts` "the black hole's
  well is narrower higher up".
- **C9** (5) Na linha do meio da Hero, o poço do buraco negro alcança 280 px (escala de projeto):
  desvio > 0 a 270 px e 0 a 290 px. Proof: `components/organisms/hero/grid-motion.test.ts` "the
  black hole's well reaches 280px at the middle".
- **C10** (6) Em repouso, o horizonte mede 96 px (±10%) de largura e de altura. A altura é lida
  entre os picos do anel de fótons acima e abaixo do centro, divididos por 1,04, porque o disco
  cobre a parte de baixo do horizonte. Proof: `e2e/black-hole.spec.ts` "a 96px event horizon".
- **C11** (6) O diâmetro do horizonte é proporcional à largura de uma célula na altura dele
  (±10%). Proof: `components/organisms/hero/black-hole.test.ts` "the horizon follows the
  sheet's scale".
- **C12** (7) A horizontal mais próxima do ponteiro desce de 6 a 20 px na vertical dele. Proof:
  `e2e/hero-grid.spec.ts` "the horizontal nearest the pointer sinks 6 to 20px".
- **C13** (7) As verticais mais próximas se curvam de 6 a 20 px na direção do ponteiro, nunca para
  longe, inclusive com o ponteiro fora do `<h1>`. Proof: `e2e/hero-grid.spec.ts` "the pointer
  pulls the nearest verticals 6 to 20px towards it".
- **C14** (7) A depressão segue o ponteiro em até 150 ms e fica enquanto ele está parado. Proof:
  `e2e/hero-grid.spec.ts` "the well follows the pointer within 150ms and stays while it rests".
- **C15** (8) Com o ponteiro a 25% da altura, a faixa que ele curva é no máximo 0,85 vez tão larga
  quanto a 75%. Proof: `e2e/hero-grid.spec.ts` "the pointer's well is narrower higher up".
- **C16** (9) O poço do ponteiro se desfaz em até 800 ms depois de ele sair da Hero. Proof:
  `e2e/hero-grid.spec.ts` "the well fades within 800ms after the pointer leaves".
- **C17** (9) Nenhuma linha dentro do horizonte. Proof: `e2e/hero-grid.spec.ts` "no grid line
  inside the event horizon".
- **C59** (8) Na linha do meio da Hero, o poço do ponteiro alcança 180 px: desvio > 0 a 170 px e
  0 a 190 px. Proof: `components/organisms/hero/grid-motion.test.ts` "the pointer's well
  reaches 180px at the middle".
- **C18** (9) Sob movimento reduzido, nem o ponteiro nem o buraco negro movem a malha: ela fica
  idêntica, pixel a pixel, por 2 s, com o ponteiro passando por três pontos dela. Proof:
  `e2e/reduced-motion.spec.ts` "the grid holds still under reduced motion".

### S3 - Buraco negro com volume · 5 files · ~30 KB · ~8k

- **C19** (10) A elipse externa do disco tem altura de 0,2 a 0,32 vez a largura. Proof:
  `e2e/black-hole.spec.ts` "the disk is inclined: 0.2 to 0.32 as tall as wide".
- **C20** (10) O disco tem de 360 a 440 px de largura (4 diâmetros ±10%). Proof:
  `e2e/black-hole.spec.ts` "the disk is about 400px wide".
- **C21** (11) Na vertical do centro, há luz do disco entre 0,3 e 0,7 raio abaixo do centro,
  dentro do horizonte. Proof: `e2e/black-hole.spec.ts` "the near half of the disk crosses in
  front of the horizon".
- **C22** (11) Um arco de luz contorna o topo do horizonte de 20° a 160°, passando por 90°. Proof:
  `e2e/black-hole.spec.ts` "the far half arches over the top of the horizon".
- **C23** (11) Um arco embaixo do horizonte tem luz, mais fraca e mais fina que a do de cima.
  Proof: `e2e/black-hole.spec.ts` "a thinner, fainter arc runs under the horizon".
- **C24** (12) A metade mais clara do disco tem luminância média ≥ 1,5 vez a da outra. Proof:
  `e2e/black-hole.spec.ts` "one side of the disk is at least 1.5 times brighter".
- **C25** (13) Nada quente: em todo pixel aceso, azul ≥ vermelho e azul ≥ verde − 2. Proof:
  `e2e/black-hole.spec.ts` "the black hole is drawn in cool blues only".
- **C26** (13) Um anel fino e claro está colado ao horizonte: luminância > 0,5 a até 8 px da borda,
  numa faixa clara de no máximo 4 px de largura. Proof: `e2e/black-hole.spec.ts` "a thin bright
  photon ring hugs the horizon".
- **C27** (14) O disco dá pelo menos uma volta a cada 20 s, e o padrão muda na tela em 1 s.
  Proof: `components/organisms/hero/black-hole.test.ts` "the disk turns at least once every 20
  s at every radius". Proof: `e2e/black-hole.spec.ts` "the disk's pattern turns".
- **C28** (14) A inclinação oscila entre 12° e 18° (±0,1°), com período de 14 a 20 s. Proof:
  `components/organisms/hero/black-hole.test.ts` "the disk's tilt swings between 12 and 18
  degrees every 14 to 20 s".
- **C29** (14) O eixo balança ±3° (±0,1°), com período de 17 a 25 s, diferente do da inclinação.
  Proof: `components/organisms/hero/black-hole.test.ts` "the disk's axis rocks 3 degrees on its
  own cycle".
- **C30** (14) Na tela, a razão da elipse muda pelo menos 0,03 entre dois instantes a 4 s um do
  outro. Proof: `e2e/black-hole.spec.ts` "the disk's tilt changes on screen".
- **C31** (15) Com o disco parado, a pose é 15° de inclinação e 0° de balanço em qualquer
  instante. Proof: `components/organisms/hero/black-hole.test.ts` "a still disk rests at 15
  degrees, square".
- **C32** (15) Sob movimento reduzido, duas capturas a 2 s uma da outra são iguais (diferença
  média ≤ 1 nível). Proof: `e2e/reduced-motion.spec.ts` "the disk holds still under reduced
  motion".

### S4 - Lente só no H1, sem borda · 5 files · ~34 KB · ~9k

- **C33** (16) Com o mouse na Hero, fora da caixa do `<h1>`, o canvas da lente fica vazio e o
  título fica inteiro sólido. Proof: `e2e/lens.spec.ts` "no lens over the hero outside the
  title".
- **C34** (17) Ao entrar no `<h1>`, a lente abre em até 150 ms e segue o ponteiro com até 100 ms
  de atraso. A prova lê a abertura a 167 ms, porque a lente começa a abrir no primeiro quadro
  depois da chegada do ponteiro, até 1/60 s depois. Proof: `e2e/lens.spec.ts` "the lens opens on the title within 150ms and follows
  within 100ms".
- **C35** (17) Ao sair da caixa do `<h1>` sem sair da Hero, a lente some em até 300 ms. Proof:
  `e2e/lens.spec.ts` "the lens closes within 300ms of leaving the title".
- **C36** (18) A intensidade da lente é 1 até 80 px e 0 a partir de 160 px, e varia no máximo
  0,05 entre raios a 2 px um do outro. Proof: `components/organisms/hero/lens.test.ts` "the lens
  fades from full at 80px to nothing at 160px with no step".
- **C37** (18) Sem anel: com a lente aberta, nenhum pixel do canvas da lente tem tinta a 160 px ou
  mais do centro. Proof: `e2e/lens.spec.ts` "the lens has no ring and nothing past 160px".
- **C38** (19) Com a lente aberta, ela mostra de 6 a 10 estrelas, e nenhum pixel do canvas tem
  alfa acima de `255 · intensidade(d) + 8`. Proof: `components/organisms/hero/lens.test.ts`
  "a constellation has 6 to 10 stars". Proof: `e2e/lens.spec.ts` "nothing in the lens is
  brighter than its fade allows".
- **C39** (20) Sobre o `<h1>`, o título é só contorno a menos de 80 px do centro e sólido a mais de
  160 px, com uma passagem gradual entre os dois (cobertura intermediária a 120 px). A prova
  mede a menos de 70 px e a mais de 170 px, com 10 px de folga para a borda suavizada da letra,
  e aceita 95% do miolo sólido fora. Proof:
  `e2e/lens.spec.ts` "the title turns to outline inside the lens and fades back to solid".
- **C40** (20) O nome acessível do `<h1>` é o título, lido uma vez. Proof: `e2e/a11y.spec.ts`
  "decorations are hidden and each title is read once".
- **C41** (21) Com toque, caneta ou movimento reduzido não aparece lente. Proof:
  `e2e/lens.spec.ts` "touch and pen open no lens". Proof: `e2e/lens.spec.ts` "a tap opens no
  lens". Proof: `e2e/reduced-motion.spec.ts` "no lens under reduced motion".

### S5 - H1 2,5× maior e fluido · 6 files · ~20 KB · ~5k

- **C42** (22) Em 1440 px de largura, o `font-size` do `<h1>` é 157,5 px. Proof:
  `e2e/hero.spec.ts` "the title is 157.5px at 1440px".
- **C43** (22) O contorno da lente tem o mesmo `font-size` e as mesmas quebras de linha do
  `<h1>`. Proof: `e2e/hero.spec.ts` "the lens outline wraps like the title".
- **C44** (23) O `font-size` do `<h1>` é 112 px (±1) em 1024 px e 72 px em 375 px. Em 1280 px e
  768 px é `max(72, 157,5 · largura / 1440)` (±1). Proof: `e2e/hero.spec.ts` "the title scales
  with the window".
- **C45** (24) Título, subtítulo e CTA centralizados (até 2 px) e o título entre 40% e 55% da
  altura em 1440×900, 1024×768, 768×1024 e 375×667. Proof: `e2e/hero.spec.ts` "the hero copy is
  centred at <w>x<h>" (as quatro variantes).
- **C46** (24) Título, subtítulo e CTA cabem inteiros na primeira tela nos quatro tamanhos.
  Proof: `e2e/sections.spec.ts` "hero copy fits the first screen at <w>x<h>" (as quatro
  variantes).
- **C47** (24) O `logo` não cruza a caixa do `<h1>` nem a do CTA, em 1440×900 e 375×667. Proof:
  `e2e/hero.spec.ts` "the logo clears the title and the CTA at <w>x<h>" (as duas variantes).
- **C48** (24) Nenhuma palavra do `<h1>` é partida entre linhas, nos quatro tamanhos. Proof:
  `e2e/hero.spec.ts` "no word of the title breaks at <w>x<h>".
- **C49** (24) Sem rolagem horizontal em 375 px. Proof: `e2e/sections.spec.ts` "no horizontal
  scroll at 375px".

### S6 - A página não sai da tela do laptop · 3 files · ~14 KB · ~4k

- **C50** (25) Com uma página sintética no `iframe` (fundo vermelho, moldura verde de 16 px), a 0,
  150, 300, 450 e 600 px depois do fim de `#notebook`, as bordas pintadas da página que estão na
  tela ficam a até 3 px das bordas do vidro.
  - **Vidro:** a região escura cercada pela moldura do laptop, com a página escondida.
  - **Página:** a média das capturas antes e depois do vidro, porque o laptop oscila alguns px
    por segundo.
  - **Moldura de 16 px, não 4:** a página é 3,75% maior que o vidro (`SCREEN_BLEED`), e uma
    moldura de 4 px ficaria escondida sob a moldura do laptop.
    A mesma prova confere que a moldura pintada acompanha a posição do fim da seção, deslocada
    pelo `getBoundingClientRect` do `iframe`. Proof: `e2e/notebook.spec.ts` "the page stays on the
    laptop's glass as the section scrolls away".
- **C51** (25) Nas mesmas posições, nenhum pixel vermelho ou verde aparece fora do retângulo do
  vidro (a caixa da página no fim da seção, deslocada como em C50, mais 3 px). Proof:
  `e2e/notebook.spec.ts` "no page pixel shows outside the glass".
- **C52** (26) Rolando pela roda do mouse (Lenis) do fim de `#notebook` até a página sair da tela,
  em cada passo a borda de baixo pintada fica a até 3 px da que o `iframe` informa. Proof:
  `e2e/notebook.spec.ts` "the page moves with the laptop under the wheel".
- **C53** (27) O laptop continua ligando com a rolagem, e a página carrega e descarrega como
  antes. Proof: `e2e/notebook.spec.ts` "scrolling through the notebook powers the laptop on".
  Proof: `e2e/offscreen.spec.ts` "the screen page loads a screen before the notebook". Proof:
  `e2e/offscreen.spec.ts` "the screen page unloads far past the notebook".

- **C60** (27) Com a rolagem, o laptop abre, endireita e a página aparece aos poucos:
  - no meio da janela de ligar (77,5% da rolagem), a opacidade da página fica entre 0,2 e 0,8;
  - do início ao fim, a borda de cima do laptop sobe pelo menos 25% da altura dele aberto (a
    tampa se levanta);
  - no fim, a página pintada preenche pelo menos 97% da própria caixa (retângulo de frente para
    a câmera).
    Proof: `e2e/notebook.spec.ts` "the laptop opens, straightens and fades its page in with the
    scroll".
- **C58** (27, 29) A página do laptop não recebe ponteiro (`pointer-events: none`) nem foco
  (`tabindex="-1"`), tem `aria-hidden="true"`, e nada dela aparece na árvore de acessibilidade de
  `#notebook`. Proof: `e2e/notebook.spec.ts` "the screen page takes no pointer or focus and is
  hidden from assistive tech".

### Desempenho e regras herdadas

- **C54** (28) Com o topo de `#sobre` ou de `#faq` no topo da janela, a Hero faz 0 draw calls em
  1 s. Proof: `e2e/offscreen.spec.ts` "no scene draws while both are off screen". Proof:
  `e2e/offscreen.spec.ts` "only the hero draws at the top of the page" (o contador registra os
  quadros da cena, da malha e da lente quando eles desenham).
- **C55** (28) O buraco negro retoma a até 12 px de onde parou. Proof: `e2e/offscreen.spec.ts`
  "the black hole resumes where it stopped".
- **C56** (29) `package.json` sem dependência nova: `git diff 3de27ef -- package.json` vazio.
  Proof: `git diff --exit-code 3de27ef -- package.json`.
- **C57** (29) A cena da Hero, a malha e a lente ficam fora da árvore de acessibilidade. Proof:
  `e2e/a11y.spec.ts` "the hero scene is hidden from assistive tech".

## Swept

- validation: n/a - nenhuma entrada; o ponteiro conta só dentro da Hero (C12) e da caixa do `<h1>` (C33, C34)
- failure modes: C50, C51 (a página fora do vidro é o modo de falha que esta tarefa corrige)
- idempotency: n/a - nada é enviado nem gravado
- authorization: n/a - página pública
- concurrency: C52 (página e laptop em passo a cada passo da rolagem); existing - `BEFORE_HTML` em `components/organisms/notebook/laptop.tsx:74`, usado em `:152`; C55 (pausa e retomada)
- data lifecycle: n/a - nada persiste
- dependency failure: n/a - nos testes o site embutido é bloqueado ou trocado por página sintética (`e2e/fixtures.ts`)
- state transitions: C16, C34, C35
- observability: n/a - o projeto não tem telemetria; custo de quadro coberto por C54

## Handoff

Depois da rodada 3 (FAIL, 60 de 60 provados como escritos; C6 não cumpria o critério 4):

- os limites de C6 passaram a ser as bordas do poço tiradas da geometria (140,9 / 163,9 px);
- as verticais inclinadas lidas como linhas a 40 px saíram do filtro;
- a prova passou 2 vezes seguidas.
  Essa correção não foi verificada por um Verifier independente: as três rodadas acabaram, e a
  quarta depende do usuário. Fica aberto também o achado menor da rodada 3: o C60 não mede a pose
  torta do início, só a final.

Rodada 3 do Verifier (FAIL na rodada 2: C6 baixava o critério 4, e "aparece aos poucos",
"endireita" e "abre", do critério 27, não tinham check). C6 agora cobre o poço inteiro na coluna
medida, e C60 cobre o critério 27 por inteiro.

Rodada 2 do Verifier (FAIL na rodada 1, 55 de 57). As provas ficaram mais fortes em C5, C7
(ambos os lados), C10, C13 (ponteiro fora do `<h1>`), C26 e C50. C6 foi reformulado para o
critério 4 da tarefa, e C18 descreve o que a prova já mede. Os checks C58 e C59 cobrem os
critérios 27, 29 e 8, que não tinham prova.

Os seis slices somam ~37k tokens de leitura (`wc -c` dos arquivos tocados ÷ 4), abaixo de 150k.
Por isso vai tudo num lote só, sem handoff. O Verifier roda depois sobre `3de27ef..HEAD`, com
todos os checks.

Testes substituídos (o `Impact` da tarefa os lista; cada um sai em favor do check entre
parênteses):

- `e2e/hero-grid.spec.ts`:
  - "the grid recedes: verticals closer at the top and 48px apart at the middle" (por C1–C3);
  - "horizontals near the pointer sag downwards" (por C12).
- `e2e/black-hole.spec.ts`:
  - "an edge-on disk about 400px wide crosses the horizon" (por C19–C21);
  - "the back of the disk arches over and under the horizon" (por C22, C23).
- `e2e/lens.spec.ts`:
  - "a 120px lens with a faint mist ring follows the mouse within 100ms" (por C34, C37);
  - "the lens shows 6 to 10 stars and nothing outside its circle" (por C38);
  - "inside the lens the title is an outline; outside it stays solid" (por C39);
  - "the lens is gone within 300ms of leaving", que vira "the lens is gone within 300ms of
    leaving the hero" e abre a lente pelo título (C35 cobre a saída do título).
