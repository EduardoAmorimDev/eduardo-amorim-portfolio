# Landing page do portfólio — Alcance termina no aparelho de quem visita

Sources:

- `.tasks/portfolio-lp-device-last.md` - a task: 12 critérios em 4 fatias, 1 Decided, 1 Unresolved
  (tablet deitado com 1024 px ou mais conta como laptop: fica escrito assim).
- `.checks/portfolio-lp-mobile-alcance.md`, C2–C4, e `.checks/portfolio-lp-mobile.md`, C8 - o que
  os critérios 10 e 11 mantêm.

Profile: `light`. O repositório não tem `docs/constitution.md`; vale só a constituição geral.

## Out of scope

- Gestos de entrada, janelas de tempo do carrossel e texto dos capítulos, além do que os
  critérios 4 e 5 exigem - a task.
- Escolher o aparelho pelo user agent ou pelo tipo de ponteiro - a task (a largura da janela).

## Landing

Toca `notebook/stages.ts` (aparelho de quem visita, ordem, janelas por posição, `ScreenView`),
`notebook/devices.ts` (novo: specs e geometria do celular e do tablet, antes em `handheld.tsx`),
`use-viewer-device.ts` (novo), `device-carousel.tsx`, `handheld.tsx`, `laptop.tsx`,
`device-copy.tsx`, `notebook.tsx` e `notebook-scene.tsx`. Reaproveita `isSideLayout`/`SIDE_MIN_WIDTH`
(o `lg`), `useSyncExternalStore` como em `use-fine-pointer.ts`, `ScaledPage`, `restRenderScale`,
`renderScale` e o mergulho de hoje, que passa a ler a `ScreenView` de qualquer aparelho.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| A ordem do carrossel depende do aparelho de quem visita, e o mergulho serve a qualquer aparelho (task, Decided) | `viewerDevice(width): 'phone' \| 'tablet' \| 'laptop'` em `stages.ts`; `deviceOrder(viewer) = [...['phone','tablet','laptop'] sem viewer, viewer]`; `SLOTS` (1º, 2º, último) com as janelas `in`, `out`, `turn`, `own`; cada aparelho preenche a `ScreenView` quando é o último | Ordem fixa com o laptop por último (hoje): o mergulho acontece num aparelho que quem visita não tem na mão |

- Nada mais aqui é difícil de reverter. Decisões reversíveis que a task deixou abertas:
  - laptop em 2º lugar: o seu gesto (endireitar, abrir, ligar) corre de quando começa a entrar até
    quando começa a sair, `[0.22, 0.42]`, com a mesma duração de hoje (0,2); rejeitado `[0.32, 0.52]`
    (depois de entrar, como hoje), que o deixaria ainda abrindo enquanto sai;
  - tablet em 1º lugar: vira em `[0.15, 0.21]`, 0,06 centrado no seu repouso `[0.14, 0.22]`, como o
    `[0.34, 0.40]` de hoje no repouso `[0.32, 0.42]`;
  - celular por último numa janela mais larga que alta (< 768 px): o corpo vira para paisagem como o
    tablet, com o lado curto da tela na largura de sempre do celular; rejeitado um celular de pé
    com a tela larga, que encolheria a altura para ~0,5 unidade;
  - a moldura (`Frame`) do celular e do tablet cresce na mesma razão que o corpo, quando a página
    da janela o deixa maior que o desenhado; nas medidas de hoje fica a mesma;
  - `useViewerDevice` lê `innerWidth` no `resize` (a mesma largura das media queries); no servidor
    responde `laptop`, a ordem de hoje, e o cliente corrige ao hidratar.

## Checks

Cada check tem o número do critério da task.

### S1 - Aparelho de quem visita · 3 files · ~4k

**C1** - A largura escolhe o aparelho: 0, 390 e 767 px → celular; 768, 820 e 1023 → tablet; 1024,
1440 e 1920 → laptop
Proof: `node --test components/organisms/notebook/stages.test.ts` (`the window width picks the visitor's device`)
Proof: `npx playwright test e2e/notebook.spec.ts -g "the window width picks the last device at"` (767, 768, 1023, 1024: o último capítulo é o do aparelho)

**C2** - Redimensionar no meio do Alcance (1440 → 390 → 1440, em p = 0,1) refaz a ordem: os
rótulos mudam, há sempre 3 páginas com títulos distintos, e em cena só a do aparelho da 1ª posição
(celular em 1440, tablet em 390)
Proof: `npx playwright test e2e/notebook.spec.ts -g "crossing a width limit mid-Alcance reorders the devices"`

### S2 - Ordem do carrossel · 4 files · ~6k

**C3** - O último é o de quem visita e os outros mantêm a ordem de hoje: laptop → celular, tablet,
laptop; tablet → celular, laptop, tablet; celular → tablet, laptop, celular
Proof: `node --test components/organisms/notebook/stages.test.ts` (`the visitor's device comes last`)
Proof: `npx playwright test e2e/notebook.spec.ts -g "the devices come on stage in the visitor's order at"` (1440×900, 820×1180, 390×844: a única página em cena em p = 0,1, 0,37 e 0,62)

**C4** - Cada aparelho mantém o seu gesto em qualquer posição:
- o laptop em 2º lugar (820×1180) abre e liga: em p = 0,2 a página está apagada (opacidade ≤ 0,05);
  em p = 0,41 acesa (≥ 0,9) e aberta (altura/largura da página na tela ≥ 0,6);
- o celular por último (390×844) chega de frente: em p = 0,45 a sua página está centrada (centro a
  menos de 10% da largura do meio da janela) e mais estreita que em p = 0,62;
- o tablet que não é o último vira: em 1º lugar (390×844) a página é 820×1180 em p = 0,12 e
  1180×820 em p = 0,215; em 2º lugar (1440) como hoje;
- o tablet por último não vira e termina na orientação da janela: 820×1180 → página 820×1180 em
  p = 0,62 e 0,9; 1000×700 → 1000×700 em p = 0,62 e 0,9.

Proof: `npx playwright test e2e/notebook.spec.ts -g "the laptop opens and lights in second place"`
Proof: `npx playwright test e2e/notebook.spec.ts -g "the last phone comes from the depth"`
Proof: `npx playwright test e2e/notebook.spec.ts -g "the tablet turns in first place"`
Proof: `npx playwright test e2e/notebook.spec.ts -g "the tablet turns and its page lays out again for landscape"` (2º lugar, inalterado)
Proof: `npx playwright test e2e/notebook.spec.ts -g "the last tablet keeps the window's orientation at"`

**C5** - Os capítulos acompanham o seu aparelho, numerados pela ordem de aparição, com títulos e
textos inalterados: em 820×1180, "01 · Apps", "02 · Sistemas", "03 · Sites e landing pages"; em
390×844, "01 · Sites e landing pages", "02 · Sistemas", "03 · Apps"; em 1440×900 como hoje; e o
capítulo em cena é o do aparelho em cena, nos dois sentidos (p = 0,1, 0,37, 0,62; nenhum em 0,85)
Proof: `npx playwright test e2e/notebook.spec.ts -g "the chapters are numbered in the order of the devices at"`
Proof: `npx playwright test e2e/notebook.spec.ts -g "the notebook is labelled by its heading and tells a chapter per device"` (1440, inalterado)
Proof: `npx playwright test e2e/notebook.spec.ts -g "the chapter follows its device on stage at"` (820×1180, 390×844)
Proof: `npx playwright test e2e/notebook.spec.ts -g "the chapter follows the device on stage, both ways"` (1440, inalterado)

### S3 - Mergulho e passagem · 5 files · ~12k

**C6** - No fim da seção a página do último aparelho enche a janela: a caixa do iframe na tela tem
esquerda, topo e direita a ≤ 2 px das bordas da janela e base ≥ altura − 2 (laptop) ou a ≤ 2 px
dela (celular, tablet); em 1440×900, 820×1180 e 390×844
Proof: `npx playwright test e2e/notebook.spec.ts -g "the dive ends on the last device's page filling the window at"`

**C7** - A página do último aparelho é diagramada na janela - largura = largura da janela (os três)
e, no celular e no tablet, altura = altura da janela, em 1440×900, 820×1180, 1000×700, 390×844 e
375×667 - e o corpo do celular e o do tablet seguem a proporção dela (altura/largura da tela =
altura/largura da página, para 390×844, 375×667, 820×1180 e 700×1000), com a moldura de hoje nas
medidas de hoje
Proof: `npx playwright test e2e/notebook.spec.ts -g "every device shows the projects section at its own width"`
Proof: `node --test components/organisms/notebook/devices.test.ts`

**C8** - Fora da última posição a página fica na largura do aparelho: celular 390, tablet 820
(retrato) ou 1180 (paisagem), laptop 1280
Proof: `npx playwright test e2e/notebook.spec.ts -g "every device shows the projects section at its own width"` (atributo `width`)
Proof: `npx playwright test e2e/mobile.spec.ts -g "every device page lays out at its device width"` (`clientWidth` do documento, toque 390×844: tablet 820 e 1180, laptop 1280)

**C9** - A passagem do último aparelho para a página real difere ≤ 5% dos pixels
(`HANDOFF_MAX_SHARE`) em 1440×900, 1920×1080, 1280×720, 820×1180 e 390×844
Proof: `npx playwright test e2e/notebook.spec.ts -g "the stage hands over to the real page with no visible change at"`

### S4 - O que não pode regredir · 2 files · ~11k

**C10** - Em toque, cada página tem uma única escala, um único `z-index`, e o canvas um único
tamanho com razão 1,25, numa passada para baixo e para cima (agora com o celular por último)
Proof: `npx playwright test e2e/mobile.spec.ts -g "on touch each device page keeps one scale"`
Proof: `npx playwright test e2e/mobile.spec.ts -g "on touch the device pages keep their stacking"`
Proof: `npx playwright test e2e/mobile.spec.ts -g "on touch the alcance canvas never resizes"`

**C11** - Nenhum ancestral de iframe usa `zoom` e cada página fica dentro do seu vidro
Proof: `npx playwright test e2e/mobile.spec.ts -g "every device page stays inside its glass"`

**C12** - As suítes e2e existentes passam sem afrouxar valor nenhum. Mudam só os testes que
fixavam a ordem ou as larguras antigas: em `mobile.spec.ts`, "every device page lays out at its
device width" (pontos de progresso da nova ordem e laptop em 1280 - critérios 3 e 8); em
`notebook.spec.ts`, "every device shows the projects section at its own width" ganha tamanhos
(1440 inalterado - critérios 7 e 8) e o loop da passagem ganha 820×1180 e 390×844 (critério 9)
Proof: `npx playwright test` (a suíte inteira é o objeto do claim; os testes de FPS e "the black hole rises out through the top" são instáveis nesta máquina e são relatados, não perseguidos)

## Swept

- validation, idempotency, authorization, data lifecycle, external-dependency: n/a - visual, sem
  entrada nem dados (task).
- failure modes: existing - página que não carrega deixa o vidro preto (`useStaticPage`).
- concurrency and ordering: C2 - redimensionar no meio do Alcance.
- state transitions: C2, C4 (a virada do tablet).
- observability: n/a.

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| aparelho de quem visita (3) | celular C1, C3 · tablet C1, C3 · laptop C1, C3 | - |
| limites de largura (2 limites, 4 bordas) | 767 · 768 · 1023 · 1024, todos em C1 | - |
| último aparelho na passagem (3) | laptop C9 (3 tamanhos) · tablet C9 · celular C9 | - |
| gesto por posição (laptop 2º/3º, celular 1º/3º, tablet 1º/2º/3º = 7) | laptop 2º C4 · laptop 3º existente "the laptop is lit before the dive" · celular 1º sem teste próprio (código de hoje) · celular 3º C4 · tablet 1º C4 · tablet 2º C4 · tablet 3º C4 | celular 1º |
| orientação do tablet por último (2) | retrato C4 (820×1180) · paisagem C4 (1000×700) | - |
| largura das páginas fora do último (4) | celular 390 C8 · tablet 820 C8 · tablet 1180 C8 · laptop 1280 C8 | - |
| modos que fixam a escala (2) | toque C10 · leve - mesmo código (`touch = fine === false \|\| lite`), sem prova própria | leve |

- Nenhuma check afirma status, rota ou forma de resposta.
- C10 prova o modo leve apenas pelo caminho de código que divide com o toque; virar o modo leve
  num teste custa ~2 min e é instável (FPS), o que o perfil `light` deixa em aberto.

## Handoff

S1–S4 somam ~33k de leitura (`wc -c` dos arquivos tocados / 4), todos no `notebook` e nos seus
dois specs e2e: um lote só, sem passagem.
