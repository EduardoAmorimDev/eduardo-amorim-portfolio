# Landing page do portfólio — buraco negro maior, que sobe e desce sobre a malha

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

> **Substituídos em parte por `.tasks/portfolio-lp-black-hole-behind.md` (2026-10-28):** 12 (10 a
> 30 px/s viram 5 a 15 px/s).

## Intent

O buraco negro da Hero ainda não tem o peso que o dono do portfólio quer:

- é pequeno para a cena (96 px de horizonte em 1440×900);
- tem sempre a mesma distância da malha, então a distorção só muda quando ele se desloca;
- atravessa a Hero rápido demais para a calma que a cena pede (20 a 60 px/s).

A fonte não traz métrica nem prazo; o custo é a primeira impressão de quem visita.

Com a tarefa entregue:

- o buraco negro tem o dobro do tamanho, e o poço que ele cava na malha cresce na mesma
  proporção;
- ele sobe e desce devagar sobre a malha. Mais perto de quem olha, parece maior e distorce menos;
  mais perto da malha, parece menor e distorce mais;
- ele vaga pela Hero na metade da velocidade.

14 critérios em 4 fatias · 0 one-way doors · 1 em aberto: bloqueia go-live (herdado).

## Criteria

Medidas em CSS px numa janela de 1440×900, salvo quando indicado. "Movimento reduzido" é
`prefers-reduced-motion: reduce`. "Escala de projeto" é a do buraco negro em 1440×900, como em
`portfolio-lp-gravity`. "Subida" é o quanto o buraco negro está afastado da malha, de 0 (rente a
ela) a 1 (o mais longe).

### S1 — O dobro do tamanho

1. Enquanto houver movimento reduzido, o horizonte mede 192 px de diâmetro (±10%) no ponto de
   repouso (centro, a 32% da altura da Hero). É o dobro dos 96 px de hoje. Em janelas menores,
   ele encolhe na mesma regra de hoje (critério 6 de `portfolio-lp-gravity`).
2. Sempre, o disco, o anel e os arcos crescem com o horizonte: o disco mede cerca de 4 diâmetros
   do horizonte (~806 px ±10% em repouso), com a mesma inclinação e o mesmo movimento de hoje
   (critérios 10–15 de `portfolio-lp-gravity`).
3. Sempre, a esfera e os arcos (até 1,65 raio do horizonte) ficam dentro da Hero, a 10% de cada
   borda, em todo o caminho e em qualquer subida. O disco pode passar das bordas e ser cortado
   por elas.

### S2 — Distorção coerente com o novo tamanho

4. Sempre, o poço do buraco negro dobra junto com ele: raio de 560 px da folha (na linha do meio
   da Hero, escala de projeto) e puxão lateral de até 96 px, igual ao raio do horizonte, de modo
   que nenhum ponto passa do centro.
5. Sempre, na subida 0 (rente à malha), a horizontal mais próxima do centro desce de 80 a 160 px.
   É o dobro do critério 4 de `portfolio-lp-gravity`.
6. Sempre, nenhuma horizontal desce além da seguinte: a ordem das linhas na tela se mantém dentro
   do poço.

### S3 — Sobe e desce sobre a malha

7. Enquanto não houver movimento reduzido, a subida oscila de 0 a 1 e volta, num ciclo de 10 a
   14 s. Esse ciclo é diferente dos ciclos da inclinação (16 s) e do eixo (21 s).
8. Sempre, o tamanho na tela segue a subida: na subida 1 o buraco negro é 1,12 vez maior, e na
   subida 0, 0,88 vez, multiplicando o tamanho pela profundidade na folha (critério 6 de
   `portfolio-lp-gravity`).
9. Sempre, a distorção segue a subida ao contrário. O afundamento e o puxão lateral do poço são
   multiplicados por 1 na subida 0 e por 0,5 na subida 1, em linha reta entre os dois. Na mesma
   posição, a horizontal mais próxima do centro desce na subida 0 pelo menos 1,8 vez o que desce
   na subida 1.
10. Sempre, o raio do poço não muda com a subida: só a profundidade e o puxão mudam.
11. Enquanto houver movimento reduzido, a subida fica parada em 0,5: tamanho 1 × (192 px em
    repouso) e distorção multiplicada por 0,75. A horizontal mais próxima do centro desce então
    de 60 a 120 px.

### S4 — Metade da velocidade

12. Enquanto não houver movimento reduzido, o buraco negro vaga entre 10 e 30 px/s (metade dos 20
    a 60 px/s de hoje). As outras regras do caminho continuam: curva e muda de direção a cada 4 a
    10 s, nunca salta mais de 4 px num quadro e nunca para (critério 29 de
    `portfolio-lp-cosmos`).

### Regras herdadas

13. Sempre, as regras vigentes continuam:
    - quando a Hero volta à tela, o buraco negro está a até 12 px de onde parou (critério 40 de
      `portfolio-lp-cosmos`);
    - fora da tela, a Hero faz 0 draw calls (39);
    - nenhuma linha da malha aparece dentro do horizonte (21);
    - o `logo` não cruza a caixa do `<h1>` nem a do CTA (critério 24 de `portfolio-lp-gravity`).
14. Sempre, nenhuma dependência nova entra no `package.json`.

## Out of scope

- Mudar o poço do ponteiro, a lente, o H1 ou o laptop. Nada disso foi pedido.
- Fazer a posição na tela mudar com a subida (o buraco negro "subir" na tela). A subida muda o
  tamanho e a distorção; o caminho na tela continua o de hoje, mais lento.
- Mudar a luz que o buraco negro joga no `logo` com a subida. A intensidade não muda com a
  subida; com o dobro do tamanho, ela dobra (de 160 para 320 cd; ver Sources).

## Observable

| Surface            | Decision                                                      | Landing                                                                  |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| tela `/` › `#hero` | em repouso, sem ponteiro                                      | 1, 2, 4, 5                                                               |
| tela `/` › `#hero` | em movimento                                                  | 7, 8, 9, 12                                                              |
| tela `/` › `#hero` | movimento reduzido                                            | 1, 11                                                                    |
| tela `/` › `#hero` | janela estreita (375×667)                                     | 1, 3                                                                     |
| tela `/` › `#hero` | densidade e ordem (corpo sobre o título e o `logo`)           | 3, 13                                                                    |
| tela `/` › `#hero` | carregando, erro (sem WebGL), não autorizado, ação destrutiva | n/a - inalterados por esta tarefa; seguem como em `portfolio-lp-gravity` |

## Swept

- validation: n/a - nenhuma entrada de dados
- failure modes: n/a - nada novo pode falhar; o buraco negro e a malha já desenham sem rede
- idempotency and retry: n/a - nada é enviado nem gravado
- authorization: n/a - página pública
- concurrency and ordering: 13 (pausa fora da tela e retomada sem salto, agora também da subida)
- data lifecycle: n/a - nada persiste; o caminho é novo a cada carregamento (existing - `createWander(Math.random, …)` em `use-hero-field.ts`)
- external-dependency failure: n/a - nenhum recurso externo
- state transitions: 7, 11 (subida oscilando ou parada sob movimento reduzido)
- observability: n/a - o projeto não tem telemetria; o custo de quadro segue coberto por 13

## Impact

| Front           | What changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain          | termo novo: subida (`lift`) — quanto o buraco negro está afastado da malha, de 0 a 1; muda o tamanho (8) e a força do poço (9). Vive junto de `diskPose`, em `black-hole.ts`                                                                                                                                                                                                                                                                                                                                                                                        |
| domain          | termo existente: `HOLE.horizon` (96) passa a 192, e `HOLE_WELL` (`radius` 280, `pull` 48, `sink` 84) passa a 560, 96 e 168, com força multiplicada pela subida. Quem depende: `horizonRadius`, `horizonAt`, `holeScale`, `black-hole-mesh.tsx`, `use-hero-field.ts`, `grid-motion.test.ts`, `black-hole.test.ts`, `e2e/black-hole.spec.ts` (96 px, ~400 px de disco), `e2e/hero-grid.spec.ts` (`HOLE_RADIUS`, `HOLE_SINK`, `WELL_ON_SCREEN`, `REST`, `farFrom`), `e2e/reduced-motion.spec.ts` (`DISK_BOX`), `e2e/hero.spec.ts` (`HOLE_REACH` do `logoBox`)          |
| domain          | termo existente: `wanderBox` mantém hoje o corpo inteiro (`HOLE.halfWidth` 4,2) a 10% das bordas. Com o dobro do tamanho, isso não deixa espaço para vagar em nenhum tamanho de tela (−14 px de folga em 1440×900, negativo também em 1024×768, 768×1024 e 375×667). Passa a guardar só a esfera e os arcos (`HOLE.halfHeight` 1,65), com o tamanho no pé da Hero e na subida 1. Folga horizontal: 694 px em 1440, 428 em 1024, 279 em 768 e 136 em 375. Quem depende: `black-hole-path.ts`, `black-hole-path.test.ts` ("the whole body stays 10% inside the hero") |
| domain          | termo existente: `WANDER` (`minSpeed` 20, `maxSpeed` 60, `maxSpeedStep` 8, `minHop` sobre `minSpeed × minLeg`) passa à metade da velocidade. Quem depende: `black-hole-path.test.ts` ("the speed stays within 20 to 60px/s and never stops"), `e2e/black-hole.spec.ts` ("the black hole wanders": 30 px em 2 s ficam no limite com 10 px/s), `e2e/hero-grid.spec.ts` (`MAX_SPEED` 60 em `drift`)                                                                                                                                                                    |
| teste           | com o poço de 560 px, as faixas "longe dos corpos" da malha encolhem. A reta das linhas (critério 3 de `portfolio-lp-gravity`) passa a ser medida onde o poço não alcança. A margem de `e2e/hero.spec.ts` em volta do buraco negro precisa acompanhar o disco de ~806 px, que agora passa perto do `logo`                                                                                                                                                                                                                                                           |
| tarefa anterior | `.tasks/portfolio-lp-gravity.md` recebe no topo a lista do que esta substitui: 4 e 5 em parte (40–80 px e 280 px viram 80–160 e 560); `.tasks/portfolio-lp-cosmos.md`, o 29 em parte (velocidade e "fica sempre inteiro") e o 28 (96 px)                                                                                                                                                                                                                                                                                                                            |
| stored data     | nothing to migrate - nada persiste                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Decided

| Decision                                                                                                                 | Shape | Alternative rejected |
| ------------------------------------------------------------------------------------------------------------------------ | ----- | -------------------- |
| None - tudo aqui é reversível: nenhum dado persistido, nenhum contrato consumido por fora, nenhuma dependência nova (14) | -     | -                    |

## Sources

- Conversa com o usuário (2026-10-27), transcrita:
  - "Agora quero que o buraco negro duplique de tamanho, A distorção gravitacional deve ser
    coerente ao novo tamanho dele."
  - "Também quero que além do eixo dele oscilar, quero que a escala dele oscile um pouco, fazendo
    parece que ele está mais 'perto do usuário' e mais 'longe da malha'. Quanto mais longe da
    malha ele estiver, menos distorção gravitacional ele vai causar, quanto mais perto, mais
    distorção, dessa forma vai ficar muito bom."
  - "A velocidade que ele se move pela Hero também deve ser reduzida pela metade."
- `.tasks/portfolio-lp-gravity.md` e `.tasks/portfolio-lp-cosmos.md` — tudo o que esta tarefa não
  substitui (Impact) continua valendo.
- Respostas do usuário (2026-10-27):
  - **O que fica dentro da Hero (3):** "siga pelo recomendado mesmo" — esfera e arcos a 10% das
    bordas; o disco pode passar delas.
  - **Números da subida (7–11):** "vamos ver como fica, se precisar eu te falo pra aumentar o gap
    entre 0,8 e 1,2. Por agora siga o recomendado mesmo" — 0,88 a 1,12 ×, ciclo de 10 a 14 s,
    distorção de 1 a 0,5 ×.
- Resposta do usuário durante o build (2026-10-27), sobre a luz no `logo`: "320, dobrada".
  - **O problema:** com o disco maior atrás do vidro, a 160 cd o lado voltado ficava de 3% a 13%
    mais claro, e o teste herdado de 5% (`portfolio-lp-cosmos` 31) falhava em ~1 de 4
    execuções.
  - **A 320 cd:** fica de 11% a 15% mais claro, em todas as execuções.
- Folgas do caminho calculadas com `horizonRadius`, `sheetScale` e `HOLE` do código atual (main em
  `68efb10`), com 2× e subida máxima de 1,12 ×.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| #   | Kind           | Question                                                                                | Until answered                                        |
| --- | -------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | blocks go-live | Destino real dos CTAs e conteúdo real (herdado de `portfolio-lp-cosmos`, Unresolved 1). | A Hero continua com lorem, e o CTA leva a `#contato`. |
