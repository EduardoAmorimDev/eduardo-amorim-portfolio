# Landing page do portfólio — lente gravitacional real do buraco negro sobre a malha

Profile: `light` (o `AGENTS.md` do repositório não declara perfil) · handoff: `on`, budget 150k.
Base da feature: `5bb2888` (o commit da tarefa). Branch: `feat/black-hole-lensing`, a partir de
`main` em `a9aad4e`; sem push.

Sources:

- `.tasks/portfolio-lp-black-hole-lensing.md` — os 13 critérios, o limite (`Out of scope`), o
  `Swept`, o `Impact` e as 4 decisões de `Decided`. É o registro de decisão; os números entre
  parênteses abaixo são os critérios dela.
- `.tasks/references/portfolio-lp-black-hole-lensing.png` — referência do aspecto, transcrita na
  tarefa; não traz números.
- V. Bozza, arXiv:gr-qc/0208075 — a integral de deflexão de Schwarzschild e o limite de campo
  forte que conferem C1.
- `.tasks/portfolio-lp-gravity.md`, `.tasks/portfolio-lp-cosmos.md` e
  `.tasks/portfolio-lp-black-hole-scale.md` — o que esta não substitui continua valendo.

## Out of scope

- Distorcer o `logo` ou movê-lo para trás do buraco negro; traçar raios no disco; aberração
  cromática; distorcer o texto da Hero — `Out of scope` da tarefa.

## Landing

Toca `components/organisms/hero/`:

- um módulo puro novo, `deflection.ts`, com a deflexão e a lente fina, ao lado de `black-hole.ts`;
- `black-hole-mesh.tsx`, que ganha o passe da lente;
- `grid-motion.ts`, onde `HoleBody` ganha `lift`;
- `use-hero-field.ts`, que publica a subida;
- `hero.tsx` e `hero-scene.tsx`, que passam a malha ao buraco negro e mudam a opacidade.

Reusa `CanvasTexture` e `DataTexture` do `three`, `LIFT` e `liftScale` de `black-hole.ts`, e o
`hole` publicado pelo laço da Hero. O nome do termo novo é `deflection`/`bend`: "lens" já é a
constelação do ponteiro.

| One-way door                                    | Literal shape                                                                                                                                                                                                                                                                                                         | Alternative rejected                                                                                                                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A lente é do buraco negro (Decided 1 da tarefa) | `<BlackHole hole={hole} behind={grid} />`, `behind: RefObject<HTMLCanvasElement \| null>`. O buraco negro lê o canvas como `CanvasTexture`, enviada a cada quadro. Desenha a malha com a opacidade calculada do canvas (`getComputedStyle(behind).opacity`) e põe `visibility: hidden` no canvas só enquanto desenha. | Mapear as linhas em `drawGrid`: põe a distorção na malha, o que o usuário excluiu                                                                                                               |
| Deflexão exata tabelada na CPU (Decided 2)      | `deflection(impact)` em `deflection.ts`. Uma tabela de 512 valores de α sobre s = 1/θ (θ em raios do horizonte), numa `DataTexture` `RedFormat`/`FloatType` com `NearestFilter`, lida por `texelFetch` e interpolada à mão. Lente fina: β = θ − K·α.                                                                  | Geodésica por pixel, que refaria o disco. Campo fraco, que dá 0,667 rad contra 1,719 em b = 3. Interpolar a tabela pelo filtro linear: `FloatType` linear depende de `OES_texture_float_linear` |
| Lente na tela inteira (Decided 3)               | Um plano com `frustumCulled={false}`, `renderOrder={-1}` e `depthTest={false}`, dentro do grupo do buraco negro. O vertex shader escreve direto em clip space, desenhado antes do quadrado do disco.                                                                                                                  | Quadrado com a distorção indo a zero na borda: inventa uma borda (37 px de deslocamento a 700 px)                                                                                               |
| Nenhuma dependência nova (Decided 4)            | só `three`, `@react-three/fiber`, `@react-three/drei`                                                                                                                                                                                                                                                                 | `@react-three/postprocessing`                                                                                                                                                                   |

- Nada mais aqui é difícil de reverter: nada persiste e nenhum contrato é consumido por fora.

Decisões reversíveis, registradas antes do código:

- **Força da lente (K) pela subida, em `deflection.ts`:** `bendAt(lift)` = K₀,₅ · f(lift)/f(0,5),
  com f = e(1 − e) e e = `LIFT.lowest` / `liftScale(lift)`. K₀,₅ vem de θ_E = 2 raios do
  horizonte. O laço publica `lift` em `HoleBody`. Rejeitado: deduzir a subida de `strength` (a
  força do poço), que acopla a lente à regra do poço.
- **Os testes de pixel injetam o que está atrás.** Com o relógio parado, o e2e desenha no canvas
  `hero-grid` um círculo de raio conhecido em volta do buraco negro. Sob movimento reduzido
  desenha direto; em movimento, troca o `stroke` do contexto daquele canvas, que o laço chama a
  cada quadro. Depois lê onde as imagens aparecem, comparando com a captura de uma fonte vazia.
  Isso prova que o buraco negro distorce o que estiver atrás, não só a malha. Rejeitado: achar
  linhas da malha real na tela, que o disco e o próprio poço confundem.
- **`showSceneOnly` (e2e) zera a opacidade da malha** em vez de só escondê-la: o buraco negro
  desenha a malha com a opacidade do canvas, e `visibility` passa a ser dele.

Decisões reversíveis descobertas no build, registradas antes do código que as fecha:

- **C8 lê d = 476 à direita do centro, não abaixo.** A imagem espelhada abaixo do centro vem
  da parte do círculo acima dele, e a 476 px ela fica além do topo da Hero (o centro está a
  288 px). À direita, a imagem cai entre o horizonte e a borda interna do disco (1,5 raio), sem
  nada por cima.
- **C20 compara o centro da lente com o ponto em que o laço pôs o buraco negro naquele quadro**
  (gravado pelo `arc` do recorte do horizonte, em `data-drawn-hole`). É dali que o quadrado do
  horizonte é posicionado. A caixa do horizonte nos pixels é inteira e erra até meio px, então
  só confirma o ponto, a até 2 px. O círculo é ajustado por mínimos quadrados em raio e centro,
  ao longo de 14 raios a até 45° da vertical, sem os raios que ficam a mais de 3 px do primeiro
  ajuste (o `logo`, a borda de um disco inclinado). Rejeitado: o centro da caixa do horizonte,
  cujo erro (±0,5 px mais a caixa recortada pelo disco) passa de 1 px sozinho.
- **Testes em movimento com 120 s de limite**, como o `hero-grid.spec` faz. Rodam 6 s de quadros
  com envio da malha à GPU, e passaram de 30 s com a máquina em carga 37.
- **"the black hole grows and shrinks as it rises" com 60 s de limite.** Roda 12 s de quadros
  pelo relógio parado e passou a levar ~32 s, com a malha enviada à GPU a cada quadro. Enviada
  uma vez só, levou 27,4 s; sem mipmaps, 31,8 s, então eles não pesam. Não foi possível medir a
  `main` (o build em worktree falhou com `node_modules` ligado). O teste não muda; só o limite.
- **C8 mede com faixas largas.** A lente comprime as imagens espelhadas na direção do raio
  (0,27× a d = 96 px, 0,17× a 192 e 0,05× a 476). Um traço de 3 px vira 0,16 px a 476, abaixo
  do que a captura distingue. O teste desenha faixas de 8, 12 e 40 px, que viram ~2 px, e mede o
  centro delas. A tolerância de ±4 px não muda. Rejeitado: baixar o limiar de detecção até o
  ruído do brilho do disco.

## Checks

Comandos: unidade `node --test --test-name-pattern="<nome>" components/organisms/hero/deflection.test.ts`;
e2e `npx playwright test e2e/<arquivo> -g "<nome>"`.

### S1 - A deflexão de Schwarzschild · 3 files · ~16 KB · ~4k

**C1** - α(b) é a integral exata: α(1000) = 0,00200, α(100) = 0,0203, α(10) = 0,2361, α(3) =
1,719 e α(b_c·1,001) = 6,51 rad, ±1% (1). Proof: `deflection.test.ts` › "the deflection is
Schwarzschild's exact integral"

**C2** - α tende a 2/b no campo fraco (b = 10⁴, ±0,5%) e a −ln(b/b_c − 1) − 0,4002 perto de b_c
(b = b_c·1,0001, ±0,5%) (1). Proof: `deflection.test.ts` › "the deflection meets the weak and
strong field limits"

**C3** - Um raio com b ≤ b_c é capturado: `deflection` dá `Infinity` em b_c e em 2 (2). Proof:
`deflection.test.ts` › "a ray at or inside the critical impact is captured"

**C4** - Com uma fonte toda branca atrás, nenhum pixel dentro do horizonte (até 0,97 raio do
centro) se afasta do `ink` mais que 6 níveis (2). Proof: `e2e/deflection.spec.ts` › "nothing
behind shows inside the horizon"

### S2 - A malha atrás do buraco negro aparece pela lente · 9 files · ~105 KB · ~26k

**C5** - Na subida 0,5, θ₊(d) = 238, 298, 530 e 737 px para d = 96, 192, 476 e 700, ±4 px, com
horizonte de 96 px (3). Proof: `deflection.test.ts` › "at rest a point appears farther out, on its
own side"

**C6** - Sob movimento reduzido, um círculo de raio d desenhado na fonte em volta do buraco negro
aparece na tela a θ₊(d), ±4 px. A medida é feita para baixo do centro, para d = 96, 192 e 476, e
na diagonal para baixo e para a esquerda, para d = 700 (3, 6). Proof: `e2e/deflection.spec.ts` ›
"what lies behind appears farther out, as the lens equation says"

**C7** - Na subida 0,5, θ₋(d) = 160, 139 e 111 px para d = 96, 192 e 476, ±4 px (4). Proof:
`deflection.test.ts` › "at rest a point also appears mirrored inside the Einstein ring"

**C8** - Sob movimento reduzido, o mesmo círculo aparece também a θ₋(d) do lado oposto, ±4 px,
para d = 96, 192 e 476 (4). Proof: `e2e/deflection.spec.ts` › "what lies behind also appears
mirrored between the shadow and the Einstein ring"

**C9** - O anel de Einstein mede 1,0, 1,61, 2,0, 2,25 e 2,42 raios do horizonte nas subidas 0;
0,25; 0,5; 0,75 e 1, ±3% (5). Proof: `deflection.test.ts` › "the Einstein ring follows the lift
as a thin lens does"

**C10** - Em movimento, um círculo de 2 raios do horizonte em volta do buraco negro aparece a
até 6 px de 2 raios logo após o início, com a subida perto de 0. Aos 6 s, com a subida perto
de 1, aparece a θ₊ de K(1), ±4% (5). Proof: `e2e/deflection.spec.ts` › "the lens is weakest on
the grid and strongest risen off it"

**C11** - O deslocamento θ₊ − d cai a cada px de d entre 1 e 900 px, na subida 0,5: 142, 106,
54 e 37 px a 96, 192, 476 e 700, ±4 px (6). Proof: `deflection.test.ts` › "the shift falls off
smoothly with distance, with no edge"

**C12** - A malha tem opacidade calculada 0,5. Com uma fonte toda branca, um ponto longe do
buraco negro e do `logo` fica no meio do caminho entre `ink` e branco: luminância relativa
entre 0,18 e 0,26 (7). Proof: `e2e/deflection.spec.ts` › "what lies behind shows at the grid's
half opacity"

**C13** - A fonte continua com o poço de hoje: a horizontal pelo centro desce 60 a 120 px na
subida 0,5 (8). Proof: `e2e/hero-grid.spec.ts` › "horizontals through the black hole's well sink,
60 to 120px at half lift"

**C14** - A fonte continua com o poço que enfraquece com a subida (8). Proof:
`e2e/hero-grid.spec.ts` › "the well weakens as the black hole rises"

### S3 - A lente é do buraco negro · 6 files · ~60 KB · ~15k

**C15** - Antes do primeiro quadro da cena 3D, o canvas `hero-grid` está visível com opacidade
0,5. Depois de quadros com o buraco negro desenhado, ele fica `hidden`, e a malha aparece pela
lente (9). Proof: `e2e/deflection.spec.ts` › "the grid shows itself until the black hole draws
it"

**C16** - Sob movimento reduzido, o `logo` aparece onde o layout o projeta (anchor 0,62 / 0,74 a
z = 0), ±15 px no centro do brilho. A lente o deslocaria ~54 px (10). Proof:
`e2e/deflection.spec.ts` › "the logo in front is not bent"

**C17** - O texto da Hero continua desenhado por cima da cena (10). Proof: `e2e/hero.spec.ts` ›
"the hero copy lies over the black hole"

**C18** - O anel de fótons continua fino, claro e colado ao horizonte (11). Proof:
`e2e/black-hole.spec.ts` › "a thin bright photon ring hugs the horizon"

**C19** - A metade próxima do disco continua passando à frente do horizonte (11). Proof:
`e2e/black-hole.spec.ts` › "the near half of the disk crosses in front of the horizon"

**C20** - Em movimento, o centro da imagem de um círculo desenhado na fonte em volta do buraco
negro fica a até 1 px do centro do horizonte na tela, em 3 instantes (12). Proof:
`e2e/deflection.spec.ts` › "the lens stays centred on the horizon as it wanders"

### Regras herdadas · 0 files novos

**C21** - Fora da tela, a Hero faz 0 draw calls (13). Proof: `e2e/offscreen.spec.ts` › "no scene
draws while both are off screen"

**C22** - O buraco negro volta a até 12 px de onde parou (13). Proof: `e2e/offscreen.spec.ts` ›
"the black hole resumes where it stopped"

**C23** - O `logo` não cruza o `<h1>` nem o CTA (13). Proof: `e2e/hero.spec.ts` › "the logo clears
the title and the CTA at 1440x900"

**C24** - Nenhuma dependência nova (13). Proof: `git diff --exit-code 5bb2888 -- package.json
package-lock.json`

## Handoff

S1–S3 somam ~45k tokens de leitura, todos em `components/organisms/hero/` e `e2e/`: um lote só,
sem passagem.

## Swept

- validation: not in scope - nenhuma entrada de dados
- failure modes: C15 (o buraco negro que não desenha deixa a malha à vista)
- idempotency: not in scope - nada é enviado nem gravado
- authorization: not in scope - página pública
- concurrency: C20 (centro da lente e do horizonte do mesmo quadro); a fonte pode ter um quadro de atraso
- data lifecycle: not in scope - nada persiste
- dependency failure: not in scope - nenhum recurso externo; a tabela é calculada no navegador
- state transitions: C15 (fonte à vista → desenhada pela lente)
- observability: not in scope - sem telemetria; C21 cobre o custo fora da tela

## Coverage

| Set (size)                                             | Member -> proof                                         | Unproven                                                           |
| ------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------ |
| α(b) da tabela do critério 1 (5)                       | 1000, 100, 10, 3, b_c·1,001: todos em C1                | -                                                                  |
| θ₊ do critério 3 (4)                                   | 96, 192, 476, 700: C5 (unidade) e C6 (tela)             | -                                                                  |
| θ₋ do critério 4 (3)                                   | 96, 192, 476: C7 (unidade) e C8 (tela)                  | -                                                                  |
| subidas do critério 5 (5)                              | 0, 0,25, 0,5, 0,75, 1: C9 (unidade); 0 e 1 na tela: C10 | 0,25, 0,5 e 0,75 só na unidade (0,5 aparece na tela por C6 e C8)   |
| quem fica à frente (4: logo, título, CTA, constelação) | logo C16 · título e CTA C17 (a cópia sobre a cena)      | constelação: canvas `hero-lens` acima do canvas 3D, sem prova nova |

- Nenhum check reivindica status, rota ou formato de resposta.
