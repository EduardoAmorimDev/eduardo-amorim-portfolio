# Landing page do portfólio — Hero com gravidade em perspectiva — Verificação

**Verdict**: FAIL
**Profile**: light (o `AGENTS.md` do repositório não declara perfil)
**Diff range**: 3de27ef..7de158c (correção da rodada 2: b1a2b33..7de158c)
**Round**: 3 - scoped
**Verifier**: sub-agente independente (author != verifier)

Todas as provas rodaram verdes em `7de158c`. `npm test` aprovou 50 de 50. O Playwright aprovou 66
de 66 numa invocação só (9 specs, `--workers=1`, `-g` com a alternância dos 56 nomes, 6,1 min).
Os nomes com template rodaram todas as variantes: 4 + 4 + 4 + 2. Cada teste nomeado aparece
individualmente como `✓` no log, inclusive o novo "the laptop opens, straightens and fades its
page in with the scroll" (`e2e/notebook.spec.ts:399`). Os 60 checks estão provados como estão
escritos.

O FAIL continua vindo da fidelidade do C6 ao critério 4 da tarefa. A correção estendeu o corte,
mas o limite de cima, 120 px, para 0,5 px antes da horizontal mais alta do poço. Essa linha está
dentro do poço e desce 4,4 px medidos na tela. É a mesma linha que a rodada 2 apontou (−121,4 px,
4,07 px calculados). A justificativa escrita no C6 ("É a extensão do poço nessa coluna") não bate
com a geometria do próprio render: nessa coluna o poço vai de 140,9 px acima a 163,9 px abaixo
do centro. C60 cobre o critério 27 e discrimina abrir e aparecer aos poucos. De "endireita", só
prova o estado final.

## Escopo desta rodada (verified at 7de158c)

- Diff da correção, `b1a2b33..7de158c`:
  - testes: `e2e/hero-grid.spec.ts` (constante `WELL_ON_SCREEN` e o filtro do C6) e
    `e2e/notebook.spec.ts` (constantes de C60, `laptopBox` e o teste novo);
  - checklist: `.checks/portfolio-lp-gravity.md` (C6 reescrito, C60 novo, nota no `Handoff`).
- Nenhum arquivo de produção, auxiliar de e2e (`e2e/*-helpers.ts`, `e2e/fixtures.ts`) ou tarefa
  mudou na correção (`git diff --stat b1a2b33..HEAD -- components app lib e2e/*helpers*
e2e/fixtures.ts` vazio).
- Checks reabertos:
  - não-PASS (fidelidade) na rodada 2: C6;
  - novo: C60;
  - citações renovadas porque o arquivo de teste mudou: C1–C5, C7, C12–C17 (`hero-grid.spec.ts`)
    e C50–C53, C58 (`notebook.spec.ts`).
- Os demais checks vêm `carried from b1a2b33` ou, onde a rodada 2 já os carregou,
  `carried from 805f297`. Os arquivos de teste deles não mudaram desde então.

## Passos sob `light` (carried from 805f297)

- O passo 1 (fontes binding) não roda: nenhuma fonte está marcada como binding. A tarefa é o
  registro de decisão. A pedido do orquestrador, julguei a fidelidade de C6 e C60 aos critérios 4
  e 27 dela (seção própria abaixo).
- Junção de `Coverage`, veredictos de `Test policy` e injeção de falhas não rodam sob `light`, e o
  checklist não tem essas seções. As sondas abaixo são leituras, não mutações: rodaram fora do
  repositório, contra o build de `7de158c`.

## Checks (verified at 7de158c)

| Check | Claim                                                                                                                                                       | Proof run | Evidence                                                                                                                                                                                                                                                                                                                                                                   | Result                                                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| C6    | toda horizontal entre 120 px acima e 148 px abaixo do centro desce > 0,5 px, medida a 56 px do centro, dos dois lados; a mais próxima desce 40–80 px        | e2e ✓     | `e2e/hero-grid.spec.ts:27` - `WELL_ON_SCREEN = { up: 120, down: 148 }`; `:363-366` - `y - REST.y > -WELL_ON_SCREEN.up && y - REST.y < WELL_ON_SCREEN.down`; `:367` - `inside.length` `toBeGreaterThanOrEqual(9)`; `:369` - `sink` `toBeGreaterThan(0.5)`; `:373-374` - `nearest.sink` em [`HOLE_SINK.min` 40, `.max` 80]; `:359` - lido em `REST.x + side * (HORIZON + 8)` | PASS como escrito. **FIDELIDADE: ainda deixa de fora uma linha do poço** (ver abaixo)      |
| C60   | no meio da janela de ligar (77,5%) opacidade em (0,2, 0,8); a borda de cima do laptop sobe ≥ 25% da altura aberta; no fim, a página preenche ≥ 97% da caixa | e2e ✓     | `e2e/notebook.spec.ts:414-415` - `midway` `toBeGreaterThan(FADE.from)` (0,2) e `toBeLessThan(FADE.to)` (0,8); `:422-424` - `start.top - open.top` `toBeGreaterThanOrEqual(LID_RISE * (open.bottom - open.top))` (0,25); `:434` - `filled / area` `toBeGreaterThanOrEqual(SQUARE_FILL)` (0,97); constantes em `:35-38`                                                      | PASS como escrito. Abrir e aparecer aos poucos discriminam; "endireita" só no estado final |

Citações renovadas, sem mudança de veredicto (verified at 7de158c; as linhas se moveram com a
correção):

| Check | Evidence                                                                                                                                                                              | Result |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| C1    | `e2e/hero-grid.spec.ts:268` - `Math.abs(gap - SPACING) ≤ SPACING_SLACK`; `:273-277` - `aspect` em [`MIDDLE_ASPECT.min`, `.max`]                                                       | PASS   |
| C2    | `e2e/hero-grid.spec.ts:286` - `height / width ≤ TOP_ASPECT`                                                                                                                           | PASS   |
| C3    | `e2e/hero-grid.spec.ts:299` - `top ≤ TOP_TO_BOTTOM * bottom`                                                                                                                          | PASS   |
| C4    | `e2e/hero-grid.spec.ts:252` - `inked > 0`                                                                                                                                             | PASS   |
| C5    | `e2e/hero-grid.spec.ts:386` - `expectStraight(grid, farFrom(pointer, drift(600)))`, que afirma `≤ STRAIGHT_PX` em `:145-148`; `:399` - `rows.length > 15`; `:404` - `run < SUSTAINED` | PASS   |
| C7    | `e2e/hero-grid.spec.ts:316-320` - `≥ 1` linha por lado; `:333` - `pulled > 1`; `:334` - `≤ HOLE_PULL + SPACING_SLACK`                                                                 | PASS   |
| C12   | `e2e/hero-grid.spec.ts:463-464` - `nearest.sink` em [6, 20]; `:468` - `sink > 0.5`                                                                                                    | PASS   |
| C13   | `e2e/hero-grid.spec.ts:416` - ponteiro fora do título; `:431` - `left ≥ -0.5`; `:433` - `right ≤ 0.5`; `:444-445` - 6 ≤ valor ≤ 20                                                    | PASS   |
| C14   | `e2e/hero-grid.spec.ts:527-530` - 6 ≤ curva ≤ 20 e `Math.abs(left - right) ≤ 1.5`                                                                                                     | PASS   |
| C15   | `e2e/hero-grid.spec.ts:499` - `high ≤ NARROWER * low`                                                                                                                                 | PASS   |
| C16   | `e2e/hero-grid.spec.ts:550` - curva > 1 antes; `:553` - `expectStraight(…, farFrom(null, drift(1450)))`                                                                               | PASS   |
| C17   | `e2e/hero-grid.spec.ts:344` - `alphaAt(grid, x, y)` `toBe(0)`                                                                                                                         | PASS   |
| C50   | `e2e/notebook.spec.ts:308-321` - bordas a ≤ `ALIGN_PX` do vidro; `:183-184` - vidro cercado; `:322-338` - comparação relativa; `glassBox` em `:142`                                   | PASS   |
| C51   | `e2e/notebook.spec.ts:359` - `outside` `toBe(0)`                                                                                                                                      | PASS   |
| C52   | `e2e/notebook.spec.ts:378-381` - `≤ ALIGN_PX`; `:383` - `steps > 3`                                                                                                                   | PASS   |
| C53   | `e2e/notebook.spec.ts:232` - opacidade ≤ 0,05; `:235-237` - ≥ 0,9; `e2e/offscreen.spec.ts` como na rodada 1                                                                           | PASS   |
| C56   | `git diff --exit-code 3de27ef -- package.json` - saída vazia, exit 0                                                                                                                  | PASS   |
| C58   | `e2e/notebook.spec.ts:391` - `aria-hidden` `'true'`; `:392` - `tabindex` `'-1'`; `:393` - `pointer-events: none`; `:396` - `ariaSnapshot` `not.toMatch(/iframe\|document/i)`          | PASS   |

Carried from b1a2b33 (arquivos de teste intocados pela correção; provas re-executadas verdes em
7de158c): C8, C9, C10, C18, C19–C27, C30, C34, C39, C54 e C59, com as citações da rodada 2.

Carried from 805f297 (idem): C11, C28, C29, C31, C32, C33, C35, C36, C37, C38, C40, C41, C42,
C43, C44, C45, C46, C47, C48, C49, C55 e C57, com as citações da rodada 1.

Provados: **60 de 60**, como estão escritos.

## Fidelidade à tarefa (verified at 7de158c)

### C6 frente ao critério 4: ainda deixa uma linha do poço de fora

O critério 4 diz: "As linhas horizontais que passam pelo poço descem na tela em direção a ele, e
a que passa mais perto do centro desce de 40 a 80 px." O C6 agora diz "toda horizontal que passa
pelo poço" e afirma que 120 px acima e 148 px abaixo "é a extensão do poço nessa coluna".

Recalculei com `sheet`, `wellsOf` e `displace` de `components/organisms/hero/grid-motion.ts`, as
mesmas funções do render. Buraco negro em repouso em (720, 288), escala 1, coluna `720 ± 56`. Medi
também no build de `7de158c`, com o mesmo `traceRow` da prova, numa spec fora do repositório:

| Horizontal (y plano, medida) | Distância do centro | Distância na folha | Afundamento calculado | Afundamento medido (esq. / dir.) | Dentro do corte |
| ---------------------------- | ------------------- | ------------------ | --------------------- | -------------------------------- | --------------- |
| 143,5                        | −144,5              | 287,9 (fora)       | 0                     | 0,00 / 0,00                      | não             |
| 167,5                        | −120,5              | 241,2 (dentro)     | 4,07 px               | 4,45 / 4,40 px                   | **não**         |
| 190,5 a 405,5 (9 linhas)     | −97,5 a +117,5      | 60,7 a 207,5       | 12,96 a 56,10 px      | 12,50 a 56,03 px                 | sim             |
| 435,5                        | +147,5              | 253,8 (dentro)     | 2,05 px               | 1,84 / 1,85 px                   | sim             |
| 466,5                        | +178,5              | 300,6 (fora)       | 0                     | 0,00 / 0,00                      | não             |

- O poço, nessa coluna, vai de 140,9 px acima a 163,9 px abaixo do centro (varredura de `toSheet`
  com distância < 280). Nenhuma derivação que tentei dá 120 e 148:
  - borda do poço em `u = 0`: 144,5 e 167,5;
  - borda com o buraco afundado 84 px: 84,6 e 230,6;
  - afundamento > 0,5 px: 134,4 e 155,5.
- O comentário da prova diz "~125 px up … ~150 px down" (`e2e/hero-grid.spec.ts:360-362`), mas a
  constante é 120. Ela fica 0,5 px abaixo da linha a −120,5 px. O limite de baixo, 148, fica 0,5
  px além da linha a +147,5. Os dois limites parecem ajustados às linhas, não derivados do poço.
- A linha excluída passaria: mede 4,4 px de cada lado, quase nove vezes o limiar de 0,5 px. Uma
  regressão que cortasse o poço logo acima de −120 px passaria em C6.

Conserto sem mudar a ideia da prova:

- `WELL_ON_SCREEN.up` entre 120,5 e 144,5 (exclusivos); 141, a borda do poço, inclui a linha a
  −120,5 e deixa de fora a de −144,5, que está fora do poço e não desce;
- `down` pode ficar em 148 (qualquer valor entre 147,5 e 178,5 serve; a borda é 163,9);
- o mínimo de `:367` passa de 9 a 11, o número de linhas do poço nessa coluna;
- a frase do C6 (`.checks/portfolio-lp-gravity.md:134-136`) deve seguir os números.

Um detalhe para quem corrigir: em x = 40 há um cruzamento espúrio a −159,8 px (y 128,2), de uma
vertical inclinada. Ele "desce" 3,6 e 6,7 px no rastreio. Um limite acima de 159,8 o incluiria, e
ele passaria por acaso.

### C60 frente ao critério 27: cobre, com uma ressalva em "endireita"

Leitura no build de `7de158c`, com a mesma página sintética e as mesmas medidas da prova:

| Momento                 | Caixa do laptop (topo–base) | Opacidade | Página pintada  |
| ----------------------- | --------------------------- | --------- | --------------- |
| início (`gotoNotebook`) | 377–703                     | 0         | nenhuma         |
| 10% da rolagem          | 384–698                     | 0         | nenhuma         |
| 40%                     | 354–650                     | 0         | nenhuma         |
| 77,5%                   | 180–610                     | 0,499     | nenhuma (fraca) |
| fim                     | 175–600                     | 1         | 496,184–944,491 |

Folgas: opacidade 0,499 contra (0,2, 0,8); subida 0,475 da altura aberta contra 0,25;
preenchimento 0,9991 contra 0,97. Nenhum limite está colado ao valor medido.

O que cada asserção pega:

- **Aparece aos poucos** (`:414-415`): `POWER_ON = [0.6, 0.95]` (`laptop.tsx:63`) e 77,5% é o meio
  da janela. Página sempre acesa, nunca acesa ou ligada num degrau dariam 1 ou 0, e a prova falha.
  Uma amostra só prova um estado intermediário, não a continuidade. Para o critério, basta.
- **Abre** (`:422-424`): com a tampa fechada, a borda de cima fica entre 350 e 385, e a subida
  seria ~0. Então a prova falha. Além disso, a página dentro da tampa fechada não pintaria, e
  `paintedBox` lançaria em `:428`.
- **Endireita** (`:434`): a página parada torta falha. Com o rolamento de 10° de `START_POSE`
  (`laptop.tsx:46`), o retângulo preenche ~0,73 da caixa, e 1° residual já dá ~0,963. Uma guinada
  de 30° em perspectiva também fica abaixo de 0,97. A prova **não** falha se o laptop perder a
  pose torta do início e ficar reto a rolagem toda: nada mede o início torto. O critério diz
  "endireita … com a rolagem", e o C60 afirma só "no fim … retângulo de frente para a câmera".
  É uma lacuna de precisão menor, que não decide o veredicto sozinha. Fecha com uma asserção no
  início: por exemplo, a caixa da página ou do laptop inclinada, ou a borda de baixo não
  horizontal, em `gotoNotebook`.

### Lista de lacunas da rodada 2

| Item da rodada 2                                       | Situação em 7de158c                                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| C6 rebaixa o critério 4 (corte em 90 px, 4 de 11 fora) | **parcial**: 10 de 11 cobertas; a linha a −120,5 px (desce 4,4 px) continua fora por 0,5 px (`e2e/hero-grid.spec.ts:27`) |
| critério 27: "aparece aos poucos", "endireita", "abre" | resolvido por C60, com a ressalva de "endireita" (só o estado final)                                                     |
| critério 3: horizontais só de 1100 a 1400 px (nota)    | inalterado; a afirmação do C5 diz isso                                                                                   |

## Swept existing rows re-read (verified at 7de158c)

| Row         | Cited constraint                                  | Found                                                                                                | Result |
| ----------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| concurrency | `BEFORE_HTML` em `laptop.tsx:74`, usado em `:152` | `components/organisms/notebook/laptop.tsx:74` - `const BEFORE_HTML = -1`; `:152` - `}, BEFORE_HTML)` | PASS   |

## Gate (verified at 7de158c)

- `npm test`: 50 aprovados, 0 falhas.
- `npx playwright test e2e/{a11y,black-hole,hero-grid,hero,lens,notebook,offscreen,reduced-motion,sections}.spec.ts --reporter=list --workers=1 -g "<56 nomes>"`:
  66 aprovados, 0 falhas, 6,1 min (build de produção, porta 3100).
- `git diff --exit-code 3de27ef -- package.json`: exit 0.
- `npx tsc --noEmit -p .`: exit 0.
- `npx eslint .`: exit 0.
- `npx prettier --check .`: **exit 1**, 11 arquivos Markdown, todos de features anteriores e
  nenhum de código: `.checks/portfolio-lp-{corrections,cosmos,performance,visual}.md`, os
  `.verified.md` de cada uma e `.tasks/portfolio-lp-{corrections,cosmos,visual}.md`. Os arquivos
  desta feature passam.
- Árvore de trabalho: `git status --porcelain` mostra só este relatório, antes e depois. O build
  regenera `.next/`, que o git ignora. As sondas rodaram em
  `/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/ea2ab78c-5fa6-45d7-bfa0-e377e78912de/scratchpad/probe/`,
  contra `next start --port 3101` sobre o mesmo build, já encerrado.
