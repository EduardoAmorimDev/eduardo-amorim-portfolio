# Landing page do portfólio — Hero cósmica e refinamentos

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

Hoje a Hero não conta a história que o dono do portfólio quer contar (astronomia, gravidade):

- A luz é uma bola azul num canto.
- A malha se desloca para longe do ponteiro, o que, nas palavras do usuário, "parece puxar a
  malha, e não empurrar".
- Três ícones de vidro disputam a atenção com o título, e "dois deles fogem do que eu realmente
  quero".

O resto da página também tem fricções:

- O glitch dispara a cada hover e chama atenção demais.
- Os acordeões do FAQ abrem e fecham num salto.
- Os textos aceitam seleção e cursor de texto, como um documento, e não como uma peça visual.
- O fundo das seções "já parece o espaço sideral, mas pode melhorar": quase nada nele se mexe.

A fonte não traz métrica nem prazo; o custo é a primeira impressão de quem visita.

Com a tarefa entregue, a Hero tem um H1 grande no centro, com subtítulo e CTA abaixo. A malha
aparece em perspectiva, como um tecido do espaço-tempo. Um buraco negro vaga por cima dela e a
afunda, e o ponteiro do mouse é um segundo corpo que também a afunda. Uma lente redonda segue o
ponteiro, mostrando constelações e o H1 vazado onde passa. Só o logo de vidro fica na Hero.

Fora da Hero:

- O glitch fica sutil e aparece sozinho, em momentos aleatórios.
- Os acordeões animam.
- Os textos deixam de reagir ao cursor; só os botões reagem.
- O fundo das seções ganha movimento contínuo e lento.
- Os cards ganham vidro fosco, com os brilhos passando por trás.

42 critérios em 9 fatias · 0 one-way doors · 2 em aberto: 1 open, nenhum bloqueia; 1 bloqueia go-live (herdado).

## Criteria

Medidas em CSS px e numa janela de 1440×900, salvo quando indicado. "Movimento reduzido" é
`prefers-reduced-motion: reduce`.

### S1 — Textos sem interação; botões com hover e ponteiro (item 1)

1. Sempre, todo texto da página (`h1`–`h3`, `p`, `li`, `span`, `blockquote`, `figcaption`) tem
   `cursor: default` e `user-select: none`: depois de um clique triplo num parágrafo,
   `getSelection().toString()` é `""`.
2. Sempre, todo controle acionável (`button`, `a[href]` e o `summary` de cada pergunta do FAQ) tem
   `cursor: pointer`. Ao passar o mouse por cima, cada um muda de aparência: a cor de fundo ou a do
   texto computada difere do estado em repouso.
3. Sempre, nenhum título dispara efeito ao receber o ponteiro: passar o mouse sobre um `h1` ou `h2`
   não liga `data-glitch="on"` (ver 9).

### S2 — Acordeões com transição (item 2)

4. Quando uma pergunta do `#faq` abre, por hover, clique, teclado ou toque, a resposta cresce de
   0 até a altura do conteúdo e a opacidade vai de 0 a 1, em 300 ms com `ease-out`. O sinal `+`
   gira 45° no mesmo tempo.
5. Quando uma pergunta fecha, a resposta encolhe até 0 e some em 300 ms, e o `+` volta a 0° no
   mesmo tempo; o conteúdo não desaparece antes de a animação terminar.
6. Enquanto houver movimento reduzido, abrir e fechar acontece sem animação (duração 0).
7. Sempre, as regras atuais de abrir e fechar continuam valendo (critérios 20–26 de
   `.tasks/portfolio-lp-corrections.md`). Na regra de saída do hover, o prazo de 300 ms vale
   para o início do fechamento.

### S3 — Glitch sutil e aleatório (item 3)

8. Enquanto um `h1` ou `h2` tiver pelo menos metade da área na tela, ele dispara uma rajada de
   glitch em intervalos aleatórios, sorteados de forma uniforme entre 5 s e 12 s, contados a
   partir da entrada na tela ou do fim da rajada anterior. Cada título tem o seu sorteio.
9. Sempre, nada além do sorteio dispara uma rajada: nem a entrada na tela no mesmo instante, nem o
   hover, nem o clique.
10. Sempre, a rajada é sutil:
    - no máximo 3 quadros com cópias, seguidos de um quadro limpo;
    - no máximo 300 ms do início ao fim;
    - deslocamento de cada cópia de no máximo 3 px;
    - o texto principal nunca se move (sem tremor).
11. Enquanto o título tiver menos de metade da área na tela, ou houver movimento reduzido, nenhuma
    rajada dispara.

### S4 — Composição da Hero (resposta do usuário)

12. Quando `/` carrega, o `<h1>` da Hero fica centralizado na horizontal, com o centro a até 2 px
    do centro da janela, em 1440×900 e em 375×667. Na vertical, o centro fica entre 40% e 55% da
    altura da Hero. O subtítulo e o CTA ficam logo abaixo dele, também centralizados (centro a
    até 2 px do centro da janela).
13. Sempre, o `<h1>`, o subtítulo e o CTA cabem inteiros na primeira tela, em 1440×900 e em
    375×667.
14. Quando `#hero` renderiza, o único ícone de vidro é o `logo`: só `/models/glass/logo.glb` é
    requisitado entre os modelos de vidro (`cursor.glb` e `atom.glb` não são).
15. Sempre, em 1440×900, a caixa projetada do `logo` não cruza a caixa do `<h1>` nem a do CTA. O
    `logo` mantém o comportamento atual com o ponteiro: inclina na direção dele e cresce no hover.

### S5 — Malha gravitacional em perspectiva (itens 5, 7 e 9)

16. Sempre, a malha cobre a Hero inteira, de borda a borda, sem cantos vazios. Ela aparece em
    perspectiva, inclinada 30° em torno do eixo horizontal (a parte de cima mais distante):
    - o espaço entre duas linhas verticais vizinhas no alto da Hero é no máximo 0,8 vez o espaço
      entre elas embaixo;
    - na altura do meio da Hero, esse espaço é de 48 px.
17. Sempre, longe dos corpos, a malha é reta: a mais de 180 px do ponteiro e a mais de 280 px do
    centro do buraco negro, nenhuma linha se desvia mais de 1 px da reta.
18. Enquanto um mouse está sobre a Hero, o ponteiro afunda a malha num raio de 180 px.
    - As linhas verticais de cada lado se curvam na direção do ponteiro, nunca para longe dele.
      Na que fica mais perto, o desvio vai de 6 a 20 px.
    - As horizontais dentro do raio se curvam para baixo.
    - A depressão acompanha o ponteiro com até 150 ms de atraso e continua enquanto o ponteiro
      estiver parado.
19. Quando o ponteiro sai da Hero, a depressão dele se desfaz em até 800 ms, e a malha ali volta a
    ficar reta (17).
20. Sempre, o buraco negro afunda a malha num raio de 280 px em volta do centro dele: as linhas se
    curvam na direção do centro, com até 48 px de desvio.
21. Sempre, nenhuma linha da malha aparece dentro do horizonte de eventos (22): os pixels ali têm
    a cor de fundo `ink`.
22. Enquanto houver movimento reduzido, nem o ponteiro nem o buraco negro movem a malha. A
    depressão parada do buraco negro na posição de repouso (29) pode continuar.
23. Sempre, a malha só existe em `#hero`, e o ponteiro não fica preso nela: os cliques e o hover
    no `logo`, no texto e no CTA continuam funcionando.

### S6 — Lente redonda com constelações (item 4)

24. Enquanto um mouse está sobre a Hero, um círculo de 120 px de raio acompanha o ponteiro, com
    até 100 ms de atraso, contornado por um anel fino em `mist` com 30% de opacidade.
25. Enquanto a lente está aberta, aparecem dentro do círculo de 6 a 10 estrelas (pontos de 2 a 3
    px) ligadas por linhas de no máximo 1 px, em `mist`. Elas derivam devagar, até 10 px/s.
    Nenhuma estrela nem linha é desenhada fora do círculo.
26. Enquanto a lente passa sobre o `<h1>`, a parte do título dentro do círculo aparece só em
    contorno: traço de 1 px em `mist` e miolo transparente, deixando ver a malha e as estrelas.
    Fora do círculo, o título continua sólido. O nome acessível do `<h1>` continua sendo o texto,
    lido uma vez.
27. Quando o ponteiro sai da Hero, a lente some em até 300 ms. Com toque ou caneta não aparece
    lente, e sob movimento reduzido ela não aparece.

### S7 — Buraco negro (item 6, referência de imagem)

28. Quando `#hero` renderiza, a bola de luz e o halo atuais deixam de existir, e no lugar aparece
    um buraco negro:
    - **Horizonte de eventos:** disco preto com 96 px de diâmetro (±10%).
    - **Anel de fótons:** fino e brilhante, colado à borda do horizonte.
    - **Disco de acreção:** quase de perfil, como uma faixa brilhante que atravessa o horizonte na
      horizontal, com cerca de 4 diâmetros de largura (~400 px).
    - **Imagem curvada:** a parte de trás do disco forma um arco por cima e outro por baixo do
      horizonte.

    O disco é frio, no azul da marca: `mist` no miolo, indo a `primary` na borda, sem tons quentes
    (laranja, amarelo, vermelho). Em janelas mais
    estreitas que 1440 px, o tamanho encolhe na mesma proporção dos ícones, como a luz faz hoje.
29. Enquanto não houver movimento reduzido, o buraco negro vaga por cima da malha num caminho
    aleatório e suave, novo a cada carregamento:
    - velocidade entre 20 e 60 px/s;
    - curva e muda de direção a cada 4 a 10 s;
    - nunca salta mais de 4 px entre dois quadros;
    - nunca para;
    - fica sempre inteiro dentro da Hero, com 10% de margem em cada lado.

    Sob movimento reduzido, fica parado em repouso, no centro horizontal e a 32% da altura da
    Hero.
30. Enquanto não houver movimento reduzido, o disco de acreção gira: o padrão de brilho dele dá ao
    menos uma volta a cada 20 s.
31. Sempre, o buraco negro ilumina o `logo` de vidro com a cor do disco. A face do `logo` voltada
    para ele fica mais clara que a oposta.
32. Sempre, o `<h1>`, o subtítulo e o CTA ficam por cima do buraco negro e continuam legíveis.

### S8 — Fundo vivo, como corpos astronômicos (item 8)

33. Enquanto não houver movimento reduzido, cada um dos dois brilhos do fundo das seções
    (`sections-glow`) faz um caminho fechado e lento:
    - desloca-se até 8vmax a partir da posição de hoje;
    - completa o caminho em 30 a 45 s;
    - a opacidade "respira" ±0,1 em volta da atual, num ciclo de 8 a 12 s.
34. Enquanto não houver movimento reduzido, os pontos da camada de trás do parallax cintilam, com
    a opacidade entre 0,25 e 1. Cada ponto tem um período sorteado entre 3 e 8 s e sua própria
    fase, então eles não piscam juntos.
35. Enquanto não houver movimento reduzido:
    - os anéis da camada de trás pulsam de 0,95 a 1,05 de escala em 12 s;
    - as formas da camada do meio, além da flutuação atual, giram até ±6° num ciclo de 14 s.
36. Sempre, o parallax por rolagem continua como hoje (velocidades 0,2×, 0,5× e 1,3×), e, sob
    movimento reduzido, tudo do fundo fica parado.

### S9 — Vidro fosco e luzes (resposta do usuário)

37. Sempre, os cards de `#solucoes` (6), `#cases` (3) e `#depoimentos` (3) e as etapas de
    `#workflow` (6) têm superfície de vidro fosco:
    - fundo `mist` com 5% de opacidade;
    - `backdrop-filter: blur(16px)`;
    - borda de 1 px em `mist` com 10% de opacidade;
    - um filete de luz de 1 px no topo, em `mist` com 20% de opacidade.
38. Sempre, os brilhos do fundo (33) passam por trás desses cards. Com o brilho atrás de um card,
    a luminância média do card fica pelo menos 0,01 acima da que ele tem com o brilho longe.

### Desempenho (sem regressão do trabalho anterior)

39. Sempre, a pausa fora da tela continua valendo: com o topo de `#sobre` ou de `#faq` no topo da
    janela, a Hero faz 0 draw calls em 1 s, incluindo a malha, a lente e o buraco negro.
40. Quando a Hero volta à tela depois de 2 s fora, o buraco negro está a até 12 px de onde estava
    ao sair: o caminho retoma, não salta (substitui C5 de `.checks/portfolio-lp-performance.md`).
41. Sempre, nenhuma dependência nova é adicionada ao `package.json`.

### Acessibilidade

42. Sempre, a lente, a malha, o buraco negro, as estrelas e as cópias do glitch ficam fora da
    árvore de acessibilidade (`aria-hidden="true"`). Cada título continua lido uma única vez.

## Out of scope

- Fazer da lente um cursor personalizado (esconder a seta do sistema). Não foi pedido; a seta
  continua visível.
- Estrelas, planetas ou outros corpos novos no fundo das seções. O pedido é dar vida ao que já
  existe (33–35).
- Trocar as formas SVG do parallax. Segue a decisão anterior: "deixa assim".
- Lente gravitacional física de verdade (traçado de raios). O efeito é estilizado: a malha
  afunda (17–21) e o disco forma arcos (28).
- DPR adaptativo — item 4 da rodada de desempenho, ainda não aprovado.
- Conteúdo real e destino dos CTAs — Unresolved 1 da tarefa anterior, herdado aqui.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| tela `/` › `#hero` | estado em repouso, sem ponteiro | 16, 17, 20, 28, 29 |
| tela `/` › `#hero` | carregando (modelos ainda chegando) | existing - `Suspense` sem fallback; a malha e o buraco negro desenham antes do `logo` |
| tela `/` › `#hero` | erro (WebGL indisponível) | Unresolved 2 |
| tela `/` › `#hero` | toque, sem hover | 27, e a malha sem depressão do ponteiro (18 exige mouse) |
| tela `/` › `#hero` | movimento reduzido | 22, 27, 29 |
| tela `/` › `#hero` | densidade e ordem | 12, 13, 14, 15 |
| tela `/` › `#hero` | janela estreita (375×667) | 12, 13, 28 |
| tela `/` › seções | estado em repouso e movimento | 33–36 |
| tela `/` › seções | movimento reduzido | 36 |
| tela `/` › `#faq` | abrir e fechar | 4, 5, 6, 7 |
| tela `/` › títulos | glitch | 8–11 |
| tela `/` › cards | aparência | 37, 38 |
| tela `/` | ação destrutiva | n/a - não há |
| tela `/` | não autorizado | n/a - página pública, sem login |
| texto da página | estrutura e tom | n/a - lorem, conteúdo real é Unresolved 1 |

## Swept

- validation: n/a - nenhuma entrada de dados; o único insumo é a posição do ponteiro, ignorada fora da Hero (18, 27)
- failure modes: Unresolved 2 (sem WebGL); modelo do `logo` que não carrega: existing - `Suspense` não mostra nada e o resto da Hero segue
- idempotency and retry: n/a - nada é enviado nem gravado
- authorization: n/a - página pública
- concurrency and ordering: 10 (rajada não se sobrepõe a si mesma; existing - `requestBurst` bloqueia um novo início durante a rajada); 40 (pausa e retomada não fazem o buraco negro saltar)
- data lifecycle: n/a - nada persiste; o caminho do buraco negro é novo a cada carga (29)
- external-dependency failure: n/a - nenhum recurso externo novo; o iframe do Kune segue a regra anterior
- state transitions: 4, 5 (acordeão), 18, 19, 24, 27 (lente e depressão ao entrar e sair)
- observability: n/a - o projeto não tem telemetria; o custo de quadro é coberto por 39 e pela medição da tarefa de desempenho

## Impact

| Front | What changes |
|---|---|
| domain | termo novo: `BlackHole` — o corpo que substitui `HeroLight` na cena da Hero: horizonte, anel e disco, vagando (29) |
| domain | termo novo: lente (`lens`) — o círculo que segue o ponteiro, com constelações e o H1 vazado (24–27) |
| domain | termo existente: `HeroLight` / `lightDrift` (`light-drift.ts`) deixam de existir; quem depende hoje: `hero-scene.tsx`, `e2e/light-helpers.ts`, `e2e/hero-light.spec.ts`, `e2e/reduced-motion.spec.ts` ("the light holds still…"), `e2e/offscreen.spec.ts` ("the hero light resumes…") |
| domain | termo existente: `GLASS_LAYOUT` passa de 3 ícones a 1 (`logo`); quem depende: `glass-elements.tsx`, `glass-motion.test.ts`, `e2e/hero.spec.ts` ("only the cursor, atom and logo models are loaded") |
| domain | termo existente: `grid-motion.ts` (`bendShift`, `GRID.maxShift = 12`, raio 160, fade de 600 ms) muda de sentido, de "empurrar para longe" para "afundar em direção ao corpo", e ganha perspectiva; quem depende: `hero-grid.tsx`, `grid-motion.test.ts`, `e2e/grid-helpers.ts`, `e2e/hero-grid.spec.ts` (os 6 testes), `e2e/reduced-motion.spec.ts` ("hero grid stays straight…"), `e2e/theme.spec.ts` ("hero grid is drawn in mist…") |
| domain | termo existente: `lib/glitch.ts` (`BURST` de 6 quadros, 8 px, tremor de 2 px; gatilho por entrada e hover) passa a um quadro sutil e gatilho aleatório; quem depende: `glitch-text.tsx`, `lib/glitch.test.ts`, `e2e/glitch.spec.ts` (entrada, hover, 6 quadros, tremor, 8 px), `e2e/reduced-motion.spec.ts` ("no glitch…" continua) |
| layout | `hero-copy.tsx` sai do canto inferior esquerdo para o centro; `e2e/sections.spec.ts` ("hero copy fits the first screen…") passa a medir a nova posição |
| desempenho | a malha deixa de desenhar só quando o ponteiro mexe e passa a animar sempre (buraco negro vagando). O custo entra na pausa fora da tela (39); dentro da tela é trabalho novo, que a tarefa de desempenho não mediu |
| tarefa anterior | `.tasks/portfolio-lp-corrections.md` recebe no topo a lista dos critérios substituídos: 3, 4, 5, 7–10, 15 e 16; o 17 em parte, porque a regra de não sobrepor rajadas continua |
| stored data | nothing to migrate - nada persiste |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| None - tudo aqui é reversível: nenhum dado persistido, nenhum contrato consumido por fora e nenhuma dependência nova (41). Onde a malha mora (canvas 2D ou cena WebGL) e como o disco é desenhado (geometria ou shader) se decidem no build e ficam no `Landing` do checklist | - | - |

## Sources

- Conversa com o usuário (2026-10-26). Itens 1–9 transcritos, nas palavras dele:
  - **1:** "textos não devem ter interação com o cursor, a unica interação é hover e cursor pointer
    nos botões".
  - **2:** "Adicionar transition e duration aos accordions".
  - **3:** "quero que o glitch seja mais sutil e seja disparado de tempos em tempos de forma
    aleatória".
  - **4:** "um H1 foda no Centro, e atrás um elemento que remete ao contexto da pagina, observe o
    hover do mouse neste título, é um hover redondo, que trás elementos científicos no hover
    [...] quero que o hover na malha (Grid) do background seja algo parecido, a malha deve sofrer
    uma alteração gravitacional (gosto de astronomia)".
  - **5:** "a malha da Hero sofra alteração gravitacional do Mouse, aliado ao 'redondo' do hover
    do mouse".
  - **6:** "o elemento que emite luz na Hero [...] deve virar um 'buraco negro' [...] que distorça
    o fundo da malha e aplique distorção gravitacional".
  - **8:** "as coisas do fundo podem se mexer um pouco mais, a fim de parece corpos astronômicos
    vivos".
  - **9:** "Hoje o mouse parece aplicar uma distorção na malha de forma contrária ao que quero,
    parece 'puxar' a malha, e não empurrar. Se precisar tiltar a malha [...] pode fazer".
- Respostas às perguntas desta tarefa:
  - **Composição:** "H1 grande centralizado, subtítulo e CTA logo abaixo, o buraco negro
    flutuando aleatoriamente sobre a malha do background causando distorções. Pode deixar apenas
    o ícone 3D de logo de vidro na Hero [...] Além disso pode trazer um pouco mais do
    glassmorfismo e brincadeira com luzes neste projeto".
  - **Lente:** "Constelações + H1 vazado".
- Respostas às questões em aberto (2026-10-26):
  - **Cor do disco (28):** "deve ser uma cor fria, pode ser o azul da marca, a referencia só foi
    para você ver a distorçao do fundo".
  - **Vidro e luzes (37–38):** "vamos ver, pode seguir" — user delegated. Vale o default: vidro
    fosco nos cards e os brilhos vivos passando por trás, sem brilho que siga o cursor.
  - **Números (8–10, 16–27, 33–35):** "Sobre os números, tudo bem".
  - **CTAs:** "vamos ver os CTAs outra hora" — Unresolved 1 continua.
- Pioneer, "Corn. Revolutionized." — https://cornrevolution.resn.global/#. O WebFetch devolveu só
  a tela de navegador sem suporte; abri o site no Chromium (Playwright) e transcrevi:
  - **Título:** em caixa alta, centralizado na tela, com a imagem do contexto (uma espiga) atrás.
  - **Hover:** um círculo segue o ponteiro. Dentro dele, as letras do título viram só contorno e
    aparece uma rede de pontos ligados por linhas finas, parecida com moléculas.
  - **Uso nesta tarefa:** referência de estilo, não binding.
- `/home/joao-eduardo/Pictures/Screenshots/Screenshot From 2026-10-26 12-53-10.png` (buraco negro)
  — transcrito em 28; vale a forma e a distorção, não a cor (o usuário pediu cor fria):
  - disco preto no centro, com anel fino e brilhante colado;
  - disco de acreção quase de perfil cruzando na horizontal;
  - a parte de trás do disco curvada num arco por cima e outro por baixo;
  - tons quentes, do branco ao laranja, sobre um fundo estrelado.
- `/home/joao-eduardo/Pictures/Screenshots/Screenshot From 2026-10-26 12-54-45.png` (malha e corpos)
  — transcrito em 16–20:
  - malha clara em perspectiva, inclinada para trás;
  - dois corpos (uma estrela grande e um planeta) afundando poços nela;
  - as linhas convergem e descem em direção a cada corpo.
- As duas imagens são de terceiros. Por isso ficam fora do repositório, e os valores que decidem
  algo estão transcritos acima.
- `.tasks/portfolio-lp-corrections.md` e `.tasks/portfolio-lp-visual.md` — tudo o que esta tarefa
  não substitui continua valendo.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | blocks go-live | Destino real dos CTAs e conteúdo real (herdado da tarefa anterior). | A Hero continua com lorem e o CTA leva a `#contato`. |
| 2 | open | Fallback para o caso raro de o navegador não ter WebGL (aparelho antigo, aceleração desligada, modo de economia): o que a Hero mostra no lugar da malha, do buraco negro e da lente? Não afeta quem tem WebGL, que é quase todo visitante. | Hoje a cena 3D simplesmente não aparece nesse caso. Nenhum critério cobre o fallback até a resposta. |
