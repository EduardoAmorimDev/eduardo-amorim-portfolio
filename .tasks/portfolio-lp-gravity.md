# Landing page do portfólio — Hero com gravidade em perspectiva e laptop contido

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

A Hero ainda não passa a sensação de gravidade que o dono do portfólio quer. Nas palavras dele:

- A malha "parece boa", mas tudo nela parece "muito reto". Ela não tem a perspectiva da referência,
  e os corpos não "pesam" nela.
- O buraco negro "parece apenas um círculo", "meio morto, sem vida". O disco de acreção é uma faixa
  achatada, sem volume.
- A lente de constelações acompanha o cursor em toda a Hero, sempre. O contorno é um círculo
  nítido, e o usuário quer "um perímetro não tão bem delimitado, sem fronteira visível".
- O H1 é pequeno para o impacto pretendido.

Fora da Hero há um defeito. Depois que o laptop abre por completo, a rolagem leva à próxima seção,
e nesse trecho a página exibida na tela do laptop "teleporta": parte dela fica fora do vidro.
Reproduzido no Chrome com janela (1440×900): 300 px depois do fim da seção, a página aparece cerca de
55 px acima do vidro, e uma faixa preta fica no pé da tela. `getBoundingClientRect` do `iframe`
informa a posição certa nesse mesmo instante, então o erro só aparece nos pixels. No Chromium
headless do Playwright o `iframe` nem chega a pintar, e o defeito não aparece. A fonte não traz
métrica nem prazo; o custo é a primeira impressão de quem visita.

Com a tarefa entregue:

- A malha da Hero aparece como na referência: um plano visto de cima, em perspectiva forte, com as
  células achatadas ao fundo.
- O buraco negro e o ponteiro afundam a malha em poços que seguem essa perspectiva. Quanto mais ao
  fundo, menor o poço.
- O buraco negro tem volume: o disco de acreção está inclinado, passa à frente do horizonte
  embaixo e se curva por cima dele. O disco gira e oscila devagar.
- A lente só abre com o ponteiro sobre o H1. O H1 fica 2,5× maior, e a lente se dissolve nas
  bordas, sem anel.
- A página na tela do laptop não sai do vidro em nenhum momento da rolagem.

29 critérios em 6 fatias · 0 one-way doors · 3 em aberto: 2 open, nenhum bloqueia; 1 bloqueia go-live (herdado).

## Criteria

Medidas em CSS px numa janela de 1440×900, salvo quando indicado. "Movimento reduzido" é
`prefers-reduced-motion: reduce`. "Escala de projeto" é a do buraco negro em 1440×900
(`holeScale` = 1). Os critérios da tarefa `portfolio-lp-cosmos` que esta substitui estão em
`Impact`; o resto dela continua valendo.

### S1 — Malha em perspectiva, como na referência (item 1)

1. Sempre, a malha aparece como um plano inclinado visto de cima, com a parte de cima da Hero mais
   distante. Medido com a malha reta, longe dos corpos:
   - na altura do meio da Hero, a altura de uma célula na tela é de 0,55 a 0,7 vez a largura dela,
     e a largura é de 48 px;
   - no topo da Hero, a altura de uma célula é no máximo 0,55 vez a largura dela;
   - o espaço entre duas linhas verticais vizinhas no topo é no máximo 0,75 vez o espaço entre
     elas embaixo.
2. Sempre, a malha cobre a Hero de borda a borda, sem cantos vazios (critério 16 de
   `portfolio-lp-cosmos` continua valendo nisto). Não há borda do plano à vista: no topo, o fundo
   dele some pela própria perspectiva.
3. Sempre, longe dos corpos, a malha continua reta: fora do raio de cada poço (5, 8), nenhuma linha
   se desvia mais de 1 px da reta da perspectiva.

### S2 — Os corpos pesam na malha, e o peso segue a perspectiva (itens 1 e 3)

4. Sempre, o buraco negro está assentado no fundo do próprio poço. As linhas horizontais que passam
   pelo poço descem na tela em direção a ele, e a que passa mais perto do centro desce de 40 a
   80 px (escala de projeto, buraco negro em repouso). As verticais de cada lado se curvam na
   direção dele.
5. Sempre, o poço do buraco negro tem 280 px de raio medido na altura do meio da Hero, e encolhe
   com a profundidade como a malha. Com o buraco negro a 25% da altura da Hero, a largura na tela
   da faixa que ele curva (desvio > 1 px) é no máximo 0,85 vez a largura que ela tem a 75% da
   altura.
6. Sempre, o buraco negro encolhe com a profundidade junto com o poço. O horizonte mede 96 px de
   diâmetro (±10%) no ponto de repouso, a 32% da altura da Hero. Em qualquer ponto do caminho, o
   diâmetro é proporcional à largura de uma célula da malha naquela altura (±10%).
7. Enquanto um mouse está sobre a Hero, o ponteiro afunda a malha num poço menor:
   - a horizontal mais próxima do ponteiro desce de 6 a 20 px na vertical dele;
   - as verticais de cada lado se curvam na direção dele, nunca para longe;
   - a depressão segue o ponteiro com até 150 ms de atraso e continua enquanto ele estiver parado.
8. Sempre, o poço do ponteiro tem 180 px de raio na altura do meio da Hero e encolhe com a
   profundidade como o do buraco negro. Com o ponteiro a 25% da altura, a largura da faixa curvada
   é no máximo 0,85 vez a largura que ela tem a 75%.
9. Sempre, a regra vigente continua: o poço do ponteiro se desfaz em até 800 ms depois de ele sair
   da Hero (critério 19 de `portfolio-lp-cosmos`). Nenhuma linha aparece dentro do horizonte (21),
   e, sob movimento reduzido, nem o ponteiro nem o buraco negro movem a malha (22).

### S3 — Buraco negro com volume e disco vivo (item 2)

10. Quando `#hero` renderiza, o disco de acreção aparece inclinado, não de perfil. A elipse externa
    dele tem altura de 0,2 a 0,32 vez a largura, e a largura continua com cerca de 4 diâmetros do
    horizonte (~400 px na escala de projeto, ±10%).
11. Sempre, o disco envolve o horizonte em 3D:
    - a metade próxima passa à frente do horizonte, na parte de baixo. Na vertical do centro, há
      luz do disco entre 0,3 e 0,7 raio abaixo do centro;
    - a metade distante, curvada pela gravidade, forma um arco de luz que contorna o topo do
      horizonte de um lado a outro, passando pelo ponto mais alto;
    - um arco mais fino e mais fraco contorna a parte de baixo.
12. Sempre, um lado do disco é mais brilhante que o outro, o lado que gira na direção de quem olha.
    A luminância média da metade mais clara é pelo menos 1,5 vez a da outra.
13. Sempre, as cores continuam frias, como no critério 28 de `portfolio-lp-cosmos`: `mist` no
    miolo, indo a `primary` na borda, sem laranja, amarelo ou vermelho. O anel de fótons continua
    fino e colado ao horizonte.
14. Enquanto não houver movimento reduzido, o disco gira pelo menos uma volta a cada 20 s (critério
    30 de `portfolio-lp-cosmos`). Ele também se move devagar:
    - a inclinação oscila entre 12° e 18°, num ciclo de 14 a 20 s;
    - o eixo balança ±3° no plano da tela, num ciclo de 17 a 25 s, que não coincide com o da
      inclinação.
15. Enquanto houver movimento reduzido, o disco fica parado: inclinação de 15°, eixo sem balanço e
    padrão de brilho fixo.

### S4 — Lente só no H1, sem borda visível (itens 4 e 6)

16. Enquanto um mouse está sobre a Hero e fora da caixa do `<h1>`, a lente não aparece: nenhuma
    estrela, nenhuma linha e o título inteiro sólido. O poço do ponteiro na malha (7) continua
    valendo em toda a Hero.
17. Quando o ponteiro entra na caixa do `<h1>`, a lente abre em até 150 ms e passa a segui-lo com
    até 100 ms de atraso. Quando ele sai da caixa, a lente se fecha em até 300 ms, mesmo que o
    ponteiro continue sobre a Hero.
18. Sempre, a lente não tem anel nem borda. A intensidade dela cai suavemente do centro para fora:
    - total até 80 px do centro;
    - nula a partir de 160 px;
    - sem degrau em nenhuma distância: entre dois raios a 2 px um do outro, a opacidade das
      estrelas e linhas varia no máximo 0,05.
19. Enquanto a lente está aberta, 6 a 10 estrelas ligadas por linhas finas (como hoje) aparecem
    dentro dela. Cada uma tem a opacidade da intensidade da lente no ponto em que está (18), então
    as da borda somem aos poucos.
20. Enquanto a lente passa sobre o `<h1>`, o título vira contorno na mesma proporção da intensidade
    (18): só contorno até 80 px do centro, sólido a partir de 160 px e uma passagem gradual entre
    os dois. O nome acessível do `<h1>` continua sendo o texto, lido uma vez.
21. Sempre, a regra vigente continua: com toque, caneta ou movimento reduzido não aparece lente
    (critério 27 de `portfolio-lp-cosmos`).

### S5 — H1 2,5× maior (item 5)

22. Quando `/` carrega numa janela de 1440 px de largura ou mais, o `font-size` computado do `<h1>`
    da Hero é 2,5 vezes o de hoje: 157,5 px (2,5 × 63 px, `text-display`). O contorno da lente usa
    o mesmo tamanho e as mesmas quebras de linha que o título.
23. Sempre, abaixo de 1440 px o `<h1>` encolhe junto com a largura da janela, sem saltos entre
    breakpoints:
    - 157,5 px × (largura / 1440), com piso de 72 px;
    - 112 px (±1) em 1024 px de largura;
    - 72 px em 375 px de largura, 1,5× o tamanho de hoje no celular (48 px).
24. Sempre, em 1440×900 e em 375×667, as regras de composição continuam valendo: título,
    subtítulo e CTA centralizados e inteiros na primeira tela (critérios 12 e 13 de
    `portfolio-lp-cosmos`); o `logo` não cruza a caixa do `<h1>` nem a do CTA (15); a página não
    rola na horizontal em 375 px. Nenhuma palavra do `<h1>` é partida no meio. O mesmo vale em
    1024×768 e 768×1024.

### S6 — A página não sai da tela do laptop (item 7)

25. Sempre, a página mostrada na tela do laptop fica dentro do vidro. A verificação usa uma página
    sintética servida no lugar do site embutido: fundo de uma cor só, com uma moldura de 4 px de
    outra cor. Nas posições de rolagem 0, 150, 300, 450 e 600 px depois do fim de `#notebook`:
    - as quatro bordas da moldura ficam a até 3 px das bordas do vidro no screenshot;
    - nenhum pixel da página aparece fora do vidro.
      Medido nos pixels, não em `getBoundingClientRect`, porque ele dá a posição certa enquanto a
      imagem está errada.
26. Quando o usuário rola com a roda do mouse (Lenis ativo) do fim de `#notebook` até a página sair
    da tela, a moldura (25) continua a até 3 px das bordas do vidro em cada quadro capturado. A
    página não salta: entre dois quadros seguidos, ela se move o mesmo que o laptop, com até 3 px
    de diferença.
27. Sempre, o resto do comportamento atual do laptop continua:
    - endireita, abre e liga com a rolagem;
    - a página aparece aos poucos;
    - a página não recebe ponteiro nem foco;
    - carrega uma tela antes de `#notebook` e é descartada longe dele.

### Desempenho e regras herdadas

28. Sempre, a pausa fora da tela continua valendo: com o topo de `#sobre` ou de `#faq` no topo da
    janela, a Hero faz 0 draw calls em 1 s (critério 39 de `portfolio-lp-cosmos`), incluindo a
    malha nova e o buraco negro novo. Quando a Hero volta à tela, o buraco negro está a até 12 px
    de onde estava (40).
29. Sempre, nenhuma dependência nova entra no `package.json`. A malha, o buraco negro, a lente e a
    página do laptop continuam fora da árvore de acessibilidade (`aria-hidden="true"`).

## Out of scope

- Corpos novos na malha (planetas, estrelas), mesmo os que a referência mostra. O pedido é o peso
  e a perspectiva; os corpos continuam sendo o buraco negro e o ponteiro.
- Lente gravitacional física de verdade (traçado de raios contra o fundo). O volume do buraco negro
  vem do disco inclinado e dos arcos (10–12); o fundo atrás dele não é distorcido.
- Mudar a densidade da malha. As linhas continuam a 48 px no meio da Hero, embora a referência
  seja mais densa.
- O plano da malha com bordas visíveis, como o quadrado da referência. O usuário respondeu que a
  imagem mostrava só a perspectiva e o peso; a malha continua de borda a borda (2).
- Cursor personalizado (esconder a seta do sistema); continua fora, como na tarefa anterior.
- Trocar o site exibido no laptop ou mudar como ele é carregado. Só a posição na tela entra aqui.
- Fallback sem WebGL (Unresolved 2 de `portfolio-lp-cosmos`, herdado e ainda aberto).

## Observable

| Surface                | Decision                               | Landing                                                                 |
| ---------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| tela `/` › `#hero`     | em repouso, sem ponteiro               | 1, 2, 3, 4, 6, 10, 11, 12, 13                                           |
| tela `/` › `#hero`     | ponteiro fora do `<h1>`                | 7, 8, 16                                                                |
| tela `/` › `#hero`     | ponteiro sobre o `<h1>`                | 17, 18, 19, 20                                                          |
| tela `/` › `#hero`     | ponteiro sai da Hero                   | 9, 17                                                                   |
| tela `/` › `#hero`     | carregando (modelo do `logo` chegando) | existing - `Suspense` sem fallback; malha e buraco negro desenham antes |
| tela `/` › `#hero`     | erro (sem WebGL)                       | n/a - herdado, Unresolved 2 de `portfolio-lp-cosmos`                    |
| tela `/` › `#hero`     | toque, sem hover                       | 21; sem poço do ponteiro (7 exige mouse)                                |
| tela `/` › `#hero`     | movimento reduzido                     | 9, 15, 21                                                               |
| tela `/` › `#hero`     | densidade e ordem                      | 22, 23, 24                                                              |
| tela `/` › `#hero`     | janela estreita (375×667)              | 23, 24                                                                  |
| tela `/` › `#notebook` | saída da seção pela rolagem            | 25, 26                                                                  |
| tela `/` › `#notebook` | página embutida ainda não carregada    | existing - fundo `ink` atrás do `iframe`, que aparece aos poucos (27)   |
| tela `/`               | ação destrutiva                        | n/a - não há                                                            |
| tela `/`               | não autorizado                         | n/a - página pública, sem login                                         |

## Swept

- validation: n/a - nenhuma entrada de dados; a posição do ponteiro só conta dentro da Hero (7) e da caixa do `<h1>` (16, 17)
- failure modes: 25 (a página fora do vidro é o modo de falha atual, verificado nos pixels); modelo do `logo` que não carrega: existing - `Suspense` não mostra nada e a cena segue
- idempotency and retry: n/a - nada é enviado nem gravado
- authorization: n/a - página pública
- concurrency and ordering: 26 (página e laptop em passo a cada quadro durante a rolagem); existing - `BEFORE_HTML` em `laptop.tsx` põe a pose da tampa antes de o `<Html>` ler; 28 (pausa e retomada sem salto do buraco negro)
- data lifecycle: n/a - nada persiste
- external-dependency failure: n/a - o site embutido não é tocado (Out of scope); nos testes ele é bloqueado ou trocado por página sintética (`e2e/fixtures.ts`)
- state transitions: 9, 16, 17 (lente fechada ⇄ aberta na fronteira do `<h1>`; poço que se desfaz)
- observability: n/a - o projeto não tem telemetria; o custo de quadro fica coberto por 28

## Impact

| Front           | What changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain          | termo existente: `sheet` / `GRID` (`grid-motion.ts`, inclinação de 30°, foco 1,6 h) passa a uma perspectiva mais forte (1); quem depende: `use-hero-field.ts`, `grid-motion.test.ts`, `e2e/grid-helpers.ts`, `e2e/hero-grid.spec.ts` ("the grid recedes…")                                                                                                                                                                                                                                |
| domain          | termo existente: `pointerShift` / `holeShift` / `displace` deslocam pontos no plano da tela; passam a afundar o plano em profundidade, e o tamanho do poço depende da altura (4–8). Quem depende: `use-hero-field.ts`, `grid-motion.test.ts`, `e2e/hero-grid.spec.ts` (os testes de ponteiro e de buraco negro)                                                                                                                                                                           |
| domain          | termo existente: `HoleBody.horizon` e `holeScale` (`black-hole.ts`) têm hoje um tamanho só para a Hero toda; passam a variar com a profundidade (6). Quem depende: `black-hole-mesh.tsx`, `black-hole-path.ts` (`wanderBox` usa o raio para a margem de 10%), `e2e/black-hole.spec.ts` ("a 96px event horizon", "the horizon shrinks…"), `e2e/reduced-motion.spec.ts` ("rests at the centre, 32% down")                                                                                   |
| domain          | termo existente: o shader de `black-hole-mesh.tsx` (`SQUASH` 0,05, disco de perfil num quad voltado à câmera) passa a desenhar um disco inclinado e oscilante (10–15); quem depende: `e2e/black-hole.spec.ts` ("an edge-on disk about 400px wide…", "the back of the disk arches…", "the disk's pattern turns")                                                                                                                                                                           |
| domain          | termo existente: a lente (`lens.ts`, `LENS.radius` 120, `ringAlpha` 0,3; `lens-solid` e `lens-outline` em `app/globals.css`, máscara e recorte de borda dura) passa a abrir só no `<h1>` e a ter borda suave (16–20); quem depende: `use-hero-field.ts`, `lens.test.ts`, `e2e/lens.spec.ts` (os 6 testes), `e2e/reduced-motion.spec.ts` ("no lens…")                                                                                                                                      |
| layout          | `hero-copy.tsx` (`TITLE_TYPE`, `max-w-4xl`) com o título 2,5× maior em `lg` (22); o `logo` em `GLASS_LAYOUT` pode ter de se mover para manter o 15. Quem depende: `e2e/hero.spec.ts` ("the hero copy is centred…", "the logo clears the title…"), `e2e/sections.spec.ts` ("hero copy fits the first screen…")                                                                                                                                                                             |
| teste           | o defeito do laptop não aparece no projeto Playwright atual (Chromium headless, sem pintar o `iframe`) nem em `getBoundingClientRect`. A prova de 25–26 precisa de um modo de navegador que o reproduza antes da correção, comparando pixels, e de uma página sintética no lugar do site, porque `e2e/fixtures.ts` bloqueia a rede (constituição VI). Hipótese, não verificada: composição do `<Html transform>` do drei (CSS 3D) dentro do contêiner `sticky` quando ele deixa de grudar |
| tarefa anterior | `.tasks/portfolio-lp-cosmos.md` recebe no topo a lista do que esta substitui: 16 (exceto "borda a borda"), 17, 18, 20, 24, 25, 26, a forma do disco no 28 e o diâmetro fixo do horizonte no 28                                                                                                                                                                                                                                                                                            |
| stored data     | nothing to migrate - nada persiste                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Decided

| Decision                                                                                                                                                                                                                                                                                                                                                                   | Shape | Alternative rejected |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------- |
| None - tudo aqui é reversível: nenhum dado persistido, nenhum contrato consumido por fora, nenhuma dependência nova (29). Onde a malha passa a ser desenhada (canvas 2D com projeção própria ou na cena WebGL junto do buraco negro), como o disco ganha volume (geometria ou shader) e como o laptop deixa de vazar se decidem no build e ficam no `Landing` do checklist | -     | -                    |

## Sources

- Conversa com o usuário (2026-10-27). Itens 1–7, transcritos:
  - **1:** "A malha parece boa, mas quero algo mais em perspectiva, algo assim [malha.png]. Note a
    perspectiva da imagem e como os corpos celestes 'pesam' na malha."
  - **2:** "O buraco negro está muito 'reto' quero que o disco de acresção seja 3D assim vai parecer
    de fato que o buraco negro é uma esfera, hoje parece apenas um círculo... está meio 'morto', sem
    vida, o disco de acresção deve ser mais 3D e se movimentar sutilmente além de girar em torno do
    buraco negro."
  - **3:** "A distorção da gravidade que o buraco negro aplica sobre a malha até que está bom, mas
    deve acompanhar a perspectiva adotada no ponto 1, hoje parece tudo muito 'reto'."
  - **4:** "O cursor atualmente SEMPRE tem o círculo com nodes e arestas dentro na Hero, eu quero
    que este comportamento seja apenas no hover do título H1 da Hero."
  - **5:** "O título H1 deve ser 2.5x maior que é hoje."
  - **6:** "o círculo com nodes e arestas dentro que fica em volta do cursor, não deve ser definido
    100%, deve ser algo mais suave [...] algo sem fronteira visível entende? O vazado do título vai
    delimitar, quero algo bonito."
  - **7:** "após scrollar totalmente, o laptop abre totalmente, scrollar mais faz o usuário ir para
    próxima seção, mas o conteúdo do laptop está 'vazando' por cima da tela do laptop, ela está
    'teleportanto' ficando 1/3 dela para fora do laptop."
- `/home/joao-eduardo/Downloads/malha.png` (referência da malha). Imagem de terceiros, fora do
  repositório. Transcrita em 1, 4–8, com medidas a olho numa imagem de 1200×600:
  - plano branco de linhas finas sobre fundo preto, visto de cima e de frente, com o lado distante
    no alto;
  - células no fundo com cerca de 0,5 de altura por largura; no meio, cerca de 0,64; na frente,
    cerca de 0,78;
  - verticais no fundo a cerca de 0,7 do espaço que têm na frente;
  - três esferas (laranja, amarela e vermelha) assentadas no fundo de poços proporcionais ao
    tamanho delas. As horizontais descem para dentro de cada poço, e as verticais em volta se
    curvam em direção à esfera;
  - o poço da esfera maior desce visivelmente mais que os outros;
  - o plano é um quadrado com bordas visíveis, e isso não vale aqui (ver as respostas abaixo).
  - Vale a perspectiva e o peso, não as cores nem os corpos (Out of scope).
- Reprodução do item 7 (2026-10-27): Chrome 1440×900 com janela, `next dev`, rolagem
  instantânea e pela roda.
  - **No fim de `#notebook`:** página e vidro alinhados.
  - **300 px depois:** a página aparece ~55 px acima do vidro, com uma faixa preta embaixo, enquanto
    `getBoundingClientRect` do `iframe` acompanha o canvas sem desvio.
  - **No Chromium headless do Playwright:** o `iframe` não pinta.
- Respostas do usuário (2026-10-27):
  - **Bordas da malha (2):** "manter a malha cobrindo de ponta a ponta, o ponto da imagem era te
    mostrar a perspectiva e o peso que os corpos aplicam na malha."
  - **H1 em telas menores (23):** "Aplique responsividade ao H1." A curva (proporcional à
    largura, com piso de 72 px) foi escolhida no plano, porque 2,5× de 48 px (120 px) não cabe em
    375 px.
- `.tasks/portfolio-lp-cosmos.md` — tudo o que esta tarefa não substitui (Impact) continua valendo.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| #   | Kind           | Question                                                                                                                                                                                                                                                             | Until answered                                                                                                            |
| --- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | open           | Números novos assumidos, sem confirmação do usuário: proporções das células (1); curva do H1 e piso de 72 px (23); afundamento e encolhimento dos poços (4, 5, 8); inclinação, oscilação e brilho do disco (10, 12, 14, 15); faixa de 80 a 160 px da lente (18, 20). | Escritos como estão. Ajuste fino depois de ver no navegador, como nas rodadas anteriores.                                 |
| 2   | open           | "O vazado do título vai delimitar": as estrelas também ficam presas às letras, ou só somem aos poucos no disco suave?                                                                                                                                                | Escrito 19: elas somem aos poucos no disco suave, sem recorte nas letras. Só o contorno do título (20) desenha uma forma. |
| 3   | blocks go-live | Destino real dos CTAs e conteúdo real (herdado de `portfolio-lp-cosmos`, Unresolved 1).                                                                                                                                                                              | A Hero continua com lorem, e o CTA leva a `#contato`.                                                                     |
