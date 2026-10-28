# Landing page do portfólio — lente em forma de maçã, com polos à esquerda e à direita, e Hero parada

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

A lente do buraco negro (`portfolio-lp-black-hole-lensing`, `-behind`) não tem o formato que o
dono do portfólio quer:

- **a distorção é radial simples.** Ela é igual em todas as direções, e a área distorcida é um
  círculo. Na referência, o que está atrás escorre e "cai" em dois polos, à esquerda e à direita
  da sombra.
- **a área distorcida é grande demais:** o anel de Einstein fica a 2 raios do horizonte
  (192 px).
- **a distorção muda de tamanho.** O horizonte acompanha a profundidade de uma malha que já não
  existe na tela: é maior embaixo e menor em cima. Por isso a lente cresce e encolhe conforme o
  buraco negro vaga.
- **tudo se mexe ao mesmo tempo.** O `logo` e os quatro modelos balançam e seguem o ponteiro, e
  o título, o subtítulo e o CTA ficam na frente. Assim não dá para ler o efeito da lente.

A fonte não traz métrica; o custo é o tempo do dono do portfólio para julgar o efeito.

Com a tarefa entregue:

- só o buraco negro se move na Hero;
- o texto da Hero sai por enquanto;
- o horizonte tem tamanho fixo;
- a lente tem anel de Einstein de 1,6 raio em cima e embaixo, e afunda em direção à sombra nos
  polos esquerdo e direito. A área distorcida tem a forma de uma maçã deitada, que é o formato
  das linhas de campo de um dipolo.

**Isso não é física.** Campo magnético não desvia luz. É uma escolha visual do dono do
portfólio, construída sobre a lente de Schwarzschild.

11 critérios em 4 fatias · 0 one-way doors · 2 em aberto, nenhum bloqueia (1 bloqueia go-live,
herdado).

## Criteria

Medidas em CSS px numa janela de 1440×900, salvo quando indicado. O horizonte tem 96 px de raio.
r é a distância ao centro do buraco negro, em raios do horizonte. φ é o ângulo a partir do eixo
dos polos, a horizontal: 0° à direita e à esquerda, 90° em cima e embaixo.

### S1 — Só o buraco negro se move

1. Sempre, o `logo` e os quatro modelos de trás (`cursor`, `wave`, `atom`, `brick`) ficam na
   pose de repouso de `GLASS_LAYOUT`: posição, rotação e escala. Nada muda de um quadro para o
   outro: não balançam, não giram e não seguem o ponteiro.
2. Quando o ponteiro passa sobre o `logo`, ele não inclina nem cresce.

### S2 — Lente em forma de maçã

3. Sempre, um ponto da tela a r e φ mostra o que está atrás a β = r − K·α(ρ), na mesma direção,
   com ρ = r / sen²φ:
   - α é a deflexão exata de `deflection.ts`;
   - ρ é o raio, no equador, da linha de campo do dipolo que passa pelo ponto (r = ρ·sen²φ);
   - K é fixado para o anel de Einstein ficar a 1,6 raio no equador: K = 1,9987.

   Onde β < 0, o ponto mostra o lado oposto, espelhado, como hoje.

4. Sempre, o anel de Einstein (onde β = 0), ±3%:

   | φ   | anel (raios)     | anel (px)       |
   | --- | ---------------- | --------------- |
   | 90° | 1,60             | 154             |
   | 60° | 1,34             | 128             |
   | 45° | 1,04             | 100             |
   | 30° | dentro da sombra | — (não há anel) |

   Perto dos polos, o anel afunda para dentro da sombra.

5. Sempre, um ponto atrás a d px do centro aparece a θ₊ px na mesma direção, ±4 px:

   | φ   | d = 96 | d = 192 | d = 476 |
   | --- | ------ | ------- | ------- |
   | 90° | 198    | 262     | 507     |
   | 45° | 153    | 228     | 491     |
   | 0°  | 96     | 192     | 476     |

   Sobre o eixo dos polos, nada se desloca.

6. Sempre, a sombra continua redonda, com 1 raio, e nada do que está atrás aparece dentro dela.

### S3 — Tamanho fixo

7. Sempre, o horizonte mede 96 px de raio (±2 px) em qualquer ponto do caminho, e a lente tem o
   mesmo tamanho onde quer que o buraco negro esteja. Em janelas menores, encolhe como hoje
   (`holeScale`).

### S4 — Hero sem texto

8. Quando `/` carrega, `#hero` não tem `<h1>`, subtítulo nem CTA. O componente `HeroCopy`
   continua no projeto, sem uso.

### Regras herdadas

9. Sempre, o buraco negro vaga entre 5 e 15 px/s, como hoje (`portfolio-lp-black-hole-behind`
   11).
10. Sempre, fora da tela, a Hero faz 0 draw calls.
11. Sempre, nenhuma dependência nova entra no `package.json`.

## Out of scope

- **Escrever, mudar ou rodar testes:** decisão do usuário ("Não mexa nem rode testes").
- **Desenhar as linhas de campo do dipolo na tela**, como na imagem dos polos: ela mostra o
  formato, e o pedido é que a lente siga esse formato.
- **Pôr conteúdo com linhas horizontais atrás do buraco negro**, como o texto da referência: não
  foi pedido. Com os quatro modelos, o formato de maçã aparece só quando um deles passa perto.
- **Voltar com o título, o subtítulo e o CTA:** a tarefa os tira "por enquanto".
- **A luz que o buraco negro joga nos modelos:** continua; a pergunta feita ao usuário ainda não
  foi respondida.

## Observable

| Surface            | Decision                                  | Landing                                           |
| ------------------ | ----------------------------------------- | ------------------------------------------------- |
| tela `/` › `#hero` | em repouso e em movimento                 | 1, 3–7                                            |
| tela `/` › `#hero` | sem texto                                 | 8; a página fica sem `<h1>` por enquanto (Impact) |
| tela `/` › `#hero` | ponteiro                                  | 2                                                 |
| tela `/` › `#hero` | carregando, erro (modelo que não carrega) | existing - `Suspense` sem fallback                |
| tela `/` › `#hero` | janela estreita (375×667)                 | 7                                                 |
| tela `/` › `#hero` | não autorizado, ação destrutiva           | n/a - página pública, sem ação destrutiva         |

## Swept

- validation: n/a - nenhuma entrada de dados
- failure modes: existing - `Suspense` não mostra o modelo que não carrega
- idempotency and retry: n/a - nada é enviado nem gravado
- authorization: n/a - página pública
- concurrency and ordering: existing - a lente e a sombra leem o mesmo `hole` no mesmo quadro (`portfolio-lp-black-hole-lensing` 12)
- data lifecycle: n/a - nada persiste
- external-dependency failure: n/a - nenhum recurso externo
- state transitions: n/a - nada novo alterna estado; a subida já está parada em 0,5
- observability: n/a - o projeto não tem telemetria

## Impact

| Front           | What changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain          | termo novo: raio da linha de campo (ρ = r / sen²φ). É o que faz a lente seguir o formato de dipolo. Vive em `deflection.ts`, ao lado de `sourceRadius`, e no shader de `bent-light.tsx`.                                                                                                                                                                                                                                                                                                |
| domain          | termo existente: `EINSTEIN.radius` passa de 2 a 1,6, agora medido no equador. Quem depende: `bendAt`, `deflection.test.ts` (tabelas de θ₊/θ₋ a 2,0), `e2e/deflection.spec.ts`.                                                                                                                                                                                                                                                                                                          |
| domain          | termo existente: o horizonte deixa de seguir `sheetScale` (`horizonAt`) e passa a ter tamanho fixo. Quem depende: `use-hero-field.ts`, `black-hole-path.ts` (`holeBox`), `black-hole.test.ts` ("the horizon follows the sheet's scale"), `e2e/black-hole.spec.ts` ("the black hole grows and shrinks").                                                                                                                                                                                 |
| domain          | termo existente: `motionTarget`/`MOTION` (`glass-motion.ts`) deixam de valer na Hero: os ícones ficam na pose de repouso. Quem depende: `glass-elements.tsx`, `glass-motion.test.ts`, `e2e/hero.spec.ts` ("the logo still takes the pointer", "the logo clears the title…"), `e2e/interaction.spec.ts`.                                                                                                                                                                                 |
| conteúdo        | sem `HeroCopy`, a página fica sem `<h1>`, um problema de acessibilidade e de SEO, por enquanto. A lente do ponteiro sobre o título (`hero-lens`) nunca abre, porque não há título. Quem depende: `e2e/a11y.spec.ts`, `e2e/hero.spec.ts`, `e2e/lens.spec.ts`, `e2e/sections.spec.ts`, `e2e/glitch.spec.ts`.                                                                                                                                                                              |
| teste           | **quebram e ficam quebrados, por decisão do usuário.** Nenhum teste muda nem roda. A lista acima é dedução da leitura, não de execução.                                                                                                                                                                                                                                                                                                                                                 |
| processo        | commit direto na `main`, por decisão do usuário; push precisa de autorização à parte.                                                                                                                                                                                                                                                                                                                                                                                                   |
| tarefa anterior | Recebem no topo a lista do que esta substitui: <br>• `.tasks/portfolio-lp-black-hole-lensing.md`: 3–6 (o anel de 2,0 vira 1,6 no equador, e a lente deixa de ser radial); <br>• `.tasks/portfolio-lp-black-hole-behind.md`: 5 (as tabelas de θ₊/θ₋) e 8 em parte (o `logo` deixa de seguir o ponteiro); <br>• `.tasks/portfolio-lp-gravity.md`: 6 (o horizonte segue a profundidade da malha); <br>• `.tasks/portfolio-lp-cosmos.md`: 15 em parte (o `logo` inclina e cresce no hover). |
| stored data     | nothing to migrate - nada persiste                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Decided

| Decision                                                                                             | Shape | Alternative rejected |
| ---------------------------------------------------------------------------------------------------- | ----- | -------------------- |
| None - tudo aqui é reversível: nada persiste, nenhum contrato externo, nenhuma dependência nova (11) | -     | -                    |

## Sources

- Conversa com o usuário (2026-10-28), transcrita:
  - "1 - Deixe os modelos 3D parados, apenas o que se move em tela é o buraco negro."
  - "2 - A distorção gravitacional causada na luz (distorção da lente) deve respeitar também o
    campo magnético do buraco negro."
  - "3 - Os polos do buraco negro são na esquerda e na direita […] parecendo que as letras
    'caem' nos polos esquerdo e direito do buraco negro."
  - "4 - diminua um pouco a área de distorção que o buraco negro aplica."
  - "5 - remova por enquanto o título, subtítulo e CTA da Hero (depois vamos voltar com eles
    […])"
  - "Não mexa nem rode testes, faça tudo na main."
- Respostas do usuário (2026-10-28):
  - **Formato:** "a distorção deve seguir este formato, hoje, o que vemos é uma distorção radial
    simples, mas a distorção que um buraco negro aplica é uma distorção parecida como o formato
    de uma maçã, onde os lados da maçã são redondos mas quando se encontram no topo e na parte
    de baixo da maça, eles seguem 'para dentro' da maçã."
    - Lido como a forma das linhas de campo de um dipolo, r = L·sen²φ, deitada com os polos à
      esquerda e à direita: redonda em cima e embaixo, afundando para dentro nos polos.
    - O usuário se ofereceu para explicar melhor; ver Unresolved 2.
  - **Área:** "pode ser 1,6 o raio. Parece que a distorção oscila de tamanho também, remova isso.
    por enquanto."
- Referências:
  - `.tasks/references/portfolio-lp-black-hole-poles.png`: linhas de campo azuis em arcos que
    ligam dois polos brilhantes, um à esquerda e um à direita; as externas se abrem e voltam a
    cada polo.
  - `.tasks/references/portfolio-lp-black-hole-lensing.png`: as linhas de texto se curvam em
    volta da sombra e convergem para os lados esquerdo e direito dela.
- Os números de 4 e 5 vêm de `deflection.ts`, com a busca do anel e das imagens por bisseção, e
  K fixado em 1,6 raio no equador.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| #   | Kind           | Question                                                                                                                                                                      | Until answered                                    |
| --- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | blocks go-live | Destino real dos CTAs e conteúdo real (herdado de `portfolio-lp-cosmos`). Agora o texto da Hero nem aparece.                                                                  | A Hero fica sem texto.                            |
| 2   | open           | A leitura de "maçã" (dipolo r = L·sen²φ, com polos à esquerda e à direita, anel a 1,6 em cima e embaixo e nenhum deslocamento sobre o eixo dos polos) é a que o usuário quer? | Escrita como em 3–5; ajusta-se depois de ele ver. |
