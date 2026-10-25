# Landing page do portfólio — estrutura e efeitos visuais

Profile: `light` (o `AGENTS.md` do repositório não declara perfil) · handoff: `on`, budget 150k.
Base da feature: `c359f26` (`main`). Branch: `feat/landing/portfolio-lp-visual`.

Sources:

- `.tasks/portfolio-lp-visual.md` — a tarefa: 29 critérios (numerados `T1`–`T29` abaixo), fora
  de escopo, Decided, Unresolved. Nada em `Unresolved` é decidido aqui.
- Conversa com o usuário — respostas transcritas em `Sources` da tarefa (tema pelo navegador
  com os tokens de `globals.css`, rolagem contínua, movimento reduzido pelo sistema, glitch
  sem loop, troca de tema imediata).
- Referências visuais (dvlpr.pro, tamalsen.dev, thainanprado.com.br, itssharl.ee,
  codewonders.dev) — observações transcritas na tarefa. Não há design binding (sem Figma); o
  perfil `light` não compara telas.

## Out of scope

- Destino real dos CTAs, conteúdo real, SEO/`lang`, header/footer, cursor customizado,
  granulação — copiados da tarefa; ver Unresolved 1–2 dela.
- Seletor de tema na página — o tema segue o navegador.
- Comportamento em toque e larguras < 375 px além de T2 — Unresolved 3 da tarefa.

## Landing

Toca `app/page.tsx`, `app/globals.css`, `components/organisms/laptop-hero/*` e novas seções em
`components/` seguindo atoms/molecules/organisms. Reusa `readColorToken`/`COLOR_TOKENS` para
toda cor lida em JS, o padrão `useScrollProgress` (ref lida por frame, sem re-render) para o
parallax, Lenis para a rolagem e o padrão `glass-motion.ts` (matemática pura testada à parte do
componente) para malha, parallax e glitch.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Nenhuma dependência nova de runtime (Decided da tarefa) | `dependencies` do `package.json` igual a `c359f26` | `@react-three/postprocessing` (passe extra sobre seis `MeshTransmissionMaterial`), `gsap` (Lenis + `useScrollProgress` já existem) |
| Testes de navegador com `@playwright/test` (devDependency, forçado) | `devDependencies["@playwright/test"] = "1.64.1"` (mesma versão dos navegadores já em `~/.cache/ms-playwright`, chromium-1248); script `"test:e2e": "playwright test"`; specs em `e2e/*.spec.ts`; `playwright.config.ts` sobe o app com `webServer` | `node:test` + jsdom: não renderiza WebGL, layout nem pixels, então não alcança T2, T12–T17, T21, T26 — escolha forçada, não comparada |
| Testes e2e nunca tocam a rede externa (constituição VI) | fixture compartilhada em `e2e/fixtures.ts` com `page.route('**/*', …)` que aborta toda requisição cujo host não é `localhost`/`127.0.0.1`; todo spec importa `test` dessa fixture | mockar só o iframe do `SCREEN_URL`: deixa qualquer requisição nova escapar em silêncio |
| Malha do hero em `<canvas>` 2D atrás de um canvas WebGL transparente (padrão novo no repo) | `<canvas data-testid="hero-grid">` 2D, `pointer-events: none`, atrás do `<Canvas gl={{ alpha: true }}>` do R3F; a cena não usa mais `<color attach="background">`, o fundo vem do CSS do tema; piso com alpha que some antes das bordas, para a malha aparecer em volta | linhas dentro da cena 3D: névoa e piso opacos as escondem, e só diferença de pixels de uma cena animada (laptop e ícones se movendo) provaria a curvatura |

- Nada mais nesta mudança é difícil de reverter.

## Checks

Comandos reais: unit `node --test <arquivo>` (o `npm test` do repo roda `node --test` sobre
`lib/**` e `components/**`); e2e `npx playwright test <spec> -g "<título>"`. Viewport padrão dos
e2e: 1440×900, salvo onde o check diz outra coisa.

### S1 — Estrutura da LP com conteúdo lorem ipsum · T1–T11 · 3 arquivos · 3 KB · ~1k (+ seções novas)

**C1** — `<main>` contém exatamente nove `<section>`, com `id` nesta ordem: `hero`,
`prova-social`, `sobre`, `solucoes`, `cases`, `workflow`, `depoimentos`, `faq`, `contato` (T1)
Proof: `npx playwright test e2e/sections.spec.ts -g "main has the nine sections in order"`

**C2** — Cada seção exceto `hero` tem um `<h2>` e pelo menos um parágrafo com "Lorem ipsum" ou
"lorem" (T1)
Proof: `npx playwright test e2e/sections.spec.ts -g "every section but hero has an h2 and lorem text"`

**C3** — Em 1440×900 com rolagem 0, o `<h1>`, o subtítulo e o CTA do hero estão inteiros
dentro da viewport e por cima do canvas (T2)
Proof: `npx playwright test e2e/sections.spec.ts -g "hero copy fits the first screen at 1440x900"`

**C4** — O mesmo em 375×667 (T2)
Proof: `npx playwright test e2e/sections.spec.ts -g "hero copy fits the first screen at 375x667"`

**C5** — Acionar o CTA do hero rola a página até o topo de `#contato` ficar dentro da viewport
(T3)
Proof: `npx playwright test e2e/sections.spec.ts -g "hero CTA scrolls to contato"`

**C6** — `#contato` tem um `<h2>`, um parágrafo lorem e um botão de CTA (T4)
Proof: `npx playwright test e2e/sections.spec.ts -g "contato has heading, text and CTA button"`

**C7** — `#prova-social` mostra 6 logos de exemplo (T5)
Proof: `npx playwright test e2e/sections.spec.ts -g "social proof shows six placeholder logos"`

**C8** — `#sobre` mostra um espaço reservado para foto e 2 parágrafos lorem (T6)
Proof: `npx playwright test e2e/sections.spec.ts -g "about shows a photo placeholder and two paragraphs"`

**C9** — `#solucoes` mostra 6 cards, cada um com ícone, título e descrição (T7)
Proof: `npx playwright test e2e/sections.spec.ts -g "solutions shows six cards with icon, title and text"`

**C10** — `#cases` mostra 3 cases, cada um com imagem, título, descrição e 3 tags (T8)
Proof: `npx playwright test e2e/sections.spec.ts -g "cases shows three cases with image, title, text and three tags"`

**C11** — `#workflow` mostra 6 etapas numeradas `01` a `06`, a primeira com título `Discovery`
e a última com título `Deploy` (T9)
Proof: `npx playwright test e2e/sections.spec.ts -g "workflow shows six numbered steps from Discovery to Deploy"`

**C12** — `#depoimentos` mostra 3 depoimentos, cada um com texto, nome, cargo e avatar (T10)
Proof: `npx playwright test e2e/sections.spec.ts -g "testimonials shows three quotes with name, role and avatar"`

**C13** — `#faq` mostra 5 perguntas, todas com a resposta oculta ao carregar (T11)
Proof: `npx playwright test e2e/sections.spec.ts -g "faq shows five closed questions"`

**C14** — Acionar uma pergunta fechada mostra a resposta; acionar de novo a oculta (T11)
Proof: `npx playwright test e2e/sections.spec.ts -g "faq question opens and closes"`

### S4 — Parallax entre as seções · T18–T20 · 2 arquivos · 2 KB · ~1k (+ camadas novas)

**C15** — Ao rolar 400 px, as camadas `[data-parallax-layer]` se deslocam na tela à velocidade
declarada: `back` 0,2×, `mid` 0,5×, `front` 1,3× da rolagem, com tolerância de ±4 px (T18)
Proof: `node --test lib/parallax.test.ts`
Proof: `npx playwright test e2e/parallax.spec.ts -g "layers move at 0.2x, 0.5x and 1.3x of the scroll"`

**C16** — A camada `front` são barras arredondadas nas cores `primary`, `steel` e `mist`, com
`filter: blur(≥ 8px)`, a até 15% da largura da tela de uma borda lateral (T19)
Proof: `npx playwright test e2e/parallax.spec.ts -g "front layer is blurred code bars near the side edges"`

**C17** — A camada `mid` tem um octaedro e um cubo arredondado, cada um com brilho
(`box-shadow` ou `drop-shadow` diferente de `none`) (T20)
Proof: `npx playwright test e2e/parallax.spec.ts -g "middle layer has a glowing octahedron and rounded cube"`

### S5 — Glitch e malha de fundo · T21–T23 · 2 arquivos · 2 KB · ~1k (+ componente novo)

**C18** — Quando um `<h2>` entra na viewport, ele dispara uma rajada de glitch que termina em
até 600 ms (T21)
Proof: `npx playwright test e2e/glitch.spec.ts -g "a heading glitches once when it scrolls into view"`

**C19** — Passar o ponteiro sobre um `<h2>` dispara uma rajada que termina em até 600 ms (T21)
Proof: `npx playwright test e2e/glitch.spec.ts -g "hovering a heading triggers one burst"`

**C20** — Sem nova entrada nem hover, o título não volta a glitchar por 6 s depois da rajada
(T21)
Proof: `npx playwright test e2e/glitch.spec.ts -g "no burst repeats on its own"`

**C21** — Durante a rajada há duas cópias do texto, uma com cor `primary` e outra `mist` (tema
escuro), deslocadas no máximo 4 px na horizontal e com `clip-path` diferente de `none` (T21)
Proof: `npx playwright test e2e/glitch.spec.ts -g "a burst shows a primary and a mist copy, shifted at most 4px and sliced"`

**C22** — Em qualquer janela de 1 s, o glitch muda o texto no máximo 3 vezes (T22)
Proof: `node --test lib/glitch.test.ts`

**C23** — As cópias têm `aria-hidden="true"` e cada título tem um único nome acessível igual
ao texto (T22)
Proof: `npx playwright test e2e/glitch.spec.ts -g "copies are hidden from assistive tech"`

**C24** — Fora do hero, o fundo tem malha de linhas de 1 px, células de 80 px e alpha ≤ 0,06
(T23)
Proof: `npx playwright test e2e/glitch.spec.ts -g "sections background is an 80px grid at most 6% opaque"`

**C25** — O fundo tem dois brilhos radiais desfocados, um `primary` e outro `steel` (T23)
Proof: `npx playwright test e2e/glitch.spec.ts -g "sections background has a primary and a steel glow"`

### S2 — Malha interativa no hero · T12–T15 · 4 arquivos · 25 KB · ~6k

**C26** — Com o ponteiro fora do hero, a malha `[data-testid=hero-grid]` tem linhas retas,
horizontais e verticais, a cada 48 px (T12)
Proof: `node --test components/organisms/laptop-hero/grid-motion.test.ts`
Proof: `npx playwright test e2e/hero-grid.spec.ts -g "grid is straight and 48px apart at rest"`

**C27** — Com o ponteiro em movimento, linhas a até 160 px dele se deslocam mais de 0 e no
máximo 12 px (T13)
Proof: `node --test components/organisms/laptop-hero/grid-motion.test.ts`
Proof: `npx playwright test e2e/hero-grid.spec.ts -g "lines near a moving pointer bend at most 12px"`

**C28** — Com o ponteiro em movimento, linhas a mais de 160 px dele continuam retas (T13)
Proof: `npx playwright test e2e/hero-grid.spec.ts -g "lines beyond 160px stay straight"`

**C29** — 800 ms depois de o ponteiro parar sobre o hero, todas as linhas estão retas (T14)
Proof: `node --test components/organisms/laptop-hero/grid-motion.test.ts`
Proof: `npx playwright test e2e/hero-grid.spec.ts -g "lines straighten within 800ms after the pointer stops"`

**C30** — 800 ms depois de o ponteiro sair do hero, todas as linhas estão retas (T14)
Proof: `npx playwright test e2e/hero-grid.spec.ts -g "lines straighten within 800ms after the pointer leaves"`

**C31** — A malha não intercepta o ponteiro: `pointer-events: none`, e o elemento no centro do
hero é exatamente a `<div>` que envolve o `<canvas>` WebGL do R3F (`canvas.parentElement`), não
a malha (T15). Renegociado com o usuário na rodada 1 da verificação: o drei põe
`pointer-events: none` no próprio `<canvas>`, e o R3F escuta eventos nessa `<div>`.
Proof: `npx playwright test e2e/hero-grid.spec.ts -g "grid never takes the pointer from the 3D canvas"`

### S3 — Iluminação do hero · T16–T17 · 2 arquivos · 14 KB · ~4k

C32–C34 valem no tema escuro (`colorScheme: 'dark'`); o tema claro tem C52. Renegociado com o
usuário na rodada 1 da verificação.

**C32** — No tema escuro, o pixel mais claro da metade de cima do canvas do hero tem luminância relativa ≥ 0,9
e fica acima do topo do laptop; a 40 px dele a luminância fica entre 0,15 e 0,9 (núcleo e
halo) (T16)
Proof: `npx playwright test e2e/hero-light.spec.ts -g "a glowing light core with a halo sits above the laptop"`

**C33** — No tema escuro, o piso logo abaixo da luz é mais claro que o piso do lado oposto do laptop (T17)
Proof: `npx playwright test e2e/hero-light.spec.ts -g "floor facing the light is brighter than the far side"`

**C34** — No tema escuro, o lado do laptop voltado para a luz é mais claro que o lado oposto (T17)
Proof: `npx playwright test e2e/hero-light.spec.ts -g "laptop side facing the light is brighter"`

**C52** — No tema claro, o halo da luz aparece sobre o fundo branco: no anel de 40 px em volta
do centro da luz, a média de (azul − vermelho) é ≥ 20 (escala 0–255), enquanto no céu longe da
luz e dos ícones ela é ≤ 3 (T16). Adicionado com o usuário na rodada 1 da verificação.
Proof: `npx playwright test e2e/hero-light.spec.ts -g "light scheme shows a primary-tinted halo against white"`

### S6 — Hero 3D preservado · T24 · 3 arquivos · 23 KB · ~6k

**C35** — As janelas `STRAIGHTEN`, `OPEN` e `POWER_ON` de `laptop.tsx` não mudam (T24)
Proof: `git diff c359f26 -- components/organisms/laptop-hero/laptop.tsx | grep -E '^[-+].*(STRAIGHTEN|OPEN|POWER_ON) = '; test $? -eq 1`

**C36** — `MOTION`, `ORBIT` e o resto de `glass-motion.ts` não mudam, e os testes existentes
dele passam (T24)
Proof: `git diff --quiet c359f26 -- components/organisms/laptop-hero/glass-motion.ts components/organisms/laptop-hero/glass-motion.test.ts`
Proof: `node --test components/organisms/laptop-hero/glass-motion.test.ts`

**C37** — Rolar o hero até o fim liga a tela do laptop: o iframe chega a `opacity` ≥ 0,9 (T24)
Proof: `npx playwright test e2e/hero-light.spec.ts -g "scrolling through the hero powers the laptop on"`

### S7 — Tema claro e escuro conforme o navegador · T25–T28 · 4 arquivos · 16 KB · ~4k

**C38** — Em `colorScheme: 'dark'`, o fundo das seções é `ink` (`rgb(16, 17, 19)`) e o texto
`mist` (`rgb(242, 247, 255)`) (T25)
Proof: `npx playwright test e2e/theme.spec.ts -g "dark scheme paints ink background and mist text"`

**C39** — Em `colorScheme: 'light'`, o fundo é branco (`rgb(255, 255, 255)`) e o texto `ink`
(T25)
Proof: `npx playwright test e2e/theme.spec.ts -g "light scheme paints white background and ink text"`

**C40** — O céu da cena 3D (pixel no canto superior esquerdo do hero) tem a cor de fundo do
tema: `ink` no escuro, branco no claro, ±3 por canal (T26)
Proof: `npx playwright test e2e/theme.spec.ts -g "3D scene sky matches the theme background"`

**C41** — A névoa e o piso da cena usam a cor de fundo do tema (T26)
Proof: `npx playwright test e2e/theme.spec.ts -g "far floor fades into the theme background"`

**C42** — No tema claro, as cópias do glitch são `primary` e `steel` (T27)
Proof: `npx playwright test e2e/theme.spec.ts -g "light scheme glitch copies are primary and steel"`

**C43** — No tema claro, as linhas da malha do hero e da malha de fundo são `steel` (T27)
Proof: `npx playwright test e2e/theme.spec.ts -g "light scheme grids are drawn in steel"`

**C44** — Trocar `colorScheme` com a página aberta, sem recarregar, troca o fundo das seções
(T28)
Proof: `npx playwright test e2e/theme.spec.ts -g "switching scheme live repaints the sections"`

**C45** — Trocar `colorScheme` com a página aberta troca o céu da cena 3D (T28)
Proof: `npx playwright test e2e/theme.spec.ts -g "switching scheme live repaints the 3D scene"`

### S8 — Movimento reduzido conforme o sistema · T29 · 3 arquivos · ~6 KB · ~2k

**C46** — Com `reducedMotion: 'reduce'`, entrar na viewport ou passar o ponteiro num `<h2>` não
dispara glitch (T29)
Proof: `npx playwright test e2e/reduced-motion.spec.ts -g "no glitch under reduced motion"`

**C47** — Com `reducedMotion: 'reduce'`, a malha do hero continua reta com o ponteiro em
movimento (T29)
Proof: `npx playwright test e2e/reduced-motion.spec.ts -g "hero grid stays straight under reduced motion"`

**C48** — Com `reducedMotion: 'reduce'`, as camadas do parallax não se deslocam em relação ao
conteúdo ao rolar (T29)
Proof: `npx playwright test e2e/reduced-motion.spec.ts -g "parallax layers stay put under reduced motion"`

**C49** — Com `reducedMotion: 'reduce'`, rolar o hero até o fim ainda liga a tela do laptop
(iframe `opacity` ≥ 0,9) (T29)
Proof: `npx playwright test e2e/reduced-motion.spec.ts -g "laptop still opens with the scroll under reduced motion"`

### Gates de entrega (constituição I, III, XIV)

**C50** — Tipos, lint e build sem erros novos
Proof: `npx tsc --noEmit`
Proof: `npm run lint`
Proof: `npm run build`

**C51** — Nenhuma requisição e2e sai para fora de `localhost`
Proof: `npx playwright test e2e/fixtures.spec.ts -g "external requests are aborted"`

## Swept

- validation: n/a — nenhum campo de entrada; FAQ em C13–C14
- failure modes: existing — GLB sem nós lança em `findParts`; WebGL ausente não é tratado hoje; não muda
- idempotency: C20 — a rajada não se repete sozinha; C14 — reabrir/fechar o FAQ é simétrico
- authorization: n/a — página pública
- concurrency: n/a — sem requisições nem estado compartilhado; a ordem de frames `BEFORE_HTML` é existente (C35–C36)
- data lifecycle: n/a — nada persistido
- dependency failure: C51 — e2e corta a rede; em produção o iframe do `SCREEN_URL` fica preto se falhar (existing)
- state transitions: C14 (FAQ), C18–C20 (glitch), C44–C45 (tema ao vivo)
- observability: n/a — página estática sem telemetria

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| seções de T1 (9) | C1, por lista ordenada das 9; conteúdo: `prova-social` C7 · `sobre` C8 · `solucoes` C9 · `cases` C10 · `workflow` C11 · `depoimentos` C12 · `faq` C13 · `contato` C6 · `hero` C3 | - |
| viewports de T2 (2) | 1440×900 C3 · 375×667 C4 | - |
| camadas do parallax (3) | `back` · `mid` · `front`, tabela em C15 | - |
| gatilhos do glitch (2) | entrada na viewport C18 · hover C19 | - |
| temas (2) × superfície (5) | fundo/texto: dark C38 · light C39; céu 3D: dark/light C40; glitch: dark C21 · light C42; malhas: light C43 · dark C24 + C26 rodando também em `colorScheme: 'dark'` (rodada 2); luz: dark C32–C34 · light C52 | - |
| troca de tema ao vivo (2 superfícies) | seções C44 · cena 3D C45 | - |
| efeitos sob movimento reduzido (4) | glitch off C46 · malha off C47 · parallax off C48 · laptop on C49 | - |
| montagens do app nos e2e (2) | `next` servido pelo `webServer` do `playwright.config.ts` é a única montagem; testes unitários não montam o app | - |

- Nenhum check cita status HTTP, rota de API ou forma de resposta.
- C32–C34 provam a iluminação por pixels; um teste assim passaria também se as luzes atuais já
  bastassem — limite aceito no perfil `light`.

## Handoff

Soma dos pisos ≈ 25k tokens de leitura, muito abaixo de 150k: pela aritmética caberia em um lote.
Divido mesmo assim na troca de superfície, porque a metade que a aritmética não mede (iterar
testes de pixel sobre WebGL) é toda do hero:

- **Lote 1 — DOM e CSS:** infraestrutura e2e (C51), S1, S4, S5 (C1–C25). Lê `app/*`, CSS, seções novas.
- **Lote 2 — hero WebGL e transversais:** S2, S3, S6, S7, S8 (C26–C50). Lê `components/organisms/laptop-hero/*`.

S7 e S8 vão no lote 2 porque dependem de elementos dos dois lotes (malha do hero, glitch,
parallax).

**Fronteira do lote 1:** C1–C25 e C51 fechados, provas verdes; commits `4bc592b`, `01cdd1c`,
`9c1789a`, `17d624b` (HEAD `17d624b`). Servidor e2e: `npm run build && npm run start -- --port
3100`, `workers: 1`, Chromium com `--use-gl=angle --use-angle=gl --ignore-gpu-blocklist
--enable-unsafe-swiftshader`. Helpers em `e2e/page-helpers.ts`; cores por tema já expostas em
`--glitch-a`, `--glitch-b`, `--grid-line` (`:root` de `globals.css`, sem override claro ainda).

**Decidido pelo usuário durante o build:** nada novo além do que está em `Sources` da tarefa.
Nota do lote 1: C3/C4 rodam em `colorScheme: 'dark'` porque no claro o texto `ink` fica sobre
a cena sempre `ink`; isso deixa de valer quando C40–C41 fecharem. `<Canvas>` ganhou `isolate`
(o `<Html occlude>` do drei põe z-index na casa dos milhões). Risco para C31: o canvas tem
`pointer-events: none` e, em 375 px, o `<h1>` cobre o centro do hero.

**Abandonado:** nada.

**Fronteira do lote 2:** C26–C50 fechados; commits `abfc8dc`, `d2e96af`, `9ef6b19`, `1885dce`,
`e229037`, `fcf3d04` (HEAD `fcf3d04`). Suítes completas: `npm test` 45/45, `npm run test:e2e`
49/49.

**Decidido durante o build (lote 2):** C31 aceita como alvo o wrapper do `<Canvas>` do R3F
dentro de `[data-testid="hero-scene"]`, porque o `<Html occlude="blending">` do drei põe
`pointer-events: none` no próprio `<canvas>` (intenção do claim: a malha não pega o ponteiro).
C32–C34 medem no tema escuro (no claro o céu branco é o pixel mais claro). Em
`e2e/sections.spec.ts` o locator de C3/C4 passou a `[data-testid="hero-scene"] canvas` (dois
canvases no hero); o comentário `hazard:` desses testes sobre a cena ser sempre `ink` ficou
desatualizado.

**Abandonado (lote 2):** hook temporário de ajuste da luz por URL em `hero-light.tsx`, removido
antes do commit.
