# Landing page do portfólio — carrossel: inclinação, giro do tablet e copy

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

O smartphone e o tablet chegam retos demais perto do laptop, que entra torto e se endireita. No
giro do tablet, a página às vezes fica cortada nas laterais, com uma faixa preta abaixo do aparelho.
A seção não tem texto que conte por que os três aparelhos estão ali.

4 critérios · 0 one-way doors · 0 em aberto.

## Criteria

1. Sempre, o smartphone e o tablet entram inclinados e se endireitam ao chegar ao centro, como o
   laptop: smartphone `PHONE_LEAN = { x: 0.45, z: 0.3 }` rad até `p = 0,20`; tablet
   `TABLET_LEAN = { x: 0.4, y: -0.6, z: -0.2 }` rad até `p = 0,45`.
2. Sempre, durante e depois do giro, a página do tablet preenche a tela inteira na nova orientação
   (1180 × 820 em paisagem), sem corte lateral nem faixa preta. A causa era o drei medir a página
   uma única vez para recortar a área visível, e ler o tamanho de retrato; agora essa área tem o
   tamanho da especificação (`geometry` do `<Html>`).
3. Sempre, a seção mostra o título `Responsividade` / "Um projeto, todas as telas" no topo e, embaixo,
   um capítulo por aparelho, que troca na metade de cada troca de aparelho:
   - "01 · No celular" — "Começa na palma da mão"
   - "02 · No tablet" — "Ganha espaço sem perder o ritmo"
   - "03 · No notebook" — "E se abre por inteiro"
4. Sempre, em 1440 × 900 e 390 × 844, nenhum aparelho em repouso cobre o título ou o capítulo:
   o palco reserva 12% da altura em cima e 26% embaixo (`COPY_ROOM`).

## Out of scope

- Testes (decisão do usuário). `e2e/notebook.spec.ts` "shows no text" e o `aria-label="Notebook"`
  deixam de valer: a seção agora tem texto e é rotulada pelo seu `<h2>`.

## Swept

- Todos n/a: mudança visual e de copy, sem entrada, estado persistido nem rede.

## Impact

| Front       | What changes                                                                       |
| ----------- | ---------------------------------------------------------------------------------- |
| domain      | `COPY_ROOM` e `stageLift` (novos, `stages.ts`): o `fitIn` usa só a altura do palco |
| domain      | `DeviceCopy` (novo, `device-copy.tsx`): título e capítulos da seção                |
| layout      | `#notebook` passa de `aria-label` para `aria-labelledby="notebook-title"`          |
| stored data | nothing to migrate                                                                 |

## Decided

| Decision                 | Shape | Alternative rejected |
| ------------------------ | ----- | -------------------- |
| None - tudo é reversível | -     | -                    |

## Sources

- Conversa com o usuário (2026-11-03): "O celular e o tablet parecem muito retos sabe? [...] o
  smartphone inicia meio inclinado, o tablet também.", "Notei que o tablet ao girar pode ocorrer
  um bug visual estranho no conteúdo, analise e corrija.", "Coloque copy nesta seção, fale sobre a
  responsivide em cada dispositivo, deve ter story telling."

## Unresolved

| #   | Kind | Question | Until answered |
| --- | ---- | -------- | -------------- |
| -   | -    | None     | -              |
