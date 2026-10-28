# Landing page do portfólio — modelos 3D atrás do buraco negro, sem malha, lente sem vazios

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

> **Substituídos em parte por `.tasks/portfolio-lp-black-hole-apple.md` (2026-10-28):** 5 (tabelas
> de θ₊/θ₋) e 8 em parte (o `logo` deixa de seguir o ponteiro).

## Intent

A lente gravitacional da Hero (`portfolio-lp-black-hole-lensing`) distorce só a malha. O
resultado não convence o dono do portfólio:

- **metade da lente não mostra nada.** Logo acima da sombra, entre ~1,5 e 2,5 raios do
  horizonte, aparece um anel escuro. Ele tem duas causas:
  - a malha tem um buraco recortado atrás do horizonte, e o poço puxa as linhas para longe
    dali. A lente amplia exatamente esse vazio.
  - todo raio que a lente manda para fora da tela é descartado (`discard` em
    `bent-light.tsx`). Isso apaga quase toda a região espelhada abaixo do centro, porque ela
    vem de pontos acima do topo da Hero.
- **a metade mais próxima do buraco negro parece errada.** As imagens espelhadas da malha se
  amontoam em círculos finos junto ao anel de fótons. Nas referências, ali há conteúdo denso.
- **a malha esconde o efeito que ele quer ver.** Ele quer ver a lente sobre objetos de verdade.
- **o disco não parece girar em volta do buraco negro.** Hoje cada volta leva 8 a 16 s.
- **o buraco negro ainda anda rápido demais para a cena** (10 a 30 px/s).

A fonte não traz métrica; o custo é a primeira impressão de quem visita.

Com a tarefa entregue:

- a Hero fica sem malha;
- os quatro modelos 3D de vidro que o projeto já tem (`cursor`, `wave`, `atom`, `brick`)
  flutuam atrás do buraco negro, e a lente os distorce;
- a lente enxerga além das bordas da tela, então os raios desviados encontram o que está fora
  dela em vez de sumir;
- o disco gira em 3 a 6 s por volta;
- o buraco negro anda na metade da velocidade.

12 critérios em 4 fatias · 1 one-way door · 4 em aberto, nenhum bloqueia (1 bloqueia go-live,
herdado).

## Criteria

Medidas em CSS px numa janela de 1440×900, salvo quando indicado. "Movimento reduzido" é
`prefers-reduced-motion: reduce`: o buraco negro fica em repouso em (720, 288), com horizonte de
96 px de raio. "Camada de trás" é o que fica atrás do buraco negro e só aparece pela lente: os
quatro modelos novos.

### S1 — A Hero sem malha

1. Sempre, nenhuma linha da malha aparece na Hero, nem direta nem pela lente. O canvas
   `hero-grid` não é desenhado na tela.
2. Sempre, o poço do ponteiro e o poço do buraco negro deixam de ter efeito visível, porque
   deformavam só a malha. O caminho, a subida e o tamanho do buraco negro continuam como hoje.

### S2 — Modelos atrás do buraco negro, vistos pela lente

3. Quando `#hero` renderiza, os modelos `/models/glass/cursor.glb`, `wave.glb`, `atom.glb` e
   `brick.glb` são carregados e aparecem na Hero com o mesmo vidro do `logo`.
4. Sempre, os quatro modelos ficam atrás do buraco negro: mais longe da câmera que ele. Onde a
   sombra cobre um deles, o pixel é a sombra, nunca o modelo.
5. Sempre, os quatro modelos só aparecem pela lente. Um ponto de um modelo que, sem lente,
   estaria a d px do centro do buraco negro aparece a θ₊(d) do mesmo lado, e a θ₋(d) do lado
   oposto. Os valores na subida 0,5, com ±4 px, são os de `portfolio-lp-black-hole-lensing`:

   | d (px) | θ₊ (px) | θ₋ (px) |
   | ------ | ------- | ------- |
   | 96     | 238     | 160     |
   | 192    | 298     | 139     |
   | 476    | 530     | 111     |

   A força segue a subida, como já é hoje (critério 5 de lá).

6. Sempre, a camada de trás cobre o dobro da largura e o dobro da altura da Hero, centrada nela.
   Um raio que a lente desvia para até meia Hero além de qualquer borda mostra o que está ali.
   Só um raio desviado para além disso mostra o fundo da página.
7. Enquanto houver movimento reduzido, com a camada de trás preenchida por inteiro, todo pixel
   entre 1,1 e 3 raios do horizonte mostra a camada de trás. Nenhum é descartado. Hoje, metade
   desse anel some.
8. Sempre, o `logo` continua à frente do buraco negro e não é distorcido. Os quatro modelos
   novos não pegam o ponteiro (não inclinam, não crescem no hover), e o `logo` continua
   pegando.

### S3 — O disco gira de fato

9. Enquanto não houver movimento reduzido, o gás do disco dá uma volta a cada 3 s na borda de
   dentro (1,5 raio) e a cada 6 s na de fora (4,2 raios), linear entre as duas. Hoje são 8 e
   16 s. O desenho do disco (inclinação, eixo, brilho do lado que se aproxima) não muda.
10. Enquanto houver movimento reduzido, o disco fica parado, como hoje.

### S4 — Metade da velocidade

11. Enquanto não houver movimento reduzido, o buraco negro anda entre 5 e 15 px/s, metade dos
    10 a 30 px/s de hoje. As outras regras do caminho continuam: curva a cada 4 a 10 s, nunca
    salta mais de 4 px num quadro e nunca para.

### Regras herdadas

12. Sempre, as regras vigentes continuam:
    - fora da tela, a Hero faz 0 draw calls;
    - o `logo` não cruza o `<h1>` nem o CTA;
    - nenhuma dependência nova entra no `package.json`.

## Out of scope

- **Traçar a luz do disco pela lente** (o anel por cima e por baixo da sombra da 2ª referência):
  o usuário escolheu manter o disco atual girando mais rápido.
- **Escrever, alterar ou rodar testes:** decisão do usuário ("não mexa nos testes, isso está
  demorando demais"). Os testes que esta tarefa quebra estão em `Impact`.
- **Apagar o código da malha:** ela sai "por enquanto". O desenho deixa de aparecer, mas
  `grid-motion.ts` e o laço que move o buraco negro continuam.
- **Mudar a força da lente para a distância até os modelos:** a lente segue a subida como hoje.
  Fisicamente, "rente à malha" deixa de ter objeto com a malha fora; ver Unresolved 3.
- **Aberração cromática da referência:** franjas de câmera, não de gravidade.

## Observable

| Surface            | Decision                                                       | Landing                                                                                          |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| tela `/` › `#hero` | em repouso (movimento reduzido)                                | 5, 7, 10                                                                                         |
| tela `/` › `#hero` | em movimento                                                   | 5, 9, 11                                                                                         |
| tela `/` › `#hero` | carregando (modelos ainda chegando)                            | existing - `Suspense` sem fallback: o que já carregou aparece, o resto entra depois              |
| tela `/` › `#hero` | erro (modelo que não carrega, sem WebGL)                       | existing - `Suspense` não mostra o modelo; sem WebGL segue Unresolved 2 de `portfolio-lp-cosmos` |
| tela `/` › `#hero` | densidade e ordem (logo à frente, buraco negro, modelos atrás) | 4, 8; posição e tamanho dos modelos: Unresolved 2                                                |
| tela `/` › `#hero` | janela estreita (375×667)                                      | Unresolved 2 (onde os modelos ficam numa tela estreita)                                          |
| tela `/` › `#hero` | não autorizado, ação destrutiva                                | n/a - página pública, sem ação destrutiva                                                        |

## Swept

- validation: n/a - nenhuma entrada de dados
- failure modes: existing - um modelo que não carrega não aparece (`Suspense`) e o resto da Hero segue
- idempotency and retry: n/a - nada é enviado nem gravado
- authorization: n/a - página pública
- concurrency and ordering: 5 (a camada de trás é desenhada no mesmo quadro que a lente a lê; a lente e a sombra usam o mesmo `hole` do quadro, como hoje)
- data lifecycle: n/a - nada persiste
- external-dependency failure: n/a - os modelos vêm do próprio site; falha de carga em failure modes
- state transitions: 10 (disco parado sob movimento reduzido)
- observability: n/a - o projeto não tem telemetria; o custo de quadro da camada de trás fica em Impact

## Impact

| Front           | What changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain          | termo novo: camada de trás. É o que fica atrás do buraco negro e só é visto pela lente: os quatro modelos, desenhados fora da tela numa textura do dobro da Hero. O passe da lente (`BentLight`) deixa de ler um canvas 2D e passa a ler essa textura.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| domain          | termo existente: `BlackHole`/`BentLight` recebem hoje `behind`, o canvas da malha. Passam a receber a camada de trás (Decided 1). Quem depende: `hero-scene.tsx`, `hero.tsx`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| domain          | termo existente: `GLASS_LAYOUT` (`glass-motion.ts`) tem hoje só o `logo`. Ganha os quatro modelos atrás, sem pointer. Quem depende: `glass-elements.tsx`, `glass-motion.test.ts`, `e2e/hero.spec.ts` ("only the logo model is loaded").                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| domain          | termo existente: `DISK.innerTurn`/`outerTurn` passam de 8/16 a 3/6 s, e `WANDER.minSpeed`/`maxSpeed` de 10/30 a 5/15 px/s, e `maxSpeedStep` (a maior troca de velocidade entre pernas) de 4 a 2 px/s, na mesma proporção. Quem depende: `black-hole-path.ts`, `black-hole-mesh.tsx` (uniforms).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| desempenho      | a camada de trás é desenhada a cada quadro numa textura de 2× a largura e 2× a altura da Hero: 4× os pixels da tela. São quatro modelos de vidro (`MeshTransmissionMaterial` com `buffer`, sem passe extra próprio). Some o envio da malha à GPU por quadro.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| teste           | **quebram e ficam quebrados, por decisão do usuário** (nenhum teste muda nem roda): <br>• `black-hole-path.test.ts` "the speed stays within 10 to 30px/s and never stops"; <br>• `e2e/hero-grid.spec.ts` inteiro (lê o canvas da malha); <br>• `e2e/deflection.spec.ts` inteiro (desenha no canvas da malha); <br>• `e2e/black-hole.spec.ts` "the black hole wanders" (30 px em 4 s, agora no máximo 60 px a 15 px/s, mínimo 20 px) e "the disk's pattern turns" (calibrado a 8 s por volta); <br>• `e2e/hero.spec.ts` "only the logo model is loaded" e "the hero grid covers the hero and nothing else"; <br>• `e2e/reduced-motion.spec.ts` "the grid holds still under reduced motion"; <br>• os testes que dependem do canvas da malha em `e2e/a11y.spec.ts`, `e2e/offscreen.spec.ts` e `e2e/theme.spec.ts`. <br>A lista é dedução da leitura, não de execução. |
| processo        | **commit direto na `main`, por decisão do usuário.** Contraria `~/Documents/docs/commit-convention.md` ("Never commit directly to, or push to, a protected branch"). Vale para commit; push continua precisando de autorização à parte.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| tarefa anterior | `.tasks/portfolio-lp-black-hole-lensing.md` recebe no topo a lista do que esta substitui: 7 (opacidade da malha, que sai), 8 (a fonte deixa de ser a malha), 9 (o canvas da malha deixa de ser a fonte) e Decided 1 (o formato de `behind`). `.tasks/portfolio-lp-black-hole-scale.md`, o 12 (velocidade). `.tasks/portfolio-lp-cosmos.md`, o 14 (só o `logo` na Hero) e o 30 em parte (as voltas do disco ficam mais curtas, ainda abaixo de 20 s).                                                                                                                                                                                                                                                                                                                                                                                                                |
| stored data     | nothing to migrate - nada persiste                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Decided

| Decision                                                                                                                    | Shape                                                                                                                                                                                                                                                                                                                                                                                    | Alternative rejected                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A camada de trás é desenhada numa textura fora da tela, e é isso que a lente lê. O buraco negro continua dono da distorção. | Os modelos de trás ficam numa `layer` do `three` que a câmera principal não vê. A cada quadro, o buraco negro desenha essa `layer` numa render target (`useFBO` do drei, já adotado). A câmera é a mesma, com o campo de visão aberto para cobrir 2× a Hero. `BentLight` lê a textura por `behind`, que deixa de ser um canvas. É o primeiro passe para textura fora da tela do projeto. | Desenhar os modelos na cena normal e distorcê-los "por cima": a lente veria um quadro já desenhado e teria de apagar o original, o que não se faz em WebGL sem uma textura igual a esta. Recortar a camada de trás no tamanho da tela: é o que deixa hoje metade da lente vazia (critério 7). |

## Sources

- Conversa com o usuário (2026-10-28), transcrita:
  - "1- Remova a malha por enquanto"
  - "2- Deixe o buraco negro com metade da velocidade atual."
  - "3- a lente que distorce o fundo parece ter algum problema, metáde dela não mostra nada, a
    metade mais próxiam do buraco negro que distorce o fundo, parece errado."
  - "4- A lente que distorce o buraco negro deve apresentar resultados parecidos com o que vemos
    nesstas duas imagems"
  - "5- Após remover a malha (grid) coloque os modelos 3D que temos no sistema atrás do buraco
    negro (cursor, wave, atom e brick) quero ver como a lente vai distorcer a imagem do que está
    atrás."
  - "6- em dado momento do desenvolvimento notei que o disco de acresção parecia girar de fato em
    volta do buraco negro, gostei muito daquele efeito, mas na versão final parece ter sido
    removido, volte para este estilo."
  - "7- O trabalho deve ser feito completamente na MAIN e commitado nela mesmo."
  - "8- não mexa nos testes, isso está demorando demais."
- Respostas do usuário (2026-10-28):
  - **Disco:** "Disco atual, girando mais rápido". A opção oferecida citava 3 s na borda de
    dentro e 6 s na de fora como exemplo; esses valores estão em 9 e em Unresolved 4.
  - **Testes:** "Não tocar em nenhum teste". Isso contraria a constituição geral (I: "Every
    behaviour created or modified ships with an automated test… and passes before delivery").
    O conflito foi apresentado ao usuário antes da resposta.
- Histórico do disco (`git log` de `black-hole-mesh.tsx`):
  - o desenho é o mesmo desde `cfc6e1c` (27/10);
  - em `335c380` (26/10) ele era quase de perfil;
  - as voltas sempre foram de 8/16 s.

  Não há commit com um disco que girasse diferente.

- Referências visuais, para o aspecto, não para os números:
  - `.tasks/references/portfolio-lp-black-hole-lensing.png`: o fundo inteiro distorcido até o
    anel claro, espelhado dentro de ~2 raios da sombra, sem vazios em volta.
  - `.tasks/references/portfolio-lp-black-hole-behind-disk.png`: um buraco negro sobre um campo
    de estrelas.
    - A sombra é preta, com um anel fino e claro logo fora dela.
    - O disco aparece como um anel largo por cima e por baixo da sombra.
    - As estrelas de fundo aparecem esticadas em arcos perto do anel.
    - Não há região vazia em volta da sombra.
- `.tasks/portfolio-lp-black-hole-lensing.md`: a lente, as tabelas de θ₊/θ₋ e a força pela
  subida, que esta tarefa mantém.
- `public/models/glass/`: `cursor.glb`, `wave.glb`, `atom.glb` e `brick.glb` existem (5,5 KB a
  81 KB), ao lado de `logo.glb`.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| #   | Kind           | Question                                                                                | Until answered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | -------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | blocks go-live | Destino real dos CTAs e conteúdo real (herdado de `portfolio-lp-cosmos`, Unresolved 1). | A Hero continua com lorem, e o CTA leva a `#contato`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2   | open           | Onde ficam os quatro modelos e de que tamanho?                                          | Escrito em volta do ponto de repouso do buraco negro, para a lente os mostrar em repouso. Em fração da Hero: `cursor` em `anchor` (−0,48; 0,40) e `wave` em (0,52; 0,12) — no build, (0,28; 0,22) e (0,72; 0,22) puseram o `wave`, empurrado pela lente, embaixo do `logo`, `atom` (0,32; 0,62), `brick` (0,68; 0,62). Cada um com ~120 px no maior lado, na profundidade logo atrás do buraco negro, oscilando como o `logo`. Em telas estreitas, encolhem como o `logo` (`viewFit`). Ficam atrás do título, que é desenhado por cima. |
| 3   | open           | Sem a malha, a força da lente deve continuar seguindo a subida (some "rente à malha")?  | Continua: a força segue a subida como hoje (critério 5 de `portfolio-lp-black-hole-lensing`).                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 4   | open           | As voltas de 3 s e 6 s vieram do exemplo da pergunta. Servem?                           | Escrito 3 e 6 s (critério 9).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
