# Landing page do portfólio — lente circular, inclinação que oscila, estrelas vivas e estáveis no scroll

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

Hoje, depois de `portfolio-lp-black-hole-wide`:

- **A distorção perto do buraco negro parece oval:** redonda em cima e embaixo, reta nos lados. O
  fluxo aerodinâmico (`a²·(x, −y)/r²`) age desde a borda da sombra, e é ele que achata os lados.
- **A inclinação de 20° é fixa.**
- **As estrelas parecem sem vida:** só 15% cintilam, de 40% a 100%, devagar.
- **Ao rolar a página, o céu pisca e se mexe.** O `<Canvas>` do R3F mede o tamanho com
  `scroll: true`, então o objeto `size` muda a cada scroll. O céu, que dependia dele, sorteava
  estrelas novas e repintava a cada evento.
- **A sombra é `ink` (#101113)** e parece cinza sobre o céu preto.
- **As estrelas de baixo ainda aparecem.** O desbotamento linear só chega a 0 na base.

Com a tarefa entregue, a lente perto do buraco negro é circular, com o fluxo mais longe; o disco
balança ±3°; as estrelas piscam; o céu fica parado no scroll; e a sombra é preta.

7 critérios · 0 one-way doors · 2 em aberto, nenhum bloqueia (1 bloqueia go-live, herdado).

## Criteria

1. Sempre, até 2,4 R do centro, a lente é só radial: um ponto e o seu reflexo por qualquer eixo
   que passe pelo centro são desviados igualmente. O fluxo aerodinâmico entra suave de 2,4 a 3,6
   R e age inteiro além de 3,6 R.
2. Enquanto o movimento estiver ligado, a inclinação do disco oscila entre 17° e 23° (20° ± 3°),
   num ciclo de 21 s. Sob movimento reduzido, fica em 20°.
3. Enquanto o movimento estiver ligado, 60% das estrelas pequenas piscam: o brilho vai de 15% a
   100% e volta, em 1,5 a 4 s, cada uma no seu ritmo.
4. Sempre, além das três estrelas de destaque, há mais 2 grandes (5 a 6 px), 4 médias (3 a 4 px) e
   6 pequenas (2,2 a 2,8 px). Todas têm halo e raios e piscam em 3 a 6 s. Ficam fora da faixa do
   texto (12–88% da largura × 28–80% da altura).
5. Sempre, ao rolar a página, o céu não muda: as mesmas estrelas, nas mesmas posições. Ele só é
   repintado quando a largura ou a altura da Hero mudam, e com as mesmas estrelas.
6. Sempre, a sombra do buraco negro é `#000000`, com a metade da frente do disco passando sobre
   ela como hoje.
7. Sempre, a opacidade das estrelas é 1 até 10% da altura da Hero, cai suave até 0 em 80% e é 0
   daí para baixo.

### Revisão do usuário (2026-10-28)

> Substituem 2 (±3° vira ±1,5°) e 7 (a curva de opacidade).

8. Sempre, há uma estrela grande (núcleo de 8 px, halo de 80 px, raios de 140 px) no canto
   inferior direito, em (93,5%; 84%), com a opacidade da curva de 9.
9. Sempre, a opacidade das estrelas, pela altura y no céu: 1 no topo, 0,7 na metade, 0,5 a 75%,
   0,2 a 90% e 0,02 a 8 px da base; linear entre esses pontos e 0 dali para baixo.
10. Enquanto o movimento estiver ligado, o centro do buraco negro nunca entra na caixa do texto
    (os glifos do `h1`, do `p` e do `a`). Ele dá a volta pelas faixas entre o texto e a borda da
    sua caixa, que agora tem 2% de margem, sem passar de 7,5 px/s. A esfera pode cobrir o texto
    até a metade. A inclinação oscila ±1,5°.
11. Sempre, o logo de vidro volta à Hero, no lugar de antes (canto superior direito), à frente
    do buraco negro e atrás do texto, inclinado 5 px na direção do buraco negro.

### Segunda revisão (2026-10-28)

> Substituem 1 (o fluxo deixa de ser aerodinâmico) e 11 (o logo vai para o centro).

12. Sempre, as duas distorções são radiais: a lente de perto e, a partir de 2,4 R (inteira em
    3,6 R), um segundo empurrão radial de a²/r, com a = 1,92 R. Não sobram pontas nos lados.
13. Sempre, o logo de vidro fica no centro da Hero, com o dobro do tamanho, atrás do texto e à
    frente do buraco negro.
    - O buraco negro o puxa até 8 px, menos com a distância (metade a 400 px).
    - O mouse, sobre a Hero, também o puxa até 8 px (metade a 500 px). O mouse tem prioridade: a
      atração dele substitui a do buraco negro, entrando e saindo em ~0,25 s.
    - Sob movimento reduzido, o mouse não puxa.
14. Sempre, as estrelas pequenas têm metade do brilho de antes e só 30% delas piscam. Há mais uma
    estrela grande e brilhante no canto superior esquerdo, em (6%; 9%).

## Out of scope

- Testes (decisão do usuário).
- Mudar o tamanho, a cor ou o caminho do buraco negro.

## Observable

| Surface            | Decision                         | Landing                                 |
| ------------------ | -------------------------------- | --------------------------------------- |
| tela `/` › `#hero` | em repouso, em movimento, scroll | 1–7                                     |
| tela `/` › `#hero` | movimento reduzido               | 2, 3 (as estrelas não piscam)           |
| tela `/` › `#hero` | carregando, erro, estreita       | existing - como em `portfolio-lp-space` |
| tela `/` › `#hero` | não autorizado, ação destrutiva  | n/a - página pública                    |

## Swept

- state transitions: n/a; concurrency and ordering: n/a; data lifecycle: n/a; validation: n/a;
  idempotency: n/a; authorization: n/a; external-dependency failure: n/a; observability: n/a
- failure modes: 5 (o céu não é refeito por um evento de scroll)

## Impact

| Front       | What changes                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| domain      | `FLOW` ganha `from` 2,4 e `to` 3,6; `behindPoint` (`deflection.ts`) e o shader da lente usam o mesmo peso. |
| domain      | `SPACE.twinkleShare` 0,15 → 0,6, `twinkleLow` 0,4 → 0,15, `twinkleSeconds` [2, 6] → [1,5, 4].              |
| domain      | `uRoll` do mesh passa a variar a cada quadro: `DISK_POSE.slant + diskPose(t).roll`.                        |
| teste       | nenhum teste muda nem roda.                                                                                |
| stored data | nothing to migrate                                                                                         |

## Decided

| Decision                 | Shape | Alternative rejected |
| ------------------------ | ----- | -------------------- |
| None - tudo é reversível | -     | -                    |

## Sources

- Conversa com o usuário (2026-10-28):
  - "1- A distorção parece estar oval, redonda encima e embaixo, nos lados parece estar reta,
    preciso que seja uma distorção perfeitamente circular, além da distorção erodinâmica."
  - "2- O grau de inclinação do buraco negro deve oscilar 3º pra mais e pra menos ao longo de
    sua viagem."
  - "3- as estrelas estão boas, mas parece que elas não tem vida, faça com que elas "pisquem"
    adicione mais algumas estrelas grandes, médias e pequenas no background."
  - "4- ao scrollar a tela, o background de estrelas flica, parece que todo background pisca e
    se mexe, ta bem estranho."
  - "5- O buraco negro parece cinza, ele deve ser #000."
  - "6- as estrelas mais pra baixo da hero devem ter opacity 0"
  - Revisão: "a oscilação de inclinação pode ser menor, pode ser 1.5 grau"; "as estrelas começam a
    ter opacity 0 muito antes do necesssário, pode ser a uns 8px do bottom (...) 1 nas estrelas do
    topo, 0.7 nas do meio, 0.5 nas mais pra baixo, 0.2 mais embaixo ainda e quase 0 antes de 8px
    do bottom"; "coloque uma estrela grande no canto inferior direito"; "Garanta que o buraco
    negro não vai passar atrás dos textos e CTA da Hero, não 100% mas só um pouco" (escolhido:
    "Contornar pelas bordas"); "Vamos adicionar o elemento 3D logo na Hero novamente (...) atrás
    do copy da Hero e na frente do buraco negro (...) puxado em direção ao buraco negro (...) uns
    5px".
  - Segunda revisão: "A distorção aerodinâmica está me encomodando, defina ela como radial
    também"; "A logo deve dobrar de tamanho e estar no centro da tela, atrás do COPY (...) o
    buraco nogro deve puxar a logo em sua direção por no máximo 8px, mas o cursor do mouse pode
    puxar também, em no máximo 8px, o cursor tem prioridade"; "diminua em 50% o brilho das
    estrelas, deixe que apenas 30% pisquem, Adicione 1 estrela grande e brilhante no canto
    superior esquerdo".

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| #   | Kind           | Question                                                                    | Until answered                          |
| --- | -------------- | --------------------------------------------------------------------------- | --------------------------------------- |
| 1   | blocks go-live | Texto real e destino do CTA (herdado).                                      | Lorem; o CTA leva a `#contato`.         |
| 2   | open           | Os números de 1, 3, 4 e 7 (raios da transição, quantidades, ritmos) servem? | Escritos como estão; ajustam-se ao ver. |
