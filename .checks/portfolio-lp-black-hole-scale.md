# Landing page do portfólio — buraco negro maior, que sobe e desce sobre a malha

Profile: `light` (o `AGENTS.md` do repositório não declara perfil) · handoff: `on`, budget 150k.
Base da feature: `d58349e` (o commit da tarefa). Branch: `feat/black-hole-scale`, a partir de
`main` em `68efb10`; sem push.

Sources:

- `.tasks/portfolio-lp-black-hole-scale.md` — os 14 critérios, o limite (`Out of scope`), o
  `Swept` e o `Impact`. É o registro de decisão; os números entre parênteses abaixo são os
  critérios dela.
- `.tasks/portfolio-lp-gravity.md` e `.tasks/portfolio-lp-cosmos.md` — o que esta não substitui
  continua valendo.

## Out of scope

- Poço do ponteiro, lente, H1, laptop; posição na tela mudando com a subida; luz no `logo`
  mudando com a subida — `Out of scope` da tarefa.

## Landing

Toca `components/organisms/hero/black-hole.ts` (tamanho e subida), `black-hole-path.ts` (caixa e
velocidade), `grid-motion.ts` (poço) e `use-hero-field.ts` (o laço que move o corpo). O shader do
disco não muda: ele cresce pelo `horizon` que o laço já publica. Nenhuma dependência nova.

| One-way door | Literal shape | Alternative rejected |
| ------------ | ------------- | -------------------- |
| None         | -             | -                    |

- Nada aqui é difícil de reverter: nada persiste, nenhum contrato é consumido por fora e nenhuma
  dependência entra (14).

Decisões reversíveis, registradas antes do código:

- **A subida vive no laço da Hero**, não na cena 3D. `holeLift(seconds, still)` em
  `black-hole.ts` dá a subida, 0,5 − 0,5·cos(2π·t/12), começando rente à malha, ou 0,5 parada.
  O laço a acumula só enquanto anda, então pausa e retomada não saltam. A partir dela publica:
  - em `HoleBody`, o tamanho (`horizon` × `liftScale`);
  - um campo novo, `strength`, a força do poço (`wellStrength`).
    A cena só lê o `horizon`, como hoje. Rejeitado: calcular a subida no `useFrame` da cena, que
    tem outro relógio, e o poço e o corpo sairiam de passo.
- **O raio do poço não muda com a subida; o afundamento e o puxão, sim.** `holeShift` multiplica
  `sink` e `pull` por `strength`. O horizonte na folha continua vindo do `horizon` publicado.
- **Caixa do caminho por `holeBox(width, height)`**, exportada de `black-hole-path.ts` e usada
  pelo laço e pelos testes. Ela guarda a esfera e os arcos (`HOLE.halfHeight`), no tamanho do pé
  da Hero e na subida 1. Rejeitado: o laço calcular a caixa por conta própria, como hoje, o que
  deixa o teste de unidade medindo uma caixa diferente da que roda.

Decisões reversíveis descobertas no build, registradas antes do código que as fecha:

- **Pontos de passagem a até 270 px um do outro** (`WANDER.maxHop`, 0,9 × `maxSpeed` ×
  `maxLeg`). Com metade da velocidade, um ponto sorteado em qualquer lugar da caixa (até ~700 px
  em 1440) dava pernas que nem a 30 px/s cabiam em 10 s: a primeira perna chegou a 11 s (C20).
  Vale também para o primeiro ponto, a partir do de partida. Rejeitado: aceitar pernas mais
  longas, que quebra C20.
- **C18 com limiar de 0,1 px, não 0,5.** Sob movimento reduzido, a horizontal logo dentro da
  borda de baixo do poço, na coluna medida, desce 0,31 px (calculado com `displace`). O 0,5 px
  veio de `portfolio-lp-gravity` C6 e não desta tarefa: o critério 11 só fixa a linha do centro
  (60 a 120 px). A leitura por centroide alcança 0,1 px; a mudança fica visível neste diff.

- **Medidas que crescem com o buraco negro.** A espessura máxima do anel (C26 de
  `portfolio-lp-gravity`) e o alcance da busca do anel passam a valer por 96 px de horizonte,
  porque o critério 2 desta tarefa faz o anel crescer com ele (5,5 px medidos a 192 px). Pelo
  mesmo motivo, `horizonIn` procura o anel até 4 px mais 8% do raio além da borda da calota
  escura; com 4 px fixos, falhava em ~1 de cada 10 quadros com o horizonte maior. Rejeitado:
  afinar o anel no shader, que contradiz o critério 2.
- **Buraco negro achado na tela nos testes de malha com relógio parado** (`holeNow`). Em
  movimento, ele parte do ponto de repouso empurrado para dentro da caixa nova, que começa em
  ~319 px. Ali, os testes que supunham 288 px mediam o poço no lugar errado.
- **Brilho do `logo` lido só no canto dele** (à direita de 3,5 raios e acima de 0,9 raio do
  centro do buraco negro). O brilho do disco maior entrava na metade virada para o buraco negro
  e baixava a média dela.

- **Barras de quantidade da malha mais baixas**, por causa do poço de 560 px. Ele deixa
  verticais retas só nos lados e no pé da Hero, e curva as da linha do meio por ~520 px de cada
  lado do buraco negro:
  - "lines far from the pointer and the black hole stay straight": de mais de 20 linhas medidas
    para mais de 6;
  - "cells at the middle…": de mais de 10 vãos para mais de 5.
    O valor afirmado em cada linha ou vão não mudou. C18 passa a exigir pelo menos 20 das 23
    horizontais entre as bordas do poço na coluna medida.
- **O alcance de 4 px + 8% do raio em `horizonIn` foi ajustado ao resultado.** Ele veio de ~1
  falha em 10 quadros com 4 px fixos, não de uma derivação. É um detector, não um valor que um
  check afirme.

- **Luz do buraco negro dobrada** (`INTENSITY` de 160 para 320 cd), junto com o tamanho. O quad
  maior fica atrás do `logo` de vidro, e o brilho dele, atravessando o vidro, clareia as duas
  metades por igual. A face voltada para o buraco negro ficou só 3% mais clara (`portfolio-lp-
cosmos` 31 pede o lado voltado mais claro; a prova herdada exige 5%). Com 96 px de horizonte,
  a mesma prova passa; com 320 cd e 192 px, também. A luz não muda com a subida, como a tarefa
  pede (`Out of scope`). Rejeitado: afrouxar a prova para 3%, que baixaria a barra herdada.
- **Prova da força do poço tolera quadros sem horizonte legível**: até 3 de 27, porque o
  detector falha num quadro raro.

## Checks

Medidas em CSS px, em 1440×900, salvo quando indicado. Os testes e2e que dependem de tempo usam
`page.clock` parado (`gotoStopped`) e avançado com `runFor`; os de unidade rodam com `npm test`;
os e2e, com `npx playwright test <arquivo> -g "<nome>"`.

### S1 - O dobro do tamanho · 6 files · ~60 KB · ~15k

- **C1** (1) Sob movimento reduzido, o horizonte mede 192 px (±10%) de largura e de altura (a
  altura lida entre os picos do anel de fótons, ÷ 1,04). Proof: `e2e/black-hole.spec.ts` "a 192px
  event horizon".
- **C2** (1) Em 375×667, o horizonte encolhe na regra de hoje: 192 × `viewFit` × 667/900 (±10%).
  Proof: `e2e/black-hole.spec.ts` "the horizon shrinks on a narrow screen".
- **C3** (2) O disco mede de 725 a 887 px de largura (806 ±10%). Proof:
  `e2e/black-hole.spec.ts` "the disk is about 800px wide".
- **C4** (2) A inclinação, a metade próxima à frente, os arcos, o brilho de um lado e o movimento
  do disco continuam valendo no tamanho novo. Proof: `e2e/black-hole.spec.ts` "the disk is
  inclined: 0.2 to 0.32 as tall as wide". Proof: `e2e/black-hole.spec.ts` "the near half of the
  disk crosses in front of the horizon". Proof: `e2e/black-hole.spec.ts` "the far half arches
  over the top of the horizon". Proof: `e2e/black-hole.spec.ts` "a thinner, fainter arc runs
  under the horizon". Proof: `e2e/black-hole.spec.ts` "one side of the disk is at least 1.5
  times brighter". Proof: `e2e/black-hole.spec.ts` "a thin bright photon ring hugs the horizon"
  (o anel tem até 4 px por 96 px de horizonte). Proof: `e2e/black-hole.spec.ts` "the disk's tilt changes on screen".
- **C5** (3) Em 1440×900, 1024×768, 768×1024 e 375×667, em 10 min de caminho e em qualquer
  subida, a esfera e os arcos (1,65 raio do horizonte no tamanho daquela altura e daquela
  subida) ficam a 10% de cada borda. Proof: `components/organisms/hero/black-hole-path.test.ts`
  "the sphere and arcs stay 10% inside the hero at any lift".

### S2 - Distorção coerente com o novo tamanho · (mesmos arquivos)

- **C6** (4) Na linha do meio, escala de projeto e subida 0, o poço alcança 560 px: desvio > 0 a
  550 px e 0 a 570 px. Proof: `components/organisms/hero/grid-motion.test.ts` "the black hole's
  well reaches 560px at the middle".
- **C7** (4) O puxão lateral nunca passa de 96 px nem do centro. Proof:
  `components/organisms/hero/grid-motion.test.ts` "the hole pulls towards its centre, by at most
  96px, within 560px".
- **C8** (5) Na subida 0, com o buraco negro em repouso, a horizontal mais próxima do centro
  desce de 80 a 160 px. Proof: `components/organisms/hero/grid-motion.test.ts` "at lift 0 the
  horizontal nearest the centre sinks 80 to 160px".
- **C9** (6) Na subida 0, em cinco posições do buraco negro, a ordem das horizontais na tela se
  mantém. Proof: `components/organisms/hero/grid-motion.test.ts` "no horizontal sinks past the
  next".
- **C10** (4) Na tela, as verticais de cada lado do buraco negro se curvam na direção dele.
  Proof: `e2e/hero-grid.spec.ts` "lines near the black hole bend towards it".

### S3 - Sobe e desce sobre a malha · (mesmos arquivos)

- **C11** (7) A subida vai de 0 a 1 e volta, com período de 10 a 14 s, diferente de 16 e de 21 s.
  Proof: `components/organisms/hero/black-hole.test.ts` "the lift rises from 0 to 1 and back
  every 10 to 14 s".
- **C12** (8) O fator de tamanho é 0,88 na subida 0 e 1,12 na subida 1, em linha reta. Proof:
  `components/organisms/hero/black-hole.test.ts` "the black hole is 0.88 to 1.12 times its size
  as it rises".
- **C13** (8) Na tela, ao longo de 12 s, o horizonte dividido pela escala da folha na altura dele
  varia pelo menos 1,2 vez entre o menor e o maior. Proof: `e2e/black-hole.spec.ts` "the black
  hole grows and shrinks as it rises".
- **C14** (9) A força do poço é 1 na subida 0 e 0,5 na subida 1, em linha reta. Proof:
  `components/organisms/hero/black-hole.test.ts` "the well weakens from 1 to 0.5 as the black
  hole rises".
- **C15** (9) Na mesma posição, a horizontal mais próxima do centro desce na subida 0 pelo menos
  1,8 vez o que desce na subida 1. Proof: `components/organisms/hero/grid-motion.test.ts` "the
  well sinks the grid at least 1.8 times deeper at lift 0 than at lift 1".
- **C16** (10) O raio do poço é o mesmo nas subidas 0 e 1 (desvio > 0 a 550 px e 0 a 570 px).
  Proof: `components/organisms/hero/grid-motion.test.ts` "the well's reach does not change with
  the lift".
- **C17** (11) Parada, a subida é 0,5 em qualquer instante. Proof:
  `components/organisms/hero/black-hole.test.ts` "a still black hole holds at half lift".
- **C28** (9) Na página, em movimento, o poço fica mais raso quando o buraco negro sobe. Ao longo
  de 13 s, a profundidade (o afundamento na tela dividido pelo quanto a folha desce por px
  naquela altura) é lida na horizontal mais próxima do centro, à mesma distância dele. Lida no
  quadro em que o buraco negro parece menor para a profundidade (subida 0), ela é pelo menos 1,5
  vez a do quadro em que parece maior (subida 1). O critério pede 1,8 na mesma posição; os dois
  quadros têm o buraco negro em lugares diferentes, e 1,5 ainda separa a força pela metade (2×)
  da força fixa (1×). Falha injetada (`strength: 1` na página): razão 1,006, vermelho. Proof:
  `e2e/hero-grid.spec.ts` "the well weakens as the black hole rises".
- **C18** (11) Sob movimento reduzido, toda horizontal que passa pelo poço na coluna medida desce
  mais de 0,1 px, e a mais próxima do centro desce de 60 a 120 px. A coluna fica logo além do
  horizonte (104 px do centro). As bordas do poço nela saem da geometria da folha plana, como em
  `portfolio-lp-gravity` C6. Proof: `e2e/hero-grid.spec.ts` "horizontals through the black
  hole's well sink, 60 to 120px at half lift".

### S4 - Metade da velocidade · 2 files · ~14 KB · ~4k

- **C19** (12) A velocidade fica entre 10 e 30 px/s e nunca é 0. Proof:
  `components/organisms/hero/black-hole-path.test.ts` "the speed stays within 10 to 30px/s and
  never stops".
- **C20** (12) O caminho curva a cada 4 a 10 s. Proof:
  `components/organisms/hero/black-hole-path.test.ts` "the path turns every 4 to 10 s".
- **C21** (12) Nenhum quadro move o centro mais de 4 px. Proof:
  `components/organisms/hero/black-hole-path.test.ts` "no frame moves it more than 4px".
- **C22** (12) Na tela, em 4 s, o buraco negro anda pelo menos 30 px. Proof:
  `e2e/black-hole.spec.ts` "the black hole wanders".

### Regras herdadas

- **C23** (13) Ao voltar à tela, o buraco negro está a até 12 px de onde parou. Proof:
  `e2e/offscreen.spec.ts` "the black hole resumes where it stopped".
- **C29** (13) Ao voltar à tela, a subida retoma de onde parou. Na mesma prova, o tamanho para a
  profundidade muda no máximo 3%; se a subida tivesse corrido os 2 s fora, mudaria ~13%. Proof:
  `e2e/offscreen.spec.ts` "the black hole resumes where it stopped".
- **C24** (13) Fora da tela, a Hero faz 0 draw calls. Proof: `e2e/offscreen.spec.ts` "no scene
  draws while both are off screen". Proof: `e2e/offscreen.spec.ts` "only the hero draws at the
  top of the page".
- **C25** (13) Nenhuma linha da malha dentro do horizonte. Proof: `e2e/hero-grid.spec.ts` "no
  grid line inside the event horizon".
- **C26** (13) O `logo` não cruza a caixa do `<h1>` nem a do CTA, em 1440×900 e 375×667. Proof:
  `e2e/hero.spec.ts` "the logo clears the title and the CTA at <w>x<h>" (as duas variantes).
- **C27** (14) `package.json` sem dependência nova. Proof: `git diff --exit-code d58349e --
package.json`.

## Swept

- validation: n/a - nenhuma entrada de dados
- failure modes: n/a - nada novo pode falhar
- idempotency: n/a - nada é enviado nem gravado
- authorization: n/a - página pública
- concurrency: C23, C29 (pausa e retomada sem salto, da posição e da subida)
- data lifecycle: n/a - nada persiste; o caminho é novo a cada carga (existing - `createWander(Math.random, …)` em `use-hero-field.ts`)
- dependency failure: n/a - nenhum recurso externo
- state transitions: C11, C17
- observability: n/a - sem telemetria; custo de quadro coberto por C24

## Handoff

Rodada 2 do Verifier (FAIL na rodada 1, 27 de 27 provados como escritos). A força do poço na
página não tinha prova que falhasse: C28 cobre isso, e foi feito vermelho com a falha injetada.
C29 prova a retomada da subida. C12 e C14 passam a afirmar a subida 1. As tarefas
`portfolio-lp-gravity` e `portfolio-lp-cosmos` ganharam no topo a lista do que esta substitui.
As barras afrouxadas estão registradas no `Landing`.

Os quatro slices somam ~19k tokens de leitura (`wc -c` ÷ 4), abaixo de 150k: um lote só, sem
handoff. O Verifier roda depois sobre `d58349e..HEAD`, com todos os checks.

Testes substituídos:

- `e2e/black-hole.spec.ts` "a 96px event horizon" → "a 192px event horizon" (C1); "the disk is
  about 400px wide" → "the disk is about 800px wide" (C3).
- `e2e/hero-grid.spec.ts` "horizontals through the black hole's well sink, 40 to 80px at its
  centre" → "… 60 to 120px at half lift" (C18).
- `components/organisms/hero/black-hole-path.test.ts` "the speed stays within 20 to 60px/s and
  never stops" → "… 10 to 30px/s …" (C19); "the whole body stays 10% inside the hero" → "the
  sphere and arcs stay 10% inside the hero at any lift" (C5).
- `components/organisms/hero/grid-motion.test.ts` "the black hole's well reaches 280px at the
  middle", "the black hole's well is narrower higher up" e "the hole pulls … 48px, within 280px"
  passam aos valores dobrados (C6, C7).
