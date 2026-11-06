# Landing page do portfólio — celular fluido: verificação

**Verdict**: PASS. São 15 de 16 checks provados em `cbed4f0`. No C6, as classes estão provadas, mas a parte "lembra o objeto" depende da revisão do usuário que o critério 4 exige.
**Profile**: light (o `AGENTS.md` do repositório não declara perfil)
**Diff range**: 0843e32..cbed4f0 (correção). A rodada 1 cobriu 96b0c93..0843e32.
**Round**: 2 - scoped
**Verifier**: sub-agente independente (autor != verificador), somente leitura

Escopo desta rodada: o diff da correção e todo veredito que não foi PASS na rodada 1. Isso inclui
C6, C10, C11 e C15, além dos gaps de precisão levantados em C4, C5, C7 e C8. O diff
`0843e32..HEAD` só toca `e2e/mobile.spec.ts`, `e2e/notebook.spec.ts`, `e2e/performance.spec.ts`,
`e2e/reach-and-seams.spec.ts` e o checklist. O comando `git diff 0843e32..HEAD --stat -- components lib app`
sai vazio, ou seja, nenhum código de produto mudou. Todas as provas rodaram de novo em `cbed4f0`.

Passos executados: 2 (todas as provas em HEAD), 3 (asserções nos arquivos tocados, com citações
atualizadas) e 5. Pelo perfil `light`, não rodaram o passo 1, o recálculo de `Coverage`, a seção de
`Test policy` (o checklist não a tem) nem a injeção de falhas.

Ambiente: a árvore tem alterações de favicon não commitadas e fora desta feature (`app/layout.tsx`,
`next.config.ts`, `e2e/favicon.spec.ts`, `public/favicon*`). Ninguém mexeu nelas. O
`git status --porcelain` depois das provas é idêntico ao de antes. O único arquivo escrito é este
relatório.

## Binding sources (carried from 0843e32)

| Source | Opened | Contradiction | Uncovered |
|---|---|---|---|
| nenhuma marcada como binding | - | o passo 1 não se aplica (perfil `light`) | - |

A task (`.tasks/portfolio-lp-mobile-smooth.md`) foi relida para os critérios 1, 9 e 14.

## Checks (verified at cbed4f0 quando o check foi rejulgado; carried from 0843e32 nos demais)

| Check | Claim | Proof run (cbed4f0) | Evidence | Result |
|---|---|---|---|---|
| C1 | celular, CPU 6×, hero parada: ≥ 58 FPS e ≥ 58 desenhos/s | `hero at rest draws every frame, as it comes` ✓ e `, lite` ✓ | `e2e/performance.spec.ts:317` - `expect(median('fps'), …).toBeGreaterThanOrEqual(MIN_FPS)`; `:320` - `expect(median('draws'), …).toBeGreaterThanOrEqual(MIN_FPS)`; leve forçado em `:293`; aquecimento em `:299` - `await warmUp(page, cdp, PHONE, range)` | PASS · verified at cbed4f0 (citações atualizadas; ver achado 2) |
| C2 | idem, rolagem da hero de 0 a 1 tela | `dive through the hero draws every frame, as it comes` ✓ e `, lite` ✓ | `performance.spec.ts:317`, `:320` | PASS · verified at cbed4f0 (achado 2) |
| C3 | primeiro ecrã e mergulho não mudam | `hero.spec.ts` e `swallow-and-copy.spec.ts` ✓ (lote de 122) | suítes não tocadas desde 96b0c93 | PASS · carried from 0843e32 (prova re-executada ✓) |
| C4 | celular: 6 ícones 64×64 na ordem `atom…wave`, sem `glass-shelf`, sem `/models/glass/*.glb` | `mobile.spec.ts:125` `the solution icons are drawn, with no canvas and no model` ✓ | `:143` - `).toEqual(SOLUTION_MODELS)`; `:146-147` - `expect(box?.width).toBe(ICON_PX)` / `height`; `:134` - `expect(page.locator('#solucoes canvas')).toHaveCount(0)`; `:136` - `expect(requests.filter(url => url.includes('/models/glass/'))).toEqual([])` | PASS · verified at cbed4f0 (o gap menor de `:133` continua; ver achado 4) |
| C5 | ponteiro fino + leve: ícone 2D, sem vidro, caixa no mesmo lugar ±0,5 px | `performance.spec.ts:355` `lite mode draws the solution icons flat` ✓ | `:383` - `expect(await stage(), 'the glass turns before lite').toBeGreaterThan(turning)`; `:384` - `forceLite`; `:388` - `expect(icon.locator('svg[data-flat-icon]')).toBeVisible()`; `:394` - `expect(await stage(), 'no glass is drawn for the icons').toBe(resting)`; `:401` - `expect(Math.abs(box[key] - was[key]), key).toBeLessThanOrEqual(0.5)` | PASS · verified at cbed4f0. O gap foi fechado: a asserção vácua `glass-shelf` saiu e entrou uma contagem de chamadas de desenho WebGL do canvas de `glass-stage`. Ela discrimina nos dois sentidos: `:383` falha se não houver canvas desenhando antes, e `:394` falha se ele continuar desenhando depois. |
| C6 | SVG de traço (`stroke-primary`, `fill-none`, `bg-primary/15`) que lembra o objeto | `mobile.spec.ts:125` ✓ | `e2e/mobile.spec.ts:150-152` - `toHaveClass(/stroke-primary/)`, `/fill-none/`, `/bg-primary\/15/`; screenshot em `:172` | classes PASS · "lembra o objeto" PENDENTE (revisão do usuário; ver achado 3) |
| C7 | ≤ 60 KB de marcação, vêm no HTML, sem requisição própria | `mobile.spec.ts:125` ✓ | `:160` - `expect(bytes).toBeLessThanOrEqual(MAX_ICON_BYTES)`; `:162-165` - `const html = await (await page.request.get('/')).text()` / `expect(html.match(/data-flat-icon="/g) ?? []).toHaveLength(SOLUTION_MODELS.length)`; `:168` - `#solucoes img, #solucoes svg use, #solucoes svg image` `toHaveCount(0)` | PASS · verified at cbed4f0. O gap foi fechado: agora há uma asserção sobre o HTML do servidor. |
| C8 | ponteiro fino: até carregar, ou se o modelo falhar, mostra o ícone 2D e não marca `data-ready` | `reach-and-seams.spec.ts:270` `a missing model leaves the glyph` ✓ | `:279-281` - `expect(atom.locator('[data-glass-icon="atom"] svg[data-flat-icon="atom"]')).toBeVisible()`; `:282-285` - `not.toHaveAttribute('data-ready', '')`; `:289-290` - `toHaveCount(MODELS.length - 1)` | PASS · verified at cbed4f0. O gap foi fechado: a prova agora exige o átomo novo e não qualquer `svg`. |
| C9 | ponteiro fino sem leve: vidro 3D no `GlassStage` como hoje | `cards`, `interaction` e `reach-and-seams` ✓ (lote de 122) | suítes inteiras verdes. O único acréscimo em `reach-and-seams` é o de C8. | PASS · carried from 0843e32 (prova re-executada ✓) |
| C10 | celular, CPU 6×, Alcance 0→1: ≥ 58 FPS e ≥ 58 desenhos/s | `scroll through the Alcance draws every frame, as it comes` ✓ e `, lite` ✓ (uma execução cada) | `performance.spec.ts:317` e `:320` | PASS nesta execução · verified at cbed4f0. A instabilidade conhecida continua em aberto (achado 1). |
| C11 | o celular, quando vem por último, só entra depois que o laptop sai; as caixas nunca se cruzam | `npm test` (`the phone waits for the stage to clear when it comes last`) ✓; `notebook.spec.ts:395` `the last phone never crosses the leaving laptop` ✓ | `components/organisms/notebook/stages.test.ts:68` - `assert.ok(phone.in[0] >= leaving[1], …)`; `e2e/notebook.spec.ts:424` - `expect(seen.phone, 'the phone came on stage').toBeGreaterThan(0)`; `:425` - `expect(seen.laptop, 'the laptop was on stage').toBeGreaterThan(0)`; `:421` - `expect(crossing, …).toBe(false)` | PASS · verified at cbed4f0. O gap foi fechado (achado 5). |
| C12 | celular em 1º: as janelas de hoje | `npm test` (`the windows hold when the phone comes first`) ✓ | `stages.test.ts:77-84` (sem alteração) | PASS · carried from 0843e32 (prova re-executada ✓) |
| C13 | passagem ≤ 5% em 390×844; suítes do Alcance sem afrouxar valores | `notebook`, `mobile` e `reach-and-seams` ✓ (lote de 122) | `notebook.spec.ts:546` / `:58` `HANDOFF_MAX_SHARE = 0.05` (sem alteração). A correção só acrescenta asserções nessas suítes, sem afrouxar nenhuma. | PASS · carried from 0843e32 (prova re-executada ✓) |
| C14 | luz do globo no leve a ±15% do completo | `you-are-here.spec.ts:259` ✓ | `:272` / `:191` (arquivo não tocado) | PASS · carried from 0843e32 (prova re-executada ✓) |
| C15 | celular, CPU 6×, **modo leve**, `#contato` parado: ≥ 58 FPS | `performance.spec.ts:331` `on 390x844 in lite, the contact at rest runs at 58 fps or more` ✓ | `:337` - `await forceLite(page)`; `:341` - `warmUp` 9 s; `:347-350` - `await expect(page.locator('html')).toHaveAttribute(LITE.attribute, LITE.value)`; `:351` - `expect(fps).toBeGreaterThanOrEqual(MIN_FPS)` (mediana de `RUNS = 3`, `:346`) | PASS · verified at cbed4f0. O gap foi fechado: o modo leve é forçado e o nível é assertado ao fim. |
| C16 | sem leve, bloom 0,75/0,45/0,45 e globo como hoje | `you-are-here.spec.ts` ✓ (lote de 122) | `you-are-here.tsx:110` (produto sem alteração desde 0843e32) | PASS · carried from 0843e32 (prova re-executada ✓) |

Contagem: 15 de 16 provados. O C6 só depende da revisão humana que o próprio critério 4 exige.
C10 passou nesta execução.

## Swept "existing" (carried from 0843e32)

| Linha | Restrição citada | No código |
|---|---|---|
| failure modes: `useStaticPage` (vidro preto) | página que não carrega deixa o vidro preto | `lib/use-static-page.ts:51-56`: `.catch(() => undefined)` mantém `null`. É usado em `handheld.tsx:132` e `laptop.tsx:151`. Relido em cbed4f0. Presente. |
| state transitions: o leve não volta durante a visita | `performance.spec.ts`, "lite mode switches on and stays for the visit" | o teste existe em `e2e/performance.spec.ts:448`. Não foi re-executado nesta rodada, porque o filtro do brief não o inclui e o produto não mudou. Passou na rodada 1. |

## As mudanças de teste da rodada 2 afrouxaram algo?

- **Provas de taxa de desenho (C1, C2, C10).** Antes havia 1 execução de 3 s descartada como
  aquecimento e depois a mediana das 3 seguintes. Agora há o `warmUp` de 9 s (`WARM_UP_MS = 9000`,
  `:17`, de ida e volta no trecho), seguido da mediana de 3 (`:312-315`). A janela (3 s), o número
  de execuções (3), a mediana e o limiar (`MIN_FPS = 58`) continuam os mesmos. O aquecimento ficou
  mais longo e passou a ser o da medição de `portfolio-lp-60fps`, que a seção "Medição" da task
  adota ("é a de `portfolio-lp-60fps`"). Nenhuma asserção ficou mais fraca. Efeito colateral: com
  9 s, o nível adaptativo tem mais tempo para virar `lite` antes da contagem na variante
  "as it comes" (achado 2).
- **C5.** Saiu `expect(page.locator('[data-testid="glass-shelf"]')).toHaveCount(0)`, que já era
  vácua na rodada 1 (o seletor não existe mais em `components/`). No lugar entrou uma asserção mais
  forte (`:383` e `:394`). Não houve afrouxamento.
- **C7, C8 e C11.** Só ganharam asserções (+5, +5 e +6 linhas, −0).

## Achados (por gravidade)

1. **C10: a prova "as it comes" do Alcance continua instável no limiar.** Nesta rodada passou
   (1 execução). Somando as observações, porém, ela falhou 1 vez em 2 na rodada 1 (56,19 FPS) e
   2 vezes em 7 nas execuções do autor (≤ 1,8 FPS abaixo de 58), o que dá cerca de 3 falhas em
   10 execuções. A variante `lite` passou em todas. Um único verde não sustenta o critério 9 de
   forma confiável: o produto mede no limiar e não com folga. Isso não reprova esta rodada, porque
   a prova passou em HEAD, mas o risco é real e cabe ao usuário decidir: aceitar a margem, dar
   folga ao Alcance no nível que o visitante recebe, ou conferir no Redmi Note 11 Pro (Unresolved
   da task).
2. **"as it comes" e o critério "com ou sem modo leve" (1 e 9): gap de precisão.** Em
   `lib/performance-tier.ts`, a visita vira `lite` quando 3 das 5 janelas ficam abaixo de 58. Na
   prática, "completo abaixo de 58" não é um estado que o produto mantém, e "as it comes" mede o
   que o visitante recebe. Como leitura de "qualquer que seja o nível", o rótulo é honesto e mais
   fiel que o antigo "full", que na rodada 1 terminou em `tier: lite`. Já a leitura literal,
   "≥ 58 sem modo leve a 6×", não fica provada: nenhuma variante mantém nem asserta o nível
   `full`, e num teste verde não fica registrado em qual nível a medição terminou (o nível só
   aparece na mensagem de erro, `:317`). Fica ao usuário renegociar a redação do critério ("em
   qualquer nível que a visita assuma") ou pedir uma variante que fixe `full`, o que hoje exigiria
   um gancho no produto.
3. **C6: a revisão humana continua pendente.** O screenshot foi regenerado pela prova do lote
   (`mobile.spec.ts:172`), mas a execução seguinte do Playwright limpou `test-results/` antes que
   eu o abrisse. Não o revi nesta rodada; na rodada 1, o verificador viu os seis ícones (átomo com
   órbitas, tijolo, seta, bandeira, folha, onda). O critério 4 exige revisão do usuário. Para ver:
   `npx playwright test e2e/mobile.spec.ts -g "the solution icons are drawn"` e abrir
   `test-results/solution-icons-390.png`.
4. **C4: asserção vácua (menor, sem alteração).** `mobile.spec.ts:133`,
   `expect(page.locator('[data-testid="glass-shelf"]')).toHaveCount(0)`, não tem como falhar. A
   intenção ("não monta canvas WebGL") está provada por `:134` (`#solucoes canvas` com contagem 0).
   O mesmo vale para `:178`. Não afeta o veredito.
5. **C11: o fechamento é real, com uma ressalva de leitura.** As janelas do celular e do laptop
   são disjuntas, então o `expect(crossing)` de `:421` pode continuar sem executar. Mesmo assim,
   `:424-425` agora exigem que os dois aparelhos tenham aparecido na varredura, o que faz o teste
   discriminar duas situações: o seletor deixar de casar (`seen` = 0) e a janela antiga voltar
   (ambos visíveis, com cruzamento). "Nunca visíveis ao mesmo tempo" implica "nunca se cruzam".

## Gate (verified at cbed4f0)

- `npm test`: 62 passed, 0 failed (inclui `the phone waits for the stage to clear when it comes last` e `the windows hold when the phone comes first`)
- `npx tsc --noEmit -p .`: exit 0
- `npx eslint e2e components lib`: exit 0
- `npx playwright test e2e/hero.spec.ts e2e/swallow-and-copy.spec.ts e2e/mobile.spec.ts e2e/cards.spec.ts e2e/interaction.spec.ts e2e/reach-and-seams.spec.ts e2e/notebook.spec.ts e2e/you-are-here.spec.ts --reporter=list`: 122 passed, 0 failed (11,3 min)
- `npx playwright test e2e/performance.spec.ts -g "draws every frame|lite mode draws the solution icons flat|on 390x844 in lite, the contact at rest|lite mode drops the costly effects" --reporter=list`: 9 passed, 0 failed (3,3 min). Passaram as 3 variantes `as it comes` e as 3 `lite` de `draws every frame` (`:286`), `in lite, the contact at rest` (`:331`), `lite mode draws the solution icons flat` (`:355`) e `lite mode drops the costly effects` (`:469`).
