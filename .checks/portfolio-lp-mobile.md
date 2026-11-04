# Landing page do portfólio — correções no celular

Sources:

- `.tasks/portfolio-lp-mobile.md` - a task: 17 critérios, 1 Decided, 5 Unresolved em aberto.
- Vídeo `/home/joao-eduardo/Downloads/evidência_iphone_6s.mp4` - evidência dos problemas 1–5.
- `.tasks/portfolio-lp-reach-and-seams.md`, Decided 1 - o canvas único que esta task restringe ao
  ponteiro fino.

## Out of scope

- Mudanças no desktop além dos critérios 1–3 - a task.
- Simplificar o visual no celular - o usuário escolheu "mesmo visual, mais leve".
- iOS 15 - Unresolved 1 da task, assumido iOS 16.4+.
- Os wrappers de `SKY_FADE`, que têm a altura do bloco: são máscaras estáticas, não camadas que se
  movem; o critério 14 fala das camadas do parallax.

## Landing

Toca `parallax-field` (camadas em fatias, nuvens como imagem), `glass-stage` (prateleira de touch),
`notebook` (página escalada sem `zoom`, palco em `lvh`), `lib/adaptive-dpr` (teto de touch) e
`app/page.tsx`. Reaproveita `useNearViewport`, `FINE_POINTER`, `GlassMesh`/`SharedEnvironment` e o
padrão de teste touch de `reach-and-seams.spec.ts` (`isMobile`, `hasTouch`).

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Em touch, os ícones são desenhados por `GlassShelf`, um `<Canvas>` `position: absolute` sobre a `ul` de `#solucoes`, que desenha cada ícone no retângulo do slot medido em relação ao próprio canvas no mesmo quadro; `GlassStage` só monta com `FINE_POINTER` (task, Decided 1) | `<GlassShelf>` (client) envolve a `ul`; `GlassIcon` registra slot e modelo no contexto da prateleira em touch e usa `<View>` com ponteiro fino | drei `<View>` no canvas da prateleira: calcula a posição com o `size.top` do store, medido com 50 ms de atraso na rolagem (`View.js`, `computeContainerPosition`), e erraria o slot durante a rolagem |
| As camadas do parallax viram fatias: `[data-parallax-layer]` deixa de se mover e cada `[data-parallax-slab]` dentro dela recebe o deslocamento | 3, 5 e 10 fatias para `back`, `mid` e `front`; cada estrela vai para a fatia da sua altura; cada fatia de `back` desenha o SVG da Via Láctea na altura da camada, cortado pelo `overflow-clip` da fatia | Camada inteira composta, como hoje: a da frente mede 8.397 px em 390×844 |
| A página dos aparelhos é reduzida com `transform: scale()` dentro de uma caixa que recorta, não com CSS `zoom` | `ScaledPage`: caixa externa `w·z × h·z`, `overflow: hidden`; caixa interna `w × h` com `scale(z)` a partir do canto | `zoom` no ancestral do iframe (hoje): o WebKit não aplica o `zoom` ao documento do iframe, que se diagrama na caixa reduzida. É a hipótese para "Lorer" e o vazamento (não verificada no iOS) |
| As nuvens da Via Láctea são uma imagem pré-gerada (`public/sky/clouds.webp`) aplicada como máscara em ladrilhos de tamanho fixo em px, gerada por `scripts/milky-way-clouds.mjs` | máscara `repeat`, ladrilho de 768 px CSS de uma imagem de 1152 px | `feTurbulence` ao vivo esticado ao SVG (hoje): razão de 4,55 a 5,14 em 390×844 e custo por quadro |

- Nada mais nesta mudança é difícil de reverter

## Checks

### S1 - Céu sem distorção · 4 files · 22 KB · ~6k

**C1** - Em 390×844 e 1440×900, a razão entre as escalas vertical e horizontal das nuvens fica entre 0,95 e 1,05
Proof: `npx playwright test e2e/mobile.spec.ts -g "the milky way clouds keep their shape"`

**C2** - A faixa vai de 10% a 90% da camada, com meia-largura de 9%, por cima das estrelas aglomeradas
Proof: `npx playwright test e2e/parallax.spec.ts -g "the milky way crowds the stars along a faint diagonal"`

**C3** - Nenhum `feTurbulence` na página, e as nuvens nunca ampliadas mais de 2× em pixels de dispositivo (DPR 3)
Proof: `npx playwright test e2e/mobile.spec.ts -g "the sky draws no live noise"`

### S2 - Ícones presos aos cards · 9 files · 25 KB · ~7k

**C4** - Em touch, o canvas dos ícones é descendente de `#solucoes`, não é `fixed`, e sua distância à `ul` varia 0 px ao rolar
Proof: `npx playwright test e2e/mobile.spec.ts -g "on touch the glass icons scroll with their cards"`

**C5** - Em touch, `[data-testid="glass-stage"]` não existe; com ponteiro fino, existe, `fixed`, único
Proof: `npx playwright test e2e/mobile.spec.ts -g "on touch there is no full-window glass stage"`
Proof: `npx playwright test e2e/reach-and-seams.spec.ts -g "one canvas for all the glass"`

**C6** - Em touch, um modelo que não carrega deixa o glifo SVG no card
Proof: `npx playwright test e2e/mobile.spec.ts -g "on touch a missing model leaves the glyph"`

**C7** - Em touch, o canvas dos ícones não desenha nenhum quadro com a lista a mais de 25% de tela da janela
Proof: `npx playwright test e2e/mobile.spec.ts -g "on touch the icons canvas rests away from the list"`

### S3 - Aparelhos inteiros no Alcance · 3 files · 28 KB · ~7k

**C8** - A página de cada aparelho fica numa caixa que recorta (`overflow: hidden`) do tamanho do vidro, e nenhum ancestral do iframe usa CSS `zoom`
Proof: `npx playwright test e2e/mobile.spec.ts -g "every device page stays inside its glass"`
Proof: manual - usuário no iPhone (task, Unresolved 2)

**C9** - O documento de cada iframe se diagrama na largura do aparelho: 390, 820 e a largura da janela
Proof: `npx playwright test e2e/mobile.spec.ts -g "every device page lays out at its device width"`
Proof: `npx playwright test e2e/notebook.spec.ts -g "every device shows the projects section at its own width"`

**C10** - A passagem do laptop para a seção real difere no máximo 5% (`HANDOFF_MAX_SHARE`)
Proof: `npx playwright test e2e/notebook.spec.ts -g "the stage hands over to the real page"`

### S4 - Sem tarja no Alcance · 3 files · 13 KB · ~3k

**C11** - O palco fixo do Alcance tem a altura de `100lvh`, a janela com a barra recolhida
Proof: `npx playwright test e2e/mobile.spec.ts -g "the alcance stage is as tall as the largest viewport"`
Proof: manual - usuário no iPhone, barra recolhida e expandida

**C12** - O texto do capítulo termina acima de `100dvh`, a borda da janela com a barra expandida
Proof: `npx playwright test e2e/mobile.spec.ts -g "the chapter copy ends above the dynamic viewport"`
Proof: manual - usuário no iPhone, barra expandida

### S5 - Cases presentes depois do Alcance · 2 files · ~3k

**C13** - Do fim do Alcance ao Workflow, em passos de meia tela, o título de cada card dos Cases está pintado sempre que está inteiro na janela (o título da seção já passou do topo quando a passagem termina, a 0,25 tela do fim)
Proof: `npx playwright test e2e/mobile.spec.ts -g "the cases stay painted from the alcance to the workflow"`
Proof: manual - usuário no iPhone, rolagem lenta e flick

### S6 - Fluidez no celular · 5 files · 11 KB · ~3k

**C14** - Em 390×844, nenhuma fatia do parallax passa de 2 × `innerHeight`, e as camadas seguem a 0,2×, 0,5× e 1,3× da rolagem
Proof: `npx playwright test e2e/mobile.spec.ts -g "no parallax slab is taller than two screens"`
Proof: `npx playwright test e2e/parallax.spec.ts -g "layers move at 0.2x, 0.5x and 1.3x of the scroll"`

**C15** - Em touch, nenhum canvas desenha acima de 1,5 pixel de buffer por px CSS
Proof: `npx playwright test e2e/mobile.spec.ts -g "on touch no canvas draws above 1.5x"`
Proof: `node --test lib/adaptive-dpr.test.ts` (`touchDpr`)

**C16** - Em touch, no máximo 4 canvas WebGL na página em qualquer ponto da rolagem
Proof: `npx playwright test e2e/mobile.spec.ts -g "on touch at most four webgl canvases"`

**C17** - Lado a lado com a versão atual em 390×844, nenhuma diferença visual além das correções
Proof: manual - usuário

## Swept

- validation: n/a - sem entrada.
- failure modes: C6; existing - `useStaticPage` deixa o vidro preto.
- idempotency and retry: n/a.
- authorization: n/a - página pública.
- concurrency and ordering: C4 (rolagem nativa × quadro), C11 (barra do navegador no meio da rolagem).
- data lifecycle: n/a.
- external-dependency failure: n/a - o WebGL ausente afeta a prateleira como já afeta o palco.
- state transitions: task Unresolved 5 - ponteiro lido no carregamento.
- observability: task Unresolved 4 - sem meta de fps.

## Handoff

S1–S6 somam ~30k de leitura, tudo num lote: sem handoff. WebKit do Playwright não roda nesta máquina
(faltam `libevent`, `libavif`, `libbacktrace`; exige sudo): provas em Chromium com emulação touch.
