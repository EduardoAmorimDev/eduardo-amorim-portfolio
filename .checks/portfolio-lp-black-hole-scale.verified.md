# Landing page do portfólio — buraco negro maior, que sobe e desce sobre a malha · Verificação

**Verdict**: PASS
**Profile**: `light` (o `AGENTS.md` do repositório não declara perfil). Rodaram: as provas, a
leitura de cada asserção em `file:line` e a releitura dos `Swept` que resolvem em `existing`.
Não rodaram por exigência do perfil: o passo 1, o join de `Coverage` e os veredictos de
`Test policy`. A injeção de falhas não é exigida em `light`. Rodou uma, numa cópia fora do
repositório, porque a prova do C28 mudou nesta rodada (abaixo).
**Diff range**: `d58349e..81a927f` (correção desta rodada: `eddce79..81a927f`)
**Round**: 3 - scoped
**Verifier**: sub-agente independente (autor != verificador)

## Resumo

- 29 de 29 checks provados em `81a927f`. Cada prova nomeada existe, rodou e passou.
- A lacuna que reprovou a rodada 2 está fechada: a tarefa emendada agora prevê a luz dobrada.
  - `.tasks/portfolio-lp-black-hole-scale.md:93-94` diz: "A intensidade não muda com a subida;
    com o dobro do tamanho, ela dobra (de 160 para 320 cd; ver Sources)".
  - `:155-159` registra a resposta do usuário, "320, dobrada".
  - O código bate com isso: `components/organisms/hero/black-hole-mesh.tsx:30`
    (`INTENSITY = 320`) e `:273` (`intensity={INTENSITY}`, constante, sem fator da subida).
  - O checklist acompanha a emenda (`Out of scope` e `Landing`, "Luz do buraco negro dobrada").
- O traço do C28 agora para do lado de onde parte e não atravessa o horizonte. A falha injetada
  (força fixa em 1) continua vermelha com o traço novo: razão 1,005 contra a barra de 1,5.
- O diff desta rodada não toca código de produção:
  `git diff --name-only eddce79..HEAD -- components lib app` sai vazio.

## Item bloqueante da rodada 2 · verified at `81a927f`

| Pergunta                                            | Resposta                    | Evidência                                                                                                   |
| --------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `INTENSITY = 320` é coerente com a tarefa emendada? | sim                         | tarefa `:93-94` (Out of scope) e `:155-159` (Sources); `black-hole-mesh.tsx:30`                             |
| A luz continua sem mudar com a subida?              | sim                         | `black-hole-mesh.tsx:273` - `intensity={INTENSITY}`, sem `lift`                                             |
| Está registrada como decisão do usuário?            | sim, no registro de decisão | tarefa `:155` - "Resposta do usuário durante o build (2026-10-28), sobre a luz no `logo`: \"320, dobrada\"" |
| O checklist diverge da tarefa?                      | não                         | `Out of scope`: "A luz dobra com o tamanho (320 cd), por decisão do usuário registrada na tarefa"           |

- Fato: as medidas que a tarefa e o `Landing` citam batem com as da rodada 2. A 160 cd, 1 de 4
  execuções falhou. A 320 cd, as razões ficaram entre 1,11 e 1,15.
- Fato: a prova herdada (`portfolio-lp-cosmos` 31), "the black hole lights the logo's facing
  side", passou nesta rodada. A asserção é `e2e/black-hole.spec.ts:383-385`,
  `expect(facing, …).toBeGreaterThan(away * LIT_SIDE)`, com `LIT_SIDE = 1.05` (`:68`).
- Limitação: o Verifier não presenciou a conversa. A decisão foi conferida pelo registro na
  tarefa, não pela fala original.
- Observação menor (lacuna 2): a data da resposta (2026-10-28) é posterior à do commit que a
  registra (`81a927f`, 2026-10-27 22:23 -0300) e à data de hoje no ambiente (2026-10-27).

## Checks

### Provas rodadas · verified at `81a927f`

- **Unidade.** `npm test`: 58 testes, 58 passed, 0 failed. Os 14 testes de unidade nomeados no
  checklist aparecem um a um com ✔ (C5–C9, C11, C12, C14–C17, C19–C21).
- **E2E.** Uma única invocação, `exit 0`, 24 passed em 3,2 min, cada teste listado com ✓:

  ```
  npx playwright test e2e/black-hole.spec.ts e2e/hero-grid.spec.ts e2e/offscreen.spec.ts e2e/hero.spec.ts -g "<23 nomes>"
  ```

  - O C28 levou 57,3 s.
  - A alternação cobre os 20 nomes de prova do checklist, mais o teste herdado da luz.
  - Cobre também os dois testes de barra rebaixada: "lines far from the pointer and the black
    hole stay straight" e "cells at the middle are 48px wide and 0.55 to 0.7 as tall".
  - C26 roda nas duas variantes, 1440x900 e 375x667.

- **Dependências.** `git diff --exit-code d58349e -- package.json`: exit 0.

### C28, a prova alterada nesta rodada · verified at `81a927f`

| Check | Afirmação                                                                   | Prova rodada                                              | Evidência                                                                                                                                                                                                                                                                       | Resultado |
| ----- | --------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| C28   | na página, em movimento, a profundidade na subida 0 é ≥ 1,5 × a da subida 1 | e2e "the well weakens as the black hole rises" ✓ (57,3 s) | `e2e/hero-grid.spec.ts:750-753` - `expect(low / high, …).toBeGreaterThanOrEqual(RISEN_RATIO)`, com `RISEN_RATIO = 1.5` (`:45`); `:731` - `samples.length >= RISE_SAMPLES - 3` (27 amostras a 500 ms, `:46-47`); profundidade = `(end.y - row) / sinkScaleAt(row, 900)` (`:746`) | PASS      |

**O traço fica do lado de onde parte.** Leitura de `e2e/hero-grid.spec.ts:739-744`:

- `side = at.x > WIDTH / 2 ? -1 : 1`.
- `start = side < 0 ? 40 : WIDTH - 40`.
- O traço vai de `start` até `at.x + side * offset`.
- Buraco negro à direita: `side = -1`. O traço parte de x = 40 e para em `at.x - offset`, à
  esquerda do centro, do mesmo lado do início.
- Buraco negro à esquerda: `side = 1`. O traço parte de x = 1400 e para em `at.x + offset`, à
  direita do centro, do mesmo lado do início.
- `traceRow` (`:293-307`) só visita colunas entre `from` e `to`. Toda coluna visitada fica, então,
  a pelo menos `offset = max(raio) + 8` px do centro na horizontal (`:737`). Nenhuma cruza o
  horizonte.
- Antes (`eddce79`), o fim era `at.x - side * offset`, e o traço passava pelo horizonte. O
  comentário `:734-736` agora descreve a intenção certa ("on the side the line is followed in
  from").

**Falha injetada com o traço novo.** Cópia descartável: `git archive HEAD` no scratchpad,
`node_modules` copiado, porta 3200. O alvo é `use-hero-field.ts:97`, que passou a
`strength: Math.max(1, wellStrength(lift))`.

| Build                 | Profundidade na subida ~0 | Na subida ~1 | Tamanhos (min, max) | Razão     | Resultado                               |
| --------------------- | ------------------------- | ------------ | ------------------- | --------- | --------------------------------------- |
| `81a927f` (sem falha) | -                         | -            | -                   | ≥ 1,5     | verde (invocação principal)             |
| força fixa em 1       | 146,77                    | 146,03       | 89,7 e 114,6        | **1,005** | vermelho em `hero-grid.spec.ts:750-753` |

A falha morre como na rodada 2 (1,009 com o traço antigo) e como o autor registrou (1,006).
A árvore real ficou intacta: `git status --porcelain` saiu vazio antes e depois da injeção.

### Checks no arquivo tocado, citações conferidas · verified at `81a927f`

O diff em `e2e/hero-grid.spec.ts` acrescenta uma linha em `:736`. Nenhuma linha acima dela se
desloca, então as citações abaixo continuam as da rodada 2, conferidas nesta rodada.

| Check | Evidência                                                                                                 | Resultado |
| ----- | --------------------------------------------------------------------------------------------------------- | --------- |
| C10   | `e2e/hero-grid.spec.ts:403`, `:416`, `:417`                                                               | PASS      |
| C25   | `e2e/hero-grid.spec.ts:427` - `toBe(0)` para `distance < HORIZON - 1` (`:426`)                            | PASS      |
| C18   | `e2e/hero-grid.spec.ts:459` (`inside.length >= 20`), `:461` (`sink > RIM_SINK`, 0,1), `:465-466` (60–120) | PASS      |

### Checks fora do escopo · carried from `eddce79`

C1–C9, C11–C17, C19–C24, C26, C27 e C29 têm as mesmas evidências e as mesmas linhas do
relatório da rodada 2:

- carried from `eddce79`: C2, C4 (movimento da inclinação), C12, C13, C14, C15, C22, C23, C29;
- carried from `d55929a`: os demais.

O diff `eddce79..HEAD` não toca nenhum dos arquivos que eles citam: `black-hole.spec.ts`,
`offscreen.spec.ts`, `hero.spec.ts` e os testes de unidade. As provas de todos rodaram de novo em
`81a927f` e passaram (ver "Provas rodadas").

## Lacunas da rodada 2

| #   | Lacuna                                                       | Situação em `81a927f`                                                                                                                 |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `INTENSITY = 320` contradizia a tarefa                       | **Fechada**: tarefa emendada (`:93-94`, `:155-159`), checklist alinhado, decisão atribuída ao usuário                                 |
| 2   | traço do C28 atravessava o horizonte                         | **Fechada**: `hero-grid.spec.ts:744` (`at.x + side * offset`) e comentário `:734-736`; falha injetada continua morta (1,005)          |
| 3   | fator 0,75 do critério 11 sem prova que o distinga de 1      | **Aberta, não reprova**: precisão herdada da tarefa (faixa 60–120 em `hero-grid.spec.ts:465-466`); mudar a faixa é decisão do usuário |
| 4   | `portfolio-lp-gravity` não marcava 96 → 192 px no critério 6 | **Fechada**: `.tasks/portfolio-lp-gravity.md:6-8`                                                                                     |

## Lacunas, em ordem

1. **Precisão herdada da tarefa, não reprova.** O fator 0,75 do critério 11 continua sem prova na
   página que o distinga de 1 (`e2e/hero-grid.spec.ts:465-466`, faixa 60–120). Uma falha só no
   ramo parado (`still ? 1 : …`) passaria. Fechar isso pede estreitar a faixa do critério 11, o
   que é decisão do usuário.
2. **Menor, documental.** `.tasks/portfolio-lp-black-hole-scale.md:155` data a resposta do
   usuário em 2026-10-28. O commit que a registra (`81a927f`) é de 2026-10-27 22:23 -0300, e a
   data de hoje no ambiente é 2026-10-27. Vale corrigir para a data real da conversa.

## Swept `existing`, relido · carried from `eddce79`

| Linha          | Restrição citada                                      | No código                                                                                     |
| -------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| data lifecycle | `createWander(Math.random, …)` em `use-hero-field.ts` | presente: `components/organisms/hero/use-hero-field.ts:110` (arquivo não tocado nesta rodada) |

## Fontes vinculantes

Carried from `eddce79`: o passo 1 não roda sob `light`, e o checklist não marca fonte de design
nem contrato. A tarefa foi relida inteira como registro de decisão. Depois da emenda, não
sobrou contradição entre ela e o checklist.

## Faltas injetadas (opcional em `light`) · verified at `81a927f`

| Mutação              | Local                  | Prova | Morta             |
| -------------------- | ---------------------- | ----- | ----------------- |
| `strength` fixa em 1 | `use-hero-field.ts:97` | C28   | sim (1,005 < 1,5) |

C29 e a luz carregam o resultado da rodada 2 (carried from `eddce79`): os arquivos deles não
mudaram.

A cópia descartável ficou em
`/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/ea2ab78c-5fa6-45d7-bfa0-e377e78912de/scratchpad/mut3`.
O hook do ambiente bloqueou o `rm` sobre ela; está fora do repositório.

## Gate · verified at `81a927f`

- `npm test` - 58 passed, 0 failed.
- `npx playwright test <4 arquivos> -g "<23 nomes>"` - 24 passed, 0 failed (3,2 min), exit 0.
- `git diff --exit-code d58349e -- package.json` - exit 0.
- `npx tsc --noEmit -p .` - sem erros.
- `npx eslint .` - sem problemas.
- `npx prettier --check .` - exit 1, só em Markdown de features anteriores (os mesmos 11 das
  rodadas 1 e 2):
  - `.checks/`: `portfolio-lp-corrections.md`, `portfolio-lp-corrections.verified.md`,
    `portfolio-lp-cosmos.md`, `portfolio-lp-cosmos.verified.md`, `portfolio-lp-performance.md`,
    `portfolio-lp-performance.verified.md`, `portfolio-lp-visual.md`,
    `portfolio-lp-visual.verified.md`;
  - `.tasks/`: `portfolio-lp-corrections.md`, `portfolio-lp-cosmos.md`,
    `portfolio-lp-visual.md`.

  Nenhum arquivo desta feature falha, nem os três que esta rodada tocou:
  `.tasks/portfolio-lp-black-hole-scale.md`, `.tasks/portfolio-lp-gravity.md` e
  `.checks/portfolio-lp-black-hole-scale.md`.
