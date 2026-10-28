# Landing page do portfólio — buraco negro maior, que sobe e desce sobre a malha · Verificação

**Verdict**: FAIL (um item bloqueante, que pede decisão do usuário e não uma correção de código)
**Profile**: `light` (o `AGENTS.md` do repositório não declara perfil). Rodaram: as provas, a
leitura de cada asserção em `file:line` e a releitura dos `Swept` que resolvem em `existing`.
Não rodaram por exigência do perfil: o passo 1, o join de `Coverage` e os veredictos de
`Test policy`. A injeção de falhas não é exigida em `light`; rodou só para confirmar o que o
autor afirma em C28 e para C29, numa cópia fora do repositório (abaixo).
**Diff range**: `d58349e..eddce79` (correção: `d55929a..eddce79`)
**Round**: 2 - scoped
**Verifier**: sub-agente independente (autor != verificador)

## Resumo

- 29 de 29 checks provados como escritos em `eddce79`. Cada prova nomeada existe, rodou e passou.
- A lacuna que reprovou a rodada 1 está fechada. O C28 falha quando a página deixa de aplicar a
  força do poço (razão 1,009 contra a barra de 1,5). O C29 falha quando a subida corre durante a
  ausência (13% contra a barra de 3%).
- O FAIL desta rodada vem de uma decisão do `Landing`. Ela contradiz uma frase explícita da
  tarefa, o registro de decisão: `INTENSITY` passou de 160 para 320 cd
  (`components/organisms/hero/black-hole-mesh.tsx:30`). A tarefa diz, em
  `.tasks/portfolio-lp-black-hole-scale.md:93`: "A intensidade continua a de hoje." Ela também
  diz (`:157`): "If a linked document diverges, ask before building." O usuário não foi
  consultado. Além disso, a medição que justifica a mudança não se reproduziu de forma
  consistente (lacuna 1).

## Checks

### Provas rodadas · verified at `eddce79`

- Unidade: `npm test` deu 58 passed e 0 failed. Os 15 testes de unidade nomeados no checklist
  aparecem um a um com ✔.
- E2E: uma única invocação,
  `npx playwright test e2e/black-hole.spec.ts e2e/hero-grid.spec.ts e2e/offscreen.spec.ts e2e/hero.spec.ts -g "<23 nomes>"`.
  Resultado: 24 passed (as duas variantes de C26), exit 0, em 4,2 min. O C28 levou 1,2 min.
  - A alternação inclui os 21 nomes das provas e os dois testes de barra rebaixada ("lines far
    from the pointer and the black hole stay straight" e "cells at the middle…").
  - Inclui também "the black hole lights the logo's facing side".
- O diff do spec tocou "the black hole is drawn in cool blues only" (`black-hole.spec.ts:339`).
  Rodado à parte: 1 passed, exit 0.
- `git diff --exit-code d58349e -- package.json` deu exit 0.

### Checks no escopo da rodada 2 (verified at `eddce79`)

| Check | Afirmação                                                                                            | Prova rodada                                                                     | Evidência                                                                                                                                                                                                                                                                   | Resultado |
| ----- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| C28   | na página, em movimento, a profundidade na subida 0 é ≥ 1,5 × a da subida 1                          | e2e "the well weakens as the black hole rises" ✓ (1,2 min)                       | `e2e/hero-grid.spec.ts:749-752` - `expect(low / high, …).toBeGreaterThanOrEqual(RISEN_RATIO)`, `RISEN_RATIO = 1.5` (`:45`); `:731` - `samples.length >= RISE_SAMPLES - 3` (27 amostras a 500 ms, `:46-47`); profundidade = `(end.y - row) / sinkScaleAt(row, 900)` (`:745`) | PASS      |
| C29   | ao voltar, o tamanho para a profundidade muda ≤ 3%                                                   | e2e "the black hole resumes where it stopped" ✓                                  | `e2e/offscreen.spec.ts:192-195` - `abs(size(after) / size(before) - 1) <= RESUMED_SIZE`, `RESUMED_SIZE = 0.03` (`:28`), `size = width / sheetScaleAt(cy, 900)` (`:189-190`); ausência de `AWAY_MS = 2000` (`:29`)                                                           | PASS      |
| C23   | volta a até 12 px de onde parou (mesmo teste de C29)                                                 | o mesmo ✓                                                                        | `e2e/offscreen.spec.ts:186-188` - `hypot(after - before) <= RESUMED_PX` (12, `:24`)                                                                                                                                                                                         | PASS      |
| C12   | tamanho 0,88 → 1,12, linear, subida 1 incluída                                                       | unit "the black hole is 0.88 to 1.12 times its size as it rises" ✓               | `components/organisms/hero/black-hole.test.ts:182-185` - `for (step = 0; step <= 20; step++)`, `lift = step / 20` (chega a 1 exatamente), `abs(liftScale(lift) - expected) < 1e-9`                                                                                          | PASS      |
| C14   | força 1 → 0,5, linear, subida 1 incluída                                                             | unit "the well weakens from 1 to 0.5 as the black hole rises" ✓                  | `black-hole.test.ts:190-193` - o mesmo laço; `abs(wellStrength(lift) - expected) < 1e-9`                                                                                                                                                                                    | PASS      |
| C15   | afunda ≥ 1,8× mais na subida 0 que na 1 (mesma posição)                                              | unit ✓                                                                           | carried from `d55929a` (`grid-motion.test.ts:220`, arquivo não tocado pelo diff); a ligação com a página agora é provada por C28                                                                                                                                            | PASS      |
| C18   | movimento reduzido: ≥ 20 de 23 horizontais no poço da coluna descem > 0,1 px; a mais próxima, 60–120 | e2e "horizontals through the black hole's well sink, 60 to 120px at half lift" ✓ | `e2e/hero-grid.spec.ts:459` - `inside.length >= 20` (antes: 11); `:461` - `sink > RIM_SINK` (0,1, `:40`); `:465-466` - `nearest.sink` em `HOLE_SINK {60, 120}` (`:39`)                                                                                                      | PASS      |
| C10   | verticais dos dois lados se curvam para o buraco negro                                               | e2e "lines near the black hole bend towards it" ✓                                | citação atualizada: `e2e/hero-grid.spec.ts:403` - `>= 1` de cada lado; `:416` - `pulled > 1`; `:417` - `pulled <= HOLE_PULL + SPACING_SLACK`                                                                                                                                | PASS      |
| C25   | nenhuma linha dentro do horizonte                                                                    | e2e "no grid line inside the event horizon" ✓                                    | citação atualizada: `e2e/hero-grid.spec.ts:427` - `expect(alphaAt(grid, x, y), …).toBe(0)` para `distance < HORIZON - 1` (`:426`)                                                                                                                                           | PASS      |
| C2    | 375×667: 192 × `viewFit` × 667/900 ±10%                                                              | e2e ✓                                                                            | citação atualizada (o diff deslocou +3 linhas): `e2e/black-hole.spec.ts:402-404` - `abs(horizon.width - expected) <= expected * HORIZON_SLACK`                                                                                                                              | PASS      |
| C22   | em 4 s anda ≥ 30 px                                                                                  | e2e "the black hole wanders" ✓                                                   | citação atualizada: `e2e/black-hole.spec.ts:417` - `>= MIN_WANDER_PX` (30, `:60`)                                                                                                                                                                                           | PASS      |
| C4    | movimento da inclinação (parte de C4)                                                                | e2e "the disk's tilt changes on screen" ✓                                        | citação atualizada: `e2e/black-hole.spec.ts:490` - `>= TILT_CHANGE`; as outras seis provas de C4 ficam acima da linha 343, sem deslocamento                                                                                                                                 | PASS      |
| C13   | horizonte ÷ escala da folha varia ≥ 1,2× em 12 s                                                     | e2e "the black hole grows and shrinks as it rises" ✓                             | citação atualizada: `e2e/black-hole.spec.ts:506` - `expect(ratio, …).toBeGreaterThanOrEqual(GROWS)`                                                                                                                                                                         | PASS      |

### Checks fora do escopo · carried from `d55929a`

C1, C3, C5, C6, C7, C8, C9, C11, C16, C17, C19, C20, C21, C24, C26 e C27 têm as mesmas
evidências e as mesmas linhas do relatório da rodada 1:

- os arquivos de C5–C9, C11, C16, C17 e C19–C21 não foram tocados, exceto `black-hole.test.ts`
  nas linhas 62 e 182–193, que não deslocam C11 nem C17;
- C1 e C3 ficam acima da linha alterada em `black-hole.spec.ts`;
- `hero.spec.ts` (C26) e as provas de C24 em `offscreen.spec.ts` (`:122`, `:145`) não se
  moveram.

As provas de todos eles rodaram de novo em `eddce79` e passaram (ver "Provas rodadas").

## Os quatro julgamentos pedidos

**(a) C28 falha se a página deixar de aplicar a força? Sim.** Confirmado numa cópia descartável
(`git archive HEAD` no scratchpad, fora do repositório, porta 3200, depois apagada). Foi
injetado `strength: Math.max(1, wellStrength(lift))` em `use-hero-field.ts:97`:

| Build                 | Quadros lidos | Profundidade na subida ~0 | Na subida ~1 | Razão     | Resultado |
| --------------------- | ------------- | ------------------------- | ------------ | --------- | --------- |
| `eddce79` (sem falha) | 26 de 27      | 145,3                     | 74,3         | **1,957** | verde     |
| força fixa em 1       | 27 de 27      | 146,8                     | 145,5        | **1,009** | vermelho  |

Isso reproduz o 1,006 que o autor registrou. As amostras escolhidas são de fato os extremos: os
tamanhos ficaram entre 89,9 e 114,4, e os quadros mínimo e máximo foram os escolhidos.

**A barra de 1,5 está argumentada com honestidade e não rebaixa o critério 9.** O "1,8 na mesma
posição" continua afirmado onde a posição é controlável: o C15, nas funções puras. O C28 é a
prova de ligação, com o buraco negro em dois lugares diferentes (y 439 e 332 na execução
medida). O checklist registra a divergência no próprio C28 (`.checks/…:162-169`), e 1,5 fica a
meio caminho entre 1× (sem força) e 2× (força pela metade). O valor medido, 1,96, passa até de
1,8. Uma observação menor, que não reprova:
`traceRow(…, start, at.x - side * offset)` (`hero-grid.spec.ts:743`) termina do lado oposto do
centro em relação a `start`, então o traço atravessa o horizonte antes de ler a linha. A leitura
continua simétrica, à mesma distância do centro, e os valores medidos batem com o modelo:
168 × falloff ≈ 155 na força 1, metade na força 0,5. O comentário em `:733-735` sugere, porém,
outra intenção.

**(b) C29 prova a retomada da subida? Sim.** Mesma cópia. A subida foi tirada do relógio de
quadros (`lifted = now / 1000 - seconds` antes de `advance`), então corre durante a ausência:

| Build               | Largura antes → depois | Razão de tamanho | Resultado                                         |
| ------------------- | ---------------------- | ---------------- | ------------------------------------------------- |
| `eddce79`           | 183 → 184 px           | 1,005            | verde                                             |
| subida pelo relógio | 184 → 208 px           | 1,130            | vermelho em `offscreen.spec.ts:195` (0,13 > 0,03) |

Os 13% previstos no checklist se confirmam.

**(c) Dobrar `INTENSITY` (160 → 320) não é fiel à tarefa; é decisão do usuário.**

- Fato: `.tasks/portfolio-lp-black-hole-scale.md:93` diz "Mudar a luz que o buraco negro joga no
  `logo` com a subida. A intensidade continua a de hoje." A segunda frase fixa a intensidade
  independentemente da subida.
- Fato: o `Out of scope` do checklist (`.checks/…:17-18`) parafraseia só "luz no `logo` mudando
  com a subida" e descarta a frase sobre a intensidade. O `Landing` (`:86-91`) lê a restrição
  como "a luz não muda com a subida" e dobra a constante.
- O critério 1 dobra o horizonte. O critério 2 faz crescer o disco, o anel e os arcos. Nenhum
  dos dois fala da luz.
- O conflito é real: a prova herdada de `portfolio-lp-cosmos` 31 exige 5%
  (`LIT_SIDE = 1.05`, `black-hole.spec.ts:68`). A precedência não o resolve, e a própria tarefa
  manda perguntar.
- Fato, medido na cópia com 3 repetições de "the black hole lights the logo's facing side"
  (razão face voltada ÷ face oposta):

  | `INTENSITY` | Razões medidas      | Resultado            |
  | ----------- | ------------------- | -------------------- |
  | 160 cd      | 1,126, 1,111, 1,030 | 2 passaram, 1 falhou |
  | 320 cd      | 1,114, 1,139, 1,146 | 3 passaram           |

  Na execução com as falhas combinadas (160 cd), o teste também passou. O "só 3% mais clara" do
  `Landing` é, portanto, um resultado intermitente, não o comportamento típico em 160 cd.

- Suposição: a variação vem da pose do `logo` (o teste usa tempo real). Com n = 3, os 320 cd
  dão alguma margem a mais, mas não dobram a diferença entre as faces.
- Opinião: as saídas possíveis são três, e cabem ao usuário: ratificar 320 cd emendando a
  tarefa; voltar a 160 cd e estabilizar a prova herdada (por exemplo, fixar a pose do `logo`);
  ou renegociar a barra de 5%.

**(d) Lacunas da rodada 1:**

| #   | Lacuna da rodada 1                                   | Situação em `eddce79`                                                                                                                                                                                                                                                                                                                                          |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | força do poço sem prova na página (critérios 9 e 11) | **Fechada para o critério 9** (C28, morto pela falha). **Resíduo no critério 11:** C18 ainda aceita a força 1 sob movimento reduzido (111,9 px cabe em 60–120). Uma falha só no ramo parado (`still ? 1 : …`) passaria. A faixa 60–120 é da própria tarefa, então isso é lacuna de precisão da tarefa e não reprova. Ver lacuna 3.                             |
| 2   | `Swept` concurrency sem prova da subida              | **Fechada** (C29, morto pela falha; `Swept` agora aponta C23 e C29).                                                                                                                                                                                                                                                                                           |
| 3   | linha do `Impact` não executada                      | **Fechada**: `.tasks/portfolio-lp-gravity.md:6` e `.tasks/portfolio-lp-cosmos.md:6` trazem a nota. Resíduo menor: a nota de `gravity` diz que "o 6 ganha o fator da subida", mas não marca que os 96 px do critério 6 viram 192. O `Impact` só exigia o 4 e o 5, e o 96 → 192 está anotado em `cosmos` 28.                                                     |
| 4   | precisão de C12 e C14 (subida 1 nunca amostrada)     | **Fechada** (`black-hole.test.ts:182-183` e `:190-191`, `lift = step / 20`).                                                                                                                                                                                                                                                                                   |
| 5   | nome de teste desatualizado                          | **Fechada** (`black-hole.test.ts:62`, "the horizon is 192px …").                                                                                                                                                                                                                                                                                               |
| 6   | barras afrouxadas sem registro                       | **Fechada**: registradas no `Landing` (`.checks/…:74-81`); C18 subiu para `>= 20` (`hero-grid.spec.ts:459`); `expectStraight` `> 6` (`:223`) e "cells at the middle" `> 5` (`:349`) passaram nesta execução.                                                                                                                                                   |
| 7   | teste alterado e não rodado                          | **Fechada**: "the black hole lights the logo's facing side" passou na invocação principal, e "the black hole is drawn in cool blues only" (o teste que o diff do spec realmente tocou, `:339-357`) passou à parte. A reestruturação em `:346-356` é equivalente à asserção por pixel anterior: `b < r \|\| b < g - 2` vai para `warm`, e `warm` deve ser `[]`. |

## Lacunas, em ordem

1. **Bloqueia; decisão do usuário.** `components/organisms/hero/black-hole-mesh.tsx:30`
   (`INTENSITY = 320`) contradiz `.tasks/portfolio-lp-black-hole-scale.md:93` ("A intensidade
   continua a de hoje"). O `Out of scope` do checklist (`.checks/…:17-18`) omite essa frase. A
   justificativa do `Landing` (`:86-91`, "só 3% mais clara" a 160 cd) não se reproduziu de
   forma consistente: 2 de 3 execuções passaram a 160 cd, com razões 1,13, 1,11 e 1,03.
2. **Menor.** `e2e/hero-grid.spec.ts:743`: `at.x - side * offset` faz o traço do C28 atravessar
   o horizonte e ler a linha do lado oposto ao `start`. A medida é válida (os valores batem com o
   modelo), mas o comentário `:733-735` não descreve isso, e o traço depende de reencontrar a
   linha depois do vão de ~2 raios (`TRACE_REACH = 5`, `:285`).
3. **Precisão herdada da tarefa, não reprova.** O fator 0,75 do critério 11 continua sem prova na
   página que o distinga de 1 (`hero-grid.spec.ts:465-466`, faixa 60–120). Fechar isso pede
   mudar a faixa do critério 11, que é decisão do usuário.
4. **Menor, documental.** `.tasks/portfolio-lp-gravity.md:6` não marca que o critério 6 (96 px)
   passa a 192 px.

## Swept `existing`, relido · verified at `eddce79`

| Linha          | Restrição citada                                      | No código                                                                                                                     |
| -------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| data lifecycle | `createWander(Math.random, …)` em `use-hero-field.ts` | presente: `components/organisms/hero/use-hero-field.ts:110` - `wander = still ? null : createWander(Math.random, box, start)` |

## Fontes vinculantes

Carried from `d55929a`: o passo 1 não roda sob `light`, e o checklist não marca fonte de design
nem contrato. A tarefa foi lida como registro de decisão, e é dela a contradição da lacuna 1.

## Faltas injetadas (opcional em `light`) · verified at `eddce79`

Todas rodaram numa cópia descartável (`git archive HEAD` no scratchpad, `node_modules` copiado,
porta 3200), apagada ao final. A árvore real não foi alterada: `git status --porcelain` mostra
só este relatório, antes e depois.

| Mutação                                                   | Local                                | Prova                                                        | Morta                                 |
| --------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------ | ------------------------------------- |
| `strength` fixa em 1                                      | `use-hero-field.ts:97`               | C28                                                          | sim (1,009 < 1,5)                     |
| subida pelo relógio de quadros (corre durante a ausência) | `use-hero-field.ts:354-355` (`tick`) | C29                                                          | sim (0,130 > 0,03)                    |
| `INTENSITY` 320 → 160                                     | `black-hole-mesh.tsx:30`             | "the black hole lights the logo's facing side" (não é check) | intermitente: 1 de 4 execuções falhou |

## Gate · verified at `eddce79`

- `npm test` - 58 passed, 0 failed.
- `npx playwright test <4 arquivos> -g "<23 nomes>"` - 24 passed, 0 failed (4,2 min), exit 0.
- `npx playwright test e2e/black-hole.spec.ts -g "the black hole is drawn in cool blues only"` -
  1 passed.
- `git diff --exit-code d58349e -- package.json` - exit 0.
- `npx tsc --noEmit -p .` - sem erros.
- `npx eslint .` - sem problemas.
- `npx prettier --check .` - exit 1, só em Markdown de features anteriores (os mesmos 11 da
  rodada 1):
  - `.checks/`: `portfolio-lp-corrections.md`, `portfolio-lp-corrections.verified.md`,
    `portfolio-lp-cosmos.md`, `portfolio-lp-cosmos.verified.md`, `portfolio-lp-performance.md`,
    `portfolio-lp-performance.verified.md`, `portfolio-lp-visual.md`,
    `portfolio-lp-visual.verified.md`;
  - `.tasks/`: `portfolio-lp-corrections.md`, `portfolio-lp-cosmos.md`,
    `portfolio-lp-visual.md`.

  `.tasks/portfolio-lp-cosmos.md` foi tocado pela correção (nota no topo), mas já falhava na
  rodada 1. Nenhum arquivo próprio desta feature falha.
