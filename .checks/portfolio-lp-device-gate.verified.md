# Verificação do aparelho - Verification

**Verdict**: PASS (20/20 com `file:line` e prova verde em f619858; as lacunas 1, 3, 5 e 6 da rodada 1 foram fechadas; 6 lacunas de precisão/alcance seguem abertas como limites conhecidos, nenhuma reprova sob `light`)
**Profile**: light (o `AGENTS.md` do repositório não declara um)
**Diff range**: eb49e98..f619858 (fix da rodada 2: 85cf00b..f619858, só `e2e/device-gate.spec.ts` e o checklist)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

## Binding sources

carried from 85cf00b. Nenhuma marcada como binding; o passo 1 só roda sob `ui`. A task `.tasks/portfolio-lp-device-gate.md` foi lida para julgar o valor concreto de cada critério, não como fonte binding.

## Checks

Provas reexecutadas por inteiro em f619858 (verified at f619858):

- Unit: `node --test lib/performance-tier.test.ts lib/stills.test.ts components/organisms/you-are-here/still-pin.test.ts`, 11 passed, 0 failed.
- E2E: `npx playwright test e2e/device-gate.spec.ts e2e/performance.spec.ts:221 --workers=1`, 25 passed, 0 failed (3.8 min). É o spec do device-gate inteiro mais os 6 testes do C20. A tentativa 1 abortou no `next build` (SecurityFatalError do CLI do Next, problema de ambiente, não é resultado de teste). A tentativa 2 rodou inteira. Nenhum upgrade foi rodado.

O fix tocou `e2e/device-gate.spec.ts`, então as citações nesse arquivo foram atualizadas para todos os checks que ele prova. O veredito de cada check fora do escopo (C1–C5, C8, C9, C11, C12, C14–C20) vem de 85cf00b. Só os números de linha mudaram, conferidos com `sed -n` em f619858.

| Check | Claim | Proof run (f619858) | Evidence | Result | Origem |
|---|---|---|---|---|---|
| C1 | BENCHMARK fps ≥ 60 dá `full`; fps < 60, BLOCKLISTED e WEBGL_UNSUPPORTED dão `lite` | unit `a known gpu at 60 fps or more is full` ✔, `below 60 fps, blocklisted or without webgl is lite` ✔ | `lib/performance-tier.test.ts:19` `assert.equal(FULL_FPS, 60)`; `:21` fps 60 → `'full'`; `:28,:31,:32,:36` fps 59, BLOCKLISTED e WEBGL_UNSUPPORTED → `assert.equal(decideTier(gpu, device), 'lite')` | PASS | carried from 85cf00b |
| C2 | FALLBACK dá `full` só com ponteiro fino e ≥ 8 núcleos | unit `an unknown gpu is full only on a fine pointer with 8 cores or more` ✔ | `:40` `assert.equal(FALLBACK_CORES, 8)`; `:42` fino+8 → `'full'`; `:43` fino+7 → `'lite'`; `:44` toque+16 → `'lite'` | PASS | carried from 85cf00b |
| C3 | Erro ou mais de 3000 ms sem resposta dá `lite` | unit `a check that throws is lite` ✔, `a check that takes over 3000 ms is lite` ✔ | `:53` rejeição → `'lite'`; `:57` `assert.equal(CHECK_TIMEOUT_MS, 3000)`; `:75` não resolvido em 2999 ms; `:77` `'lite'` em 3000 ms; `:80` resposta atrasada não muda nada | PASS | carried from 85cf00b |
| C4 | Os mesmos dados dão o mesmo tier; a verificação roda uma vez por visita | unit `the tier is decided once` ✔ | `:120-121` segunda chamada continua `'full'`; `:123` `assert.equal(measured, 1)`; `decideTier` é pura (`lib/performance-tier.ts:33-44`); `turnStill`, `watchPerformance` e `PerformanceWatch`: sem ocorrência | PASS | carried from 85cf00b |
| C5 | Benchmarks da própria origem; nenhuma requisição a `unpkg.com` | e2e `the check reads its benchmarks from the site` ✔ | `e2e/device-gate.spec.ts:107-109` `toEqual([stringMatching(/^http:\/\/localhost:\d+\/detect-gpu\/benchmarks\//)])`; `:110` `unpkg.com` `toEqual([])` | PASS | carried from 85cf00b (linhas inalteradas) |
| C6 | Enquanto pendente: sem `data-performance`, sem canvas e sem imagem, véu de pé | e2e `nothing mounts before the check answers` ✔ | `:127` `data-performance` `toBeNull()`; `:128` `page.locator('canvas').count()` `toBe(0)` (qualquer canvas, não só a Hero); `:129-132` `hero-still`, `notebook-still` e `globe-still` com count `0`. Os três test ids existem no código (`hero-still.tsx:48`, `still-carousel.tsx:195`, `globe-still.tsx:109`), então a ausência não é vazia. `:133` `[data-loading-veil]` `toBeVisible()`; `:135-136` depois de liberar, `full` e `hero-scene` montada. **Lacuna 5 da rodada 1 fechada.** | PASS | verified at f619858 |
| C7 | O contexto WebGL da verificação é perdido (`loseContext`) antes de o tier ser publicado | unit `the check's context is lost before the tier is told` ✔; e2e `the check's own context is lost before the tier is told` ✔ | Unit: `lib/performance-tier.test.ts:96` `deepEqual(order, ['measure', 'release', 'tier full'])`, `:104` `['release', 'tier lite']`. E2E: o spy envolve o `WEBGL_lose_context.loseContext` real e registra o `data-performance` no momento da chamada (`e2e/device-gate.spec.ts:160`); `:176` `toEqual(['pending'])`. Um `release` sem efeito daria `[]`, e uma liberação depois de publicar daria `['full']`: as duas falham. **Lacuna 1 da rodada 1 fechada.** Ressalva: o spy cobre só o protótipo WebGL 1; se uma cena usasse WebGL 1, haveria uma entrada a mais e o teste falharia (falha conservadora) | PASS | verified at f619858 |
| C8 | No toque, nos dois tiers, nenhum `<canvas>` WebGL de ponta a ponta; Hero, Alcance e Contato `still` | e2e `on touch no webgl is drawn in full` ✔, `... in lite` ✔ | `:194` `expect(await webglAlong(page)).toEqual([])`; `:195` → `:66` `toHaveAttribute('data-scene', 'still')` nas três seções | PASS | carried from 85cf00b (linhas atualizadas) |
| C9 | A imagem do globo ocupa a caixa do canvas (`-50svh`, mesma máscara), ≤ 1 px do aparelho por px da imagem em 390×844@3, 820×1180@2 e 1440×900@2 | e2e `the globe image fills the canvas's box, sharp, at 390x844 at 3x` ✔, `820x1180 at 2x` ✔, `1440x900 at 2x` ✔ | `:230` `toBeLessThanOrEqual(MAX_DENSITY)` com `1.01` (`:13`); `:232` `box.rise` `toBeCloseTo(box.half, 0)`; `:233` base rente à seção; `:234` `mask` `toContain('linear-gradient')`. Lacuna 2 abaixo | PASS | carried from 85cf00b (linhas atualizadas) |
| C10 | Local na face visível dá pin com anel a cada 2,4 s (até 3,2×); do outro lado ou sem local, nenhum pin; com movimento reduzido, o anel não anima | e2e `the still globe pins a place on its face, with a pulsing ring` ✔, `... no place on its far side` ✔, `... nothing without a place` ✔, `... with a ring held still` ✔ | `:258` pin count `1`; `:265` `toEqual([PIN_PULSE])` com `{ name: 'pin-pulse', ms: 2400 }` (`:14`); `:274` keyframes `scale` `toEqual(['1', '3.2'])`; `:288` Tóquio count `0`; `:296-301` sem local: fuso `UTC` (`:294`), `/api/onde-estou` responde `204` (`placeIs`, `e2e/page-helpers.ts:295`), img count `1` (`:298`, prova que o globo está lá) e pin count `0` (`:301`); `:314-315` `getAnimations().length` `0` sob movimento reduzido. **Lacuna 3 da rodada 1 fechada.** Lacuna 1 abaixo segue | PASS | verified at f619858 |
| C11 | Se a imagem do globo falha, o texto do Contato continua visível e nenhuma mensagem aparece | e2e `a globe image that fails leaves the contact as it reads` ✔ | `:327` aborta `**/stills/globe-*`; `:332` img count `0`; `:333-334` `h2` e `button` visíveis; `:335` `not.toContainText(/erro\|error/i)` | PASS | carried from 85cf00b (linhas atualizadas) |
| C12 | Ponteiro fino e `full`: Hero, Alcance e globo `live`, `GlassStage` montado | e2e `a full desktop draws every scene live` ✔ | `:343` `full`; `:344` → `:66` três cenas `live`; `:345` `glass-stage` count `1`; `:346-347` `arrayContaining(['hero-scene', 'notebook-scene', 'globe-scene'])` | PASS | carried from 85cf00b (linhas atualizadas) |
| C13 | Com CPU 20× por 8 s, o desktop `full` continua `live` e `full` | e2e `a slow full desktop never swaps` ✔ | `:365` `rate: SLOW_CPU` (20, `:15`); `:366` `waitForTimeout(SLOW_MS)` (8000, `:16`); `:368` `full`; `:369-371` `#hero`, `#notebook` e `#contato` `toHaveAttribute('data-scene', 'live')`; `:372` `hero-scene` 1. **Lacuna 6 da rodada 1 fechada.** | PASS | verified at f619858 |
| C14 | Em `lite` no desktop: nenhum canvas WebGL, três cenas `still`, sem `glass-stage`, `html` sem `glass-cursor` | e2e `lite draws no webgl and keeps the system pointer` ✔ | `:387` `webglAlong` `toEqual([])`; `:388` três cenas `still`; `:393` `glass-stage` count `0`; `:394` `not.toHaveClass(/glass-cursor/)`; `:401` cursor `not.toBe('none')` | PASS | carried from 85cf00b (linhas atualizadas) |
| C15 | Em `lite`: `.glass-card` sem `backdrop-filter`, `html` sem `lenis`, estrelas sem animação, ícones planos | e2e `lite stills the page` ✔ | `:408` `not.toHaveClass(/\blenis\b/)`; `:416` `blurred` `toBe(0)`; `:423` `twinkling` `toBe(0)`; `:425` `svg[data-flat-icon]` count `6`. Lacuna 3 abaixo | PASS | carried from 85cf00b (linhas atualizadas) |
| C16 | Em `lite`, nenhum título faz glitch | e2e `lite never glitches` ✔ | `:448` `page.clock.runFor(NEVER_MS)` (15 000, `:17`); `:449` `not.toContain('on')` em `#workflow h2`. O mesmo procedimento em `full` dispara glitch em até 12 s (`e2e/glitch.spec.ts:61-78`, controle positivo) | PASS | carried from 85cf00b (linhas atualizadas) |
| C17 | Em `lite` a 1440×900, o laptop é o último aparelho e, em 0,96 do progresso, a tela dele cobre a janela | e2e `lite keeps the alcance story` ✔ | `:456` `notebookAt(page, 0.96)`; `:465` `toEqual(['laptop'])`; `:469-472` `left < 0`, `top < 0`, `right > 1440`, `bottom > 900` | PASS | carried from 85cf00b (linhas atualizadas) |
| C18 | `stills.json` tem `globe` com `wide`, `tablet` e `phone`, e todo arquivo do `srcset` existe em `public/` | unit `every globe shape is listed and on disk` ✔; `render-stills.mjs ... globe` não reexecutado | `lib/stills.test.ts:17-21` `deepEqual(names.sort(), ['phone', 'tablet', 'wide'])`; `:27` `existsSync` por fonte. Conferido à mão em 85cf00b: os 7 webp versionados, larguras e proporções batem com `stills.json`. O fix não tocou esses arquivos | PASS (metade script não reexecutada) | carried from 85cf00b |
| C19 | O local de frente para a câmera cai a ≤ 4 px CSS do centro do globo em 390×844 e 1440×900; a mais de 75°, sem pin | unit `... at 390x844` ✔, `... at 1440x900` ✔, `a place past 75 degrees has no pin` ✔ | `components/organisms/you-are-here/still-pin.test.ts:57` `assert.ok(off <= 4)`; `:61` `PIN_MAX_ANGLE == 75`; `:70` antípoda `null`; `:73` 60° com pin; `:80` 80° `null` | PASS | carried from 85cf00b |
| C20 | 390×844 no toque, `lite` CPU 6× e `full` CPU 4×, Hero parada e rolagem de Alcance e Contato, ≥ 58 FPS | e2e `on a phone the page holds 58 fps in lite, the hero at rest` ✔, `... in lite, the scroll through the Alcance` ✔, `... in lite, the scroll through the contact` ✔, `... in full, the hero at rest` ✔, `... in full, the scroll through the Alcance` ✔, `... in full, the scroll through the contact` ✔ | `e2e/performance.spec.ts:16` `PHONE_FPS = 58`; `:214-215` lite/6 e full/4; `:227-230` tier confirmado; `:241` `toBeGreaterThanOrEqual(PHONE_FPS)` sobre a mediana de 3 janelas | PASS | carried from 85cf00b (reexecutado em f619858) |

### Swept

carried from 85cf00b. Nenhuma linha `Swept` do checklist resolve para `existing`.

### Lacunas que seguem abertas (limites conhecidos), por gravidade

Numeração da rodada 1 entre parênteses.

1. **(2) C19 e C10, o pin contra a imagem real.** `facingPlace` e `pinOnStill` derivam do mesmo `stillGlobe`. O teste prova coerência interna, não que o pin caia sobre o local na imagem renderizada. O e2e verifica só que o pin está dentro da caixa (`e2e/device-gate.spec.ts:276-283`, sem a base). Uma pose de captura diferente de `STILL_POSE` passaria.
2. **(4) C9, precisão.** A máscara é verificada só com `toContain('linear-gradient')`, não com o gradiente até `50svh`. A densidade aceita até 1,01, contra "≤ 1". O caso 1440×900@2 roda com ponteiro fino em `lite`, não no toque.
3. **(7) C15, vacuidade e narrowing.** Sem guarda de não vazio para `.glass-card` e `[data-parallax-layer]`. Ficam fora do C15 o parallax sem deslocamento e o brilho das seções parado do critério 13. Estão em `e2e/performance.spec.ts:478`, fora do checklist e não rodado aqui.
4. **(8) C19, limiar de 75°.** O comportamento só é provado em 60° e 80°; só a constante amarra o 75. O código mede o ângulo de visão (`still-pin.ts:75-78`), não o ângulo central desde o centro da face. Suposição: o corte efetivo fica alguns graus abaixo de 75°.
5. **(9) C20, metodologia.** É a mediana de 3 janelas de 3 s; a task fala em "uma janela de 3 s".
6. **(10) C18.** `render-stills.mjs ... globe` não reexecutado.

Fechadas nesta rodada: (1) C7 `loseContext` real, (3) C10 anel até 3,2× e sem local sem pin, (5) C6 nenhum canvas nem imagem em cena alguma e véu visível, (6) C13 `#contato` continua `live`.

## Test policy rows

Não roda sob `light`.

## Coverage

Não roda sob `light`.

## Faults injected

Não roda sob `light`.

## Gate

verified at f619858:

- `node --test` (3 arquivos): 11 passed, 0 failed
- `npx playwright test e2e/device-gate.spec.ts e2e/performance.spec.ts:221`: 25 passed, 0 failed
- `npx tsc --noEmit -p .`: sem erros
- `npx eslint .`: sem problemas
- `git status --porcelain`: limpo, exceto este relatório (sem commit)
