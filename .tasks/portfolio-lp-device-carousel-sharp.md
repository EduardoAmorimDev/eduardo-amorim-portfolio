# Landing page do portfólio — carrossel: telas nítidas e aparelhos centralizados

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

As páginas dentro dos aparelhos parecem de baixa qualidade: são desenhadas no tamanho cheio
(390, 820 ou a janela inteira) e encolhidas 2 a 4 vezes pela GPU, o que serrilha o texto. Com o
texto ao lado, os aparelhos saíram do centro.

2 critérios · 0 one-way doors · 0 em aberto.

## Criteria

1. Sempre, a página de cada aparelho é desenhada com CSS `zoom` próximo do tamanho em que aparece
   na tela (`renderScale`, degraus de 0,25 a 1); o layout interno não muda, porque o iframe mantém a
   largura do aparelho em px CSS. No fim do mergulho o `zoom` do laptop é 1, e a passagem para a
   página real continua com 2,66% de pixels diferentes em 1440 × 900.
2. Sempre, os aparelhos ficam no centro da tela, inclusive com o texto ao lado; o texto ocupa uma
   coluna de 24% em cada lado, e o aparelho, os 40% do meio (`COPY_ROOM.side.width`).

## Out of scope

- Testes (decisão do usuário).
- Remover o `will-change` do laptop: sem ele, o Chrome desenha a página ~55 px fora do lugar depois
  que o palco solta (medido: 7% de pixels diferentes na passagem).

## Swept

- Todos n/a: mudança visual, sem entrada, estado persistido nem rede.

## Impact

| Front       | What changes                                                                    |
| ----------- | ------------------------------------------------------------------------------- |
| domain      | `renderScale`, `isShown` (novos, `stages.ts`); `restX` sai: aparelhos no centro |
| stored data | nothing to migrate                                                              |

## Decided

| Decision                 | Shape | Alternative rejected |
| ------------------------ | ----- | -------------------- |
| None - tudo é reversível | -     | -                    |

## Sources

- Conversa com o usuário (2026-11-03): "a imagem de dentro dos devices parece com baixa
  qualidade, quero que mesmo que haja copy ao lado dos devices, eles fiquem centralizados".

## Unresolved

| #   | Kind | Question | Until answered |
| --- | ---- | -------- | -------------- |
| -   | -    | None     | -              |
