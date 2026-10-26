# Landing page do portfólio — desempenho: verificação

**Verdict**: PASS
**Profile**: light
**Diff range**: 62045d4..f06dc6a
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Resumo: 12 de 12 checks provados em `f06dc6a`. A correção desta rodada (`1f3b89e..f06dc6a`) só
mexe no teste de C5 em `e2e/offscreen.spec.ts` e no texto e no Evidence de C5 no checklist. O
código da aplicação é o mesmo das rodadas 1 e 2. O relógio falso agora é instalado com `time` e
parado com `pauseAt` antes do `page.goto`. Com isso a captura "antes" ficou determinística:
nas 20 execuções do probe (10 em HEAD, 10 no mutante), o ponto foi o mesmo, (327,80; 108,32).
O mutante sem a restauração do relógio reprova sempre, com 27,05–27,11 px. HEAD passa 10/10,
com 2,10–2,16 px. C12 passa (`npm run test:e2e` 78/78). O gap 2 da rodada 2 (discriminação
residual de C5) foi resolvido. Restam o gap baixo de C10, inalterado, e duas ressalvas
cosméticas de texto em C5 (Gaps 2).

Escopo desta rodada: o diff da correção e os checks C5 e C12. O resto vem da rodada 2, marcado
`carried from 1f3b89e`. As provas rodaram todas de novo em HEAD, e as citações de
`e2e/offscreen.spec.ts` foram refeitas, porque a constante nova em `:23` desloca as linhas
seguintes em 1.

## Binding sources

Não roda no perfil `light`. O checklist não marca nenhuma fonte como binding.

## Checks

`verified at f06dc6a` para a coluna "Proof run": todas as provas e2e saem de uma única execução
de `npm run test:e2e` em HEAD (build novo na porta 3100), com 78 passed, 0 failed, exit 0 em
2,9 min. Cada teste citado aparece individualmente como ✓ na saída. Na coluna Evidence, o
julgamento vem da rodada indicada; as linhas citadas foram conferidas em HEAD.

| Check | Claim | Proof run (`f06dc6a`) | Evidence | Result |
|---|---|---|---|---|
| C1 | No topo, Hero > 0 e notebook 0 draw calls em 1 s | `offscreen.spec.ts:98` "only the hero draws at the top of the page" ✓ | `:102-103` - `expect(draws.hero).toBeGreaterThan(0)` · `expect(draws.notebook).toBe(0)`; `SAMPLE_MS = 1000` em `:13`. Julgamento `carried from 1f3b89e` | PASS |
| C2 | Topo do `#notebook` + 1 tela: notebook > 0, Hero 0 | `:106` "only the notebook draws while it is on screen" ✓ | `:112` - `scrollWindowTo(page, top + viewport.height)`; `:114-115`. `carried from 1f3b89e` | PASS |
| C3 | Em `#sobre` e `#faq`, nenhum canvas desenha | `:118` "no scene draws while both are off screen" ✓ | `:121-123` - `for (const section of ['#sobre', '#faq'])` … `toEqual({ hero: 0, notebook: 0 })`. `carried from 1f3b89e` | PASS |
| C4 | De `#faq` ao topo, a Hero volta a desenhar | `:127` "the hero draws again when scrolled back" ✓ | `:131` - `.hero).toBe(0)`; `:133` - `.toBeGreaterThan(0)`. `carried from 1f3b89e` | PASS |
| C5 | Depois de 2 s fora, a luz fica a ≤ 12 px de onde estava | `:136` "the hero light resumes where it stopped" ✓; 10/10 com `--repeat-each=10` | `:141` - `page.clock.install({ time: CLOCK_START })`; `:142` - `pauseAt(CLOCK_START + 100)`, antes do `goto` em `:143`; `:145` - `runFor(2000)`; `:153` - `runFor(AWAY_MS)`; `:156` - `runFor(RESUME_MS)`; `:159-161` - `expect(Math.hypot(…)).toBeLessThanOrEqual(RESUMED_PX)`; constantes em `:20-23`. Medições abaixo. `verified at f06dc6a` | PASS |
| C6 | No topo não há `iframe` nem requisição ao host do Kune | `:164` "the laptop's screen page is not loaded at the top" ✓ | `:167` - `toHaveCount(0)`; `:168` - `expect(requests).toEqual([])`; filtro por `hostname === SCREEN_HOST` em `:92`, host em `:11`. `carried from 1f3b89e` | PASS |
| C7 | Topo do `#notebook` meia tela abaixo da janela: exatamente um `iframe`, dentro de `#notebook`, com `src` do Kune, e houve requisição | `:171` "the screen page loads a screen before the notebook" ✓ | `:178` - `scrollWindowTo(page, top - viewport.height * 1.5)`; `:179` - `toHaveCount(1)`; `:180` - `toHaveAttribute('src', …)`; `:184` - `await expect.poll(() => requests.length).toBeGreaterThan(0)`. `carried from 1f3b89e` | PASS |
| C8 | Em `#faq` não há `iframe` | `:187` "the screen page unloads far past the notebook" ✓ | `:190` - pré-condição `toHaveCount(1)`; `:192` - `toHaveCount(0)`. `carried from 1f3b89e` | PASS |
| C9 | Ao fim da rolagem, a tela acende com opacidade ≥ 0,9 | `notebook.spec.ts:43` "scrolling through the notebook powers the laptop on" ✓ | `e2e/notebook.spec.ts:50-52`. Arquivo fora do diff da correção. `carried from 1f3b89e` | PASS |
| C10 | `resolution={256}`, e o piso em `notebookEnd` difere da versão 512 no máximo o ruído 512×512 + 2 níveis de média | medição pontual da rodada 1 (não refeita: nenhuma correção tocou o notebook) | `components/organisms/notebook/notebook-scene.tsx:125` - `resolution={256}`; maior média base×HEAD 0,31 contra limite 0,09 + 2. `carried from 1f3b89e` | PASS (gap baixo, Gaps 1) |
| C11 | Piso iluminado (`MIN_FLOOR_LIFT`), céu e piso ink, nos dois esquemas | `theme.spec.ts:203` "dark scheme notebook sky and floor are ink" ✓ e "light scheme notebook sky and floor are ink" ✓ | `e2e/theme.spec.ts:125-128`, `:73-76`, `:108-111`. `carried from 1f3b89e` | PASS |
| C12 | tsc, lint, `npm test` e `npm run test:e2e` passam | os quatro comandos em `f06dc6a` | tsc exit 0 · lint exit 0 · `npm test` 44/44, exit 0 · `npm run test:e2e` 78 passed, exit 0. `verified at f06dc6a` | PASS |

### C5: a primeira captura agora cai num tempo fixo? (`verified at f06dc6a`)

Sim. Conferi com um probe (`…/scratchpad/r3probe/c5-probe.spec.ts`) que repete os passos do
teste novo, na mesma ordem (`install({ time })` → `pauseAt` → `goto`), e só registra valores.
Ele rodou 10 vezes contra o `.next` de HEAD, recém-gerado pelo e2e e servido por mim na porta
3102, e 10 vezes contra o mutante na porta 3300.

- **O relógio já está parado na carga.** Depois do `networkidle`, o `Date.now()` da página é
  exatamente `CLOCK_START + 100` e o `performance.now()` falso está em 1–6 ms, nas 20
  execuções. A Hero fez 0 draw calls até o `runFor(2000)`. Portanto o `pauseAt` chamado antes
  do `goto` vale para o documento carregado, e nenhum tempo real entra na cena.
- **Primeiro frame em tempo falso fixo.** O primeiro draw call da Hero cai em 51–56 ms de
  tempo falso, já dentro do `runFor`. Antes da captura foram sempre 1139 draw calls.
- **Captura "antes" idêntica.** Nas 20 execuções, HEAD e mutante, o ponto foi o mesmo,
  (327,80; 108,32). Invertendo `light-drift.ts` (`…/scratchpad/infer.py`, erro de ajuste
  0,4 px), isso dá ≈ 1,9 s de cena, ou seja, `runFor(2000)` menos o atraso do primeiro frame.
  Na rodada 2, esse tempo variava de 2,1 a 3,5 s no mutante e de ~1,3 a ~9,3 s em HEAD.
- **Captura parada:** duas `coreCentre` seguidas deram 0,00 px nas 20 execuções.
- **Fora e na volta:** 0 draw calls da Hero durante o `runFor(2000)` em `#faq`, e 54 no
  `runFor(100)` da volta, nas 20 execuções.

### C5: separação do limite de 12 px (`verified at f06dc6a`)

| Caso | Build | Execuções | Distância medida | Resultado |
|---|---|---|---|---|
| HEAD | 3102 (probe) e 3100 (teste real, config do repositório) | 10 + 10 + 1 (gate) | 2,10–2,16 px (probe); tempo de cena depois − antes = 0,10 s | 21/21 passam |
| Mutante sem `clock.elapsedTime = elapsed` | 3300 | 10 (probe) + 5 (teste real) | 27,05–27,11 px; teste real: `Received: 27.0816…` 4× e `27.1113…` 1× | 15/15 reprovam |
| Base `62045d4` (sem `RenderGate`) | - | não refeito | 42,8–48,3 px na rodada 2 (`carried from 1f3b89e`) | - |

- O teste real em HEAD foi `npx playwright test e2e/offscreen.spec.ts -g "resumes where"
  --repeat-each=10`, com build próprio na porta 3100: 10 passed.
- O teste real contra o mutante usou a spec de HEAD com `webServer: undefined` e `baseURL`
  apontando para 3300 (`…/scratchpad/pw-r3spec-3300.config.mjs`), com `--repeat-each=5`:
  5 failed.
- O mutante está confirmado pelo bundle: o `.next` de `…/scratchpad/wt` contém
  `e.elapsedTime,r(n?"always":"never")}`, sem a atribuição de volta. O `.next` de HEAD
  contém `i=e.elapsedTime;r(n?"always":"never"),e.elapsedTime=i`.
- No mutante, o tempo de cena depois da volta é sempre 0,09–0,10 s: o relógio zera na
  retomada. Com a captura "antes" fixa em ≈ 1,9 s, a distância fica em ≈ 27 px em toda
  execução, longe das janelas de escape calculadas na rodada 2 (4,66–5,42 s e 9,71–10,51 s).
  A folga deixou de depender da velocidade da máquina.
- A variação que sobra (0,06 px) vem do primeiro frame cair entre 51 e 56 ms. Isso é muito
  menor que a margem: 9,8 px acima do pior HEAD e 15 px abaixo do melhor mutante.
- O código da aplicação em `f06dc6a` é igual ao de `03b7777`, porque as duas correções só
  tocaram a spec e o checklist.

### Discriminação contra a base (rodada 1)

`carried from 1f3b89e`. C5 foi medido na base na rodada 2 (5/5 reprovam). 7 de 8 testes de
`offscreen.spec.ts` reprovam na base; C7 passa porque na base o iframe existe sempre.

### `RenderGate` comparado ao código-fonte do R3F

`carried from 1f3b89e`. Nenhuma correção tocou `components/atoms/render-gate/render-gate.tsx`
(gate em `:19-27`).

### Testes da Handoff ("superseded")

`carried from 1f3b89e`. `e2e/hero.spec.ts` e `e2e/page-helpers.ts` não mudaram.

## Swept (linhas "existing")

`carried from 1f3b89e`. Nenhum arquivo citado mudou na correção.

| Row | Constraint cited | In code |
|---|---|---|
| failure modes: lote vazio do `IntersectionObserver` | guard em `entries.at(-1)` | sim - `lib/use-near-viewport.ts:21-22` |
| concurrency: `useFrame` protegido por `if (page.current)` | guard no laptop | sim - `components/organisms/notebook/laptop.tsx:151` |
| external-dependency failure (existing) | site fora do ar deixa a tela preta | sim - iframe condicional (`laptop.tsx:187`, `screenUrl &&`) |

## Faults injected

Não roda no perfil `light`. Fora do protocolo, para julgar C5, rodei o mutante pronto em 3300
(tabela acima). A base não foi reconstruída nesta rodada.

## Constituição (diff da correção `1f3b89e..f06dc6a`, `verified at f06dc6a`)

- **III** (sem casts nem supressões): nada. Fiz grep nas linhas adicionadas por ` as `,
  `@ts-`, `eslint-disable`, `!.` e `!)`. `CLOCK_START` é um `number` vindo de `Date.UTC`, sem
  asserção.
- **XIII** (comentários): o bloco em `:137-140` tem 4 linhas, em inglês. Ele abre com `why:` e
  tem um segundo `why:` interno, o que é permitido. Nenhuma linha narra o código. A ressalva da
  rodada 2 sobre "10-20 px" foi corrigida: agora diz "6-15 px", compatível com os 5,8–13,2 px
  medidos na rodada 1. O comentário removido ("an installed clock still flows in real time
  until paused") descrevia o código antigo, então saiu com razão. Há uma ressalva de conteúdo,
  cosmética: o comentário e o checklist dizem "the same 2 s of animation", mas o tempo de cena
  inferido é ≈ 1,9 s (Gaps 2).
- **XIV** (sem saída de debug): nenhum `console.*` nem `debugger` nas linhas adicionadas.
- **VI** (sem rede real): a spec continua importando `test` de `./fixtures` (`:2`), que aborta
  todo host externo. As linhas novas não fazem requisição.
- Para o resto do range `62045d4..1f3b89e`: `carried from 1f3b89e`, sem violações.

## Gaps (ranked)

1. **C10, gap de precisão (baixo, `carried from 1f3b89e`).** Nenhuma correção tocou C10.
   - A tolerância "+2 níveis de média" é frouxa e não limita o máximo por pixel.
   - O resultado se sustenta mesmo assim: máximo medido de 1,7 nível.
   - Nenhum teste versionado impede a volta para 512, o que o checklist já declara.
2. **C5, texto um pouco mais forte que a medição (cosmético, não bloqueia).**
   - O Evidence "Rodada 3" diz que o mutante reprova "com o mesmo valor, 27,08 px". Na prática
     variou de 27,05 a 27,11 px: 4 de 5 execuções deram 27,08 e 1 deu 27,11 no teste real.
   - O comentário em `:139-140` e o Evidence dizem que a captura cai "em 2 s de animação". O
     tempo de cena inferido é ≈ 1,9 s, porque o primeiro frame só acontece cerca de 50 ms
     depois do início do `runFor`. Ele é fixo, que é o que importa.
   - Nenhum dos dois afeta o veredicto.
3. **C5, discriminação residual da rodada 2: resolvida.** O relógio fica parado desde antes da
   carga, e a captura "antes" foi idêntica em 20 de 20 execuções. O mutante reprova sempre com
   ≈ 27 px. A folga contra o mutante deixou de depender do tempo real.

## Gate (`verified at f06dc6a`)

- `npx tsc --noEmit`: exit 0
- `npm run lint`: exit 0
- `npm test`: 44 passed, 0 failed
- `npm run test:e2e`: 78 passed, 0 failed, exit 0 (2,9 min)
- Extra: `npx playwright test e2e/offscreen.spec.ts -g "resumes where" --repeat-each=10`:
  10 passed

## O que esta verificação fez fora do repositório

- Arquivos temporários em
  `/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/bc062844-dcee-44af-be67-4488b7714b40/scratchpad/`:
  `r3probe/`, `pw-r3-3102.config.mjs`, `pw-r3-3300.config.mjs`, `pw-r3spec-3300.config.mjs`,
  `r3-probe-head.txt`, `r3-probe-mutant.txt`, `r3-mutant-real.txt`, `r3-head-real.txt`,
  `e2e-r3.log`, `next3102-r3.log`.
- Reusei o servidor do mutante em 3300, sem mexer em `wt`.
- Subi `next start` em 3102 a partir do `.next` de HEAD, só para o probe, e encerrei depois.
- Não houve `git stash` nem mudança na árvore real além deste arquivo.
