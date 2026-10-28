# Landing page do portfólio — buraco negro maior, mais de lado, inclinado e vagando pela Hero inteira; céu que esmaece para baixo

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

Hoje, depois de `portfolio-lp-space`:

- **A Hero fecha com a silhueta de um planeta**, que o usuário não quer mais.
- **As estrelas têm o mesmo brilho de cima a baixo** e parecem pontos chapados, sem brilho
  próprio.
- **O buraco negro fica no meio:** descansa a 32% da altura, e cada perna do caminho anda no
  máximo ~67 px (`0,9 × 7,5 px/s × 10 s`). Ele passeia em volta do centro e nunca chega aos
  cantos.
- **Os discos são pequenos e quase de frente:** o horizontal vai a 4 R, visto 13° acima do plano,
  sem inclinação na tela.
- **A lente tem forma de maçã:** o desvio cai perto dos polos, à esquerda e à direita
  (`|sen φ|^0,5`, `FIELD.exponent`). O usuário acha a distorção errada. Ela deve ser só radial,
  com o fluxo aerodinâmico (`FLOW`) por fora.

A fonte não traz métrica; o custo é a Hero não ter a cara que o dono do portfólio quer.

Com a tarefa entregue:

- a Hero tem só o gradiente, as estrelas, o buraco negro e o texto;
- as estrelas brilham e esmaecem para baixo junto com o gradiente;
- o buraco negro é maior, mais visto de lado e inclinado como "/";
- ele parte do canto superior esquerdo e anda pela Hero inteira;
- a lente é radial e 1,2 vez maior.

11 critérios em 4 fatias · 0 one-way doors · 1 em aberto, que bloqueia go-live (herdado).

## Criteria

Medidas em CSS px numa janela de 1440×900, com R = 72 px (raio do horizonte).

### S1 — Só o gradiente embaixo

1. Sempre, a Hero não tem planeta: não há `[data-testid="hero-planet"]`. O caminho do buraco
   negro deixa de ser limitado pelo planeta e volta às margens de `HOLE.margin`.

### S2 — Estrelas incandescentes que esmaecem para baixo

2. Sempre, a opacidade de cada estrela (pequenas e de destaque) é 1 − y/H, sendo y a altura dela
   no céu: 1 no topo da Hero, 0 na base, linear como o gradiente. Abaixo da Hero, fica 0.
3. Sempre, cada estrela pequena brilha:
   - um núcleo `mist`/`snow` do tamanho de hoje (1 a 2 px);
   - um halo de raio igual a 3 vezes o tamanho, com 35% do brilho do núcleo, esmaecendo até 0;
   - um quarto das estrelas, as mais brilhantes, ganha raios em cruz de 4 vezes o tamanho, como
     as de destaque.

### S3 — O buraco negro

4. Sempre, os discos têm o dobro do tamanho de hoje, e a ligação entre eles continua:
   - o horizontal vai de 1,15 a 8 R (era 4);
   - o vertical vai de 1,05 a 1,80 R em cima (era 1,425) e a 1,39 R embaixo (era 1,22);
   - as faixas de cor do vertical continuam entrando no horizontal pela parte de mesma cor (task
     `black-hole-disk-colors`, 1–3), agora até a borda de 8 R.
5. Sempre, os discos são vistos 7° acima do plano (eram 13°): mais de lado do que de cima.
6. Sempre, o eixo longo do disco horizontal fica inclinado 20° da horizontal, no sentido "/":
   sobe para a direita. Na tela, a borda direita do disco está acima da esquerda.
7. Quando a página carrega com o movimento ligado, o centro do buraco negro começa no canto
   superior esquerdo do seu caminho, a ±2 px de (`box.left`; `box.top`). Sob movimento reduzido,
   ele fica parado ali.
8. Enquanto o movimento estiver ligado, o caminho cobre a Hero inteira. Numa simulação de 300 s
   a 1440×900, a partir do canto superior esquerdo, o centro passa pelos quatro quadrantes da
   caixa do caminho. A velocidade fica de 2,5 a 7,5 px/s e o tamanho fica fixo, como hoje.

### S4 — A lente

9. Sempre, a lente é radial: o desvio de um ponto depende só da distância dele ao centro, não do
   ângulo (`FIELD.exponent` = 0; era 0,5).
10. Sempre, a área curvada é 1,2 vez maior:
    - o anel de Einstein vai a 1,92 R (era 1,6);
    - o fluxo aerodinâmico contorna um círculo de 1,92 R (era 1,6).

    O fluxo continua por fora da distorção radial, como hoje.

### Regras herdadas

11. Sempre:
    - o título, o subtítulo, o CTA, o gradiente e as cores dos discos ficam como em
      `portfolio-lp-space` e `black-hole-disk-colors`;
    - na sonda de GPU (Iris Xe, 1440×900, `deviceScaleFactor` 1), a espera média fica em até 8 ms,
      a 60 FPS;
    - nenhum pixel é quente (r ≤ b + 8);
    - nenhuma dependência nova.

## Out of scope

- **Testes:** o usuário decidiu não escrever testes nem rodar os que existem.
- **Mudar a velocidade do buraco negro:** o pedido é ir mais longe, não mais rápido
  (Unresolved 4).
- **Girar o fluxo aerodinâmico com o disco:** o fluxo continua horizontal (Unresolved 3).

## Observable

| Surface            | Decision                        | Landing                                                              |
| ------------------ | ------------------------------- | -------------------------------------------------------------------- |
| tela `/` › `#hero` | em repouso e em movimento       | 1–10                                                                 |
| tela `/` › `#hero` | carregando                      | existing - o céu e o buraco negro entram com a cena 3D               |
| tela `/` › `#hero` | erro (sem WebGL)                | existing - Unresolved herdado; ficam o texto e o gradiente           |
| tela `/` › `#hero` | movimento reduzido              | 7 (parado no canto superior esquerdo)                                |
| tela `/` › `#hero` | janela estreita (375×667)       | 7 e 8 usam a caixa do caminho, que escala com a Hero; 2 é por fração |
| tela `/` › `#hero` | não autorizado, ação destrutiva | n/a - página pública                                                 |

## Swept

- validation: n/a - nenhuma entrada
- failure modes: existing - sem WebGL, ficam o texto e o gradiente
- idempotency and retry: n/a
- authorization: n/a - página pública
- concurrency and ordering: n/a - nenhuma corrida
- data lifecycle: n/a - nada persiste
- external-dependency failure: n/a - nada externo
- state transitions: 7 (início no canto, depois o caminho)
- observability: n/a - sem telemetria; o desempenho fica na sonda de 11

## Impact

| Front           | What changes                                                                                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain          | `DISK.outer` 4 → 8, `HOLE.halfWidth` 4 → 8, `HOLE.topHeight` 1,425 → 1,80, `HOLE.halfHeight` 1,22 → 1,39. Quem depende: o shader do mesh (faixas, cores e pés), `wanderBox` (o alcance passa a 1,80 R) e `diskTurnSeconds`. |
| domain          | `DISK_POSE.tilt` 13° → 7°; o mesh passa a usar um `roll` de 70°, em vez de 0.                                                                                                                                               |
| domain          | `FIELD.exponent` 0,5 → 0, `EINSTEIN.radius` e `FLOW.radius` 1,6 → 1,92. Quem depende: `bent-light.tsx`, `deflection.ts` (`bendAt` e `fieldShare`) e `black-hole-path.ts`, se usar o campo.                                  |
| domain          | `HOLE.rest` (meio, 32%) deixa de ser o início; o início e o repouso passam a ser o canto superior esquerdo da caixa. Quem depende: `use-hero-field.ts` (`resetPath`, `advance`).                                            |
| desempenho      | com o disco 2 vezes maior, o quadrado do buraco negro (`SPAN` = 5) precisa ir a ~9,5 R, e a área desenhada cresce ~3,6 vezes. Os desvios rápidos do shader limitam o custo, mas 11 tem de ser medido.                       |
| layout          | sai `hero-planet.tsx` e `PLANET`. O limite do planeta em `wanderBox` também sai.                                                                                                                                            |
| teste           | nenhum teste muda nem roda, por decisão do usuário. `black-hole.test.ts`, `black-hole-path.test.ts`, `deflection.test.ts` e os e2e do buraco negro supõem os valores antigos.                                               |
| tarefa anterior | `portfolio-lp-space.md` (6 e 7: o planeta) e `portfolio-lp-black-hole-disk-colors.md` (coordenadas das linhas em R, que agora escalam com o disco) ganham nota no topo.                                                     |
| stored data     | nothing to migrate - nada persiste                                                                                                                                                                                          |

## Decided

| Decision                                                                      | Shape | Alternative rejected |
| ----------------------------------------------------------------------------- | ----- | -------------------- |
| None - tudo é reversível: nada persiste, nenhum contrato, nenhuma dependência | -     | -                    |

## Sources

- Conversa com o usuário (2026-10-28), transcrita:
  - "1- Remova a silhueta do planeta, deixe só o gradiente."
  - "2- As estrelas devem ser opacity 0 até 1 junto com o gradiente, quanto mais pra cima, mais
    perto do 1 ou 1. Quanto mais pra baixo, mais perto do 0 ou 0."
  - "3- As estrelas devem ser encadescentes, parece que as estrelas atuais não tem brilho..."
  - "4- Aumente 1.2x a área de distorção causada pelo buraco negro."
  - "5- O buraco negro deve se mexer para mais longe, hoje ele fica mais no meio, ele deve
    iniciar no canto superior esquerdo e começar seu trageto, claro, respeitando a
    responsividade."
  - "6- O buraco negro deve ficar mais torto para esquerda, neste sentido: "/" em cerca de 70º de
    inclinação."
  - "7- Aumente 2 vezes o tamanho dos discos de acresção, mantendo o comportamento de ligação
    entre os discos vertical e horizontal."
  - "8- a perspectiva do usuário em relação ao buraco negro deve ficar um pouco mais "de lado",
    hoje vemos ele de lado encima, mude um poucco a perspectiva para vermos ele mais de lado do
    que de cima."
  - "9- eu cinseramente acho que a distorção do buraco negro está meio errada, acho que ele deve
    distorcer de forma radial e em forma de fluxo aerodinâmico, ainda vamos ter 2 distorções, a
    distorção de aerodinamica vai ficar (a distorção mais distante) e a distorção da "maçã" deve
    se tornar radial apenas."
  - "Use o /tlc-plan para planejar essa implementação." Sem testes e tudo na `main`, como nas
    tarefas anteriores.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| #   | Kind           | Question                               | Until answered                  |
| --- | -------------- | -------------------------------------- | ------------------------------- |
| 1   | blocks go-live | Texto real e destino do CTA (herdado). | Lorem; o CTA leva a `#contato`. |

Respostas do usuário (2026-10-28):

- 2: "Sim, o correto acho que seria 20º", no sentido "/" (6).
- 3: "Fluxo aerodinâmico consinua": o fluxo continua horizontal.
- 4: "Sim, ele vai mais longe, não mais rápido": a velocidade fica a de hoje.
