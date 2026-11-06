# Landing page do portfólio — celular fluido: buraco negro, Soluções, Alcance e a luz do globo

Sources:

- `.tasks/portfolio-lp-mobile-smooth.md` - a task: 15 critérios em 4 fatias, 0 Decided, 1 Unresolved
  aberto (régua em Chromium; o aparelho é um Redmi Note 11 Pro, que o usuário confere).
- Respostas do usuário (2026-11-06), na task: ícone 2D desenhado e minimalista; o celular espera o
  laptop sair e vem de trás; touch e modo leve; 60 KB; ±15%.
- `.checks/portfolio-lp-60fps.verified.md`, achado 1 - os números no celular que não chegaram a 58.

Profile: `light`. O repositório não tem `docs/constitution.md`; vale só a constituição geral.

## Out of scope

- 60 FPS a 1440×900 e qualquer mudança visual do modo completo no desktop - a task.
- Telemetria de FPS em produção - a task.

## Landing

Toca `hero/hero.tsx` e `hero/gargantua.tsx` (custo no touch), `atoms/render-gate` (o meio-quadro do
modo leve), `solutions/solutions.tsx` e `glass-stage/*` (ícones 2D no lugar do `GlassShelf`),
`notebook/stages.ts` e `device-carousel.tsx` (entrada do celular por último), `you-are-here/*`
(luz sem bloom). Reaproveita `useFinePointer`, `useLiteMode`, `touchDpr`, `SLOTS`/`slotOf` e a
medição de `e2e/performance.spec.ts`.

| One-way door                                                                     | Literal shape | Alternative rejected |
| -------------------------------------------------------------------------------- | ------------- | -------------------- |
| None - tudo é reversível: SVG no código, janelas de rolagem, cortes do modo leve | -             | -                    |

## Checks

Cada check traz o número do critério da task. "Celular" = 390×844, `isMobile`, `hasTouch`, DPR 3.
"Desenhos/s" = quadros de `requestAnimationFrame` em que o canvas recebeu ao menos uma chamada de
desenho WebGL, divididos pelo tempo (mediana de 3 janelas de 3 s, como `performance.spec.ts`).

### S1 - O buraco negro sem travar · 4 files · ~6k

**C1** (1) - Celular, CPU 6×, hero parada: ≥ 58 FPS e canvas da hero ≥ 58 desenhos/s
Proof: `npx playwright test e2e/performance.spec.ts -g "on 390x844, the hero at rest draws every frame"`

**C2** (1) - Celular, CPU 6×, rolagem da hero de 0 a 1 tela: ≥ 58 FPS e canvas da hero ≥ 58
desenhos/s
Proof: `npx playwright test e2e/performance.spec.ts -g "on 390x844, the dive through the hero draws every frame"`

**C3** (2) - O primeiro ecrã e o mergulho não mudam
Proof: `npx playwright test e2e/hero.spec.ts e2e/swallow-and-copy.spec.ts`

### S2 - Ícones de Soluções como ícones 2D desenhados · 6 files · ~8k

**C4** (3) - No celular, os 6 cartões mostram, em caixas de 64×64, os ícones `atom`, `brick`,
`cursor`, `flag`, `note`, `wave` nessa ordem; `[data-testid="glass-shelf"]` não existe; nenhum
`.glb` é pedido
Proof: `npx playwright test e2e/mobile.spec.ts -g "the solution icons are drawn, with no canvas and no model"`

**C5** (3, 7) - Com ponteiro fino, ao ligar o modo leve, cada ícone vira o seu ícone 2D, sem
`glass-shelf`, e a caixa de 64×64 de cada cartão fica no mesmo lugar (±0,5 px)
Proof: `npx playwright test e2e/performance.spec.ts -g "lite mode draws the solution icons flat"`

**C6** (4) - Cada ícone é um SVG de traço (`stroke-primary`, `fill-none`, fundo `bg-primary/15`)
que lembra o seu objeto
Proof: `npx playwright test e2e/mobile.spec.ts -g "the solution icons are drawn, with no canvas and no model"` (classes)
Proof: screenshot `test-results/solution-icons-390.png`, revisado pelo usuário

**C7** (5) - Os seis ícones somam ≤ 60 KB de marcação e não fazem requisição própria
Proof: `npx playwright test e2e/mobile.spec.ts -g "the solution icons are drawn, with no canvas and no model"` (soma de `outerHTML` dos 6 SVG; nenhuma requisição de imagem da seção)

**C8** (6) - Com ponteiro fino, até o modelo carregar e para sempre se ele falhar, o cartão mostra o
seu ícone 2D e não marca `data-ready`
Proof: `npx playwright test e2e/reach-and-seams.spec.ts -g "glyph"`

**C9** (8) - Com ponteiro fino e sem modo leve, os ícones 3D giram no `GlassStage` como hoje
Proof: `npx playwright test e2e/cards.spec.ts e2e/interaction.spec.ts e2e/reach-and-seams.spec.ts`

### S3 - Alcance sem travar e sem sobreposição · 5 files · ~12k

**C10** (9) - Celular, CPU 6×, Alcance do progresso 0 ao 1: ≥ 58 FPS e canvas do Alcance ≥ 58
desenhos/s
Proof: `npx playwright test e2e/performance.spec.ts -g "on 390x844, the scroll through the Alcance draws every frame"`

**C11** (10) - Com o celular por último, a sua entrada só começa quando a saída do laptop termina,
e em nenhum progresso a caixa da página do celular na tela cruza a do laptop
Proof: `node --test components/organisms/notebook/stages.test.ts` (`the phone waits for the stage to clear when it comes last`)
Proof: `npx playwright test e2e/notebook.spec.ts -g "the last phone never crosses the leaving laptop"`

**C12** (11) - Com o celular em 1º lugar, as janelas são as de hoje
Proof: `node --test components/organisms/notebook/stages.test.ts` (`the windows hold when the phone comes first`)

**C13** (12) - Passagem ≤ 5% em 390×844 e as suítes do Alcance passam sem afrouxar valores
Proof: `npx playwright test e2e/notebook.spec.ts e2e/mobile.spec.ts e2e/reach-and-seams.spec.ts`

### S4 - A luz do globo no modo leve · 3 files · ~5k

**C14** (13) - Celular, movimento reduzido, `#contato` na mesma posição: a luminância média do
globo (disco + anel até 1,3 raio) no modo leve fica a ±15% da do modo completo
Proof: `npx playwright test e2e/you-are-here.spec.ts -g "the globe keeps its light in lite mode"`

**C15** (14) - Celular, CPU 6×, modo leve, `#contato` parado: ≥ 58 FPS
Proof: `npx playwright test e2e/performance.spec.ts -g "at 6x CPU on 390x844, the contact at rest"`

**C16** (15) - Sem modo leve, o bloom (0,75 / 0,45 / 0,45) e o globo continuam como hoje
Proof: `npx playwright test e2e/you-are-here.spec.ts`

## Swept

- validation: n/a - sem entrada.
- failure modes: C8 - `.glb` que falha deixa o ícone 2D; existing - `useStaticPage` (vidro preto).
- idempotency: n/a.
- authorization: n/a - página pública.
- concurrency: C5 - o modo leve liga com os ícones na tela; C11 - o celular espera o laptop.
- data lifecycle: n/a - nada é guardado.
- dependency failure: C8.
- state transitions: C5; existing - o leve não volta na visita (`performance.spec.ts`, "lite mode
  switches on and stays for the visit").
- observability: não no escopo - Unresolved 5 da task (régua em Chromium, confirmação no aparelho).

## Coverage

| Set (size)                            | Member -> proof                                              | Unproven |
| ------------------------------------- | ------------------------------------------------------------ | -------- |
| ícones (6)                            | `atom` `brick` `cursor` `flag` `note` `wave` - C4, por ordem | -        |
| caminhos do ícone (3)                 | touch C4 · fino + leve C5 · fino + completo C9               | -        |
| ordens do carrossel com o celular (3) | último C11 · 1º (tablet e laptop) C12                        | -        |

## Handoff

S1–S4 somam ~31k de leitura, bem abaixo de 150k: um lote só, sem passagem.
