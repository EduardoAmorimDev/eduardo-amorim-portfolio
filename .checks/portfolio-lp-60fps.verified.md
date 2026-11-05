# Landing page do portfólio — 60 FPS com CPU 6× mais lenta — Verificação

**Verdict**: FAIL
**Profile**: light (sem fontes binding, sem join de `Coverage`, sem `Test policy`, sem injeção de falhas)
**Diff range**: 81f3ffd..d6b2bf6
**Round**: 1 - full
**Verifier**: sub-agente independente (author != verifier)

Resumo: 7 de 10 checks provados nesta rodada (C3, C5, C6, C7, C8, C9, C10); C1 e C2 falham;
C4 não foi re-executado por inteiro (apoiado no relato do autor e na execução dirigida).

## Fontes binding

Nenhuma fonte marcada como binding no checklist; passo 1 não roda no perfil `light`. A task
`.tasks/portfolio-lp-60fps.md` foi lida para julgar as "Mudanças durante o build" (abaixo).

## Execução

- e2e, uma invocação: `npx playwright test e2e/performance.spec.ts e2e/backdrop.spec.ts
  e2e/parallax.spec.ts e2e/reduced-motion.spec.ts` → **24 passed, 3 failed** (8,5 min), exit 1.
- `node --test lib/performance-tier.test.ts` → 4 pass, 0 fail (os 4 testes listados
  individualmente). `npm test` → 53 pass, 0 fail.
- Contenção corroborada: `uptime` load average 6,9–7,7; um processo `chrome --type=renderer`
  (PID 1625683) a ~70% de CPU há 3 h 31 min; `sophos_threat_d` ~33%.

## Checks

| Check | Claim | Proof run | Evidence | Result |
|---|---|---|---|---|
| C1 | 1440×900, CPU 6×, 5 trechos ≥ 58 FPS | `performance.spec.ts:157` (5 testes) | `performance.spec.ts:176` - `expect(fps, \`tier: ${tier ?? 'full'}\`).toBeGreaterThanOrEqual(MIN_FPS)` (`MIN_FPS = 58`, l. 6) | **FAIL** - hero parada **56,32** (tier `lite`); rolagem do Alcance **53,16** (tier `lite`); Soluções, Cases→Workflow e Contato passaram |
| C2 | 390×844 touch DPR 3, idem | idem, describe `390x844` | idem l. 176; `PHONE` l. 17–22 | **FAIL** - hero parada **46,82** (tier `lite`), longe do limiar; os outros 4 trechos passaram |
| C3 | visita de 60 s sem lentidão termina sem `lite` | `performance.spec.ts:180` ✓ (1,0 min) | `:186` - `expect(page.locator('html')).not.toHaveAttribute(LITE.attribute, LITE.value)`; gesto de 60 000 ms l. 185 | PASS |
| C4 | suítes existentes passam sem afrouxar valores | **não re-executada** a suíte inteira | execução dirigida: os 13 testes existentes de `backdrop`, `parallax` e `reduced-motion` passaram; diff de `backdrop.spec.ts`/`parallax.spec.ts` não afrouxa valor (ver abaixo). Relato do autor: 178 passed / 4 failed, as 4 de C1/C2 | NÃO VERIFICADO de forma independente |
| C5 | gatilho e permanência do `lite`; recarregar volta | `performance.spec.ts:223` ✓; `node --test lib/performance-tier.test.ts` ✓ | `:227` - `toHaveAttribute(LITE.attribute, LITE.value)` após 5 s em CPU normal; `:231` - `not.toHaveAttribute(...)` após reload; `performance-tier.test.ts:21` - `isSlowWindow(frames(114, 1000 / 57))` → `true`, `:20` 58,5 FPS → `false`, `:27` stall de 300 ms não liga | PASS, com lacunas (ver Achados 3 e 6) |
| C6 | cortes do `lite` | `performance.spec.ts:244` ✓ | `:283` - `expect(sky).toEqual({ shifted: 0, animated: 0 })`; `:284–291` `data-effects` = `lite` (notebook, globo); `:293–304` `toBeCloseTo(LITE_DPR.hero/notebook/globe, 1)` com `{ hero: 0.4, notebook: 0.75, globe: 0.6, glass: 1 }` (l. 14); `:309` glass 1; `:319` - `expect(await draws(), 'the glass holds still').toBe(before)` | PASS em 1440×900; o caso touch (notebook 1,25 ≠ 0,75 do claim) não é testado (Achado 4) |
| C7 | movimento reduzido como hoje | `reduced-motion.spec.ts` 6 testes ✓ (l. 55, 73, 97, 140, 165, 208) | suíte pré-existente, sem alteração no diff | PASS - mas o "com ou sem o modo leve" da task 7 caiu do checklist (Achado 5) |
| C8 | fatias a 0,2/0,5/1,3× com 0 mutações de `style` | `performance.spec.ts:322` ✓; `parallax.spec.ts:27` ✓ | `performance.spec.ts:357` - `expect(writes).toBe(0)`; `:367` - `expect(timeline).toBe('--sky')`; `parallax.spec.ts:52–55` - `Math.abs(moved - speed * scrolled) <= TOLERANCE_PX` com `SPEEDS = { back: 0.2, mid: 0.5, front: 1.3 }` (l. 5) | PASS |
| C9 | 4 grupos de piscar | `backdrop.spec.ts:156` ✓; `parallax.spec.ts:60` ✓ | `backdrop.spec.ts:165` `toBeLessThanOrEqual(TWINKLE.groups)` por fatia; `:181` `toBe(4)`; `:205–206` `periods.size`/`timings.size` `toBe(4)`; `:202–203` `toBeCloseTo(0.25, 2)` / `toBeCloseTo(1, 2)`; `parallax.spec.ts:128` - `expect(item.groupAnimation).toBe(item.size >= 1.5 ? 'twinkle' : 'none')` | PASS |
| C10 | brilhos ±0,1 em 0,3/0,4, 10 s e 9 s, sem `var()` | `backdrop.spec.ts:119` ✓ | `:135–136` `toBeCloseTo(base ∓ GLOW_BREATH.swing, 2)`; `:152` `toHaveLength(2)`; `:153` `not.toContain('var(')`; períodos: `:130–131` só faixa 8–12 s | PASS - lacuna de precisão: 10 s/9 s ficam no CSS (`globals.css:56,59`), não na asserção |

## Swept (linhas "existing")

- failure modes, C8 (sem `animation-timeline`, o JS move o céu como hoje): o caminho existe no
  código - `parallax-field.tsx:286` escolhe por `CSS.supports('animation-timeline: view()')`;
  o JS de reserva segue em `:324` (`update`). Nenhum teste exercita a reserva (o Chromium sempre
  suporta); constraint presente, sem prova.
- concurrency/ordering, lifecycle, state transitions → C5: `performance-tier.ts` `turnLite` só
  vai de `full` a `lite`; o laço para em `lite` (`if (tier === 'lite') return`). Presente.

## Landing × código

| Linha | Código | Confere |
|---|---|---|
| Nível de desempenho | `lib/performance-tier.ts`: janelas de 2000 ms, `STALL_MS = 250`, `WARM_UP_MS = 1000`, `useLiteMode()` via `useSyncExternalStore` (`lib/use-lite-mode.ts`), `<html data-performance="lite">` | parcial - a linha ainda diz "média abaixo de 55 FPS → `lite`"; o código usa `LITE_BELOW_FPS = 58` e 3 janelas lentas entre as últimas 5. Linha desatualizada |
| Parallax por linha do tempo | `view-timeline-name: --sky` no contêiner (`parallax-field.tsx:287`), `--sky-from`/`--sky-to` em px no `resize` (`:293`), keyframes `sky-drift` (`globals.css:205`), reserva JS | sim (usa `translate3d(0, var(...), 0)` em vez de `translateY`; equivalente) |
| Teste com CPU desacelerada | `e2e/performance.spec.ts`, `Emulation.setCPUThrottlingRate` 6 | sim, mas a rolagem medida usa `Input.synthesizeScrollGesture`, não "`scrollTo` a cada quadro" da Medição da task (mudança não registrada) |
| `data-effects` | `notebook.tsx:162`, `you-are-here.tsx:95` | sim |

## Testes existentes alterados

`git diff 81f3ffd..HEAD -- e2e/backdrop.spec.ts e2e/parallax.spec.ts`:
- `far stars twinkle out of step` → `far stars twinkle in four groups`: substituição sancionada
  (task 9). Mantém período 3–8 s, `iterations === Infinity`, opacidade 0,25↔1; a varredura passa
  de cada estrela a cada grupo de uma fatia (consequência do desenho).
- `each glow breathes`: mesmas faixas; o nome da animação passa a `glow-breathe-a/b`; ganhou a
  verificação de keyframes sem `var(` (reforço).
- `the field is far stars...`: a animação passa da estrela ao grupo; a regra 1,5 px mantida.
- Nada afrouxado além do sancionado.

## Mudanças durante o build - julgamento

| Mudança | Julgamento |
|---|---|
| Aquecimento: 2 s parado → 9 s rolando ida e volta | Em parte correção do harness (parado no início não exercita o custo da rolagem). O comprimento de 9 s, porém, decorre do gatilho mais lento e **afrouxa a régua da task**: o visitante tolera ~6–9 s de lentidão antes do `lite`, contra 2 s na Medição. Rebaixa |
| Gatilho: 1 janela → 3 seguidas → 3 entre as últimas 5 | **Altera a one-way door Decided 1**, que o usuário confirmou ("Certo"), sem registro de nova aprovação. Reação ao lento 3× mais demorada. Rebaixa a reatividade; a linha de Landing ficou desatualizada e o claim C5 ainda diz "3 janelas seguidas" |
| Limiar 55 → 58 FPS | Torna o gatilho mais sensível (na direção da meta), não rebaixa C1/C2; ainda assim muda um valor Decided e confirmado pelo usuário - pedir aceite |
| `data-stage-covers` tira os céus sob o palco | Otimização em todos os modos; não rebaixa. Mudança fora do `lite`, coberta só por C4 (não re-executado por mim) |
| Cortes extras no `lite` (Lenis, `backdrop-filter`, blur, `will-change`) | Dentro da permissão do usuário para downgrades; não rebaixa os checks. Ampliam o que o `lite` muda (rolagem passa a nativa) sem check próprio |
| Mediana de 3 medições de 3 s | **Rebaixa**: tolera 1 medição em 3 abaixo de 58. Justificativa ambiental plausível (contenção corroborada), mas é afrouxamento da régua, não só do detector |
| Notebook a 1,25 no touch em `lite` (não 0,75) | **Rebaixa C6/task 6** no touch: resolve em silêncio um conflito entre task 6 e `portfolio-lp-mobile-alcance` C3; deveria ter ido ao usuário. O claim C6 segue dizendo 0,75 sem qualificar aparelho, e nenhum teste roda C6 em touch |
| `RenderGate` a cada 2 quadros em `lite` | Cumpre a letra da métrica (quadros de `rAF`), mas as cenas 3D atualizam a 30 Hz no `lite`. Não rebaixa o número; o usuário deve saber que "60 FPS" aqui não vale para o conteúdo 3D |
| Páginas dos aparelhos numa escala, glitch parado, ouvintes de rolagem limitados | Otimizações; não rebaixam |
| Gatilho final 3 de 5 | Ver linha do gatilho |

## Achados (por gravidade)

1. **C1/C2 FAIL** - 1440: hero parada 56,32 e Alcance 53,16; 390: hero parada 46,82; os três já
   em `lite`. 56,3 é limítrofe e pode oscilar com a contenção; 46,8 no celular não é. A hero parada
   não se sustenta nem no modo leve. O autor relatou 4 falhas; aqui foram 3, com outro conjunto.
2. **One-way door Decided 1 alterada sem aceite registrado do usuário** (55 → 58 FPS; 1 janela →
   3 de 5) e, por consequência, aquecimento de 2 s → 9 s e mediana de 3: três afrouxamentos da
   régua da task (tempo até o `lite`, tolerância a medições lentas). Landing e claim C5 desatualizados.
3. **C6 no touch**: o claim diz notebook 0,75; o código usa `DPR.touch` (1,25) em `lite` no touch
   (`notebook.tsx`, `const dpr = touch ? DPR.touch : lite ? DPR.reduced : ...`), e o teste roda só
   em 1440×900. O conflito entre tasks precisa de decisão do usuário.
4. **Lacuna de cobertura - task 7 "com ou sem o modo leve"**: o checklist C7 omitiu, e nenhum teste
   combina movimento reduzido com `lite`.
5. **Teste unitário do gatilho só afirma constantes** (`performance-tier.test.ts:38–41`:
   `assert.equal(SLOW_WINDOWS, 3)`, `assert.equal(RECENT_WINDOWS, 5)`). A lógica de
   `watchPerformance` (janela deslizante, aquecimento de 1 s, parada em `lite`) não tem teste
   unitário; só o e2e de C5 a exercita indiretamente.
6. **Mudança visual fora do `lite` não registrada**: o céu do palco do notebook passou a
   `<ParallaxField still />` em todos os modos (`notebook.tsx`). A task põe fora de escopo
   mudanças visuais fora do `lite` além de 9 e 10. Suposição: o efeito visível se limita à entrada
   e à saída do palco fixo; não verificado visualmente.
7. **Método de rolagem da medição** mudou de "`scrollTo` a cada quadro" (Medição da task) para
   `Input.synthesizeScrollGesture` (`performance.spec.ts:103`), sem registro em "Mudanças".
8. **Suposição a confirmar**: `@keyframes sky-drift` (`globals.css:205–212`) usa `var()`, e o
   próprio repositório adverte (comentário `hazard:` em `globals.css`) que `var()` em keyframes
   tira a animação do compositor. C8 prova 0 mutações de `style`, não que a animação seja
   compositada. Não medido.
9. **Precisão de C10**: os períodos de 10 s/9 s são afirmados só como faixa 8–12 s
   (`backdrop.spec.ts:130–131`).
10. **Reserva JS de C8 sem prova** (Swept failure modes): presente em `parallax-field.tsx:324`,
    nenhum teste a exercita.
11. **Regra XIII de comentários** (≤ 5 linhas contando os marcadores): `lib/performance-tier.ts:1`
    (JSDoc de 8 linhas) e `lib/canvas-size.ts:1` (JSDoc de 6 linhas). Todos os demais blocos
    adicionados abrem com `why:`/`hazard:`/`invariant:` ou são JSDoc e cabem em 5 linhas.

## Faults injected

Não executado - perfil `light`.

## Gate

- `npx tsc --noEmit -p .` - sem erros (exit 0)
- `npm run lint` - sem problemas (exit 0)
- `npm test` - 53 passed, 0 failed
- e2e dirigido - 24 passed, 3 failed (C1 ×2, C2 ×1)
