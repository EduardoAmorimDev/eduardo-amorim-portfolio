# Landing page do portfólio — desempenho

Profile: `light` (o `AGENTS.md` do repositório não declara perfil) · handoff: `on`, budget 150k.
Base da feature: `62045d4`. Branch: `main` — o usuário pediu a `main` atualizada (fast-forward até
`feat/landing/portfolio-lp-visual`) e as mudanças em cima dela, exceção explícita à regra de
branch protegida de `~/Documents/docs/commit-convention.md`. Sem push.

Sources:

- Conversa com o usuário (2026-10-26): "pode aplicar do 1 ao 3" sobre a recomendação de
  desempenho — (1) pausar cada canvas fora da tela, (2) carregar o iframe do Kune só perto do
  notebook e descarregá-lo longe, (3) `ContactShadows` em resolução 256. Item 4 (DPR adaptativo)
  fica fora.
- Medição de base (scratchpad, build de produção, 1440×900, DPR 2): os dois canvas desenham todo
  quadro em qualquer posição de rolagem; Hero 9 draw calls/quadro, notebook 37 draw calls e
  6 `bindFramebuffer`/quadro.
- Restrição do usuário: "sem perder qualidade" — nada visível muda.

## Out of scope

- DPR adaptativo (`PerformanceMonitor`) — item 4, não aprovado agora.
- `samples` do material de vidro, malha, parallax, brilhos — sem custo relevante medido ou com
  perda visual.
- Comportamento sob movimento reduzido — inalterado.

## Landing

Um hook compartilhado `lib/use-near-viewport.ts` (`IntersectionObserver` com `rootMargin`), um
átomo `components/atoms/render-gate/` que fica dentro de cada `<Canvas>` e observa o próprio
canvas, e o notebook usando o mesmo hook para o iframe. Nenhuma dependência nova.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| None | - | - |

Decisões reversíveis, registradas antes do código:

- Pausa via `setFrameloop('never' | 'always')` do R3F, restaurando `clock.elapsedTime` depois da
  troca. Rejeitado: a prop `frameloop` do `<Canvas>` — o R3F zera o relógio a cada troca, e a
  luz e os ícones (dirigidos por `elapsedTime`) pulariam para a pose inicial ao voltar.
- Margem de render `25% 0px` (¼ de tela antes de entrar): a cena volta a desenhar antes de
  aparecer, então o quadro parado nunca é visto. Rejeitado: margem 0, que mostra um quadro antigo
  quando a rolagem é rápida.
- Margem do iframe `100% 0px` (uma tela): monta em `scrollY ≈ 1436` (seção Sobre), ~2.900 px antes
  de a tela acender (`progress` 0,6). Rejeitado: `loading="lazy"`, que carrega mas nunca descarrega.

## Checks

### S1 - Canvas só desenha perto da tela (item 1) · 4 files · ~4k

- **C1** No topo da página (`scrollY` 0), em 1 s, o canvas da Hero faz > 0 draw calls e o do
  notebook faz 0. Proof: `e2e/offscreen.spec.ts` "only the hero draws at the top of the page".
- **C2** Com o topo do `#notebook` + 1 tela no topo da janela, em 1 s, o notebook faz > 0 draw
  calls e a Hero faz 0. Proof: `e2e/offscreen.spec.ts` "only the notebook draws while it is on
  screen".
- **C3** Com o topo de `#sobre` e depois o de `#faq` no topo da janela, em 1 s, nenhum dos dois
  canvas faz draw calls. Proof: `e2e/offscreen.spec.ts` "no scene draws while both are off
  screen".
- **C4** Voltando de `#faq` ao topo, a Hero volta a desenhar (> 0 draw calls em 1 s). Proof:
  `e2e/offscreen.spec.ts` "the hero draws again when scrolled back".
- **C5** Voltando de `#faq` ao topo depois de 2 s fora, o centro da luz fica a ≤ 12 px de onde
  estava antes de sair (a animação retoma de onde parou; rodando o tempo todo, 2 s a moveriam
  ≥ 20 px — `light-drift.ts`). Proof: `e2e/offscreen.spec.ts` "the hero light resumes where it
  stopped".

### S2 - Iframe do Kune só perto do notebook (item 2) · 4 files · ~5k

- **C6** No topo da página não há nenhum `iframe` e nenhuma requisição ao host do Kune
  (`kune-joaoeduardoajs-projects.vercel.app`). Proof: `e2e/offscreen.spec.ts` "the laptop's
  screen page is not loaded at the top".
- **C7** Com o topo do `#notebook` meia tela abaixo da janela, existe exatamente um `iframe` na
  página, dentro de `#notebook`, com `src` do Kune, e houve requisição a esse host. Proof:
  `e2e/offscreen.spec.ts` "the screen page loads a screen before the notebook".
- **C8** Com o topo de `#faq` no topo da janela, não há `iframe` na página. Proof:
  `e2e/offscreen.spec.ts` "the screen page unloads far past the notebook".
- **C9** O notebook continua acendendo a tela ao fim da rolagem (opacidade ≥ 0,9). Proof:
  `e2e/notebook.spec.ts` "scrolling through the notebook powers the laptop on".

### S3 - Sombra de contato em 256 (item 3) · 1 file · ~2k

- **C10** `ContactShadows` com `resolution={256}` em `notebook-scene.tsx`, e a região do piso sob
  o notebook, em `notebookEnd`, difere da versão 512 no máximo tanto quanto duas capturas 512
  diferem entre si (ruído do balanço), +2 níveis de média. Proof: medição pontual no
  scratchpad (`shadow-diff.mjs`), números e capturas registrados abaixo em Evidence.
- **C11** O piso continua iluminado (`MIN_FLOOR_LIFT`) e o céu e o piso continuam ink, sob os
  dois esquemas do sistema. Proof: `e2e/theme.spec.ts` "dark scheme notebook sky and floor are
  ink" e "light scheme notebook sky and floor are ink".

### Gate

- **C12** `npx tsc --noEmit`, `npm run lint`, `npm test` e `npm run test:e2e` passam. Proof: os
  quatro comandos, exit 0.

## Swept

| Dimension | Landing |
| --- | --- |
| validation | n/a — nenhuma entrada do usuário |
| failure modes | `IntersectionObserver` entrega lote vazio: o hook ignora (guard em `entries.at(-1)`); o iframe abortado nos testes não afeta a página (C7 roda com o fixture abortando) |
| idempotency and retry | n/a — sem escrita |
| authorization | n/a |
| concurrency and ordering | C5 — troca de `frameloop` preserva o relógio; montar/desmontar o iframe não toca o `useFrame` (já protegido por `if (page.current)`) |
| data lifecycle | C8 — o iframe sai do DOM longe do notebook |
| external-dependency failure | existing — o site do Kune fora do ar deixa a tela preta, como antes |
| state transitions | C1–C4, C6–C8 |
| observability | n/a — sem telemetria no projeto; a medição é o teste de draw calls |

## Handoff

S1–S3 somam ~11k tokens de leitura, abaixo de 150k: um lote só, sem handoff. O Verifier roda
depois, sobre `62045d4..HEAD`, com todos os checks.

Tests superseded:

- `e2e/hero.spec.ts` "hero has no laptop" — a segunda asserção (`#notebook iframe` com contagem 1
  no topo) contradiz o item 2 aprovado; passa a exigir zero `iframe` na página no topo, e a
  contagem 1 dentro de `#notebook` vai para C7.
- `e2e/page-helpers.ts` `gotoNotebook` — esperava o `iframe` no topo; passa a rolar até o
  notebook antes de esperar por ele.

## Evidence

Medido no scratchpad, com o build de base (`62045d4`, porta 3300) e o build de HEAD (porta 3101),
Chromium headless com ANGLE/GL e requisições externas abortadas.

- **Discriminação dos testes novos:** `e2e/offscreen.spec.ts` contra o build de base reprova 7 de
  8. Passa apenas "the screen page loads a screen before the notebook", porque na base o iframe
  existe sempre. Contra HEAD passam 8 de 8. Na base, C5 mediu 32,1 px (limite 12).
- **Draw calls por quadro (DPR 2, 2880×1800):**

  | Posição | Base, Hero | Base, notebook | HEAD, Hero | HEAD, notebook |
  | --- | --- | --- | --- | --- |
  | topo | 9 | 37 | 9 | 0 |
  | `scrollY` 3000 | 9 | 37 | 0 | 37 |
  | meio do notebook | 9 | 37 | 0 | 37 |
  | fim da página | 9 | 37 | 0 | 0 |

  Em `scrollY` 3000 o notebook já desenha, por causa da margem de ¼ de tela.
- **Intervalo entre quadros, sem limite de fps (DPR 1), média em ms:**
  - Base: Hero 6,1; notebook 7,6; fim da página 8,4. O p95 fica entre 35 e 86.
  - HEAD: Hero 2,6; notebook 4,0; fim da página 0,6. O p95 fica entre 1 e 3.
  - Nesse modo artificial, HEAD tem picos isolados de 0,3 a 1,4 s, que somem com vsync.
- **Com vsync (60 Hz, o caso real) em DPR 2:** nenhum quadro acima de 25 ms durante a rolagem,
  nem na base nem em HEAD. Esta máquina já segurava 60 fps, e o ganho aparece como folga de GPU,
  que é o que falta numa GPU integrada.
- **Shaders:** compilam na carga nos dois builds (22 `compileShader` no notebook). Nenhum compila
  durante a rolagem, então pausar não desloca a compilação para a hora em que a cena aparece.
- **C10, sombra:** região do piso (x 300–1140, y 640–900) em `notebookEnd`, luminância de 0 a 255.

  | Comparação | DPR 1, média / máximo | DPR 2, média / máximo |
  | --- | --- | --- |
  | 512 contra 512 (ruído) | 0,06–0,08 / 1 | 0,05 / 1 |
  | 512 contra 256 | 0,17–0,19 / 1,1 | 0,15–0,16 / 1,1 |

  A diferença fica abaixo de ¼ de nível na média, dentro do critério (ruído + 2). Capturas
  inteiras em `scratchpad/shadow/{base,head}-dpr{1,2}.png`, iguais a olho nu.
- **Gate:**
  - tsc e lint sem erros.
  - `npm test`: 44/44.
  - `npm run test:e2e`: 78/78 (70 anteriores + 8 novos).
