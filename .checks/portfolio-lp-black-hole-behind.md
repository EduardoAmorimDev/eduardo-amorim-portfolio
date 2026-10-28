# Landing page do portfólio — modelos 3D atrás do buraco negro, sem malha, lente sem vazios

Profile: `light` · handoff: `on`, budget 150k (cabe num lote). Base da feature: `083a798` (o
commit da tarefa), direto na `main` por decisão do usuário; sem push.

**Provas sem testes do repositório.** O usuário decidiu que nenhum teste muda nem roda ("não
mexa nos testes, isso está demorando demais"). As provas usam:

- os testes de unidade que já existem, só rodados, quando cobrem o check sem mudança;
- `tsc` e lint;
- scripts de sonda fora do repositório, no scratchpad da sessão
  (`/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/a43d5673-cd23-4c14-b639-6f8d61e3badb/scratchpad/behind/`):
  - `math.ts`, em node, sobre os módulos puros;
  - `probe.mjs`, em Playwright, sobre o build de produção.

Os testes que a tarefa quebra estão listados no `Impact` da tarefa e não são provas aqui.

Sources:

- `.tasks/portfolio-lp-black-hole-behind.md` — os 12 critérios, o limite, o `Swept`, o
  `Impact` e o `Decided`. Os números entre parênteses abaixo são os critérios dela.
- `.tasks/portfolio-lp-black-hole-lensing.md` — a lente e as tabelas de θ₊/θ₋, mantidas.
- `.tasks/references/portfolio-lp-black-hole-lensing.png` e
  `.tasks/references/portfolio-lp-black-hole-behind-disk.png` — aspecto, sem números.

## Out of scope

- Traçar a luz do disco; escrever, mudar ou rodar testes do repositório; apagar o código da
  malha; mudar a força da lente; aberração cromática — `Out of scope` da tarefa.

## Landing

Toca `components/organisms/hero/`:

- `hero.tsx`: sai o canvas da malha;
- `use-hero-field.ts`: a malha passa a ser opcional, e o tamanho vem do canvas da lente;
- `bent-light.tsx`: a lente lê a camada de trás;
- `black-hole-mesh.tsx`: a luz chega à camada de trás;
- `black-hole.ts`: voltas do disco e a camada;
- `black-hole-path.ts`: velocidade;
- `glass-motion.ts` e `glass-elements.tsx`: os quatro modelos atrás.

Reusa `useFBO` do drei, a mesma câmera da cena, o vidro do `logo` e a lente atual.

| One-way door                                                                 | Literal shape                                                                                                                                                                                                                                                                                                                                                                                                                                | Alternative rejected                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A camada de trás é desenhada numa textura fora da tela (Decided 1 da tarefa) | `BEHIND_LAYER = 1` em `black-hole.ts`. Os modelos `behind: true` de `GLASS_LAYOUT` vão para essa camada, que a câmera principal (camada 0) não vê. `BentLight` recebe `behind: number` (a camada). A cada quadro, desenha essa camada numa `useFBO` de 2× a largura e 2× a altura da Hero em CSS px, `HalfFloatType`, 4 amostras. Usa uma cópia da câmera com fov = 2·atan(2·tan(fov/2)), e a lente lê a textura com u' = 0,5 + (u − 0,5)/2. | Desenhar os modelos na cena normal: a lente não consegue apagá-los e redesenhá-los dobrados. Recortar a camada no tamanho da tela: é o que esvazia metade da lente hoje (critério 7) |

- Nada mais é difícil de reverter: nada persiste, e nenhuma dependência entra.

Decisões reversíveis, registradas antes do código:

- **`cursor` e `wave` mais baixos** (`anchor` (−0,48; 0,40) e (0,52; 0,12), em vez de
  (−0,44; 0,56) e (0,44; 0,56)). Em repouso, a lente empurra os modelos para fora do centro do
  buraco negro, e o `wave` foi parar embaixo do `logo`. A tarefa (Unresolved 2) foi corrigida.

- **A malha sai da Hero sem apagar o código.** `useHeroField` aceita `grid` ausente e, sem ela,
  não desenha a malha. O tamanho passa a vir do canvas da lente, que cobre a mesma área.
- **Os modelos de trás não seguem o ponteiro.** Só balançam (`bob`/`sway`), com o ponteiro
  fixo em (0, 0). O raycaster do R3F usa a camada 0, então eles também não pegam o hover.
- **A luz do disco também ilumina a camada de trás** (`pointLight.layers.enable(BEHIND_LAYER)`).
  Sem isso, o passe da camada 1 deixa a luz de fora.
- **A lente aplica tone mapping e conversão de cor na saída.** A textura guarda cor linear, sem
  tone mapping, e precisa sair com a mesma cara do `logo`, que passa pelos dois.

## Checks

### S1 - A Hero sem malha · 2 files · ~18 KB · ~5k

**C1** - `#hero` não tem `[data-testid="hero-grid"]` (1). Proof: `probe.mjs` › "no grid"

**C2** - O caminho, a subida e o tamanho do buraco negro continuam como hoje (2). Proof:
`node --test components/organisms/hero/black-hole.test.ts`, sem mudança no arquivo

### S2 - Modelos atrás do buraco negro, vistos pela lente · 6 files · ~45 KB · ~12k

**C3** - Carregar `/` pede `cursor.glb`, `wave.glb`, `atom.glb` e `brick.glb` com status 200 (3).
Proof: `probe.mjs` › "models load"

**C4** - Os quatro modelos ficam a z = −3, mais longe da câmera que o buraco negro (z ≈ −1,5, a
8,5 da câmera em (0, 1, 7)) (4). Proof: `math.ts` › "models lie behind the black hole"

**C5** - As tabelas de θ₊/θ₋ continuam (5). Proof: `node --test
components/organisms/hero/deflection.test.ts`, sem mudança no arquivo

**C6** - Em repouso (centro em (720, 288), horizonte de 96 px, subida 0,5, Hero de 1440×900),
todo pixel entre 1,1 e 3 raios do horizonte, em 360 direções, lê um ponto dentro da camada de
trás de 2× ([−720, 2160] × [−450, 1350]) (6, 7). Proof: `math.ts` › "the lens never reads
outside the back layer"

**C7** - Em repouso, com o título escondido, aparece o vidro de ao menos 3 dos 4 modelos: mais
de 300 pixels fora do `ink` em volta de cada posição esperada, longe do disco e do `logo` (3, 5).
Proof: `probe.mjs` › "models show through the lens"

**C8** - Os modelos de trás estão na camada 1 e o `logo` na 0 (8). Proof: `math.ts` › "only the
logo takes the pointer" (sobre `GLASS_LAYOUT`)

### S3 - O disco gira de fato · 1 file · ~5 KB · ~1k

**C9** - `diskTurnSeconds(1.5)` é 3 e `diskTurnSeconds(4.2)` é 6 (9). Proof: `math.ts` › "the
disk turns in 3 to 6 s"

**C10** - Sob movimento reduzido, o disco não muda entre duas capturas com 1 s de intervalo:
nenhum pixel do disco muda mais que 6 níveis (10). Proof: `probe.mjs` › "the disk holds still"

### S4 - Metade da velocidade · 1 file · ~10 KB · ~3k

**C11** - Num caminho de 600 s, sorteado com `createWander` em 1440×900, a velocidade fica
entre 5 e 15 px/s, nenhum quadro passa de 4 px e ele nunca para (11). Proof: `math.ts` › "the
black hole wanders at 5 to 15 px/s"

### Regras herdadas · 0 files novos

**C12** - Nenhuma dependência nova (12). Proof: `git diff --exit-code 083a798 --
package.json package-lock.json`

**C13** - O código compila e passa no lint (12). Proof: `npx tsc --noEmit -p .` e `npm run
lint`

## Handoff

S1–S4 somam ~21k tokens de leitura, todos em `components/organisms/hero/`: um lote só, sem
passagem.

## Swept

- validation: not in scope - nenhuma entrada de dados
- failure modes: existing - `Suspense` não mostra o modelo que não carrega
- idempotency: not in scope - nada é enviado nem gravado
- authorization: not in scope - página pública
- concurrency: C6 (a lente e a camada de trás vêm da mesma câmera e do mesmo quadro)
- data lifecycle: not in scope - nada persiste
- dependency failure: not in scope - modelos do próprio site
- state transitions: C10
- observability: not in scope - sem telemetria

## Coverage

| Set (size)           | Member -> proof                                                     | Unproven                                       |
| -------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| modelos de trás (4)  | cursor, wave, atom, brick: C3 (carga), C4, C8; vistos: C7 (≥3 de 4) | um dos 4 pode estar escondido pelo disco em C7 |
| faixa da lente em C6 | 1,1 a 3 raios × 360 direções                                        | abaixo de 1,1 raio (sob o anel de fótons)      |
