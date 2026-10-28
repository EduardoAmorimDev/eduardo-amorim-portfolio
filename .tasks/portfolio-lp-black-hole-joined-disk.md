# Landing page do portfólio — só o buraco negro, disco vertical mais grosso em cima e ligado ao horizontal

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

O usuário passa a chamar os dois discos assim:

- **vertical:** o anel redondo que passa por cima, por baixo e pelos lados da sombra;
- **horizontal:** o oval deitado, o dos filamentos de gás.

Hoje:

- **a Hero mostra mais do que o buraco negro:** o `logo`, os quatro modelos de vidro atrás e a
  parede de texto lorem atrás.
- **o disco vertical tem a mesma largura em toda a volta**, de 1,05 a 1,22 raio do horizonte
  (R). Na referência, em cima ele é um pouco mais grosso que embaixo.
- **os dois discos parecem duas peças.** O anel atravessa o oval nos lados, sem se ligar a ele.
  Na referência, são uma coisa só: o disco horizontal cuja luz de trás a gravidade dobrou por
  cima e por baixo da sombra.

A fonte não traz métrica; o custo é o realismo do buraco negro, que é o assunto da Hero agora.

Com a tarefa entregue:

- a Hero mostra só o buraco negro;
- o disco vertical fica mais grosso em cima e igual embaixo;
- nos lados, o disco vertical se abre no horizontal, e os dois leem como um disco só.

8 critérios em 3 fatias · 0 one-way doors · 3 em aberto, nenhum bloqueia (1 bloqueia go-live,
herdado).

## Criteria

Medidas em CSS px numa janela de 1440×900, com R = 96 px. θ é o ângulo em volta do centro do
buraco negro: 90° em cima, 270° embaixo, 0° e 180° nos lados.

### S1 — Só o buraco negro

1. Quando `/` carrega, a Hero não pede nenhum modelo de `/models/glass/` e não desenha `logo`,
   ícones nem a parede de texto. Na tela da Hero, só o buraco negro tem luz: a sombra, o anel
   de fótons, o brilho em volta e os dois discos.
2. Sempre, a Hero não tem texto nem canvas 2D visível. O `#hero` não tem `h1`, `p`, `a` nem
   texto.

### S2 — Disco vertical mais grosso em cima

3. Sempre, o disco vertical vai de 1,05 R até 1,30 R em cima (θ = 90°), e até 1,22 R embaixo
   (θ = 270°), como hoje. A borda de fora passa de uma medida à outra suavemente, conforme sen θ.
   Em cima, a largura cresce cerca de 50% (de 0,17 a 0,25 R).
4. Sempre, a parte de baixo do disco vertical, de θ = 200° a 340°, fica como hoje: mesmos raios,
   mesmo brilho, mesmo gás.

### S3 — Disco vertical ligado ao horizontal

5. Sempre, nos lados (θ a até ~20° de 0° ou de 180°), os pés do disco vertical se alargam ao longo
   do plano do disco horizontal até 1,6 R e se fundem nele, como na referência.
   - Nessa faixa, o gás do vertical é amostrado no plano do disco, no mesmo raio e ângulo do
     horizontal, e tem o brilho inteiro, sem o desconto de 0,6 dos lados.
   - O arco de cima parece sair do disco, e não atravessá-lo.
6. Sempre, sobre a horizontal do centro, dos dois lados e de 1,05 R a 2 R, o brilho do buraco
   negro (o alfa do quadrado dele) não cai abaixo de 60% do brilho a 2 R. Não há faixa escura
   entre os dois discos.
7. Sempre, os dois discos giram juntos: o gás do vertical e o do horizontal usam o mesmo período
   (73 s a 145 s por volta) e o mesmo padrão de filamentos.

### Regras herdadas

8. Sempre:
   - nenhuma dependência nova entra no `package.json`;
   - o buraco negro vaga entre 2,5 e 7,5 px/s, com tamanho fixo;
   - o disco horizontal continua como está (raios de 1,15 a 3 R, espessura, filamentos, brilho).

## Out of scope

- **Escrever, mudar ou rodar testes:** decisão do usuário.
- **Apagar o código dos modelos, da parede de texto e da lente:** saem da Hero, mas os
  componentes ficam no projeto. A lente continua ligada, sem nada atrás para dobrar
  (Unresolved 3).
- **Mudar o disco horizontal:** o pedido é ligá-lo ao vertical, não alterá-lo.

## Observable

| Surface            | Decision                        | Landing                                                          |
| ------------------ | ------------------------------- | ---------------------------------------------------------------- |
| tela `/` › `#hero` | em repouso e em movimento       | 1–7                                                              |
| tela `/` › `#hero` | carregando                      | existing - a cena 3D desenha quando pronta; nada mais a carregar |
| tela `/` › `#hero` | erro (sem WebGL)                | existing - Unresolved herdado de `portfolio-lp-cosmos`           |
| tela `/` › `#hero` | janela estreita (375×667)       | existing - escala com `holeScale`                                |
| tela `/` › `#hero` | não autorizado, ação destrutiva | n/a - página pública                                             |

## Swept

- validation: n/a - nenhuma entrada
- failure modes: n/a - nada novo pode falhar; sem modelos, não há carga que falhe
- idempotency and retry: n/a
- authorization: n/a - página pública
- concurrency and ordering: 7 (os dois discos usam o mesmo tempo, `uTime`)
- data lifecycle: n/a - nada persiste
- external-dependency failure: n/a - nenhum recurso externo
- state transitions: n/a
- observability: n/a - sem telemetria

## Impact

| Front           | What changes                                                                                                                                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain          | termos novos: disco vertical (o anel, `over` no shader) e disco horizontal (o oval, `disk()`). Os nomes passam aos comentários de `black-hole-mesh.tsx`.                                                                                                  |
| domain          | termo existente: `HOLE.halfHeight` (1,22, a borda de fora do anel) passa a valer embaixo, e entra uma borda de cima de 1,30. Quem depende: `wanderBox` em `black-hole-path.ts`, que deve guardar a borda maior, 1,30.                                     |
| layout          | `HeroScene` deixa de montar `GlassElements`, `BehindText`, `StudioEnvironment` e a névoa, que existiam para os ícones. O canvas da constelação (`hero-lens`) sai se nada mais o usar. Quem depende: `use-hero-field.ts`, que tira o tamanho desse canvas. |
| desempenho      | sem quatro modelos de vidro e sem a parede de texto, a camada de trás fica vazia, mas a lente continua desenhando-a a cada quadro (Unresolved 3).                                                                                                         |
| teste           | nenhum teste muda nem roda, por decisão do usuário.                                                                                                                                                                                                       |
| processo        | commit direto na `main`, por decisão do usuário.                                                                                                                                                                                                          |
| tarefa anterior | `.tasks/portfolio-lp-black-hole-behind.md` (3–8) e `.tasks/portfolio-lp-black-hole-flow.md` (7–9) recebem no topo: os modelos e a parede de texto saem da Hero.                                                                                           |
| stored data     | nothing to migrate - nada persiste                                                                                                                                                                                                                        |

## Decided

| Decision                                                                           | Shape | Alternative rejected |
| ---------------------------------------------------------------------------------- | ----- | -------------------- |
| None - tudo é reversível: nada persiste, nenhum contrato, nenhuma dependência nova | -     | -                    |

## Sources

- Conversa com o usuário (2026-10-28), transcrita:
  - "o vertical é o disco redondo que passa por cima, baixo e lados da bola preta. o horizontal
    é o que simula os gases, ele tem a forma oval deitada na horizontal."
  - "1 - Remover completamente os campos de texto da Hero assim como todos elementos que não
    sejam o buraco negro."
  - "2 - Aumentar um pouco a grossura do disco de acresção vertical na parte de cima do buraco
    negro, a parte de baixo deve permanecer intacta."
  - "3 - Adicionar ligação entre o disco de acresção vertical e horizontal nas laterais do disco
    de acresção vertical, isso vai simular que os discos de acresção na verdade são a mesma
    coisa, e a luz dele apenas está sofrendo distorção."
  - "note como a parte de cima do buraco negro tem o disco de acresção um pouco mais grosso que a
    parte de baixo, note também que o disco de acresção parece uma coisa só, o disco de acresção
    vertical e horizontal estão conectados."
- A primeira referência indicada (`Downloads/buraco-negro-de-4k-…webp`) não abriu: era uma página
  HTML de 200 KB. O usuário mandou a correta:
  `.tasks/references/portfolio-lp-black-hole-joined-disk.png`. Transcrição:
  - a sombra é redonda e escura, com um anel fino e claro (ciano) colado nela em toda a volta;
  - um disco largo e inclinado, de filamentos coloridos, vai a ~4,5 raios da sombra para os
    lados;
  - sobre a sombra, um arco grosso, de ~1,0 a ~1,32 raio, sobe do disco. Seus pés se alargam
    ao longo do plano do disco até ~1,6 raio de cada lado e se fundem nele;
  - sob a sombra, abaixo do disco, um arco fino, de ~0,1 raio de largura;
  - as cores (ciano e magenta) não entram: o projeto usa `mist`, `primary` e `ink`.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| #   | Kind           | Question                                                                                                                            | Until answered                                                                                  |
| --- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | blocks go-live | Conteúdo real e CTAs (herdado).                                                                                                     | A Hero mostra só o buraco negro.                                                                |
| 2   | open           | "Um pouco mais grosso" em cima: +50% de largura (1,30 R) serve? E "ligação" é o anel abrindo-se no plano do disco nos lados (±20°)? | Escrito como em 3 e 5; ajusta-se ao ver. Ajuda reenviar a imagem de referência, que não baixou. |
| 3   | open           | Com nada atrás, a lente deve continuar ligada (custa um passe por quadro) ou sair até haver conteúdo atrás?                         | Continua ligada.                                                                                |
