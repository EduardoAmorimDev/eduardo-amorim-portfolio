# Landing page do portfólio — lente gravitacional real do buraco negro sobre a malha

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

> **Substituídos em parte por `.tasks/portfolio-lp-black-hole-behind.md` (2026-10-28):** 7 (a malha
> sai da Hero), 8 e 9 (a lente deixa de ler o canvas da malha e passa a ler a camada de trás, com
> os modelos) e Decided 1 (o formato de `behind`).

## Intent

O buraco negro da Hero simula só a própria luz. O disco tem a metade de trás dobrada por cima e
por baixo do horizonte, mas o que está atrás dele aparece intacto: as linhas da malha passam ao
redor da sombra como se ali não houvesse massa nenhuma. A única deformação que a malha sofre é o
poço, que puxa e afunda as linhas, e não desvia luz. Diante da referência que o dono do portfólio
trouxe, a cena não parece realista: o fundo não forma anel em volta da sombra e não aparece
espelhado dentro dele. A fonte não traz métrica; o custo é a primeira impressão de quem visita.

Com a tarefa entregue:

- o buraco negro desvia a luz do que está atrás dele, com o ângulo de deflexão exato de
  Schwarzschild;
- a malha aparece empurrada para fora em volta da sombra, esticada ao longo de um anel de Einstein
  de 2 raios do horizonte, e espelhada entre esse anel e a sombra, como na referência;
- a distorção é inteira do buraco negro: ele recebe a imagem do que está atrás e a desenha
  distorcida, e a malha não sabe que existe lente;
- a malha passa de 14% a 50% de opacidade.

O poço continua. A lente distorce a malha já deformada por ele.

13 critérios em 3 fatias · 4 one-way doors · 1 em aberto: bloqueia go-live (herdado).

## Criteria

Medidas em CSS px numa janela de 1440×900, salvo quando indicado. "Movimento reduzido" é
`prefers-reduced-motion: reduce`: o buraco negro fica em repouso em (720, 288), com horizonte de
96 px de raio (critério 11 de `portfolio-lp-black-hole-scale`). Algumas grandezas usadas abaixo:

- **b**: parâmetro de impacto de um raio de luz, medido em raios de Schwarzschild (`r_s`);
- **α(b)**: o ângulo de deflexão desse raio;
- **b_c = 3√3/2 ≈ 2,598**: o parâmetro crítico. Na tela, b_c é o raio do horizonte desenhado, então
  `r_s` = raio do horizonte ÷ 2,598 (37 px em repouso).
- **"Fonte"**: a imagem da malha como está hoje, sem lente, no canvas `hero-grid`.
- **"d"**: a distância, na fonte, de um ponto da malha ao centro do buraco negro.

### S1 — A deflexão de Schwarzschild

1. Sempre, α(b) é a integral exata de Schwarzschild, α(b) = 2∫₀^{u₀} du / √(1/b² − u² + u³) − π,
   com u₀ = 1/r₀ e b² = r₀³/(r₀ − 1). Valores, com tolerância de ±1%:

   | b           | α(b)        |
   | ----------- | ----------- |
   | 1000        | 0,00200 rad |
   | 100         | 0,0203 rad  |
   | 10          | 0,2361 rad  |
   | 3           | 1,719 rad   |
   | b_c × 1,001 | 6,51 rad    |

   No campo fraco, isso tende a 2/b. Perto de b_c, tende a −ln(b/b_c − 1) − 0,4002 (Bozza 2002).

2. Sempre, um raio com b ≤ b_c é capturado. Nenhuma linha da malha aparece a menos de 1 raio do
   horizonte do centro: a sombra é o horizonte desenhado de hoje. Este critério mantém o 21 de
   `portfolio-lp-gravity`, agora com a física por trás.

### S2 — A malha atrás do buraco negro aparece pela lente

3. Enquanto houver movimento reduzido, um ponto da fonte a d px do centro aparece na tela do mesmo
   lado, na mesma direção, a θ₊ px do centro (±4 px):

   | d (px) | θ₊ (px) |
   | ------ | ------- |
   | 96     | 238     |
   | 192    | 298     |
   | 476    | 530     |
   | 700    | 737     |

4. Enquanto houver movimento reduzido, o mesmo ponto aparece também do lado oposto, espelhado,
   entre a sombra e o anel de Einstein, a θ₋ px do centro (±4 px):

   | d (px) | θ₋ (px) |
   | ------ | ------- |
   | 96     | 160     |
   | 192    | 139     |
   | 476    | 111     |

5. Sempre, a força da lente segue a subida como na física de lente fina: β = θ − K·α(θ), com K
   proporcional a D_L·D_LS/D_S. D_L é a distância de quem olha ao buraco negro, D_S a distância
   até a malha e D_LS = D_S − D_L. A subida já define D_L/D_S = 0,88 ÷ tamanho da subida (critério
   8 de `portfolio-lp-black-hole-scale`): 1 rente à malha, 0,786 no alto. K vale 3,591 na subida
   0,5, medido em raios do horizonte. O anel de Einstein, em raios do horizonte da subida
   (±3%):

   | subida | anel de Einstein (raios) | anel de Einstein (px, 1440×900, na altura de repouso) |
   | ------ | ------------------------ | ----------------------------------------------------- |
   | 0      | 1,0                      | 84: igual à sombra, sem deslocamento                  |
   | 0,25   | 1,61                     | 145                                                   |
   | 0,5    | 2,0                      | 192                                                   |
   | 0,75   | 2,25                     | 229                                                   |
   | 1      | 2,42                     | 261                                                   |

   Rente à malha, D_LS = 0 e a lente some: a malha aparece só deformada pelo poço e cortada pela
   sombra. Em janelas menores, tudo escala com o horizonte. Os valores de 3, 4 e 6 são os da
   subida 0,5.

6. Sempre, a lente alcança a Hero inteira, sem borda. O deslocamento para fora (θ₊ − d) cai sem
   saltos conforme d cresce: 142 px a d = 96, 106 px a 192, 54 px a 476 e 37 px a 700, ±4 px.
   Nenhum círculo marca onde a distorção acaba.
7. Sempre, a malha aparece com opacidade 0,5. Hoje é 0,14.
8. Sempre, a fonte continua como hoje: o poço do buraco negro e o do ponteiro deformam a malha com
   os números vigentes (critérios 4–6 e 9–11 de `portfolio-lp-black-hole-scale`, 17–19 de
   `portfolio-lp-gravity`). A lente distorce essa malha já deformada.

### S3 — A lente é do buraco negro

9. Se o buraco negro não desenhar, a malha aparece sem lente, com opacidade 0,5, igual à fonte.
   Isso vale sem WebGL e antes do primeiro quadro da cena 3D. Nunca há um quadro sem malha, nem
   um quadro com a malha aparecendo duas vezes (fonte e imagem distorcida).
10. Sempre, o que está à frente do buraco negro não é distorcido: o `logo`, o `<h1>`, o subtítulo,
    o CTA e a lente do ponteiro (constelação) aparecem exatamente como hoje.
11. Sempre, a sombra, o anel de fótons, o disco e a luz do disco continuam como hoje (critérios
    10–15 de `portfolio-lp-gravity`) e são desenhados por cima da malha distorcida.
12. Sempre, também em movimento, o centro da lente e o centro do horizonte desenhado são o mesmo
    ponto (±1 px). A imagem da malha que a lente distorce está no máximo um quadro atrasada em
    relação ao poço.

### Regras herdadas

13. Sempre, as regras vigentes continuam:
    - fora da tela, a Hero faz 0 draw calls (critério 39 de `portfolio-lp-cosmos`);
    - quando a Hero volta à tela, o buraco negro está a até 12 px de onde parou (40);
    - o `logo` não cruza a caixa do `<h1>` nem a do CTA (critério 15 de `portfolio-lp-gravity`);
    - nenhuma dependência nova entra no `package.json`.

## Out of scope

- Distorcer o `logo` ou mudá-lo para trás do buraco negro. O usuário respondeu que a malha basta
  como prova, e o `logo` está à frente: na física, o que está à frente não sofre lente.
- Traçar raios no disco de acreção. A metade de trás do disco continua sendo os arcos que o shader
  já desenha (critérios 10–12 de `portfolio-lp-gravity`). O pedido é distorcer o que está atrás.
- A aberração cromática da referência (franjas vermelhas e azuis nas letras). É efeito da câmera
  ou do vídeo, não da gravidade: a lente gravitacional desvia todas as cores igualmente.
- Distorcer o texto da Hero como a referência distorce o código. O texto está à frente do buraco
  negro (10).

## Observable

| Surface            | Decision                                                 | Landing                                   |
| ------------------ | -------------------------------------------------------- | ----------------------------------------- |
| tela `/` › `#hero` | em repouso (movimento reduzido)                          | 3, 4, 5, 6                                |
| tela `/` › `#hero` | em movimento                                             | 5, 12                                     |
| tela `/` › `#hero` | janela estreita (375×667)                                | 5                                         |
| tela `/` › `#hero` | densidade e ordem (o que fica à frente e atrás da lente) | 7, 10, 11                                 |
| tela `/` › `#hero` | carregando (cena 3D ainda sem quadro)                    | 9                                         |
| tela `/` › `#hero` | erro (sem WebGL)                                         | 9                                         |
| tela `/` › `#hero` | não autorizado, ação destrutiva                          | n/a - página pública, sem ação destrutiva |

## Swept

- validation: n/a - nenhuma entrada de dados
- failure modes: 9 (buraco negro que não desenha: a malha aparece sem lente)
- idempotency and retry: n/a - nada é enviado nem gravado
- authorization: n/a - página pública
- concurrency and ordering: 12 (malha desenhada num laço e lente desenhada no da cena 3D: no máximo um quadro de atraso, centro da lente igual ao do horizonte)
- data lifecycle: n/a - nada persiste
- external-dependency failure: n/a - nenhum recurso externo; a tabela de deflexão é calculada no navegador
- state transitions: 9 (a fonte aparece até a lente começar a desenhar e volta quando ela sai)
- observability: n/a - o projeto não tem telemetria; o custo de quadro segue coberto por 13 (0 draw calls fora da tela)

## Impact

| Front           | What changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain          | termo novo: lente gravitacional. É o desvio da luz do que está atrás do buraco negro, com α(b) (1) e o anel de Einstein (5). Vive no buraco negro (`black-hole.ts` e `black-hole-mesh.tsx`, ou um módulo irmão). **Colisão de nome:** "lente" já é a constelação do ponteiro (`lens.ts`, `LENS`, `hero-lens`, `--lens-*`, `e2e/lens.spec.ts`). O termo novo precisa de outro identificador (p. ex. `deflection`, `einstein`), nunca `lens`.                                                                                            |
| domain          | termo existente: o canvas `hero-grid` hoje é a malha que se vê. Passa a ser a fonte que o buraco negro lê, e só aparece enquanto o buraco negro não desenha (9). Quem depende: `e2e/hero-grid.spec.ts` e `e2e/grid-helpers.ts` (`readGrid` lê o contexto 2D e continua medindo a fonte, com poço e sem lente: os testes do poço seguem válidos); `e2e/hero.spec.ts` ("the hero grid covers the hero and nothing else"); `e2e/offscreen.spec.ts` (a malha para de desenhar fora da tela); `e2e/a11y.spec.ts` (decoração `aria-hidden`). |
| domain          | termo existente: `BlackHole` (`black-hole-mesh.tsx`) recebe hoje só `hole`. Passa a receber também o que está atrás dele (Decided 1). Quem depende: `hero-scene.tsx` e `hero.tsx`, que passam o canvas da malha.                                                                                                                                                                                                                                                                                                                       |
| domain          | termo existente: a opacidade da malha (`opacity-[0.14]` em `hero.tsx`) passa a 0,5 (7). Nenhum critério anterior fixava 0,14. A lente desenha a malha com a mesma opacidade, para que fonte e imagem distorcida se igualem (9).                                                                                                                                                                                                                                                                                                        |
| teste           | as medidas na tela em volta do buraco negro mudam: com a lente, as linhas da malha aparecem em outros lugares na captura de tela. Quem depende: `e2e/black-hole-helpers.ts` (`horizonIn` acha a sombra por pixels escuros cercados de luz; com a malha a 0,5 e espelhada até o anel de fótons, a borda clara ganha linhas) e `e2e/hero.spec.ts` (`logoBox` conta como `logo` todo pixel claro fora de `HOLE_REACH`; linhas a 0,5 passam de `LOGO_GAP`).                                                                                |
| desempenho      | a Hero ganha um passe de tela inteira e um envio de textura da malha por quadro. Hoje são 9 draw calls por quadro (`.checks/portfolio-lp-performance.md`); passam a 10. Na janela de 1440×900, a malha tem 1440×900 px em telas 1× e 2880×1800 em telas 2× (`window.devicePixelRatio`). A cena 3D desenha a pelo menos 1,5×, então em telas 1× a malha distorcida é ampliada da fonte e fica um pouco mais suave que hoje.                                                                                                             |
| tarefa anterior | `.tasks/portfolio-lp-gravity.md` recebe no topo a lista do que esta tarefa substitui: o item "Lente gravitacional física de verdade… o fundo atrás dele não é distorcido" sai de `Out of scope`, e o 21 ganha a leitura do critério 2.                                                                                                                                                                                                                                                                                                 |
| stored data     | nothing to migrate - nada persiste                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Decided

| Decision                                                                                                                                                                                   | Shape                                                                                                                                                                                                                                               | Alternative rejected                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A lente é do buraco negro. Ele recebe o canvas do que está atrás e o desenha distorcido. A malha não conhece a lente.                                                                      | `<BlackHole hole={hole} behind={grid} />`, com `behind: RefObject<HTMLCanvasElement \| null>`, lido como `CanvasTexture` do `three` (já usado em `glass-elements.tsx`). O buraco negro esconde a fonte só enquanto desenha a imagem distorcida (9). | Mapear cada ponto das linhas dentro de `drawGrid` (`use-hero-field.ts`). As linhas ficariam nítidas sem envio de textura, mas a distorção passaria para a malha, o que o usuário excluiu ("deve ser de responsabilidade total do buraco negro"), e nenhuma outra camada poderia ser distorcida.                                                       |
| A deflexão é a integral exata de Schwarzschild, tabelada uma vez na CPU e enviada ao shader como tabela 1D. A tela usa lente fina: β = θ − K·α(θ), com K fixado pelo anel de Einstein (5). | Uma função pura em TypeScript, testada com `node --test` como `black-hole.ts`. A mesma tabela gera os números de 1, 3, 4 e 6.                                                                                                                       | Integrar a geodésica por pixel (RK4 ou Verlet, até ~190 passos por pixel no exemplo "Gargantua"): refaria o disco (fora do escopo) e custaria ~190 avaliações por pixel. Só campo fraco (2/b): em b = 3, ele dá 0,667 rad contra 1,719 rad exatos, e perde o acúmulo das imagens espelhadas junto ao anel de fótons, que é o que a referência mostra. |
| A lente cobre a tela inteira, com a queda real de 1/b.                                                                                                                                     | Um passe de tela inteira dentro do buraco negro, desenhado antes do quadrado do disco.                                                                                                                                                              | Um quadrado em volta do buraco negro em que a distorção vai a zero na borda. Seria mais barato, mas inventa uma borda que a física não tem: a 700 px do centro, o deslocamento real ainda é de 37 px (6).                                                                                                                                             |
| Nenhuma dependência nova.                                                                                                                                                                  | Só `three`, `@react-three/fiber` e `@react-three/drei`, já adotados.                                                                                                                                                                                | `@react-three/postprocessing`: seria dependência nova, e o critério 13 e o 14 de `portfolio-lp-black-hole-scale` não deixam.                                                                                                                                                                                                                          |

## Sources

- Conversa com o usuário (2026-10-28), transcrita:
  - "Hoje temos no projeto um buraco negro simulado com sua própria luz, simulando distorção da luz
    do disco de asserção. mas quero que ele de fato aplique distorção na imagem que está atrás
    dele, inclusive na malha."
  - "Olha como o buraco negro dessa imagem distorce a luz (informação) que está atrás dele, este
    buraco negro é muito realista, é isso que eu quero na minha Hero!"
  - "talvez vamos precisar usar calculos reais de distorção da luz."
- Respostas do usuário (2026-10-28):
  - **`logo`:** "Eu falei só para que você tivesse uma âncora no que se basear, mas pode ser só
    pela malha (grid) que já representa a gravidade... A distorção que o buraco negro aplica sobre
    os elementos que estão atrás dele deve ser componentizada, deve ser de responsabilidade total
    do buraco negro." Daqui vêm Decided 1, 10 e Out of scope.
  - **Poço e lente:** "Mantem o poço e deforma a malha, pode deixar a malha com opacidade 0.5
    também." Daqui vêm 7 e 8.
  - **CTAs (Unresolved 1):** "CTAs vemos depois."
  - **Anel de Einstein a 2,0 raios do horizonte em repouso:** "Ta bom."
  - **Lente e subida:** "Deve ser como seria na física real." Daqui vem 5. O que manda é a lente
    fina, com o modelo de distâncias que a subida já usa para o tamanho; o poço continua com a
    regra própria (8). Na física, a lente é mais forte no alto, ao contrário do poço, e some
    rente à malha.
- Referência visual: `.tasks/references/portfolio-lp-black-hole-lensing.png`. Vale para o aspecto,
  não para os números. Transcrição:
  - texto num fundo escuro, com um buraco negro no centro;
  - sombra preta redonda, com anel fino e claro logo fora dela;
  - em volta, o texto aparece esticado em arcos concêntricos;
  - entre o anel claro e cerca de 2 raios da sombra, o texto aparece espelhado (de cabeça para
    baixo, do lado oposto);
  - as linhas de texto longe do centro ainda se curvam, até as bordas do quadro;
  - o disco aparece como um anel claro inclinado que cruza a frente da sombra;
  - as letras têm franjas vermelhas e azuis (ver Out of scope).
  - O anel de Einstein a ~2 raios da sombra foi lido a olho na imagem; o usuário aceitou 2,0.
- V. Bozza, "Gravitational lensing in the strong field limit", arXiv:gr-qc/0208075 —
  https://arxiv.org/abs/gr-qc/0208075. Para Schwarzschild, com `r_s` = 1: integral de deflexão
  exata (eqs. 6–7), u_m = 3√3/2 ≈ 2,598 (eq. 49), ā = 1, b̄ = log[216(7 − 4√3)] − π ≈ −0,4002
  (eq. 50).
- V. Bozza, S. Capozziello, G. Iovane, G. Scarpetta, "Strong field limit of black hole
  gravitational lensing", arXiv:gr-qc/0102068 — https://arxiv.org/abs/gr-qc/0102068.
- Exemplos em WebGL consultados para comparar abordagens, sem autoridade: "Gargantua — a
  ray-traced black hole in my portfolio" —
  https://discourse.threejs.org/t/gargantua-a-ray-traced-black-hole-in-my-portfolio-webgl-one-draw-call/94960;
  "Real-time Schwarzschild + binary black-hole lensing in WebGL" —
  https://discourse.threejs.org/t/real-time-schwarzschild-binary-black-hole-lensing-in-webgl-with-an-honest-writeup-of-where-the-two-body-integrator-breaks/94150.
- Os números de 1, 3, 4 e 6 foram calculados com a integral exata, por quadratura com
  substituição u = u₀(1 − t²) e 4000 pontos. Conferência: campo fraco a 0,1% em b = 1000;
  Bozza a 0,05% em b_c × 1,001. Lente fina com K = 3,591, que põe o anel de Einstein a 2,0 raios
  do horizonte; horizonte de 96 px.
- `.tasks/portfolio-lp-gravity.md`, `.tasks/portfolio-lp-cosmos.md` e
  `.tasks/portfolio-lp-black-hole-scale.md`: tudo o que esta tarefa não substitui (Impact)
  continua valendo.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| #   | Kind           | Question                                                                                | Until answered                                        |
| --- | -------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | blocks go-live | Destino real dos CTAs e conteúdo real (herdado de `portfolio-lp-cosmos`, Unresolved 1). | A Hero continua com lorem, e o CTA leva a `#contato`. |
