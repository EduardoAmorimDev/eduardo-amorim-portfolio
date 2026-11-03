# Landing page do portfólio — carrossel: projetos nas telas, texto ao lado e mergulho no laptop

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

As telas dos aparelhos mostram um site de terceiro (Kune), não o trabalho deste portfólio. O texto
de cada aparelho fica embaixo, longe dele. O carrossel termina num laptop aberto, e a página segue
para a seção de projetos sem ligação com ele.

7 critérios · 1 one-way door · 1 em aberto, nenhum bloqueia.

## Criteria

1. Sempre, as telas do smartphone, do tablet e do laptop mostram a seção de projetos (`Cases`),
   servida por `/embed/projetos`, no layout da largura de cada aparelho: 390 px, 820 ↔ 1180 px e o
   tamanho da própria janela no laptop. O conteúdo da Kune foi removido.
2. Em telas largas na horizontal (`lg:landscape:`, ≥ 1024 px e largura > altura), o capítulo de
   cada aparelho fica ao lado dele, alternando os lados: celular à direita com o texto à esquerda,
   tablet à esquerda com o texto à direita, laptop à direita com o texto à esquerda. Nas demais
   telas o texto continua abaixo.
3. Quando `p` vai de 0,80 a 0,96, a câmera mergulha na tela do laptop até a página, do tamanho da
   janela, preencher exatamente a janela. O título e os capítulos somem a partir de 0,80.
4. Quando a seção termina (`p = 1`), a seção de projetos real está exatamente atrás do palco: o
   bloco seguinte sobe 100svh (`-mt-[100svh]`). Ao longo de 25% de tela de scroll depois disso, o
   palco some (opacidade 1 → 0) e a página real assume. Em 1440 × 900, a diferença entre o
   último quadro do palco e a página real é de 2,67% dos pixels (> 40/255): as formas do parallax,
   que só existem na página real, e a borda das letras.
5. Sempre, o carrossel e o mergulho seguem o scroll nos dois sentidos: rolar para cima depois dos
   projetos afasta a câmera do laptop e traz de volta o tablet e o celular. A trava do fim do
   carrossel foi removida a pedido do usuário (2026-11-03): "Agora faz sentido remover a trava do
   fim do carrosel".
6. Sempre, o palco é calculado a partir da câmera em repouso (`CAMERA`), não da posição da câmera
   no meio do mergulho; voltar do mergulho mostra os aparelhos no tamanho certo.
7. Sempre, enquanto o palco está oculto (`visibility: hidden`), os cliques chegam à página real.

## Out of scope

- Testes (decisão do usuário).
- Formas do parallax dentro da cópia da página no laptop.

## Swept

- validation: n/a - só scroll.
- failure modes: existing - fundo `bg-ink` atrás dos iframes enquanto `/embed/projetos` carrega.
- idempotency and retry: n/a.
- authorization: n/a - página pública; `/embed/projetos` tem `robots: noindex, nofollow`.
- concurrency and ordering: n/a - sem trava, o estado é função do scroll.
- data lifecycle: n/a - nada é guardado.
- external-dependency failure: n/a - o conteúdo agora é do próprio site.
- state transitions: 3, 4, 5.
- observability: n/a.

## Impact

| Front       | What changes                                                                                |
| ----------- | ------------------------------------------------------------------------------------------- |
| domain      | `/embed/projetos` (nova rota): só a seção de projetos, para as telas dos aparelhos          |
| domain      | `STAGES.zoom`, `CAMERA`, `CAMERA_REST`, `stageViewport`, `isSideLayout` (`stages.ts`)       |
| domain      | `useScrollProgress` volta a só medir o scroll: a trava (`holdAtEnd`) saiu                   |
| layout      | `#notebook` passa a `h-[700vh]`, `z-10`, palco opaco; o bloco seguinte ganha `-mt-[100svh]` |
| stored data | nothing to migrate                                                                          |

## Decided

| Decision                                       | Shape                                                                                       | Alternative rejected                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| As telas mostram a seção por uma rota de embed | `app/embed/projetos/page.tsx` (`<main relative isolate><SectionsBackdrop/><Cases/></main>`) | renderizar `<Cases/>` direto no `<Html>`: as media queries seguem a janela, então o celular mostraria o layout de desktop |

## Sources

- Conversa com o usuário (2026-11-03): "quero que o copy dos devices fique ao lado de cada 1.
  remova completamente o conteudo dos devices, o conteúdo deve ser a seção de projetos. No fim,
  quero que o laptop venha de enconttro ao usuário, como se fosse um zoom no conteúdo, o conteúdo
  do laptop deve passar a ser a prórpia pagina, o usuário não deve perceber a transição".

## Unresolved

| #   | Kind | Question                                                                                                                                   | Until answered             |
| --- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| 1   | open | No celular, o laptop mostra a página no layout de celular, com faixas pretas nas laterais, porque é ela que vira a página real. Aceitável? | Escrito assim (critério 1) |
