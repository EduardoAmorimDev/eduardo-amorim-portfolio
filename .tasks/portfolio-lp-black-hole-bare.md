# Landing page do portfólio — buraco negro nu e estrelas menores

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

Hoje o buraco negro tem dois discos de acreção, anel de fótons, brilho em volta e uma luz que
ilumina o logo. O usuário quer só uma bola preta flutuante que curva a luz do que está atrás.
As estrelas estão grandes demais.

2 critérios · 0 one-way doors · 0 em aberto.

## Criteria

1. Sempre, o buraco negro é só a sombra `#000000`, de raio R, com a borda suavizada em 0,02 R.
   Não há disco, anel de fótons, brilho nem `pointLight`. A lente continua curvando o céu.
   - O código dos discos fica no lugar, desligado por `SHOW_DISKS = false` em
     `black-hole-mesh.tsx`; `true` traz tudo de volta.
   - O pedido era "comentar". Código comentado fere a regra de comentários da constituição
     (XIII), então a constante faz o mesmo papel.
2. Sempre, toda estrela, pequena ou de destaque, tem 2/3 do tamanho de antes (`SPACE.scale`):
   tamanho, núcleo, halo e raios.

## Out of scope

- Testes (decisão do usuário). Apagar o código dos discos.

## Swept

- Todos n/a: mudança visual sem entrada, estado nem rede.

## Impact

| Front       | What changes                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| domain      | `SHOW_DISKS` (novo) desliga o shader dos discos e a `pointLight`; sem a luz, o logo fica só com a luz do ambiente. |
| domain      | `SPACE.scale` (novo) multiplica os tamanhos das estrelas.                                                          |
| stored data | nothing to migrate                                                                                                 |

## Decided

| Decision                 | Shape | Alternative rejected |
| ------------------------ | ----- | -------------------- |
| None - tudo é reversível | -     | -                    |

## Sources

- Conversa com o usuário (2026-10-28): "comente tudo que envolva a aplicação dos discos de
  asserção no buraco negro, agora quero que só exista de fato um buraco negro flutuante sem disco
  de ascerção e sem contorno branch, de fato, só uma bola preta com a distorção visual da luz do
  que está atrás." e "diminua um pouco o tamanho geral das estrelas em 1/3, ou seja, as estrelas
  devem ter 2/3 do tamanho atual."

## Unresolved

| #   | Kind | Question | Until answered |
| --- | ---- | -------- | -------------- |
| -   | -    | None     | -              |
