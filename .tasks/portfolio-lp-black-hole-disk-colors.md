# Landing page do portfólio — disco vertical nas cores do horizontal, ligado a ele por faixa de cor

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

Nomes como na tarefa `portfolio-lp-black-hole-joined-disk`:

- **disco vertical:** o anel redondo que passa por cima, por baixo e pelos lados da sombra (`over` no
  shader);
- **disco horizontal:** o oval deitado, o dos filamentos de gás (`disk()`).

Hoje (`.tasks/references/portfolio-lp-black-hole-disk-colors-before.png`):

- **O disco vertical é todo branco.** O horizontal vai do branco (`mist`), perto da sombra, ao
  azul (`primary`), na borda de fora. O vertical não segue essas cores, porque a cor dele é
  calculada pelo raio na tela (1,05 a 1,425 R). Esse raio cai todo na parte branca do horizontal
  (`arcColor`, `black-hole-mesh.tsx:202`).
- **Nos lados, a ligação não segue as cores.** Os pés do vertical se abrem no plano do horizontal
  só até 1,6 R (`FOOT_OUT`). A borda de fora, que deveria ser azul, não chega à borda azul do
  horizontal. Por isso a luz que a gravidade dobrou não parece vir do mesmo disco.
- **Embaixo, o disco vertical também é branco.** Somado ao anel de fótons, forma um anel branco
  grosso sob a sombra.

A fonte não traz métrica. O que se perde hoje é o realismo do buraco negro, que é o assunto da Hero.

Com a tarefa entregue:

- em cima, o disco vertical tem as mesmas cores do horizontal: branco junto à sombra, azul claro
  no meio e azul na borda de fora;
- nos lados, cada faixa de cor desce e entra no horizontal pela parte de mesma cor, como nas
  linhas desenhadas pelo usuário;
- embaixo, o disco vertical é azul escuro, e o único branco é uma linha fina.

8 critérios em 3 fatias · 0 one-way doors · 1 em aberto, que bloqueia go-live (herdado).

## Criteria

Medidas em CSS px numa janela de 1440×900, com R = 72 px (horizonte de 144 px). θ é o ângulo em
volta do centro do buraco negro: 90° em cima, 270° embaixo, 0° e 180° nos lados. Nas posições
(x; y), y cresce para cima. A **parte azul** de um pixel é b / (r + g + b), nos valores sRGB que
aparecem na tela. Para comparar: `mist` (#f2f7ff) dá 0,34 e `primary` (#3f30f1) dá 0,68.

### S1 — Em cima, o disco vertical nas cores do horizontal

1. Sempre, em cima (θ de 30° a 150°), o disco vertical tem, de dentro para fora, as três faixas do
   horizontal: branca (`mist`) junto à sombra, azul claro no meio e azul (`primary`) na borda de
   fora. Em θ = 90°:
   - a parte azul é ≤ 0,40 a 1,08 R, fica entre 0,42 e 0,55 a 1,25 R e é ≥ 0,55 a 1,35 R;
   - de 1,08 R a 1,35 R, a parte azul nunca diminui (a ordem branca → azul claro → azul não volta).

### S2 — Nos lados, cada faixa entra no horizontal pela parte de mesma cor

2. Sempre, as três faixas descem dos dois lados (espelhadas em x) e seguem as linhas desenhadas na
   referência, a no máximo 0,1 R delas:
   - **azul** (linha roxa): da borda de fora no topo, (0; 1,43), até (±1,9; 0,8). Lá encontra a
     borda de fora do disco horizontal (raio 4 no plano). Hoje, os pés param em 1,6 R;
   - **azul claro** (linha ciano): de (±0,9; 1,0) até (±1,45; 0,68);
   - **branca** (linha vermelha): de (±0,9; 0,7) até (±1,45; 0,3).
3. Sempre, ao longo de cada uma das três linhas, de um ponto ao próximo (a 0,05 R), a parte azul
   muda menos de 0,05. Isso vale também no ponto em que a linha encontra o disco horizontal: na
   junção não há degrau de cor.
4. Sempre, o gás de cada faixa continua no gás do horizontal. Os filamentos que chegam à junção
   seguem dentro do horizontal sem corte. Giram no mesmo período que o gás do horizontal no raio
   do plano em que entram (de 73 s a 145 s por volta, `diskTurnSeconds`).

### S3 — Embaixo, azul escuro com uma linha fina branca

5. Sempre, embaixo (θ de 240° a 300°, onde o disco horizontal não passa na frente), de 1,10 R até
   a borda de fora (1,22 R), o disco vertical é azul escuro: parte azul ≥ 0,55 e nenhum canal acima
   de 160 (em 255).
6. Sempre, embaixo (θ de 200° a 340°), o anel de fótons fica um pouco mais fino. A largura da
   gaussiana cai de 0,028 R para 0,020 R. Em cima, continua 0,028 R.
7. Sempre, embaixo (θ de 240° a 300°), o único branco (os três canais ≥ 200) está de 1,00 R a
   1,07 R: é o anel de fótons. O disco vertical ali é só azul escuro (5).

### Regras herdadas

8. Sempre:
   - o disco horizontal não muda: raios de 1,15 a 4 R, inclinação de 13°, filamentos, cores e
     brilho;
   - o anel de fótons continua em 1,04 R e em `mist`; só a largura embaixo muda (6);
   - em θ = 90°, o disco vertical continua de 1,05 R a 1,425 R; em θ = 270°, de 1,05 R a 1,22 R;
   - só entram as cores `mist`, `primary` e `ink`, e a regra "cool blues only" do e2e continua
     valendo;
   - nenhuma dependência nova entra no `package.json`;
   - o buraco negro vaga e tem tamanho fixo, como hoje.

## Out of scope

- **Mudar o disco horizontal:** o pedido é que o vertical siga o horizontal, não o contrário.
- **Mudar a forma do disco vertical em cima (θ = 90°) e embaixo:** o pedido é sobre cores e
  ligações. Nos lados, os pés mudam porque a faixa azul tem de chegar a (±1,9; 0,8) (2).
- **Mudar o brilho em volta, ou o anel de fótons além da largura embaixo (6).**
- **Testes:** o usuário decidiu não rodar testes nem escrever novos, porque demoram demais.

## Observable

| Surface            | Decision                        | Landing                                                          |
| ------------------ | ------------------------------- | ---------------------------------------------------------------- |
| tela `/` › `#hero` | em repouso e em movimento       | 1–8                                                              |
| tela `/` › `#hero` | carregando                      | existing - a cena 3D desenha quando pronta; nada mais a carregar |
| tela `/` › `#hero` | erro (sem WebGL)                | existing - Unresolved herdado de `portfolio-lp-cosmos`           |
| tela `/` › `#hero` | janela estreita (375×667)       | existing - escala com `holeScale`; as medidas são em R           |
| tela `/` › `#hero` | movimento reduzido              | existing - `uTime` para; as cores não dependem do tempo          |
| tela `/` › `#hero` | não autorizado, ação destrutiva | n/a - página pública                                             |

## Swept

- validation: n/a - nenhuma entrada
- failure modes: n/a - só muda o cálculo do shader; nada novo pode falhar
- idempotency and retry: n/a
- authorization: n/a - página pública
- concurrency and ordering: 4 (o gás das faixas e o do horizontal usam o mesmo `uTime` e o mesmo
  período no raio da junção)
- data lifecycle: n/a - nada persiste
- external-dependency failure: n/a - nenhum recurso externo
- state transitions: n/a
- observability: n/a - sem telemetria

## Impact

| Front           | What changes                                                                                                                                                                                                                                                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain          | termo existente: `arcColor` vinha do raio na tela; passa a vir do raio no plano do horizontal que cada faixa representa. Quem depende: só `light` em `black-hole-mesh.tsx`.                                                                                                                                                                                 |
| domain          | termo existente: `FOOT_OUT` (1,6) era até onde os pés chegavam no plano. A faixa azul agora chega a (±1,9; 0,8) R. Quem depende: `outer` no shader. `wanderBox` (`black-hole-path.ts:54`) guarda `max(halfHeight, topHeight)` = 1,425 R nos dois eixos e não muda: os pés, a 1,9 R, ficam dentro do disco horizontal (4 R), que a caixa já não guarda hoje. |
| teste           | `e2e/black-hole.spec.ts:50-59` diz que os arcos "keep within 1.65 horizon radii", e `ARC_REACH` vai até 1,6 R. Com os pés indo a 1,9 R, `DISK_REACH.from` (1,6) passa a cruzar os pés. "a thinner, fainter arc runs under the horizon" (`:288`) mede o brilho embaixo, que muda de cor. O usuário decidiu não mexer nos testes nem rodá-los.                |
| tarefa anterior | `.tasks/portfolio-lp-black-hole-joined-disk.md`: o critério 4 ("a parte de baixo … fica como hoje: … mesmo brilho, mesmo gás") e o 5 (pés até 1,6 R) deixam de valer. Os dois recebem no topo uma nota apontando para esta tarefa.                                                                                                                          |
| stored data     | nothing to migrate - nada persiste                                                                                                                                                                                                                                                                                                                          |

## Decided

| Decision                                                                           | Shape | Alternative rejected |
| ---------------------------------------------------------------------------------- | ----- | -------------------- |
| None - tudo é reversível: nada persiste, nenhum contrato, nenhuma dependência nova | -     | -                    |

## Sources

- Conversa com o usuário (2026-10-28), transcrita:
  - "precisamos corrigir as cores e ligações da parde superior do disco de acresção vertical do
    buraco negro do projeto."
  - "As linhas exemplificam como os gases do disco de acresção vertical deve se conectar ao disco
    de acresção horizontal."
  - "A linha roxa seria a ligação da parte mais azul dos discos de acresção."
  - "A linha azul claro seria a parte azul claro dos discos de acresção."
  - "A linha vermelha seria a parte branca dos discos de acresção."
  - "O disco de acresção vertical está completamente branco, a ideia é que ele siga as cores do
    disco horizontal."
  - "A parte inferiro do disco de acresção vertical deve ser azul escuro, apenas com uma linha fina
    branca."
- Estado de hoje: `.tasks/references/portfolio-lp-black-hole-disk-colors-before.png`.
- Referência, **vinculante para as ligações**:
  `.tasks/references/portfolio-lp-black-hole-disk-colors.jpeg`. É a mesma captura com três linhas
  desenhadas por cima. Fora das linhas, os pixels são iguais, salvo a compressão JPEG (amostrados
  em x = 395 e x = 440). Por isso a referência não informa
  cores, só por onde passam as faixas. Transcrição em R (raio da sombra ≈ 90 px na imagem, centro
  em (395; 205)), com y para cima:
  - **roxa:** sai de (−1,9; 0,78), sobe até (0; 1,48), logo acima da borda de fora do vertical, e
    desce até (+1,9; 0,83). Do lado direito, fica plana em y ≈ 0,83 de x = 1,3 a 1,9;
  - **ciano:** de (±0,89; 1,0) a (±1,44; 0,68);
  - **vermelha:** de (±0,9; 0,7) a (±1,45; 0,29).

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| #   | Kind           | Question                        | Until answered                   |
| --- | -------------- | ------------------------------- | -------------------------------- |
| 1   | blocks go-live | Conteúdo real e CTAs (herdado). | A Hero mostra só o buraco negro. |

Respostas do usuário (2026-10-28), sobre as perguntas que estavam em aberto:

- 1 (conteúdo real): "Vamos ver depois."
- 2 (linha branca): "Sim, esse mesmo, deve diminuir um pouco a largura e o disco de acresção deve
  ser azul escuro apenas." Virou os critérios 6 e 7.
- 3 (testes): "Não vamos ter testes por que está demorando demais, não rode testes nem faça novos."
- 4 (valores lidos das linhas): "Certo."
