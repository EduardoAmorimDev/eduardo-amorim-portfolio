# Landing page do portfólio — Alcance estável no celular

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

No celular, o Alcance trava, a tela pisca e o conteúdo parece vazar um pouco das telas dos
aparelhos (usuário, 2026-11-05, depois das correções de `portfolio-lp-mobile`). Medido no Chromium
com emulação de celular (390×844, DPR 3), numa passada pelo Alcance:

- **Escala das páginas:** a escala (`renderScale`) mudou 17 vezes, 7 no tablet e 10 no laptop. Cada
  troca muda o tamanho da página no DOM, e a raiz React própria do drei `<Html>` aplica o tamanho
  novo num commit separado do quadro em que o drei aplica o `distanceFactor` novo. Pode sobrar um
  quadro com a página no tamanho errado: maior que o vidro (vaza) ou menor (pisca).
- **`z-index`:** o drei reescreve o `z-index` de cada página a cada quadro (666 valores numa passada).
- **Animações:** a página dentro do laptop roda 4 animações CSS infinitas (brilhos desfocados de
  100 px), o que força repintar uma camada com transformação 3D a cada quadro.
- **Resolução adaptável:** num aparelho lento, o ajuste automático de resolução troca de degrau
  durante a rolagem. Cada troca redimensiona o canvas, que é apagado ao redimensionar.
- **Cantos:** a caixa que recorta a página do celular e do tablet ficou com cantos arredondados em
  `portfolio-lp-mobile`, mas o furo que o vidro abre para a página é retangular. Nos cantos aparece
  o céu atrás do canvas, e não o vidro preto.

Depois desta task, no celular, cada página é desenhada numa escala só, a resolução do Alcance não
muda, o empilhamento não muda, as páginas não se animam e os cantos do vidro voltam a ser pretos.

7 critérios · 0 one-way doors · 1 em aberto, nenhum bloqueia.

## Criteria

1. Sempre, as páginas dentro dos aparelhos não rodam animações nem transições CSS: os brilhos de
   `SectionsBackdrop` dentro de cada iframe têm `animation-name: none`.
2. Dado touch, ao percorrer o Alcance inteiro para baixo e depois para cima, cada página de aparelho
   é desenhada numa única escala (`data-scale`) desde que aparece. A escala é a de `renderScale` com o
   aparelho em repouso, visto da câmera em repouso.
3. Dado touch, com a CPU 6× mais lenta, o buffer do canvas do Alcance não muda de tamanho ao
   percorrer a seção, e sua razão é 1,25 px de buffer por px CSS.
4. Dado touch, ao percorrer o Alcance, o `z-index` de cada página de aparelho assume um único valor.
5. Sempre, a caixa que recorta a página do celular e do tablet tem cantos retos (`border-radius: 0`),
   e a página mantém o próprio raio.
6. Com ponteiro fino, nada muda: a passagem do laptop para a página real continua com no máximo 5% de
   pixels diferentes (`HANDOFF_MAX_SHARE`).
7. Dado touch, os critérios de `portfolio-lp-mobile` continuam valendo (`e2e/mobile.spec.ts`).

## Out of scope

- O globo e a hero: a reclamação é só sobre o Alcance.
- Trocar as páginas ao vivo por imagens: seria uma porta difícil de reverter, e esta task resolve
  o que foi medido sem isso.

## Swept

- validation, idempotency, authorization, data lifecycle: n/a - visual, sem entrada nem dados.
- failure modes: existing - `useStaticPage` deixa o vidro preto se a página não carregar.
- concurrency and ordering: 2 - o tamanho no DOM e a matriz do drei deixam de mudar em quadros
  diferentes, porque a escala não muda.
- external-dependency failure: n/a.
- state transitions: 2, 4.
- observability: Unresolved 1.

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| None - tudo é reversível e vale só para touch, salvo 1 e 5 | - | - |

## Sources

- Usuário (2026-11-05): "A seção 'Alcance' está muito bugada em dispositivos moveis [...] está
  travada e a tela parece estar flicando, piscando, o conteúdo pode estar vazando um pouco da tela
  dos dispositivos."
- Medição por sonda no Chromium (390×844, DPR 3) em 2026-11-05, com os números citados acima.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | open | A fluidez no iPhone só se confirma no aparelho, e com o build de produção (`next dev` é bem mais lento). | Provas em Chromium; o usuário confirma no iPhone com `npm run build && npm start` |
