# Landing page do portfólio — lente de dipolo mais aberta, fluxo em volta do buraco negro e texto atrás

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

> **Substituídos em parte por `.tasks/portfolio-lp-black-hole-joined-disk.md` (2026-10-28):** 7–9 (a
> parede de texto sai da Hero).

## Intent

A lente em forma de maçã (`portfolio-lp-black-hole-apple`) tem três problemas na tela:

- **some tudo o que está acima da linha do meio do buraco negro**, a qualquer distância, e
  embaixo não.
  - Causa, pela leitura do shader (`bent-light.tsx`): o ângulo é
    `pow(offset.y / length(offset), 2.0)`. Acima do centro, `offset.y` é negativo. Em GLSL,
    `pow` com base negativa é indefinido e dá NaN, e o pixel não mostra nada.
- **a curva é fechada demais.** O `brick`, logo abaixo da sombra, vira um anel estreito colado
  nela (`.tasks/references/portfolio-lp-black-hole-brick-ring.png`). A distorção alcança pouco: a
  476 px do centro, desloca 31 px.
- **o efeito não se lê.** Atrás do buraco negro só há quatro modelos soltos; na referência há
  linhas de texto, que mostram o formato da distorção em toda parte.

O dono do portfólio pede duas distorções juntas:

- uma que segue o campo do dipolo, com polos à esquerda e à direita;
- uma "aerodinâmica": a luz de trás contorna o buraco negro como um líquido que flui da
  esquerda para a direita, passa por cima e por baixo do círculo e se reencontra do outro lado.

A fonte não traz métrica; o custo é o tempo dele julgando um efeito que ainda não convence.

Com a tarefa entregue:

- nada some acima do buraco negro;
- a distorção alcança mais longe;
- o anel tem forma quase de semicírculo, que só afunda junto aos polos;
- o que está atrás contorna o círculo como um fluxo e cai nos polos;
- blocos de texto atrás do buraco negro mostram tudo isso.

**Não é física:** é a escolha visual do dono do portfólio, montada sobre a lente de
Schwarzschild.

12 critérios em 4 fatias · 0 one-way doors · 3 em aberto, nenhum bloqueia (1 bloqueia go-live,
herdado).

## Criteria

Medidas em CSS px numa janela de 1440×900, com o horizonte de 96 px de raio (R).

- r é a distância ao centro do buraco negro, em R.
- φ é o ângulo a partir do eixo dos polos, a horizontal: 0° à esquerda e à direita, 90° em cima
  e embaixo.
- "Ponto atrás a d px" é um ponto da camada de trás a d px do centro, sem distorção.

### S1 — Nada some acima do buraco negro

1. Sempre, a distorção é simétrica em relação à horizontal do centro. Um ponto atrás a d px
   acima aparece à mesma distância, acima, que o ponto a d px abaixo aparece abaixo, ±1 px.
   Nenhum pixel acima do centro deixa de mostrar a camada de trás por erro de conta (NaN).

### S2 — Dipolo mais aberto

2. Sempre, a parte de dipolo da lente usa o fator de ângulo f(φ) = |sen φ|^0,5, em vez de
   sen²φ. Um ponto a r e φ é desviado como o ponto a ρ = r / f(φ) no equador. O fator é perto
   de 1 na maior parte dos ângulos (0,84 a 45°, 0,59 a 20°) e só cai junto aos polos: a curva
   é quase um semicírculo e afunda para o centro nos polos. A força K continua 1,9987 (anel de
   1,6 R no equador, para a lente sozinha).

### S3 — Fluxo em volta do buraco negro

3. Sempre, a distorção soma ao dipolo um fluxo potencial em volta de um círculo de raio
   a = 1,6 R, que é o escoamento ideal de um líquido em volta de um cilindro.
   - Um pixel em z (posição em relação ao centro, em R, com y para cima) mostra o ponto atrás
     em z_lente + a²·(x, −y)/|z|².
   - z_lente é o ponto que só a lente mostraria.
   - Linhas horizontais atrás passam por cima e por baixo do círculo e se reencontram do outro
     lado.
4. Sempre, onde a soma das duas cruza o centro, ±3%:

   | φ   | onde a soma cruza o centro |
   | --- | -------------------------- |
   | 90° | 2,17 R (208 px)            |
   | 60° | 1,83 R (176 px)            |
   | 45° | 1,43 R (138 px)            |
   | 30° | dentro da sombra (1 R)     |

5. Sempre, em cima e embaixo (φ = 90°), um ponto atrás a d px aparece a θ px, ±4 px:

   | d (px) | 96  | 192 | 476 | 700 |
   | ------ | --- | --- | --- | --- |
   | θ (px) | 258 | 320 | 548 | 752 |

   A 476 px, o deslocamento é de 72 px; hoje é de 31.

6. Sempre, sobre o eixo dos polos (φ = 0°), o que está atrás cai para os polos:
   - um ponto atrás a 476 px aparece a 420 px, e um a 700 px aparece a 665 px, ±4 px;
   - nenhum ponto atrás a menos de 3,2 R (307 px) aparece sobre o eixo: ele contorna o círculo
     por cima ou por baixo.

### S4 — Texto atrás do buraco negro

7. Quando `#hero` renderiza, a camada de trás tem uma parede de blocos de texto atrás dos
   quatro modelos, que só aparece pela lente.
   - Fica a z = −4, cobrindo toda a área da camada de trás: o dobro da Hero.
   - Linhas na fonte Montserrat da página, em `mist`, com 40% de opacidade.
   - Corpo de 18 px e 28 px entre linhas, na escala da Hero.
   - Blocos de 4 a 8 linhas, separados por uma linha em branco.
8. Sempre, o texto é texto de preenchimento (lorem), sem conteúdo real, e não é lido por leitor
   de tela: está numa textura da cena 3D, que é `aria-hidden`.
9. Sempre, o texto fica parado, como os modelos (`portfolio-lp-black-hole-apple` 1).

### Regras herdadas

10. Sempre, o buraco negro vaga entre 5 e 15 px/s, com tamanho fixo.
11. Sempre, fora da tela, a Hero faz 0 draw calls.
12. Sempre, nenhuma dependência nova entra no `package.json`. O texto é desenhado num canvas 2D,
    sem a `Text` do drei. A `Text` busca uma fonte num CDN quando não recebe uma.

## Out of scope

- **Escrever, mudar ou rodar testes:** decisão do usuário.
- **Desenhar as linhas de campo ou o fluxo:** o pedido é que a distorção siga essas formas.
- **Texto real atrás do buraco negro:** é só para ver a distorção.
- **Animar o fluxo**, com o texto escorrendo: o texto fica parado (9).

## Observable

| Surface            | Decision                                    | Landing                                |
| ------------------ | ------------------------------------------- | -------------------------------------- |
| tela `/` › `#hero` | em repouso e em movimento                   | 1–6, 10                                |
| tela `/` › `#hero` | conteúdo atrás (texto e modelos)            | 7–9                                    |
| tela `/` › `#hero` | carregando (fonte da página ainda chegando) | Unresolved 3                           |
| tela `/` › `#hero` | erro (modelo que não carrega)               | existing - `Suspense`                  |
| tela `/` › `#hero` | janela estreita (375×667)                   | existing - tudo escala com `holeScale` |
| tela `/` › `#hero` | não autorizado, ação destrutiva             | n/a - página pública                   |

## Swept

- validation: n/a - nenhuma entrada
- failure modes: 1 (NaN acima do centro)
- idempotency and retry: n/a - nada é enviado
- authorization: n/a - página pública
- concurrency and ordering: existing - a lente e a sombra leem o mesmo `hole` no mesmo quadro
- data lifecycle: n/a - nada persiste
- external-dependency failure: 12 (sem fonte de CDN)
- state transitions: n/a - nada alterna
- observability: n/a - sem telemetria

## Impact

| Front           | What changes                                                                                                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain          | termo novo: fluxo em volta do buraco negro. Desloca o ponto lido em a²·(x, −y)/                                                                                                                             | z   | ², com a = 1,6 R. Vive em `deflection.ts`, ao lado de `sourceRadiusAt`, e no shader de `bent-light.tsx`. |
| domain          | termo existente: o fator de ângulo de `sourceRadiusAt` passa de sen²φ a \|sen φ\|^0,5 (`portfolio-lp-black-hole-apple` 3–5 substituídos). Quem depende: `bent-light.tsx`, as provas em scratch de `-apple`. |
| domain          | termo existente: a camada de trás (`BEHIND_LAYER`) ganha uma parede de texto, além dos quatro modelos.                                                                                                      |
| desempenho      | uma textura de texto do dobro da Hero (2880×1800 px numa tela 1×), desenhada uma vez. A camada de trás já é redesenhada a cada quadro.                                                                      |
| teste           | nenhum teste muda nem roda, por decisão do usuário. Os que já estavam quebrados continuam.                                                                                                                  |
| processo        | commit direto na `main`, por decisão do usuário; push à parte.                                                                                                                                              |
| tarefa anterior | `.tasks/portfolio-lp-black-hole-apple.md` recebe no topo: 3–5 substituídos (fator de ângulo, fluxo e números).                                                                                              |
| stored data     | nothing to migrate - nada persiste                                                                                                                                                                          |

## Decided

| Decision                                                                           | Shape | Alternative rejected |
| ---------------------------------------------------------------------------------- | ----- | -------------------- |
| None - tudo é reversível: nada persiste, nenhum contrato, nenhuma dependência (12) | -     | -                    |

## Sources

- Conversa com o usuário (2026-10-28), transcrita:
  - "parece que o buraco negro está escondendo os elementos quando passa deles verticalmente
    (quando os elementos ficam acima da linha do meio do buraco negro) não importa a distância
    do buraco negro."
  - "aumente o alcance radial de distorção, e aumente o angulo para ficar mais ascentuado nos
    polos e mais atenuado fora dele, deve ser quase um semicirculo mesmo, mas com curvas que
    entram em direção ao centro do buraco negro."
  - "Está muito fechada a curva radial, ta bem feio" (sobre o `brick`, ver referência).
  - "precisamos ter 2 tipos de distorção, 1 respeitando o campo magnetico do buraco negro e 1
    distorcendo de forma 'aerodinâmica' […] Imagine qua um fluxo de um líquido está passando
    por um círculo, da direita para esquerda e vice versa, o liquido passa em volta do círculo
    se reencontrando do outro lado, mas no nosso caso o que será distorcido é a luz de trás do
    buraco negro."
  - "Coloque algumas letras (blocos de texto) atrás do buraco negro para ver como elas ficam
    distorcidas"
- Referências:
  - `.tasks/references/portfolio-lp-black-hole-brick-ring.png`: o `brick` hoje, um anel
    estreito colado embaixo da sombra.
  - `.tasks/references/portfolio-lp-black-hole-behind-disk.png`, `-lensing.png` e `-poles.png`:
    já transcritas nas tarefas anteriores.
- Os números de 4–6 vêm de `deflection.ts`, com a busca por bisseção, K = 1,9987 e a = 1,6.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| #   | Kind           | Question                                                                                                                  | Until answered                                                                          |
| --- | -------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | blocks go-live | Conteúdo real e CTAs (herdado).                                                                                           | A Hero segue sem texto na frente.                                                       |
| 2   | open           | Os valores do formato: o expoente 0,5, o raio a = 1,6 R e as duas distorções sempre somadas, com o mesmo peso. São esses? | Escritos como em 2–6; ajusta-se depois de o usuário ver.                                |
| 3   | open           | A parede de texto espera a Montserrat carregar?                                                                           | Desenhada depois de `document.fonts.ready`, então nunca aparece com a fonte do sistema. |
