# Landing page do portfólio — Hero como espaço sideral vivo, com título, subtítulo e CTA

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

Hoje a Hero mostra só o buraco negro sobre o fundo `ink`:

- **Não há texto.** Desde `052b21a`, o `HeroCopy` (título, subtítulo e CTA) está fora da página,
  para que o buraco negro aparecesse sozinho (task `black-hole-apple`, 8).
- **Em volta do buraco negro, o espaço está vazio:** não há estrelas, galáxias nem nebulosas.
  A lente gravitacional existe (`bent-light.tsx`), mas está desligada desde `e70eba7`, porque não
  há nada atrás para ela curvar.

Assim, a primeira tela não diz nada a quem chega e não dá a sensação de espaço que o dono do
portfólio quer passar. A fonte não traz métrica.

Com a tarefa entregue, a Hero vira um espaço vivo, nas cores da marca:

- o título, o subtítulo e o CTA voltam;
- atrás deles há muitas estrelas, galáxias e nebulosas;
- de tempos em tempos passa um cometa, e alguns asteroides derivam devagar;
- o buraco negro curva esse céu com a sua lente;
- tudo isso sem perder os 60 FPS de hoje.

13 critérios em 7 fatias · 0 one-way doors · 4 em aberto, nenhum bloqueia (1 bloqueia go-live,
herdado).

## Criteria

Medidas em CSS px numa janela de 1440×900, salvo onde a medida é outra. **Céu** é tudo que a
tarefa põe atrás do buraco negro: estrelas, galáxias, nebulosas, cometas e asteroides. **Caixa
do texto** é o menor retângulo que contém o `h1`, o subtítulo e o CTA.

### S1 — Título, subtítulo e CTA de volta

1. Quando `/` carrega, o `#hero` volta a mostrar o `HeroCopy`, como era antes de `052b21a`:
   - o `h1` "Lorem ipsum dolor sit amet" (`text-hero`);
   - o subtítulo;
   - o CTA "Lorem ipsum dolor", que leva a `#contato`;
   - com o ponteiro do mouse sobre o título, a lente do título abre, como hoje (task `gravity`,
     16–21).
2. Sempre, o texto fica à frente do céu. Nenhum centro de galáxia ou de nebulosa cai dentro da
   caixa do texto (Unresolved 3).

### S2 — Muitas estrelas

3. Sempre, há 2000 ± 10% estrelas no céu a 1440×900. A densidade é a mesma em qualquer tamanho
   de janela: a 375×667, são 390 ± 10%.
   - Cada estrela tem de 1 a 3 px, e no máximo 5% delas passam de 2 px.
   - As cores são `mist` e `snow`; 10 a 20% delas levam um tom de `primary` ou de `steel`.
   - Estão espalhadas: dividida a Hero em células de 120×120 px, toda célula tem pelo menos 4
     estrelas.
4. Enquanto o movimento estiver ligado, de 10 a 20% das estrelas cintilam: o brilho vai de 40% a
   100% e volta, em ciclos de 2 a 6 s, cada estrela no seu ritmo.

### S3 — Galáxias

5. Sempre, há 2 ou 3 galáxias, como na referência: um núcleo claro e um disco ou espiral difuso,
   inclinado.
   - A maior tem de 260 a 420 px no eixo longo; as outras, de 80 a 180 px.
   - O núcleo é `mist`; o halo, `primary` e `steel`; a opacidade máxima é 0,6.
   - Os centros ficam a pelo menos 300 px um do outro e dentro da Hero.

### S4 — Nebulosas

6. Sempre, há 1 ou 2 nebulosas: nuvens difusas, de bordas irregulares, em `primary` e `steel`,
   cortadas por faixas escuras de poeira (`ink`), como na referência.
   - Cada uma cobre de 20 a 35% da largura da Hero, com opacidade máxima de 0,45.
   - Com duas, uma fica na metade esquerda e a outra na direita.

### S5 — Cometas

7. Enquanto o movimento estiver ligado, um cometa atravessa a Hero de tempos em tempos, com um
   intervalo sorteado de 6 a 14 s.
   - O núcleo tem de 3 a 5 px e é `mist`.
   - A cauda tem de 120 a 260 px, abre-se e esmaece de `mist` para `primary`.
   - O cometa segue uma reta inclinada de 10° a 35° da horizontal, entra e sai fora da tela e
     cruza em 2,5 a 5 s.
   - Nunca há dois cometas ao mesmo tempo: um só agendador sorteia o próximo depois que o atual
     sai.

### S6 — Asteroides

8. Enquanto o movimento estiver ligado, há de 2 a 4 asteroides à vista.
   - São rochas 3D irregulares, de 12 a 48 px, em `graphite`, `ash` e `steel`, iluminadas pela
     luz do buraco negro (a `pointLight` que já existe).
   - Cada um gira devagar (uma volta em 20 a 60 s) e deriva a 5 a 20 px/s.
   - Quando um sai da tela, outro entra por uma borda depois de 3 a 10 s.

### S7 — Lente, movimento reduzido e desempenho

9. Sempre, o buraco negro curva o céu atrás dele pela lente que já existe (`bent-light.tsx`).
   Uma estrela, galáxia, nebulosa, cometa ou asteroide perto dele aparece esticado em arco em
   volta da sombra, com imagem espelhada do outro lado (tasks `black-hole-lensing` e
   `black-hole-flow`).
10. Sob movimento reduzido, o céu fica parado: as estrelas não cintilam, nenhum cometa passa e os
    asteroides ficam onde estão. O resto do céu aparece igual.
11. Sempre, na sonda de GPU (`readPixels` de 1 px a cada quadro, Chromium com ANGLE nesta Intel
    Iris Xe, 1440×900, `deviceScaleFactor` 1, movimento ligado, 6 s), a espera média da GPU fica
    em até 8 ms e a Hero roda a 60 FPS. Na rolagem da página inteira, 60 FPS em todas as alturas,
    como hoje.
12. Sempre, o céu é gerado no navegador: nenhuma imagem, textura ou modelo novo é baixado para
    ele.

### Regras herdadas

13. Sempre:
    - o buraco negro, os dois discos e as cores deles não mudam
      (`portfolio-lp-black-hole-disk-colors`);
    - só entram cores dos tokens (`primary`, `steel`, `mist`, `snow`, `smoke`, `graphite`, `ash`,
      `ink`), e nenhum pixel da Hero é quente (r ≤ b + 8);
    - nenhuma dependência nova entra no `package.json`.

## Out of scope

- **Testes:** o usuário decidiu não escrever testes nem rodar os que existem.
- **Texto real e destino real do CTA:** o texto continua lorem (Unresolved 1).
- **Imagens fotográficas** de galáxias e nebulosas: não seguiriam as cores da marca, e baixá-las
  vai contra 12.
- **Voltar os modelos de vidro e a parede de texto** para trás do buraco negro.

## Observable

| Surface            | Decision                        | Landing                                                                 |
| ------------------ | ------------------------------- | ----------------------------------------------------------------------- |
| tela `/` › `#hero` | em repouso e em movimento       | 1–9, 11                                                                 |
| tela `/` › `#hero` | carregando                      | existing - o texto é HTML e aparece logo; o céu entra com a cena 3D     |
| tela `/` › `#hero` | erro (sem WebGL)                | existing - Unresolved herdado de `portfolio-lp-cosmos`; o texto aparece |
| tela `/` › `#hero` | movimento reduzido              | 10                                                                      |
| tela `/` › `#hero` | janela estreita (375×667)       | 3 (densidade por área); o resto escala com a Hero                       |
| tela `/` › `#hero` | densidade e ordem               | 2 (texto à frente), 3, 5, 6                                             |
| tela `/` › `#hero` | não autorizado, ação destrutiva | n/a - página pública                                                    |

## Swept

- validation: n/a - nenhuma entrada
- failure modes: existing - sem WebGL, a Hero mostra o texto sobre `ink` (Unresolved herdado)
- idempotency and retry: n/a
- authorization: n/a - página pública
- concurrency and ordering: 7 (um só agendador; nunca dois cometas ao mesmo tempo)
- data lifecycle: n/a - nada persiste
- external-dependency failure: 12 (nada é baixado para o céu)
- state transitions: 7 e 8 (cometa: espera → cruza → espera; asteroide: à vista → fora → entra
  outro)
- observability: n/a - sem telemetria; o desempenho fica provado pela sonda de 11

## Impact

| Front           | What changes                                                                                                                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain          | termo novo: **céu**, o que fica na camada de trás (`BEHIND_LAYER`) do buraco negro: estrelas, galáxias, nebulosas, cometas e asteroides. Mora em `components/organisms/hero/`.                                                            |
| domain          | termo existente: `BEHIND_LAYER` foi feito para os modelos de vidro e a parede de texto e passa a guardar o céu. Quem depende: `bent-light.tsx`, que volta a desenhar (o `drawsOn` passa a achar o céu), e a `pointLight` do buraco negro. |
| desempenho      | a lente volta a rodar. Hoje ela desenha a camada de trás a cada quadro, num alvo de 2880×1800 com MSAA 4×, e isso custava ~46 ms. Para caber em 11, ela não pode refazer a cada quadro o que está parado.                                 |
| layout          | `app/page.tsx` volta a montar `<HeroCopy />` dentro de `<Hero>`. `use-hero-field.ts` volta a achar `[data-lens]` e o `h1`, e a lente do título volta.                                                                                     |
| teste           | nenhum teste muda nem roda, por decisão do usuário. Os e2e `sections.spec` e `deflection.spec` já supõem o `HeroCopy`.                                                                                                                    |
| tarefa anterior | ganham nota no topo: `portfolio-lp-black-hole-apple.md` (8: a Hero sem texto) e `portfolio-lp-black-hole-joined-disk.md` (1 e 2: a Hero só com o buraco negro).                                                                           |
| processo        | tudo direto na `main`, por decisão do usuário.                                                                                                                                                                                            |
| stored data     | nothing to migrate - nada persiste                                                                                                                                                                                                        |

## Decided

| Decision                                                                                                   | Shape | Alternative rejected |
| ---------------------------------------------------------------------------------------------------------- | ----- | -------------------- |
| None - tudo é reversível: nada persiste, nenhum contrato, nenhuma dependência, nenhum arquivo novo baixado | -     | -                    |

## Sources

- Conversa com o usuário (2026-10-28), transcrita:
  - "na hero, volte com o Título, subtitulo e CTA."
  - "A minha ideia é a hero ser um espaço sideral, muitas estrelas, galáxias, nebulosas, cometas
    passando, um ou outro asteroide. Enfim, um espaço vivo e bonit."
  - "Todos elementos devem ser otimizados, muito bem espalhados e usar as cores da marca."
  - "não precisamos de testes sobre isso nem rodar os que já foram feito, faça tudo na main."
  - Sobre a lente, à pergunta "O buraco negro deve curvar com a lente gravitacional o espaço
    atrás dele?", a resposta foi "Sim, com lente". A opção dizia: o céu parado é desenhado uma
    vez; a cada quadro só os cometas e asteroides; meta de GPU ≤ 8 ms por quadro.
- Referências do usuário. As cores delas **não** entram, porque o pedido é usar as da marca:
  - `.tasks/references/portfolio-lp-space-galaxies.png`: céu denso de estrelas finas, de 1 a 2
    px, quase todas brancas. Duas galáxias: à esquerda, uma grande e inclinada (~45°), com núcleo
    claro, halo difuso e faixas de poeira; embaixo, à direita, uma espiral menor;
  - `.tasks/references/portfolio-lp-space-comet.png`: estrelas esparsas; um cometa de núcleo
    pequeno e brilhante, com a cauda reta, larga, abrindo e esmaecendo até ~3/4 da largura da
    imagem, inclinada ~25° para baixo;
  - `.tasks/references/portfolio-lp-space-nebula.png`: nebulosa em duas nuvens, uma fria e outra
    quente, cortadas por uma faixa escura de poeira no meio, com estrelas na frente;
  - `.tasks/references/portfolio-lp-space-asteroids.png`: muitas rochas cinzentas, irregulares e
    craterizadas, de tamanhos variados, iluminadas de um lado. O pedido diz "um ou outro
    asteroide", então entram poucos (8).
- `components/molecules/hero-copy/hero-copy.tsx`: o título, o subtítulo e o CTA de antes.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| #   | Kind           | Question                                                                                                             | Until answered                                                              |
| --- | -------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | blocks go-live | Texto real e destino do CTA (herdado).                                                                               | Lorem; o CTA leva a `#contato`.                                             |
| 2   | open           | Os números de 3 a 8 (quantidades, tamanhos, tempos e opacidades) foram propostos aqui, não pelo usuário. Servem?     | Escritos como estão; ajustam-se ao ver.                                     |
| 3   | open           | Galáxias e nebulosas podem ficar atrás do texto, ou ficam fora da caixa do texto para não disputar a leitura?        | Os centros ficam fora da caixa do texto (2).                                |
| 4   | open           | A posição de galáxias, nebulosas e estrelas é sorteada a cada carga (respeitando as distâncias de 3, 5 e 6) ou fixa? | Sorteada a cada carga, como as estrelas da lente do título (`createStars`). |
