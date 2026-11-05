# Landing page do portfólio — Alcance termina no aparelho de quem visita · Verificação

**Verdict**: PASS (com 1 achado sobre a checklist e 2 lacunas de precisão, nenhum bloqueante)
**Profile**: light (rodaram os passos 2, 3 e 5; sem fontes vinculantes, sem join de `Coverage`, sem `Test policy`, sem injeção de falhas)
**Diff range**: 5acf447..fc62e39 (HEAD confirmado por `git log`)
**Round**: 1 - full
**Verifier**: sub-agente independente (autor != verificador)

## Fontes vinculantes

Nenhuma marcada como vinculante. A checklist foi comparada com a task de origem
(`.tasks/portfolio-lp-device-last.md`), critério a critério:

| Critério | Check | Contradição / omissão |
|---|---|---|
| 1 | C1 | nenhuma |
| 2 | C2 | nenhuma; precisão: ver achado 2 |
| 3 | C3 | nenhuma |
| 4 | C4 | nenhuma |
| 5 | C5 | nenhuma |
| 6 | C6 | nenhuma (C6 fica em 3 tamanhos; ver achado 3) |
| 7, 8, 9 | C7, C8, C9 | nenhuma |
| 10 | C10 | **o texto da check omite o "modo leve"** que o critério 10 exige ("No touch e no modo leve"); só aparece na tabela `Coverage` como não provado. Ver achado 1 |
| 11, 12 | C11, C12 | nenhuma (C12 lista também o critério 9 entre os testes alterados, o que é adição de tamanhos, não afrouxamento) |

## Checks

Todas as provas rodaram em HEAD: `npm test` (60 pass, 0 fail), `npx tsc --noEmit -p .` (sem saída),
`npm run lint` (sem saída) e uma única invocação
`npx playwright test e2e/notebook.spec.ts e2e/mobile.spec.ts` → **63 passed (7.7m), 0 failed**, exit 0.
Cada teste nomeado abaixo aparece individualmente como ✓ na saída.

| Check | Claim | Proof run | Evidence | Result |
|---|---|---|---|---|
| C1 | 0/390/767 → phone; 768/820/1023 → tablet; 1024/1440/1920 → laptop | `node --test` ✓ "the window width picks the visitor's device"; e2e ✓ "the window width picks the last device at" 767, 768, 1023, 1024 | `stages.test.ts:51` `assert.equal(viewerDevice(width), device, …)` com a tabela literal em :45-49; `notebook.spec.ts:310` `toHaveText(\`03 · ${NAME_OF[last]}\`)` e `:311` `expect((await sizeOf(page, last))[0]).toBe(width)` | PASS |
| C2 | 1440 → 390 → 1440 em p = 0,1: rótulos mudam, 3 páginas distintas, só o 1º em cena | e2e ✓ "crossing a width limit mid-Alcance reorders the devices" | `notebook.spec.ts:339` `expect(new Set(all).size).toBe(3)`; `:343` rótulos pela ordem; `:346` `toEqual(all)`; `:347` `expect(await devicesOnStage(page)).toEqual([order[0]])`; `:349-350` largura do último = janela, laptop = 1280 quando não último | PASS (precisão: achado 2) |
| C3 | ordens laptop/tablet/phone | `node --test` ✓ "the visitor's device comes last…"; e2e ✓ "the devices come on stage in the visitor's order at" 1440x900, 820x1180, 390x844 | `stages.test.ts:55-57` `deepEqual(deviceOrder('tablet'), ['phone','laptop','tablet'])` etc.; `notebook.spec.ts:323` `toEqual([device])` em p = 0,1/0,37/0,62 | PASS |
| C4 | laptop 2º abre e liga; phone último de frente; tablet 1º vira; tablet último mantém a orientação | e2e ✓ "the laptop opens and lights in second place", ✓ "the last phone comes from the depth", ✓ "the tablet turns in first place", ✓ "the tablet turns and its page lays out again for landscape", ✓ "the last tablet keeps the window's orientation at" 820x1180 e 1000x700 | `notebook.spec.ts:364` opacidade ≤ 0,05 em 0,2; `:366` ≥ `LIT_OPACITY` (0,9) em 0,41; `:372` altura/largura ≥ 0,6; `:387` `abs(centre − 195) ≤ 39`; `:388` `coming.width < landed.width`; `:395`/`:397` 820×1180 → 1180×820; `:452`/`:454` (1440, inalterado); `:411` `toEqual([width, height])` em 0,47, 0,62 e 0,9 | PASS |
| C5 | numeração pela ordem, textos inalterados, capítulo segue o aparelho | e2e ✓ "the chapters are numbered in the order of the devices at" ×3, ✓ "the notebook is labelled…", ✓ "the chapter follows its device on stage at" 820x1180 e 390x844, ✓ "the chapter follows the device on stage, both ways" | `notebook.spec.ts:265` rótulos `0${i+1} · ${NAME_OF[device]}`; `:268`/`:271` títulos e corpos contra `CHAPTERS`/`CHAPTER_BODIES` (constantes pré-existentes, :24-37, fora do diff); `:292` `toBe(chapter)` ida e volta, `null` em 0,85; `:154-159` (1440, inalterado) | PASS |
| C6 | caixa do iframe do último enche a janela (≤ 2 px) | e2e ✓ "the dive ends on the last device's page filling the window at" 1440x900, 820x1180, 390x844 | `notebook.spec.ts:432-434` left/top/right ≤ 2; `:437` laptop `bottom ≥ height − 2`; `:438` handheld `abs(bottom − height) ≤ 2` | PASS |
| C7 | página do último = janela (W, e H nos handhelds) em 1440×900, 820×1180, 1000×700, 390×844, 375×667; corpo na proporção da página; moldura de hoje nas medidas de hoje | e2e ✓ "every device shows the projects section at its own width" (1440) e "… at" 820x1180, 1000x700, 390x844, 375x667; `node --test devices.test.ts` ✓ (5 testes) | `notebook.spec.ts:201`/`:212` laptop `width: viewport.width`; `:237-238` `toEqual(own.phone/own.tablet)` com `[last]: [width, height]`; `devices.test.ts:26` `deepEqual(asViewerDevice(spec, view).page, view)`; `:45` razão do vidro = `view.height / view.width` (< 1e-9); `:53-54` `handheldFrame(ROOM, X, X, false)` = `ROOM`. Ligação ao 3D confirmada: `handheld.tsx:56` `createSlab` usa `bodySize(spec)` e o carrossel passa `phoneSpec`/`tabletSpec` | PASS |
| C8 | fora do último: phone 390, tablet 820/1180, laptop 1280 | e2e ✓ "every device shows…" (atributo `width`); ✓ "every device page lays out at its device width" (mobile) | `notebook.spec.ts:237-239` (`LAPTOP_WIDTH` = 1280); `mobile.spec.ts:327` `expect(widths).toEqual(DEVICE_WIDTHS)` com tablet 820, tablet landscape 1180, laptop 1280 (:24-28) | PASS |
| C9 | passagem ≤ 5% (`HANDOFF_MAX_SHARE`) em 1440×900, 1920×1080, 1280×720, 820×1180, 390×844 | e2e ✓ "the stage hands over to the real page with no visible change at" ×5 | `notebook.spec.ts:515` `expect(share).toBeLessThanOrEqual(HANDOFF_MAX_SHARE)`; `HANDOFF_MAX_SHARE = 0.05` (:58, inalterado) | PASS |
| C10 | toque: uma escala, um `z-index`, canvas de tamanho único, razão 1,25 | e2e ✓ "on touch each device page keeps one scale", ✓ "on touch the device pages keep their stacking", ✓ "on touch the alcance canvas never resizes" | `mobile.spec.ts:535` `toHaveLength(1)` por aparelho; `:591` idem para `zIndex`; `:564` `expect([...sizes]).toHaveLength(1)`; `:565` `toEqual([1.25])` | PASS (toque); modo leve **não provado** (achado 1) |
| C11 | nenhum ancestral com `zoom`; página dentro do vidro | e2e ✓ "every device page stays inside its glass" | `mobile.spec.ts:284` `toEqual([])`; `:285` `toBe('hidden')`; `:286-287` `right ≤ width`, `bottom ≤ height` | PASS |
| C12 | suítes existentes passam sem afrouxar valor | ver "Testes existentes alterados" e "Gate" | — | PASS (suíte completa: execução do autor, ver Gate) |

### Hand-off (critério 9) em 820×1180 e 390×844: o quadro comparado é real, não trivialmente igual

Probe próprio (script em scratchpad, servidor de produção da build de HEAD na porta 3100, já
encerrado), mesmo roteiro do teste (p = 0,9, assentar, fim da seção, assentar):

| Janela | Último | Palco | iframe do último (atributos / caixa na tela) | staged vs real | staged vs sem a página do aparelho |
|---|---|---|---|---|---|
| 1440×900 | laptop | opacity 1, visible | 1440×988,9 / [0, 0, 1440, 988,9] | 1,04% | 3,81% |
| 820×1180 | tablet | opacity 1, visible | 820×1180 / [0, 0, 820, 1180] | 0,10% | 22,17% |
| 390×844 | phone | opacity 1, visible | 390×844 / [0, 0, 390, 844] | 1,01% | 21,02% |
| 1000×700 | tablet (deitado) | opacity 1, visible | 1000×700 / [0, 0, 1000, 700] | 0,00% | 25,39% |
| 740×360 | phone (deitado) | opacity 1, visible | 740×360 / [0, 0, 740, 360] | 0,03% | 21,21% |

Em 820×1180 e 390×844 o palco está opaco e visível, só o aparelho do último lugar está em cena
(`shown` = tablet / phone), a página dele cobre a janela inteira, e esconder só essa página muda
~21-22% dos pixels: o quadro "staged" é de fato a página do tablet/celular mergulhado, e o "real"
(palco escondido) é a seção `#cases`. A comparação discrimina. Os dois tamanhos deitados (fora da
checklist) também terminam enchendo a janela, o que cobre o caminho do corpo virado 90° no mergulho.

Observação lateral, pré-existente: em 1440×900 esconder a página do laptop muda só 3,8%, porque a
seção é escura sobre o fundo `bg-ink`; ali a margem de 5% discrimina pouco. Não é desta feature.

## Testes existentes alterados (`git diff 5acf447..HEAD -- e2e/`)

- `mobile.spec.ts` `DEVICE_WIDTHS` (:22-29): phone passa a `PHONE.width` (último, na janela) e laptop
  de `PHONE.width` para 1280 — critérios 3 e 8. `ON_STAGE` (:294-299): pontos de progresso da nova
  ordem — critério 3. Só o comentário muda em "the cases stay painted…". Nenhum limite afrouxado.
- `notebook.spec.ts`: `HANDOFF_VIEWS` ganha 820×1180 e 390×844 (critério 9) e o teste passa a anotar
  o `share`; a asserção `≤ HANDOFF_MAX_SHARE` fica igual. O resto é adição (testes novos). O teste de
  1440 de "every device shows…", "the chapter follows the device on stage, both ways", "the tablet
  turns…", "the laptop is lit before the dive" e as constantes (`HANDOFF_MAX_SHARE`, `PIXEL_GAP`,
  `SETTLE_MS`, `LIT_OPACITY`) estão intocados.
- Nenhuma asserção removida, nenhum limite afrouxado fora dos critérios 3, 5, 7, 8 e 9.

## Swept "existing"

- failure modes — `useStaticPage` deixa o vidro preto: confirmado. `lib/use-static-page.ts` devolve
  `null` em carga ou falha; `handheld.tsx:218-222` e `laptop.tsx:281-289` só montam o iframe com
  `html`, sobre um `ScaledPage` `bg-ink`.

## Regra de comentários (constituição geral, XIII)

Todos os comentários acrescentados abrem com `why:`/`hazard:`/`invariant:` ou são JSDoc; o maior
bloco tem 5 linhas (`laptop.tsx`, "why: last, the page is laid out…"). JSDoc movido de `handheld.tsx`
para `devices.ts` sem alteração. Nenhuma violação.

## Landing

Confere com o código: `viewerDevice`, `deviceOrder`, `SLOTS`/`slotOf` e `ScreenView` em `stages.ts`
(`SLOTS` = `[0,0.14]/[0.22,0.32]/turn [0.15,0.21]/own [0,0.22]`, 2º `own [0.22,0.42]`, último
`own [0.52,0.72]`, como a checklist decide); `devices.ts` novo com `PHONE`/`TABLET`, `bodySize`,
`asViewerDevice`, `handheldFrame`; `use-viewer-device.ts` com `useSyncExternalStore`, `innerWidth`
no `resize` e `'laptop'` no servidor; celular por último numa janela deitada vira 90°
(`phoneOnSide`); tablet último usa `turn = Number(lastOnSide)`; o `Frame` cresce na razão do corpo
e fica igual nas medidas de hoje.

## Achados (por gravidade)

1. **C10 omite o modo leve do critério 10.** A task exige "No touch e no modo leve"; o texto da C10
   diz só "Em toque" e o modo leve fica apenas na tabela `Coverage` como não provado. Por leitura de
   código o caminho é o mesmo (`handheld.tsx` e `laptop.tsx:155` `touch = useFinePointer() === false
   || lite`; `notebook.tsx` fixa `dpr = DPR.reduced` e não monta `AdaptiveDpr` em lite), e a feature
   não tocou nesse ramo — por isso não bloqueia. Mas a omissão deveria estar no texto da check
   ("modo leve: sem prova própria, mesmo caminho do toque"), não só na tabela.
2. **Precisão de C2.** O redimensionamento é provado só em p = 0,1 e só com 1440 ↔ 390, que cruza os
   dois limites de uma vez. Não há prova de cruzar um limite só (p. ex. 1440 ↔ 820) nem num ponto em
   que o 2º aparelho difere entre as ordens (p = 0,37: tablet em 1440, laptop em 390). Pelo código o
   estado vem todo de `deviceOrder(viewer)` a cada frame, e a orientação do tablet é recalculada por
   frame (`nextLandscape`), então o risco é baixo.
3. **C6 só nos três tamanhos retrato/1440.** O critério 6 vale para "qualquer que seja" o aparelho; a
   janela deitada com tablet ou celular por último (corpo virado 90°, `up` composto pelas duas
   rotações) não tem prova na suíte. O probe acima mostra que funciona (1000×700 e 740×360: página
   enche a janela, passagem 0,00% e 0,03%), mas fica sem teste de regressão.

## Gate

- `npm test` - 60 passed, 0 failed
- `npx tsc --noEmit -p .` - sem erros
- `npm run lint` - sem erros
- `npx playwright test e2e/notebook.spec.ts e2e/mobile.spec.ts` - 63 passed, 0 failed (7.7m)
- `npx playwright test` (suíte inteira) - **não reexecutada por este verificador**; vale a execução do
  autor: 206 passed / 5 failed, sendo os 4 testes de FPS de `e2e/performance.spec.ts` e "the black hole
  rises out through the top…" de `swallow-and-copy.spec.ts`, instáveis nesta máquina por GPU
  compartilhada e fora dos arquivos tocados. Para C12 a evidência própria são os 63 testes dos dois
  specs alterados e o diff sem afrouxamento acima.
