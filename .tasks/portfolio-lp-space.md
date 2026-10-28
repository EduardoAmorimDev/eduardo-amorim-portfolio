# Landing page do portfólio — Hero com céu de estrelas e um planeta, título, subtítulo e CTA

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

> **Refeita em 2026-10-28.** A primeira versão (galáxias, nebulosas, cometas e asteroides, em
> `abfa404`) foi construída em parte e descartada pelo usuário: "não curti o resultado, remove
> tudo e deixa só as estrelas e o buraco negro". Esta versão segue a nova referência.

## Intent

Hoje a Hero mostra só o buraco negro sobre um fundo `ink` liso:

- **Não há texto.** Desde `052b21a`, o `HeroCopy` (título, subtítulo e CTA) está fora da página.
- **O espaço em volta está vazio.** A lente gravitacional existe (`bent-light.tsx`), mas está
  desligada desde `e70eba7`, porque não há nada atrás para ela curvar.
- **A Hero termina numa borda reta** que não se liga ao resto da página.

Assim, a primeira tela não diz nada a quem chega e não passa a sensação de espaço que o dono do
portfólio quer. A fonte não traz métrica.

Com a tarefa entregue, a Hero segue a referência
(`.tasks/references/portfolio-lp-space-planet.png`), nas cores da marca:

- o título, o subtítulo e o CTA voltam;
- atrás deles, um céu coberto de estrelas pequenas, com três estrelas de destaque (uma grande,
  uma média e uma pequena), que o buraco negro curva com a sua lente;
- o fundo vai do preto, em cima, ao `ink` de hoje, embaixo;
- a silhueta de um planeta, com a borda da atmosfera acesa, fecha a Hero embaixo e emenda com o
  resto da página.

10 critérios em 5 fatias · 0 one-way doors · 3 em aberto, nenhum bloqueia (1 bloqueia go-live,
herdado).

## Criteria

Medidas em CSS px numa janela de 1440×900, salvo onde a medida é outra.

### S1 — Título, subtítulo e CTA de volta

1. Quando `/` carrega, o `#hero` volta a mostrar o `HeroCopy`, como era antes de `052b21a`:
   - o `h1` "Lorem ipsum dolor sit amet";
   - o subtítulo;
   - o CTA "Lorem ipsum dolor", que leva a `#contato`;
   - o texto fica à frente do céu, do planeta e do buraco negro;
   - com o ponteiro do mouse sobre o título, a lente do título abre, como hoje.

### S2 — Céu de estrelas, curvado pelo buraco negro

2. Sempre, o céu tem 2000 ± 10% estrelas pequenas a 1440×900, com a mesma densidade em qualquer
   janela.
   - Cada estrela tem de 1 a 2 px.
   - As cores são `mist` e `snow`; 10 a 20% delas levam um tom de `primary` ou de `steel`.
   - Toda célula de 120×120 px tem pelo menos 4 estrelas.
   - Enquanto o movimento estiver ligado, de 10 a 20% delas cintilam: o brilho vai de 40% a 100%
     e volta, em 2 a 6 s.
3. Sempre, há três estrelas de destaque, como na referência: núcleo `mist`, halo puxado para
   `primary` e raios em cruz.
   - **Grande:** núcleo de 8 px, halo de 80 px e raios de 140 px.
   - **Média:** núcleo de 4 px, halo de 32 px e raios de 56 px.
   - **Pequena:** núcleo de 3 px, halo de 14 px e raios de 22 px.
   - Ficam numa coluna que desce rumo ao horizonte do planeta, à direita do texto, fora da caixa
     dele (que a 1440×900 acaba em x = 1250 px, 87%): grande em (90%; 20%) da Hero, média em
     (92%; 56%), pequena em (90,5%; 72%). (Corrigido na verificação: a primeira coluna, a ~80%,
     caía dentro da caixa do título.)
4. Sempre, o buraco negro curva o céu (estrelas pequenas e de destaque) pela lente que já existe.
   Uma estrela perto dele aparece esticada em arco em volta da sombra, com imagem espelhada do
   outro lado.

### S3 — Fundo em gradiente

5. Sempre, o fundo da Hero é um gradiente vertical: `#000000` no topo e `ink` (#101113) na base.

### S4 — Planeta

6. Sempre, a silhueta de um planeta fecha a Hero embaixo.
   - É um círculo de raio igual a 2 larguras da Hero, com o topo a 84% da altura. A borda sobe
     em arco: nos cantos, ~6,4% da largura abaixo do topo.
   - O corpo é `ink`, a mesma cor do fundo da seção seguinte, então a Hero emenda com a página
     sem borda.
   - A atmosfera é uma linha fina `mist` na borda, sobre uma faixa `primary` que esmaece para
     dentro e um brilho `primary` que esmaece para fora, como a borda acesa da referência.
   - O planeta fica à frente do céu e do buraco negro, e o texto fica à frente dele.
7. Sempre, o centro do buraco negro, ao vagar, fica acima do planeta: o ponto mais baixo do
   caminho fica a pelo menos 1,425 R acima do topo do planeta.

### S5 — Movimento reduzido e desempenho

8. Sob movimento reduzido, o céu fica parado: as estrelas não cintilam.
9. Sempre, na sonda de GPU (`readPixels` de 1 px a cada quadro, Chromium com ANGLE nesta Intel
   Iris Xe, 1440×900, `deviceScaleFactor` 1, movimento ligado, 6 s), a espera média da GPU fica
   em até 8 ms e a Hero roda a 60 FPS. Na rolagem, 60 FPS em todas as alturas.

### Regras herdadas

10. Sempre:
    - o buraco negro, os dois discos e as cores deles não mudam;
    - nenhum pixel da Hero é quente (r ≤ b + 8);
    - nenhuma imagem, textura ou modelo é baixado para o céu ou para o planeta;
    - nenhuma dependência nova entra no `package.json`.

## Out of scope

- **Testes:** o usuário decidiu não escrever testes nem rodar os que existem.
- **Texto real e destino real do CTA:** continuam lorem (Unresolved 1).
- **Galáxias, nebulosas, cometas e asteroides:** saíram, por decisão do usuário.
- **Lente sobre o planeta:** o planeta fica à frente do buraco negro, então não é curvado.

## Observable

| Surface            | Decision                        | Landing                                                                   |
| ------------------ | ------------------------------- | ------------------------------------------------------------------------- |
| tela `/` › `#hero` | em repouso e em movimento       | 1–7, 9                                                                    |
| tela `/` › `#hero` | carregando                      | existing - texto, gradiente e planeta são HTML; o céu entra com a cena 3D |
| tela `/` › `#hero` | erro (sem WebGL)                | existing - Unresolved herdado; ficam o texto, o gradiente e o planeta     |
| tela `/` › `#hero` | movimento reduzido              | 8                                                                         |
| tela `/` › `#hero` | janela estreita (375×667)       | 2 (densidade por área), 3 e 6 em frações da Hero                          |
| tela `/` › `#hero` | ordem das camadas               | 1, 6 (céu < buraco negro < planeta < texto)                               |
| tela `/` › `#hero` | não autorizado, ação destrutiva | n/a - página pública                                                      |

## Swept

- validation: n/a - nenhuma entrada
- failure modes: existing - sem WebGL, ficam o texto, o gradiente e o planeta
- idempotency and retry: n/a
- authorization: n/a - página pública
- concurrency and ordering: n/a - nenhuma corrida; a ordem das camadas está em 6
- data lifecycle: n/a - nada persiste
- external-dependency failure: 10 (nada é baixado)
- state transitions: n/a
- observability: n/a - sem telemetria; o desempenho fica provado pela sonda de 9

## Impact

| Front           | What changes                                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain          | termo novo: **céu**, o que fica na camada de trás (`BEHIND_LAYER`) do buraco negro; agora, só estrelas. Mora em `components/organisms/hero/space*.ts(x)`.                          |
| domain          | termo novo: **planeta**, a silhueta HTML na base da Hero (`hero-planet.tsx`).                                                                                                      |
| domain          | termo existente: `wanderBox` (`black-hole-path.ts`) limitava o caminho às margens da Hero; passa a limitar também acima do planeta. Quem depende: `holeBox` e `use-hero-field.ts`. |
| desempenho      | a lente volta a rodar. Para caber em 9, o alvo dela fica sem MSAA, e o céu parado é pintado uma vez numa textura.                                                                  |
| layout          | `app/page.tsx` volta a montar `<HeroCopy />`. A seção da Hero ganha o gradiente.                                                                                                   |
| teste           | nenhum teste muda nem roda, por decisão do usuário. `black-hole-path.test.ts` testa `wanderBox` e pode precisar de ajuste quando os testes voltarem.                               |
| tarefa anterior | ganham nota no topo: `portfolio-lp-black-hole-apple.md` (8) e `portfolio-lp-black-hole-joined-disk.md` (1 e 2).                                                                    |
| processo        | tudo direto na `main`, por decisão do usuário.                                                                                                                                     |
| stored data     | nothing to migrate - nada persiste                                                                                                                                                 |

## Decided

| Decision                                                                                    | Shape | Alternative rejected |
| ------------------------------------------------------------------------------------------- | ----- | -------------------- |
| None - tudo é reversível: nada persiste, nenhum contrato, nenhuma dependência, nada baixado | -     | -                    |

## Sources

- Conversa com o usuário (2026-10-28), transcrita:
  - "na hero, volte com o Título, subtitulo e CTA."
  - "remove tudo e deixa só as estrelas e o buraco negro, as estrelas serão distorcidas pelo
    buraco negro. O copy e CTA vai ficar"
  - "Quero 1 estrela razoavelmente grande, 1 estrela media e 1 estrela pequena, o resto do céu
    coberto por estrelas menores"
  - "um gradiente do total preto para o cinza escuro que temos hoje no background da Hero o
    gradiente começa preto encima e termina cinza escuro embaixo."
  - "Deve ter a silhueta de um planeta na parte de baixo da hero, essa silhueta vai se ligar com
    o restante da página. Siga o exemplo da imagem, use as cores da marca."
  - "não precisamos de testes sobre isso nem rodar os que já foram feito, faça tudo na main."
- Referência, **vinculante para a composição**: `.tasks/references/portfolio-lp-space-planet.png`.
  Transcrição:
  - céu preto, coberto de estrelas finas de 1 a 2 px;
  - uma estrela grande, brilhante, com halo e raios em cruz, um pouco acima do meio;
  - uma estrela média abaixo dela e um pouco à esquerda;
  - uma pequena mais abaixo, perto do horizonte. As três formam uma coluna que desce rumo ao
    planeta;
  - embaixo, o arco largo de um planeta escuro: uma linha fina e clara na borda, uma faixa
    colorida logo abaixo e um brilho fraco acima. O corpo fica quase preto;
  - as cores da foto (laranja e verde-azulado na atmosfera) **não** entram: a atmosfera usa
    `mist` e `primary`.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| #   | Kind           | Question                                                                                            | Until answered                                                                                         |
| --- | -------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | blocks go-live | Texto real e destino do CTA (herdado).                                                              | Lorem; o CTA leva a `#contato`.                                                                        |
| 2   | open           | Os números de 2, 3 e 6 (tamanhos, posições, raio e altura do planeta) foram propostos aqui. Servem? | Escritos como estão; ajustam-se ao ver.                                                                |
| 3   | open           | O buraco negro deve ficar sempre acima do planeta, ou pode passar atrás dele?                       | Fica acima (7). A coluna das estrelas fica à direita, para não ficar atrás do texto e do buraco negro. |
