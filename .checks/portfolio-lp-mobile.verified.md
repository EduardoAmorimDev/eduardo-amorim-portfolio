# Landing page do portfólio — correções no celular · Verificação

**Verdict**: PASS nas provas automáticas (16 de 17 checks com prova automática, 16 PASS). C17 só tem
prova manual: UNVERIFIED. As partes manuais de C8, C11, C12 e C13 estão UNVERIFIED (pendentes no
iPhone). Não há FAIL. Há lacunas de precisão e de nível, listadas em Findings: o trabalho só fecha
depois da confirmação manual.
**Profile**: light (o `AGENTS.md` do repositório não declara nenhum)
**Diff range**: `f778ae5..working tree` (não commitado; inclui os arquivos novos não rastreados)
**Round**: 1 - full
**Verifier**: sub-agente independente (author != verifier)

Passos executados: 2 (provas), 3 (asserções, linhas `Swept` "existing", `Landing`) e 5 (relatório).
Não executados, por causa do perfil `light`: passo 1 (o checklist não marca nenhuma fonte como
binding), join de `Coverage`, veredictos de `Test policy` (o artefato não tem essa seção) e passo 4
(injeção de falhas).

## Binding sources

O checklist não marca nenhuma fonte como binding. O passo 1 não se aplica.

## Checks

Uma invocação do Playwright, em Chromium, para as 19 provas e2e. Ela gerou 23 testes (C1 roda em 2
tamanhos, C10 em 3, e o filtro `one canvas for all the glass` também pegou `the glass canvas rests`,
que está no mesmo `describe`). Resultado: **23 passed (1.9m), exit 0**. Cada teste nomeado aparece
individualmente com `✓`. As provas unitárias rodaram com `npm test`: 48/48, e entre elas aparecem os
testes `touchDpr caps every ratio at 1.5…`, `every item lands in the slab…` e `the slabs tile the
layer…`.

| Check | Claim | Proof run | Evidence (assertion que decide) | Result |
|---|---|---|---|---|
| C1 | razão vertical/horizontal das nuvens entre 0,95 e 1,05 em 390×844 e 1440×900 | `mobile.spec.ts:62` ✓ nos dois tamanhos | `e2e/mobile.spec.ts:72-73`: `expect(aspect).toBeGreaterThanOrEqual(CLOUD_ASPECT.min)` / `toBeLessThanOrEqual(CLOUD_ASPECT.max)`, com `CLOUD_ASPECT = { min: 0.95, max: 1.05 }` (`:16`). Usa o valor do checklist. Mede o `mask-size` calculado contra o tamanho natural da imagem: é um valor declarado e não a renderização, mas a máscara é dada em px CSS na caixa do elemento (`parallax-field.tsx:99`), então declarado e desenhado coincidem | PASS |
| C2 | faixa de 10% a 90%, meia-largura de 9%, sobre as estrelas aglomeradas | `parallax.spec.ts:198` ✓ | `e2e/parallax.spec.ts:221`: `expect({ start, end, half }).toEqual({ start: 10, end: 90, half: 9 })`; aglomeração em `:242`: `expect(density / outside).toBeGreaterThanOrEqual(2)`. Usa os valores do checklist. Fraqueza: lê os atributos `data-band-*`, não a geometria desenhada (ver F6) | PASS |
| C3 | nenhum `feTurbulence`; nuvens nunca ampliadas mais de 2× a DPR 3 | `mobile.spec.ts:81` ✓ | `e2e/mobile.spec.ts:85`: `expect(page.locator('feTurbulence')).toHaveCount(0)`; `:89-94`: `(drawn.width * ratio) / natural.width` e a altura `toBeLessThanOrEqual(MAX_MAGNIFICATION)`, com `MAX_MAGNIFICATION = 2` e `ratio` igual a 3 (`:87`). Conferido no arquivo: `public/sky/clouds.webp` tem 1152×1152 e o ladrilho, 768 px, ou seja 768·3/1152 = 2,0 | PASS |
| C4 | em touch, o canvas dos ícones é descendente de `#solucoes`, não é `fixed`, e a distância até a `ul` varia 0 px | `mobile.spec.ts:135` ✓ | `:138` `expect(page.locator('#solucoes [data-testid="glass-shelf"]')).toHaveCount(1)`; `:139` `not.toHaveCSS('position', 'fixed')`; `:161` `for (const gap of gaps) expect(gap).toBe(gaps[0])` em 5 posições de rolagem; `:172`/`:176` vidro no slot (`> 1`) e nada ao lado (`< 0.5`). O `fixed` é testado no wrapper do R3F, não no `<canvas>`; a variação 0 é medida no `<canvas>` | PASS |
| C5 | touch: `glass-stage` não existe; ponteiro fino: existe, `fixed`, único | `mobile.spec.ts:181` ✓; `reach-and-seams.spec.ts:290` ✓ | `e2e/mobile.spec.ts:183`: `expect(page.locator('[data-testid="glass-stage"]')).toHaveCount(0)`; `e2e/reach-and-seams.spec.ts:293-295`: `[data-testid="glass-stage"] canvas` `toHaveCount(1)`; `:301`: `toHaveCSS('position', 'fixed')`. O teste de `reach-and-seams` não foi alterado e roda no projeto Desktop Chrome (ponteiro fino) | PASS |
| C6 | em touch, um modelo que falha deixa o glifo SVG | `mobile.spec.ts:187` ✓ | `:193` `expect(atom.locator('svg')).toHaveCount(1)`; `:194` `not.toHaveAttribute('data-ready', '')`; `:195-197` os outros 5 ficam `data-ready` | PASS |
| C7 | em touch, o canvas não desenha nenhum quadro com a lista a mais de 25% de tela | `mobile.spec.ts:200` ✓ | `:238` `expect(shelf).not.toHaveAttribute('data-live', '')`; `:241` `expect(await draws()).toBe(before)` depois de 1 s em `notebookAt(0.3)`. A margem está no código: `glass-shelf.tsx:15` `const LEAD = '25% 0px'`. Lacuna de precisão: o teste não sonda a fronteira de 25% (ver F4) | PASS |
| C8 | página em caixa que recorta (`overflow: hidden`) do tamanho do vidro; nenhum ancestral com `zoom` | `mobile.spec.ts:244` ✓ · manual pendente | `:270` `expect(pages).toHaveLength(3)`; `:280` `expect(zoomed).toEqual([])`; `:281` `expect(overflow).toBe('hidden')`; `:282-283` o iframe cabe na caixa interna. "Do tamanho do vidro" não é comparado ao retângulo do vidro (ver F3) | PASS (automático) · **UNVERIFIED** (manual, iPhone) |
| C9 | o documento de cada iframe é diagramado em 390, 820 e na largura da janela | `mobile.spec.ts:291` ✓; `notebook.spec.ts:137` ✓ | `e2e/mobile.spec.ts:315`: `expect(widths).toEqual(DEVICE_WIDTHS)`, com phone 390, tablet 820 e laptop `PHONE.width` (`:21-25`), lidos de `contentDocument.documentElement.clientWidth`. `e2e/notebook.spec.ts:157-170` só confere o atributo `width`. Fraquezas: em 390×844, "janela" e "390" são o mesmo número; o tablet 1180 (paisagem) e o título "Lorem ipsum dolor sit" da task ficaram fora (ver F2, F3) | PASS |
| C10 | a passagem difere no máximo 5% | `notebook.spec.ts:238` ✓ em 1440×900, 1920×1080 e 1280×720 | `e2e/notebook.spec.ts:256`: `expect(differingShare(staged, real)).toBeLessThanOrEqual(HANDOFF_MAX_SHARE)`, com `HANDOFF_MAX_SHARE = 0.05` (`:57`). Só roda em tamanhos de desktop, onde lvh = svh; a passagem no celular não é medida (ver F7) | PASS |
| C11 | o palco fixo tem a altura de `100lvh` | `mobile.spec.ts:329` ✓ · manual pendente | `:336`: `expect(stage?.height).toBe(await lengthOf(page, '100lvh'))`; `:337`: `>= innerHeight`. No Chromium com emulação, medi `svh = lvh = dvh = innerHeight = 844`, então a prova também passaria com o `h-svh` antigo (ver F1). O código tem `notebook.tsx:108` `h-lvh` | PASS (automático, não discrimina) · **UNVERIFIED** (manual, iPhone) |
| C12 | o texto do capítulo termina acima de `100dvh` | `mobile.spec.ts:342` ✓ · manual pendente | `:350-352`: `expect(box.y + box.height).toBeLessThanOrEqual(await lengthOf(page, '100dvh'))`. O termo `100lvh-100dvh` de `device-copy.tsx` (`bottom-[calc(2.5rem+100lvh-100dvh)]`) vale 0 no Chromium (ver F1) | PASS (automático, não discrimina) · **UNVERIFIED** (manual, iPhone) |
| C13 | do fim do Alcance ao Workflow, de meia em meia tela, cada título de card inteiro na janela está pintado | `mobile.spec.ts:355` ✓ · manual pendente | `:373-375`: `expect(await paintedShare(page, card)).toBeGreaterThan(0.02)`; `:379`: `expect(checked).toBeGreaterThan(0)`; o passo é `PHONE.height / 2` (`:367`) e começa em `notebookEnd + 0.25·altura` (`:361`). O limiar de 0,02 é do teste; o checklist diz só "pintado" (precisão, ver F5) | PASS (automático) · **UNVERIFIED** (manual, iPhone) |
| C14 | nenhuma fatia passa de 2 × `innerHeight`; camadas a 0,2×, 0,5× e 1,3× | `mobile.spec.ts:98` ✓; `parallax.spec.ts:27` ✓ | `e2e/mobile.spec.ts:106` `expect(slabs.length).toBeGreaterThan(0)`; `:108` `expect(height).toBeLessThanOrEqual(MAX_SLAB_SCREENS * screen)`, com `MAX_SLAB_SCREENS = 2`; `e2e/parallax.spec.ts:55` `Math.abs(moved - speed * scrolled)` `toBeLessThanOrEqual(TOLERANCE_PX)` para **cada** fatia, com `SPEEDS = {0.2, 0.5, 1.3}` | PASS |
| C15 | em touch, nenhum canvas acima de 1,5 | `mobile.spec.ts:407` ✓; `npm test` (`touchDpr`) ✓ | `e2e/mobile.spec.ts:411`: `expect(ratio).toBeLessThanOrEqual(MAX_TOUCH_DPR + 0.01)` em 4 paradas (hero, Soluções, Alcance 0,3, contato); `lib/adaptive-dpr.test.ts:53` `assert.equal(TOUCH_MAX_DPR, 1.5)` e `:54` `assert.deepEqual(touchDpr([1.5, 2], false), [1.5, 1.5])`. Um canvas com `clientWidth` 0 dá razão 0 e passa sem medir nada | PASS |
| C16 | em touch, no máximo 4 canvas WebGL | `mobile.spec.ts:414` ✓ | `:416`: `expect(canvases.length).toBeLessThanOrEqual(MAX_CANVASES)`, com `MAX_CANVASES = 4`, contando todo `canvas` (mais estrito que contar só os WebGL) em 4 paradas | PASS |
| C17 | lado a lado em 390×844, nenhuma diferença visual além das correções | só manual | não há prova automática | **UNVERIFIED** (manual, usuário) |

## Testes existentes alterados (`e2e/parallax.spec.ts`)

Li `git diff HEAD -- e2e/parallax.spec.ts`. Os limites não mudaram (`TOLERANCE_PX`, `SPEEDS`,
opacidade `<= 0.12`, `Math.abs(end - start) >= 30`, `density / outside >= 2`).

- `layers move at 0.2x…`: **mais forte**. Antes conferia uma caixa por camada; agora confere cada
  fatia de cada camada, com a mesma tolerância, e exige `slabs.length > 0` por camada (`:48`).
- `the milky way crowds the stars…`: um **enfraquecimento pequeno**. `await expect(band).toHaveCount(1)`
  virou `expect(copies.length).toBeGreaterThan(0)` (`:216`). A contagem exata saiu e não foi
  fixada em `PARALLAX_SLABS.back` (3). Em compensação, o teste ganhou duas asserções: todas as
  cópias são iguais (`:219`) e os valores exatos `{10, 90, 9}` (`:221`), que antes não eram
  conferidos.
- `the field is far stars…` (não é prova de check): os itens passaram de `layer.children` para
  `layer.querySelectorAll('[data-parallax-slab] > div > *')`. Um item posto numa camada fora de uma
  fatia deixaria de ser visto. Hoje todo item fica dentro de uma fatia (`parallax-field.tsx:303-332`),
  então não há perda real, só um seletor mais estreito.

## Landing contra o código

| Linha do `Landing` | Código | Confere |
|---|---|---|
| `GlassStage` só monta com `FINE_POINTER` | `glass-stage.tsx:47` `if (!fine) return null` (`useFinePointer` → `prefersFinePointer`, `media-preferences.ts`) | sim |
| `GlassShelf`: `<Canvas>` `position: absolute` sobre a `ul`, que desenha cada ícone no retângulo do slot medido contra o próprio canvas no mesmo quadro | `glass-shelf.tsx:84-106` (wrapper `relative` em volta da `ul`; Canvas `position:'absolute', inset:0`); `:29-50` `useFrame` lê `gl.domElement.getBoundingClientRect()` e o slot, e chama `setViewport`/`setScissor` | sim |
| `GlassIcon` registra slot e modelo na prateleira em touch; `<View>` com ponteiro fino | `glass-icon.tsx:104-105` `shelf.register(...)`; `:116` `{near && !shelf && (<View …>`. O contexto só tem valor em touch (`glass-shelf.tsx:85`) | sim |
| Fatias 3, 5 e 10; cada estrela na fatia da sua altura | `lib/parallax.ts:38-40`; `parallax-field.tsx:189-196` (`inSlab` → `slabIndex`) | sim |
| "a Via Láctea é um SVG por fatia com `viewBox` recortado" | `parallax-field.tsx:106-113` e `:323-327`: cada fatia desenha o SVG **da camada inteira** (`viewBox="0 0 100 100"`, dentro de um div de `h-[100cqh]`) e o corta pelo `overflow-clip` da fatia. O `viewBox` não é recortado | **não, literalmente** (ver F8). O efeito visual é equivalente |
| `ScaledPage`: caixa externa `w·z × h·z` com `overflow: hidden`, caixa interna `w × h` com `scale(z)` a partir do canto | `scaled-page.tsx:32-50`: `width: width * scale`, `overflow: 'hidden'`; interna `transform: scale(${scale})`, `transformOrigin: '0 0'`. Usada em `handheld.tsx:215-221` e `laptop.tsx:262-268`. Nenhum `zoom` sobrou como propriedade CSS (busca por `zoom` em `notebook/*.tsx`: só o estado `zoom` passado como `scale`) | sim |
| Nuvens: `public/sky/clouds.webp`, máscara `repeat`, ladrilho de 768 px CSS de uma imagem de 1152 px, gerada por `scripts/milky-way-clouds.mjs` | `night-sky.ts:33` `CLOUDS = { …, tile: 768, pixels: 1152 }`; `parallax-field.tsx:95-101` `maskRepeat: 'repeat'`, `maskSize: 768px 768px`; `file public/sky/clouds.webp` → 1152×1152; o script existe, com `SIZE = 1152` | sim |

## Swept "existing"

- failure modes: "existing - `useStaticPage` deixa o vidro preto". Confere: `lib/use-static-page.ts:48-50`
  engole a falha (`.catch(() => undefined)`, com comentário "without the page the device shows its
  black glass"), o iframe só monta com `html` (`handheld.tsx:224`), e a caixa interna continua
  `bg-ink` (`handheld.tsx:221`, `laptop.tsx:268`). A restrição citada está no código.

## Findings

Em ordem de peso. Nenhum é FAIL de check.

1. **F1 · nível (C11, C12)**: no Chromium com emulação touch, medi `100svh = 100lvh = 100dvh =
   innerHeight = 844` (sonda numa página com `width=device-width`, 390×844, `isMobile`). Por isso a
   prova de C11 passaria também com o `h-svh` antigo, e em C12 o termo `100lvh-100dvh` vale 0. As
   duas provas automáticas só mostram consistência e não discriminam a correção. Quem decide são as
   provas manuais no iPhone, que estão pendentes.
2. **F2 · cobertura, task → checklist (C9)**: o critério 9 da task cita o tablet em **1180 px
   (paisagem)** e o título inteiro "Lorem ipsum dolor sit", no lugar de "Lorer". O C9 e a prova dele
   cobrem 390, 820 e a janela. A paisagem do tablet existe no carrossel (`handheld.tsx:205-208`
   menciona o giro do tablet) e nenhuma prova a mede. O título também não tem prova.
3. **F3 · precisão e nível (C8, C9)**: o C8 diz "do tamanho do vidro", mas o teste confere só
   `overflow: hidden` e que o iframe cabe na caixa interna sem escala. A caixa externa não é
   comparada ao retângulo do vidro. O C9 roda numa janela de 390 px, onde "largura da janela" e
   "390" coincidem, então a asserção do laptop não distingue os dois. O bug original é do WebKit
   (`zoom` não aplicado ao documento do iframe), e o Chromium aplica `zoom` ao iframe. Por hipótese,
   não confirmada por injeção de falha (perfil light), a prova de largura do C9 passaria no código
   antigo. A asserção `zoomed == []` do C8 discrimina pela estrutura.
4. **F4 · precisão (C7)**: o teste mede só um ponto bem longe da lista (`notebookAt(0.3)`) e usa
   `drawElements` como substituto de "quadro". A fronteira de 25% fica provada pela leitura do
   código (`LEAD = '25% 0px'`), não pelo teste.
5. **F5 · precisão (C13)**: "pintado" não tem número no checklist; o teste usa `paintedShare > 0.02`.
   A task (Unresolved 2) admite que o Chromium talvez não reproduza o sumiço do iOS.
6. **F6 · enfraquecimento pequeno em teste existente (C2)**: a contagem exata `toHaveCount(1)` virou
   `> 0`, sem fixar 3 cópias. A banda é conferida pelos atributos `data-band-*`, não pela geometria
   desenhada (o padrão já era esse antes).
7. **F7 · cobertura (C10)**: o C10 diz "Sempre", mas a prova roda só em tamanhos de desktop, onde
   `-mt-[100lvh]` e `-mt-[100svh]` são iguais. A mudança para lvh em `app/page.tsx:35,61` só tem
   efeito no celular, onde a passagem não é medida.
8. **F8 · `Landing` diverge do código**: "SVG por fatia com `viewBox` recortado" não é o que o código
   faz. Cada fatia desenha o SVG da camada inteira, cortado pelo `overflow-clip` da fatia. O
   resultado visual é equivalente; o texto do `Landing` deve ser corrigido, ou o código, se o recorte
   do `viewBox` era intencional para o custo.
9. **F9 · comentário contradiz o código**: em `notebook.tsx:51-53` e `you-are-here.tsx:46-48`, o
   comentário diz "until the pointer is known … the cap holds", mas
   `touchDpr(DPR.full, fine !== false)` com `fine === null` passa `fine = true` e devolve `[1.5, 2]`
   **sem teto**. O efeito dura só até o snapshot do cliente substituir o `null` na hidratação, e o C15
   mede depois de estabilizar, então não derruba o check. Mesmo assim, o comentário ou o código está
   errado.

## Falha fora dos checks (`e2e/swallow-and-copy.spec.ts`)

`the black hole rises out through the top and is gone with the hero`: rodei isolado com
`--repeat-each=3` e passou 3/3 (24.7s). Somadas às 2 passagens isoladas relatadas antes, são 5/5. O
spec e o hero não estão no diff. Classificação: **provavelmente flaky** (tempo sob a carga da suíte
completa), não regressão. Não reproduzi a falha da suíte completa, então isso continua inferência.

## Gate

- `npm test` (node --test): 48 passed, 0 failed.
- `npx playwright test …` (as 19 provas): 23 passed, 0 failed, exit 0.
- `npx tsc --noEmit -p .`: sem erros, exit 0.
- `npm run lint`: ESLint sem problemas, exit 0.

## Pendências manuais (usuário no iPhone)

C8 (vazamento do aparelho), C11 (barra recolhida e expandida), C12 (barra expandida), C13 (rolagem
lenta e flick, para baixo e para cima), C17 (comparação lado a lado). Por F1 e F3, as provas manuais
de C8, C9, C11 e C12 são as únicas que discriminam as correções específicas do WebKit.
