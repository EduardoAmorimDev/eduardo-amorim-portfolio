# Landing page do portfólio — celular fluido: verificação

**Verdict**: FAIL
**Profile**: light (o `AGENTS.md` do repositório não declara perfil)
**Diff range**: 96b0c93..0843e32 (`perf/landing/mobile-smooth`)
**Round**: 1 - full
**Verifier**: sub-agente independente (autor != verificador), somente leitura

Passos executados: 2 (rodar as provas), 3 (asserção, não presença; releitura das linhas `Swept`
"existing") e 5 (relatório). Não executados por perfil `light`: passo 1 (sem fonte vinculante de
interface: a task não marca design nem contrato como binding), recálculo do `Coverage`, veredito
de `Test policy` (o checklist não tem a seção) e injeção de falhas.

Ambiente: as provas rodaram na árvore de trabalho, que tem alterações não commitadas de favicon
(`app/layout.tsx`, `next.config.ts`, `e2e/favicon.spec.ts`, `public/favicon*`), fora desta
feature. O diff delas só troca os metadados do ícone e remove um rewrite de `/favicon.ico`; não
toca nenhum código exercitado pelas provas abaixo. Nada foi alterado, guardado ou revertido; o
`git status --porcelain` ao fim é igual ao do início.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
|---|---|---|---|
| nenhuma marcada como binding | - | passo 1 não se aplica (perfil `light`) | - |

A task (`.tasks/portfolio-lp-mobile-smooth.md`) foi lida para julgar a fidelidade dos checks aos
critérios; os achados sobre isso estão em cada linha e em "Achados".

## Checks

| Check | Claim | Proof run | Evidence | Result |
|---|---|---|---|---|
| C1 | celular, CPU 6×, hero parada: ≥ 58 FPS e ≥ 58 desenhos/s, com e sem leve | `playwright test e2e/performance.spec.ts -g "draws every frame\|..."` - `hero at rest draws every frame, full` ✓ e `, lite` ✓ | `e2e/performance.spec.ts:314` - `expect(median('fps'), …).toBeGreaterThanOrEqual(MIN_FPS)`; `:317` - `expect(median('draws'), …).toBeGreaterThanOrEqual(MIN_FPS)`; leve forçado em `:291` - `if (tier === 'lite') await forceLite(page)` | PASS |
| C2 | idem, rolagem da hero de 0 a 1 tela | mesma invocação - `dive through the hero draws every frame, full` ✓ e `, lite` ✓ | `e2e/performance.spec.ts:314` e `:317` (as mesmas); trecho `[0, innerHeight]` em `DRAWN_STRETCHES` | PASS |
| C3 | primeiro ecrã e mergulho não mudam | `playwright test e2e/hero.spec.ts e2e/swallow-and-copy.spec.ts …` - hero 15 ✓, swallow-and-copy 6 ✓ | suítes não tocadas pelo diff (`git diff 96b0c93..HEAD --stat -- e2e/hero.spec.ts e2e/swallow-and-copy.spec.ts` vazio) | PASS |
| C4 | celular: 6 ícones 64×64 na ordem `atom…wave`, sem `glass-shelf`, sem `/models/glass/*.glb` | `e2e/mobile.spec.ts:125` `the solution icons are drawn, with no canvas and no model` ✓ (2 execuções) | `:143` - `).toEqual(SOLUTION_MODELS)`; `:146-147` - `expect(box?.width).toBe(ICON_PX)` / `height`; `:134` - `expect(page.locator('#solucoes canvas')).toHaveCount(0)`; `:136` - `expect(requests.filter(url => url.includes('/models/glass/'))).toEqual([])` | PASS (ver achado 6) |
| C5 | ponteiro fino + leve: ícone 2D, sem `glass-shelf`, caixa no mesmo lugar ±0,5 px | `performance.spec.ts:323` `lite mode draws the solution icons flat` ✓ | leve de fato forçado: `:341` - `await forceLite(page)` (espera `data-performance === 'lite'`, `e2e/page-helpers.ts`); `:332` - 6 `data-ready` antes; `:345` - `expect(icon.locator('svg[data-flat-icon]')).toBeVisible()`; `:355` - `expect(Math.abs(box[key] - was[key]), key).toBeLessThanOrEqual(0.5)` | PASS |
| C6 | SVG de traço (`stroke-primary`, `fill-none`, `bg-primary/15`) que lembra o objeto | `mobile.spec.ts:125` ✓ (classes); screenshot `test-results/solution-icons-390.png` gerado | `e2e/mobile.spec.ts:150-152` - `toHaveClass(/stroke-primary/)`, `/fill-none/`, `/bg-primary\/15/`. "Lembra o objeto" é revisão humana: o screenshot existe (regenerado nesta verificação) e não é asserção automática | PASS (classes) · PENDENTE revisão humana |
| C7 | ≤ 60 KB de marcação, sem requisição própria | `mobile.spec.ts:125` ✓ | `:160` - `expect(bytes).toBeLessThanOrEqual(MAX_ICON_BYTES)` (soma de `outerHTML`); `:163-164` - `#solucoes img, #solucoes svg use, #solucoes svg image` `toHaveCount(0)` | PASS (ver achado 7) |
| C8 | ponteiro fino: até carregar, ou se falhar, o ícone 2D e sem `data-ready` | `reach-and-seams.spec.ts:270` `a missing model leaves the glyph` ✓ | `:276` - `expect(atom.locator('[data-glass-icon="atom"] svg')).toHaveCount(1)`; `:277-280` - `not.toHaveAttribute('data-ready', '')`; `:285` - `toHaveCount(MODELS.length - 1)` | PASS (ver achado 5) |
| C9 | ponteiro fino sem leve: vidro 3D no `GlassStage` como hoje | `cards` 2 ✓, `interaction` 4 ✓, `reach-and-seams` 25 ✓ | suítes inteiras verdes; nenhuma das três alterada pelo diff | PASS |
| C10 | celular, CPU 6×, Alcance 0→1: ≥ 58 FPS e ≥ 58 desenhos/s, com e sem leve | 1ª execução: `scroll through the Alcance draws every frame, full` ✘ (`Received: 56.19`, `Error: tier: lite`); `, lite` ✓. Re-execução isolada: `full` ✓, `lite` ✓ | `e2e/performance.spec.ts:314` - `expect(median('fps'), …).toBeGreaterThanOrEqual(MIN_FPS)` falhou com 56,19 < 58 | FAIL (instável: 1 falha em 2; ver achado 1) |
| C11 | celular por último entra só após o laptop sair; caixas nunca se cruzam | `npm test` - `the phone waits for the stage to clear when it comes last` ✓; `notebook.spec.ts:395` `the last phone never crosses the leaving laptop` ✓ | `components/organisms/notebook/stages.test.ts:68` - `assert.ok(phone.in[0] >= leaving[1], …)`; `e2e/notebook.spec.ts:412` - `if (!phone \|\| !laptop) continue` antes de `:418` - `expect(crossing, …).toBe(false)` | PARCIAL: janela provada; a asserção e2e não executa nenhuma vez em HEAD (achado 2) |
| C12 | celular em 1º: janelas de hoje | `npm test` - `the windows hold when the phone comes first` ✓ | `stages.test.ts:77-82` - `assert.deepEqual(slotOf(order, 'phone'), { in: [0, 0.14], out: [0.22, 0.32], turn: [0.15, 0.21], own: [0, 0.22] })`; `:83` - `in` do 2º `[0.22, 0.32]`; `:84` - `in` do último `[0.42, 0.52]` | PASS (o `out` do 2º não é assertado; coberto por `SLOTS[1]` inalterado no diff) |
| C13 | passagem ≤ 5% em 390×844; suítes do Alcance sem afrouxar | `notebook` 42 ✓, `mobile` 20 ✓, `reach-and-seams` 25 ✓ | `e2e/notebook.spec.ts:546` - `expect(share).toBeLessThanOrEqual(HANDOFF_MAX_SHARE)`, `:58` - `HANDOFF_MAX_SHARE = 0.05` (inalterado); caso 390×844 ✓ | PASS (alterações de teste dentro do permitido, achado 4) |
| C14 | luz do globo no leve a ±15% do completo | `you-are-here.spec.ts:259` `the globe keeps its light in lite mode` ✓ | `:263` - completo sem `data-performance="lite"`; leve via `forceLite` em `lightIn`; `:272` - `expect(Math.abs(lite - full) / full, …).toBeLessThanOrEqual(LIGHT_TOLERANCE)`, `:191` - `LIGHT_TOLERANCE = 0.15`; `reducedMotion: 'reduce'` em `:238` | PASS |
| C15 | celular, CPU 6×, **modo leve**, `#contato` parado: ≥ 58 FPS | `performance.spec.ts:164` `at 6x CPU on 390x844, the contact at rest runs at 58 fps or more` ✓ | `:183` - `expect(fps, \`tier: ${tier ?? 'full'}\`).toBeGreaterThanOrEqual(MIN_FPS)`. O teste não chama `forceLite` nem assere o nível: o leve só aparece se o nível adaptativo trocar sozinho no aquecimento de 9 s | PARCIAL: gap de precisão/nível (achado 3) |
| C16 | sem leve, bloom 0,75/0,45/0,45 e globo como hoje | `you-are-here` 8 ✓ | `components/organisms/you-are-here/you-are-here.tsx:110` - `{!lite && <Bloom strength={0.75} radius={0.45} threshold={0.45} />}` (linha de contexto, inalterada no diff); `e2e/you-are-here.spec.ts` só ganhou linhas (diff +91 −0) | PASS (valores do bloom provados por leitura de código, não por asserção) |

Contagem: 12 de 16 provados (C1–C5, C7–C9, C12–C14, C16); C6 com revisão humana pendente;
C10 instável (falhou uma vez); C11 e C15 parciais.

## Swept "existing" relidos no código

| Linha | Restrição citada | No código |
|---|---|---|
| failure modes - `useStaticPage` (vidro preto) | página que não carrega deixa o vidro preto | `lib/use-static-page.ts:45-61`: `.catch(() => undefined)` mantém `null`; usada em `handheld.tsx:132` e `laptop.tsx:151` - presente |
| state transitions - o leve não volta na visita | `performance.spec.ts`, "lite mode switches on and stays for the visit" | `e2e/performance.spec.ts:402`, executado nesta verificação ✓ - presente |

## Achados (por gravidade)

1. **C10 instável no limiar.** Na execução em lote, `on 390x844, the scroll through the Alcance
   draws every frame, full` falhou: mediana 56,19 FPS < 58 (`performance.spec.ts:314`). A
   re-execução isolada passou. Uma prova que cai 1 em 2 a ~1,8 FPS do limiar não sustenta o
   critério 9. Além disso, a mensagem `tier: lite` mostra que a variante "full" terminou em modo
   leve: o teste não mantém nem assere o nível completo, então "sem modo leve" do critério 9 não
   está garantido pela variante `full` (o mesmo vale para C1/C2 `full`).
2. **C11: a asserção e2e é vacuamente verdadeira em HEAD.** `device-carousel.tsx` torna o celular
   visível só com `phoneIn > 0` (progresso > 0,52, `ease` sobre `[0.52, 0.62]`) e o laptop só com
   `laptopOut < 1` (progresso < 0,52). As janelas são disjuntas, então em todo passo de 0,40 a
   0,64 ao menos um `shownBox` é `null` e o laço faz `continue` (`notebook.spec.ts:412`): o
   `expect` de `:418` nunca roda. O teste teria pego o código antigo (entrada em `[0.42, 0.52]`),
   mas em HEAD passa também se o seletor `[data-scaled-page]` deixar de casar. Falta assertar que
   cada aparelho foi visto em ao menos um passo. A metade "janela" do C11 está provada pelo teste
   unitário (`stages.test.ts:68`).
3. **C15 não força o modo leve.** O claim e o critério 14 dizem "modo leve"; o teste citado
   (`performance.spec.ts:164`, pré-existente e não tocado pelo diff) mede com o nível que surgir e
   só imprime o nível na mensagem de erro. É um gap de precisão (o checklist reaproveitou um teste
   do modo adaptativo) e de nível: a luz pintada em `globe-scene.tsx` só existe com `glow={lite}`,
   e nada garante que foi ela a medida. Correção esperada: uma variante com `forceLite`, como em
   `DRAWN_STRETCHES`.
4. **Testes alterados: dentro do que a task permite.** Em `e2e/mobile.spec.ts` saíram quatro
   testes do caminho de touch com `GlassShelf` (vidro rolando com o cartão, sem palco de tela
   cheia, glifo com modelo ausente no touch, canvas em repouso longe da lista), todos do caminho
   que o critério 3 substitui (critério 8 permite). Em `e2e/notebook.spec.ts` só mudou
   `the last phone comes from the depth`, de 0,45 para 0,57, que é a janela antiga de entrada do
   celular por último (critério 12 permite); o gesto (`coming.width < landed.width`, `:390`)
   continua assertado. Nenhum valor de `HANDOFF_MAX_SHARE` ou de outras suítes foi afrouxado.
5. **C8 se apoia num teste que a feature não tocou.** `reach-and-seams.spec.ts:270` assere um
   `svg` qualquer, não o ícone novo (`svg[data-flat-icon="atom"]`); passaria também com os
   glifos antigos (círculo etc.) que o critério 6 manda substituir. A troca só é visível no código
   (`solutions.tsx` usa `SOLUTION_ICONS[model]`). Gap de precisão.
6. **C4: a narrowing é fiel ao critério 3.** O critério diz "A seção não ... baixa nenhum `.glb`";
   o sujeito é a seção. `laptop.glb` é carregado por `components/organisms/notebook/laptop.tsx:320`
   (`useGLTF.preload`) no nível do módulo do Alcance, não pela Soluções. O filtro `/models/glass/`
   é até mais amplo que os seis modelos (inclui `logo.glb`). Observação menor: a parte
   `[data-testid="glass-shelf"]` `toHaveCount(0)` (`mobile.spec.ts:133`, e `performance.spec.ts:348`
   no C5) é vácua, pois `GlassShelf` não renderiza mais nenhum elemento com esse `data-testid`
   (busca em `components/` sem resultado); a ausência de canvas é provada por `#solucoes canvas`
   no C4 e não tem asserção equivalente no C5.
7. **C7: "vêm no HTML da página" não é assertado.** A prova mede a marcação no DOM e a ausência
   de `img`/`use`/`image`, mas não confere a resposta HTML do servidor nem a lista de requisições
   da seção. Gap de precisão menor.
8. **C6: revisão humana pendente.** O screenshot `test-results/solution-icons-390.png` foi
   regenerado nesta verificação (`mobile.spec.ts:167`). O verificador olhou os seis ícones (átomo
   com órbitas, tijolo, seta, bandeira, folha, onda), mas o critério 4 exige a revisão do usuário.

## Gate

- `npm test` - 62 passed, 0 failed (inclui `the phone waits for the stage to clear when it comes last` e `the windows hold when the phone comes first`)
- `npx tsc --noEmit -p .` - sem erros
- `./node_modules/.bin/eslint e2e components lib` - exit 0
- `playwright test e2e/hero.spec.ts e2e/swallow-and-copy.spec.ts e2e/mobile.spec.ts e2e/cards.spec.ts e2e/interaction.spec.ts e2e/reach-and-seams.spec.ts e2e/notebook.spec.ts e2e/you-are-here.spec.ts --reporter=list` - 122 passed, 0 failed (11,8 min)
- `playwright test e2e/performance.spec.ts -g "draws every frame|lite mode draws the solution icons flat|on 390x844, the contact at rest|lite mode drops the costly effects|lite mode switches on and stays for the visit" --reporter=list` - 9 passed, **1 failed** (`the scroll through the Alcance draws every frame, full`: 56,19 < 58)
- re-execução: `playwright test e2e/performance.spec.ts e2e/mobile.spec.ts -g "the scroll through the Alcance draws every frame|the solution icons are drawn, with no canvas" --reporter=list` - 3 passed, 0 failed
