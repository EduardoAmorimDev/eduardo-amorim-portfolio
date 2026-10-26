# Landing page do portfólio — correções visuais · Verificação

**Verdict**: PASS (53/53 checks provados)
**Profile**: light (o `AGENTS.md` do repositório não declara perfil)
**Diff range**: `cb1895a..bf9d43a` (feature inteira); correção desta rodada: `332a61e..bf9d43a`
(um commit, `bf9d43a`, confirmado com `git log --oneline 332a61e..HEAD` e `git rev-parse HEAD`)
**Round**: 2 - scoped
**Verifier**: sub-agente independente (author != verifier), somente leitura

Passos que não rodam no perfil `light`, por regra e não por esquecimento: comparação com fontes
binding (passo 1, só `ui`), join de `Coverage`, linhas de `Test policy` e injeção de falhas
(passo 4, só `standard`/`ui`).

Escopo da rodada 2, conforme "Re-verifying after a fix": todas as provas rodadas de novo em
`bf9d43a`; reavaliados os veredictos que não eram PASS (C22, precisão de C30, lista do Handoff,
comentário de `light-drift.ts`); citações atualizadas só nos arquivos que a correção tocou
(`e2e/theme.spec.ts`, `e2e/glitch.spec.ts`, `lib/glitch.test.ts`,
`components/organisms/hero/light-drift.ts`, `.checks/portfolio-lp-corrections.md`). Tudo o que
está marcado `carried from 332a61e` foi herdado do relatório da rodada 1 sem reler a evidência.

O diff da correção só mexe em testes, em uma linha de comentário e no checklist. Nenhum arquivo
de produção mudou (`git diff --stat 332a61e..HEAD -- lib/glitch.ts components/ app/` traz só o
comentário de `light-drift.ts`), então nenhum check fora dos arquivos tocados pode ter mudado de
comportamento.

## Binding sources

`carried from 332a61e`. O checklist declara "Não há design binding". O passo 1 não se aplica, e a
correção não tocou interface.

## Reavaliação dos achados da rodada 1 (verified at bf9d43a)

### C22: piso começa iluminado e se dissolve em `ink`, sem borda. Agora PASS

Asserção nova em `e2e/theme.spec.ts:125-128`, dentro de `expectInkFloor`, chamada pelo teste
`${scheme} scheme notebook sky and floor are ink` (`:203`, `:209`):

```ts
expect(
  near - relativeLuminance(background),
  `near floor is lit: ${near.toFixed(4)}`
).toBeGreaterThanOrEqual(MIN_FLOOR_LIFT)
```

O limite fica legível junto da asserção: `MIN_FLOOR_LIFT = 0.005` (`:30`). `near` é a luminância
média da faixa inferior de 10 % da tela, em toda a largura (`:115-120`). As outras três asserções
continuam: degrau ≤ `MAX_STEP` entre pixels vizinhos (`:96-99`), piso distante a ≤ 3 por canal de
`ink` (`:107-111`) e `|near − L(ink)| < |near − L(white)|` (`:121-124`).

**A asserção distingue de fato um piso iluminado de um piso `ink` sem luz?** Para responder, medi
a mesma métrica (mesma faixa, mesma fórmula de luminância WCAG, `ink` = `rgb(16, 17, 19)`) no build
de produção de `bf9d43a`. Desliguei as luzes em tempo de execução, pelo gancho
`__THREE_DEVTOOLS__` do three.js, sem alterar nenhum arquivo-fonte. O script ficou só no
scratchpad. Rodei em 1440×900, esquema escuro, no mesmo ponto de rolagem de `gotoNotebook` e com
os mesmos flags de GPU do `playwright.config.ts`.

| Cena | `near` | `near − L(ink)` | Passa em `>= 0.005`? |
|---|---|---|---|
| intacta (duas vezes, idêntica) | 0,01611 | +0,01053 | sim |
| um holofote desligado (`primary`, `#3f30f1`) | 0,01411 | +0,00853 | sim |
| os dois holofotes desligados (ambiente ligado) | 0,00157 | −0,00401 | **não** |
| holofotes e ambiente desligados | 0,00000 | −0,00558 | **não** |
| piso oculto (só o fundo `ink` da página) | 0,00508 | −0,00050 | **não** |

Conclusão: a asserção reprova os dois cenários que a rodada 1 apontou, o piso inteiro em `ink`
(piso oculto) e o piso sem holofotes, e passa a cena atual com margem de cerca de 2×
(0,0105 contra 0,005). O número do Handoff ("~0,016 contra ~0,0056") bate com a medição. Assim,
"começa iluminado" fica provado. **C22: PASS.**

Duas observações, sem peso de FAIL:
- A asserção prova "iluminado", não "dois holofotes": com um holofote desligado ela ainda passa.
  O C22 não promete dois holofotes, mas T12 (`.tasks/portfolio-lp-corrections.md:65-67`) diz "a
  cena mantém o piso, os dois holofotes e a sombra de contato". Nenhum check cobre a contagem de
  holofotes nem a sombra de contato. É lacuna de cobertura do checklist, já existente na rodada 1
  e não introduzida pela correção. No perfil `light` não há join de `Coverage` que a transforme
  em FAIL.
- A margem depende do renderizador: os valores vêm de ANGLE/GL nesta máquina. Em SwiftShader ou
  com outro tone mapping, a folga de 2× pode encolher. Não é defeito, mas é ponto a observar se o
  teste ficar instável em CI.

### C30: deslocamento entre 1 e 8 px. Lacuna de precisão fechada, PASS

- Unitário, `lib/glitch.test.ts:31` "every copy is cut into three bands and shifted between 1
  and 8px": `:35` `assert.ok(Math.abs(copy.x) >= MIN_SHIFT_PX, ...)` com `MIN_SHIFT_PX = 1`
  (`:10`), e `:36` `assert.ok(Math.abs(copy.x) <= MAX_SHIFT_PX, ...)` com `MAX_SHIFT_PX = 8`
  (`:11`), para as duas cópias de cada um dos 6 quadros com cópias (`:32-34`). Um deslocamento
  subpixel (0 < |x| < 1) agora reprova. Antes, `x !== 0` aceitava esse caso.
- E2e, `e2e/glitch.spec.ts:109` "a burst shows a primary and a mist copy, shifted at most 8px and
  cut in three bands": `:163` `const x = Math.abs(Number(shift?.[1]))`; `:164`
  `expect(x).toBeGreaterThanOrEqual(MIN_SHIFT_PX)` com `MIN_SHIFT_PX = 1` (`:6`); `:165`
  `expect(x).toBeLessThanOrEqual(MAX_SHIFT_PX)` (`:7`, 8). O `x` é o valor absoluto do
  `translateX` lido de `matrix(1, 0, 0, 1, x, 0)` (`:161-162`), então 0,5 px reprova.
- Valores reais de `BURST` (`lib/glitch.ts:49-90`): ±2 a ±8 px inteiros, dentro dos limites.
- Ressalva herdada: o e2e mede só o primeiro quadro de uma rajada num título. A faixa vale para
  todos os quadros pelo unitário. O título do teste e2e ainda diz "at most 8px", mas coincide com
  o nome de prova do checklist (`.checks/portfolio-lp-corrections.md:167`), então a prova resolve.

### Handoff: lista de testes substituídos. Agora completa

Recalculei os títulos de `test(...)` em `e2e/*.ts` e `*.test.ts` em `cb1895a` e em `HEAD`
(`git grep` + `comm` com `LC_ALL=C`). Há 30 títulos na base que não existem em HEAD, e todos os
30 constam de `.checks/portfolio-lp-corrections.md:270-299`: os 19 da lista original mais os 11
acrescentados na rodada 2 (`:286-299`). Os dois testes de FAQ movidos ("faq shows five closed
questions", "faq question opens and closes") existem em HEAD com o mesmo título e estão listados
como movidos. Nenhum teste sumiu sem registro.

Detalhe de rastreabilidade, não lacuna: o Handoff mapeia "frames with copies show one copy each
side" para C29, mas o que esse teste afirmava (duas cópias por quadro) hoje está em
`lib/glitch.test.ts:33` `assert.equal(frame.copies?.length, 2, ...)`, que pertence a C30. A
rodada 1 tinha apontado C30.

### Comentário de `light-drift.ts`. Corrigido

`components/organisms/hero/light-drift.ts:2` agora diz "task T8 allows 40". O limite de 40 px é
o critério 8 da tarefa (`.tasks/portfolio-lp-corrections.md:51-53`: "sempre a até 40 px do ponto
de repouso"). O bloco continua com 4 linhas, em inglês, abrindo com `why:`. O único comentário
novo do diff, `e2e/theme.spec.ts:28-29`, também segue a regra: `why:`, 2 linhas, em inglês.

## Checks

Provas rodadas em HEAD `bf9d43a` (verified at bf9d43a): uma invocação Playwright
(`npx playwright test --reporter=list`, build de produção servido na porta 3100, **70 passed**,
exit 0, 3,0 min) e `npm test` (`node --test`, **44 pass, 0 fail**). Cada teste nomeado aparece
individualmente como `✓`/`✔` na saída; nenhum filtro casou com zero testes. Linhas de evidência:
atualizadas nos arquivos tocados (`e2e/theme.spec.ts`, `e2e/glitch.spec.ts`,
`lib/glitch.test.ts`); nos demais, `carried from 332a61e`.

| Check | Claim | Proof run (bf9d43a) | Evidence | Origem da citação | Result |
|---|---|---|---|---|---|
| C1 | dez `<section>` na ordem | "main has the ten sections in order" ✓ | `e2e/sections.spec.ts:72` - `expect(ids).toEqual(SECTION_IDS)` | carried from 332a61e | PASS |
| C2 | toda seção menos `hero`/`notebook` tem `<h2>` e lorem | "every section but hero and notebook has an h2 and lorem text" ✓ | `e2e/sections.spec.ts:83`, `:85-88` | carried from 332a61e | PASS |
| C3 | `#notebook` sem texto, `aria-label="Notebook"` | "notebook is labelled and shows no text" ✓ | `e2e/notebook.spec.ts:18`, `:20-22` | carried from 332a61e | PASS |
| C4 | `#hero` com 900 px | "hero is one screen tall" ✓ | `e2e/hero.spec.ts:13` - `expect(box?.height).toBe(900)` | carried from 332a61e | PASS |
| C5 | sem notebook em `#hero` | "hero has no laptop" ✓ | `e2e/hero.spec.ts:18` | carried from 332a61e | PASS |
| C6 | cópia da Hero inteira na 1ª tela, sobre a cena | "hero copy fits the first screen at 1440x900" e "…375x667" ✓ | `e2e/sections.spec.ts:56`, `:59`, `:60-63` | carried from 332a61e | PASS |
| C7 | CTA rola até `#contato` | "hero CTA scrolls to contato" ✓ | `e2e/sections.spec.ts:105-114` | carried from 332a61e | PASS |
| C8 | ícones = `cursor`, `atom`, `logo` | "the hero shows exactly the cursor, atom and logo icons" ✔ | `components/organisms/hero/glass-motion.test.ts:29-32` | carried from 332a61e | PASS |
| C9 | só `cursor/atom/logo.glb` | "only the cursor, atom and logo models are loaded" ✓ | `e2e/hero.spec.ts:38` | carried from 332a61e | PASS |
| C10 | `MOTION`/`ORBIT` inalterados; hover inclina e cresce | "motion and orbit constants keep their values" ✔ e mais 2 ✔ | `glass-motion.test.ts:38-47`, `:66-68`, `:96` | carried from 332a61e | PASS |
| C11 | malha 48 px, curva ≤ 12 px até 160 px etc. | testes de `e2e/hero-grid.spec.ts` ✓ | `e2e/hero-grid.spec.ts:96`, `:124`, `:142`, `:154-156`, `:216-217` | carried from 332a61e | PASS |
| C12 | malha só na caixa de `#hero` | "the hero grid covers the hero and nothing else" ✓ | `e2e/hero.spec.ts:44`, `:49-50` | carried from 332a61e | PASS |
| C13 | nenhum fundo de linhas fora de `#hero` | `glitch.spec.ts:265` "no section but the hero has a grid" ✓ | `e2e/glitch.spec.ts:267` - `sections-grid` `toHaveCount(0)`; `:279` - `expect(lined).toEqual([])` | verified at bf9d43a | PASS |
| C14 | brilho radial `primary` e `steel`, desfocado | `glitch.spec.ts:282` ✓ | `e2e/glitch.spec.ts:287` - `toHaveCount(4)`; `:305` - `blocks).toHaveLength(2)`; `:312` - `toMatch(/^radial-gradient\(/)`; `:314` - blur `toBeGreaterThan(0)` | verified at bf9d43a | PASS |
| C15 | núcleo ≥ 0,9 no alto à esquerda, halo 0,15–0,9 | "a glowing light core with a halo sits at the top left of the hero" ✓ | `e2e/hero-light.spec.ts:31`, `:38-43` | carried from 332a61e | PASS |
| C16 | ≤ 40 px do repouso; 2 s → ≥ 2 px | "the light drifts slowly near its rest point" ✓; 3 testes de `light-drift.test.ts` ✔ | `e2e/hero-light.spec.ts:62-64`, `:67-70`; `light-drift.test.ts:18`, `:25` | carried from 332a61e | PASS |
| C17 | reduced motion: ≤ 1 px em 2 s | "the light holds still under reduced motion" ✓ | `e2e/reduced-motion.spec.ts:149-151` | carried from 332a61e | PASS |
| C18 | `#notebook` sem núcleo nem halo | "the notebook shows no light core or halo" ✓ | `e2e/hero-light.spec.ts:81` | carried from 332a61e | PASS |
| C19 | 3 telas; canvas preso | "notebook is three screens tall and holds its scene" ✓ | `e2e/notebook.spec.ts:30`, `:40` | carried from 332a61e | PASS |
| C20 | tela apagada no topo, ligada no fim | "scrolling through the notebook powers the laptop on" ✓ | `e2e/notebook.spec.ts:47`, `:50-52` | carried from 332a61e | PASS |
| C21 | nada flutua sobre `#notebook` | "nothing floats over the notebook" ✓ | `e2e/notebook.spec.ts:62-65`, `:86` | carried from 332a61e | PASS |
| C22 | piso começa iluminado e se dissolve em `ink`, sem borda | `theme.spec.ts:203` "dark scheme notebook sky and floor are ink" ✓ | `e2e/theme.spec.ts:96-99` - degrau `<= MAX_STEP`; `:107-111` - piso distante `channelGap <= SKY_SLACK`; `:125-128` - `near - relativeLuminance(background) >= MIN_FLOOR_LIFT` (0,005, `:30`); discriminação medida (tabela acima) | verified at bf9d43a | **PASS** (era GAP) |
| C23 | reduced motion: notebook liga no fim | "laptop still opens with the scroll under reduced motion" ✓ | `e2e/reduced-motion.spec.ts:159-167` | carried from 332a61e | PASS |
| C24 | camadas a 0,2×, 0,5×, 1,3× | "layers move at 0.2x, 0.5x and 1.3x of the scroll" ✓ | `e2e/parallax.spec.ts:54-57` | carried from 332a61e | PASS |
| C25 | frente: barras desfocadas nas bordas | "front layer is blurred code bars near the side edges" ✓ | `e2e/parallax.spec.ts:96`, `:99-104` | carried from 332a61e | PASS |
| C26 | meio: octaedro e cubo brilhantes | "middle layer has a glowing octahedron and rounded cube" ✓ | `e2e/parallax.spec.ts:115`, `:120-123` | carried from 332a61e | PASS |
| C27 | reduced motion: camadas paradas | "parallax layers stay put under reduced motion" ✓ | `e2e/reduced-motion.spec.ts:136-139` | carried from 332a61e | PASS |
| C28 | entrada ou hover → uma rajada ≤ 600 ms | `glitch.spec.ts:67` e `:82` ✓ | `e2e/glitch.spec.ts:47` - `bursts).toHaveLength(1)`; `:51` - `burst.end - burst.start <= MAX_BURST_MS` | verified at bf9d43a | PASS |
| C29 | 6 quadros com cópias + 1 limpo | `lib/glitch.test.ts:16` ✔; `glitch.spec.ts:231` "a burst paints six frames of copies" ✓ | `lib/glitch.test.ts:17-18` - `withCopies.length === FRAMES_WITH_COPIES`, `BURST.length === FRAMES_WITH_COPIES + 1`; `:22-23` - último `copies === null`, `last.at <= MAX_BURST_MS`; `e2e/glitch.spec.ts:238` - `distinct.size === FRAMES_WITH_COPIES` | verified at bf9d43a | PASS |
| C30 | cópia `primary` e `mist`, 3 faixas, 1–8 px | `lib/glitch.test.ts:31` ✔; `glitch.spec.ts:109` ✓ | `lib/glitch.test.ts:33` - 2 cópias; `:35` - `Math.abs(copy.x) >= MIN_SHIFT_PX` (1); `:36` - `<= MAX_SHIFT_PX` (8); `:37` - `bands.length === BANDS`; `e2e/glitch.spec.ts:153-155` - cores = `{primary, mist}`; `:160` - pontos do `polygon`; `:164` - `x >= MIN_SHIFT_PX`; `:165` - `x <= MAX_SHIFT_PX` | verified at bf9d43a | **PASS** (lacuna de precisão fechada) |
| C31 | texto treme ≤ 2 px; ao fim tudo em 0 | `lib/glitch.test.ts:49` ✔; `glitch.spec.ts:242` ✓ | `lib/glitch.test.ts:51` - `|shake| <= MAX_SHAKE_PX`; `:56` - último `shake === 0`; `e2e/glitch.spec.ts:259` - `|shake| <= MAX_SHAKE_PX`; `:260` - `after).toBe('none')`; `:262` - cópias `toHaveCSS('transform', 'none')` | verified at bf9d43a | PASS |
| C32 | nenhuma rajada se repete sozinha | `glitch.spec.ts:94` ✓ | `e2e/glitch.spec.ts:102` - `expect(await log.jsonValue()).toEqual([])` | verified at bf9d43a | PASS |
| C33 | gatilho durante rajada é ignorado | `lib/glitch.test.ts:77` ✔ | `lib/glitch.test.ts:80` - `requestBurst(first.history, 100) === null`; `:81` - idem em `busyUntil - 1` | verified at bf9d43a | PASS |
| C34 | gatilho logo após a rajada começa na hora | `lib/glitch.test.ts:84` ✔ | `lib/glitch.test.ts:88` - `requestBurst(first.history, now)?.start === now` com `now = busyUntil + 1` | verified at bf9d43a | PASS |
| C35 | cópias `aria-hidden`, título lido uma vez | `glitch.spec.ts:174` ✓ | `e2e/glitch.spec.ts:184` - `toHaveAttribute('aria-hidden', 'true')`; `:185` - `toHaveAccessibleName(text)` | verified at bf9d43a | PASS |
| C36 | reduced motion: nenhuma rajada | "no glitch under reduced motion" ✓ | `e2e/reduced-motion.spec.ts:75`, `:77` | carried from 332a61e | PASS |
| C37 | 5 perguntas fechadas | "faq shows five closed questions" ✓ | `e2e/faq.spec.ts:25`, `:27` | carried from 332a61e | PASS |
| C38 | hover abre | "hovering a question opens it" ✓ | `e2e/faq.spec.ts:50` | carried from 332a61e | PASS |
| C39 | sair fecha em ≤ 300 ms | "leaving an unpinned question closes it within 300ms" ✓ | `e2e/faq.spec.ts:79-80` | carried from 332a61e | PASS |
| C40 | clique fixa | "clicking a question keeps it open after the pointer leaves" ✓ | `e2e/faq.spec.ts:95` | carried from 332a61e | PASS |
| C41 | clique na fixada fecha | "clicking a pinned question closes it" ✓ | `e2e/faq.spec.ts:109` | carried from 332a61e | PASS |
| C42 | hover em outra mantém a fixada | "hovering another question keeps the pinned one open" ✓ | `e2e/faq.spec.ts:123`, `:125` | carried from 332a61e | PASS |
| C43 | Enter abre e fixa; Espaço fecha | "Enter and Space toggle a question from the keyboard" ✓ | `e2e/faq.spec.ts:138`, `:140` | carried from 332a61e | PASS |
| C44 | `expanded` na árvore de acessibilidade | "a question exposes whether it is expanded" ✓ | `e2e/faq.spec.ts:168`, `:172` | carried from 332a61e | PASS |
| C45 | toque alterna sem hover | "a tap toggles a question without hover" ✓ | `e2e/faq.spec.ts:183`, `:185`, `:187` | carried from 332a61e | PASS |
| C46 | fundo `ink`, texto `mist` nos dois esquemas | `theme.spec.ts:164` (dark e light) ✓ | `e2e/theme.spec.ts:56` - 10 seções; `:58` - `background === THEME.background` (`rgb(16, 17, 19)`, `:17`); `:59` - `text === THEME.text` (`rgb(242, 247, 255)`, `:18`) | verified at bf9d43a | PASS |
| C47 | cópias `primary` e `mist` nos dois | `theme.spec.ts:169` (dark e light) ✓ | `e2e/theme.spec.ts:178` - 9 títulos; `:181` - `new Set(copies)).toEqual(expected)` | verified at bf9d43a | PASS |
| C48 | malha da Hero em `mist` nos dois | `theme.spec.ts:185` (dark e light) ✓ | `e2e/theme.spec.ts:187-189` - `gridInk(...)).toEqual([mist])` | verified at bf9d43a | PASS |
| C49 | `color-scheme` = `dark` | `theme.spec.ts:192` (dark e light) ✓ | `e2e/theme.spec.ts:196-200` - `colorScheme).toBe('dark')` | verified at bf9d43a | PASS |
| C50 | `light`: céu e piso do notebook em `ink` | `theme.spec.ts:203` "light scheme notebook sky and floor are ink" ✓ | `e2e/theme.spec.ts:73-76` - céu `channelGap <= SKY_SLACK`; `:107-111` - piso distante `<= SKY_SLACK`; também passa por `:125-128` | verified at bf9d43a | PASS |
| C51 | trocar o esquema não muda cor | `theme.spec.ts:217` ✓ | `e2e/theme.spec.ts:226` - `expect(await paintedColours(page)).toEqual(before)` | verified at bf9d43a | PASS |
| C52 | 375×667 sem rolagem horizontal | "no horizontal scroll at 375px" ✓ | `e2e/sections.spec.ts:224-227` | carried from 332a61e | PASS |
| C53 | tipos, lint, testes | ver Gate | exit 0 nos quatro comandos em `bf9d43a` | verified at bf9d43a | PASS |

## Notas sobre asserções

`carried from 332a61e`, porque a correção não tocou o que elas descrevem: nota 1
(`hero-grid.spec.ts`, `inScene`), nota 3 (C16, tempo da página e geometria copiada em
`light-drift.test.ts:7`), nota 4 (C24/C26/C27 medem só o primeiro bloco), nota 5 (C21 depende de
`overflow-clip` sem asserção), nota 6 (o e2e de C29 conta estados distintos) e nota 8 (C39,
tempo da página). As notas 2 (Handoff) e 7 (precisão de C30) foram resolvidas nesta rodada; ver
a seção de reavaliação.

## Regra de comentários (constituição do repositório)

Rodada 1 (`cb1895a..332a61e`, 123 blocos conformes): `carried from 332a61e`. Rodada 2 (verified at
bf9d43a): o diff `332a61e..HEAD` acrescenta um bloco (`e2e/theme.spec.ts:28-29`, `why:`, 2
linhas, inglês) e altera uma linha de outro (`components/organisms/hero/light-drift.ts:1-4`,
`why:`, 4 linhas, agora com "task T8"). Os dois estão conformes.

## Swept (linhas `existing` contra o código)

`carried from 332a61e`. A correção não tocou `laptop.tsx`, `notebook-scene.tsx` nem
`e2e/fixtures.ts`.

## Test policy rows

Não se aplica: o perfil é `light` e o checklist não tem seção `Test policy`.

## Faults injected

Não se aplica (perfil `light`). A medição de discriminação de C22 descrita acima foi feita a
pedido do orquestrador, em tempo de execução, sobre o build de `bf9d43a`, sem alterar nenhum
arquivo-fonte. Não substitui o passo 4.

## Gate (verified at bf9d43a)

- `npx tsc --noEmit` - exit 0
- `npm run lint` - exit 0
- `npm test` - 44 pass, 0 fail
- `npx playwright test --reporter=list` (build de produção na porta 3100) - 70 passed, 0 failed,
  3,0 min, exit 0
- A medição de C22 usou um `next start` próprio na porta 3101, encerrado ao fim. As portas 3100 e
  3101 estão livres. O `next dev` do usuário na porta 3000 não foi tocado.
- `git status --porcelain` ao fim: apenas `?? .checks/portfolio-lp-corrections.verified.md`

## Gaps (por prioridade)

Nenhum que reprove. Observações sem peso de FAIL no perfil `light`:

1. **T12 não está todo coberto por checks**: "os dois holofotes e a sombra de contato" não têm
   prova. O C22 prova o piso iluminado, mas passa com um holofote só (+0,00853). Lacuna do
   checklist, não da correção.
2. **Margem de C22 depende do renderizador** (≈ 2× em ANGLE/GL). Vale observar em CI com
   SwiftShader.
3. Herdadas da rodada 1: C24/C26/C27 medem só o bloco antes de `#notebook`; C21 depende de um
   `overflow-clip` não afirmado; o e2e de C29 conta estados distintos, não quadros; a conversão
   px/unidade de C16 no unitário usa geometria copiada.
4. Rastreabilidade: o Handoff mapeia "frames with copies show one copy each side" para C29; o
   conteúdo pertence a C30.
