# Landing page do portfólio — a Terra sem rótulo, uma luz só e um céu de verdade

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

O fim da página tem cinco problemas:

- **Rótulo:** um balão "Você está aqui" flutua sobre o pin e repete o que o texto já diz.
- **Interação:** o mouse inclina o globo e o arraste o gira, quando a parte viva da cena deveria
  ser só o vapor em volta.
- **Copy:** "Até aqui, você viu onde podemos chegar. No momento, você está aqui. A escolha é sua."
  soa genérico e não amarra a abertura (o buraco negro) com o fim (a Terra).
- **Luz cortada:** a luz azul do globo termina numa linha reta, porque o canvas acaba na borda de
  cima da seção (`absolute inset-0` com `overflow-clip`). O FAQ e o globo parecem dois blocos
  colados, em vez de um espaço só.
- **Estrelas:** entre as seções, as estrelas formam fileiras diagonais. Em `parallax-field.tsx`, o
  `top` cresce em passo fixo com o índice (`spread(90)`) e o `left` é `índice × 0,7548… mod 1`,
  o que dá uma rede regular, não um céu.

O que muda:

- o globo fica só com o pin e o anel;
- o cursor mexe apenas no vapor;
- a seção ganha o copy A, escolhido pelo usuário;
- a luz do globo se espalha para cima, sobre o FAQ, sem borda;
- o fundo vira um céu noturno: estrelas espalhadas ao acaso, com brilhos, tamanhos e tons
  variados, e uma faixa tênue da Via Láctea.

15 critérios em 5 slices · 0 one-way doors · 1 em aberto, que bloqueia o go-live.

## Criteria

### Pin sem rótulo

1. Sempre, `#contato` não tem nenhum elemento com o texto "Você está aqui", e o `GlobeScene` não
   monta `<Html>` do drei. O pin continua com o ponto e o anel que pulsa a cada 2,4 s.

### O mouse só mexe no vapor

2. Quando o visitante arrasta 300 px sobre o globo, com o lugar já fixado, o globo não gira. Prova
   sob movimento reduzido, que congela o vapor: o recorte do globo antes e depois do arraste
   difere em menos de 0,5% dos pixels.
3. Quando o cursor se move sobre o globo, o globo não inclina. A rotação do globo depende só da
   mira: o giro ocioso, ou a volta até o pin.
4. Quando o cursor passa a menos de 0,42 raio dos nós do vapor, eles se afastam e voltam com mola,
   como hoje. Sob movimento reduzido, o vapor fica parado.
5. O canvas não usa mais `cursor-grab` nem `touch-pan-y`. No toque, a seção rola como o resto da
   página.

### Copy A

6. Quando há cidade (lugar vindo dos cabeçalhos da Vercel), a seção mostra o texto abaixo, nesta
   ordem; o botão continua sendo `<button>`, sem destino (Unresolved 1).
   - `span`: "Contato"
   - `h2`: "Do horizonte de eventos até você."
   - `p`: "Começamos no limite do que dá para construir. Agora o mapa aponta para {cidade}, de onde
     seu projeto parte." e, na linha seguinte, "Para onde ele vai, você decide."
   - botão: "Vamos conversar"
7. Quando o lugar é aproximado (fuso do navegador), a frase do mapa vira "Agora o mapa aponta
   para perto de você, de onde seu projeto parte." e não cita cidade.
8. Quando o lugar não é encontrado, ou enquanto a busca não respondeu, a frase do mapa vira
   "Agora a viagem volta para a Terra, onde seu projeto começa." Quando a busca responde depois,
   o texto troca para o do critério 6 ou 7.

### Uma luz só

9. O canvas do globo começa 50svh acima do topo de `#contato`. Nesses 50svh, uma máscara leva a
   cena de transparente, no alto, a opaca, na borda da seção. O globo continua no mesmo lugar da
   seção (à direita do texto em tela larga; acima dele em tela em pé).
10. No topo de `#contato`, a luz do globo não tem degrau. Na linha do topo da seção, na coluna do
    centro do globo, a diferença de luminância entre o pixel 2 px acima e o pixel 2 px abaixo é
    menor que 2%, numa captura de 1440 × 900 e de 390 × 844.
11. O FAQ fica por cima da luz. Na faixa em que o canvas sobe sobre o FAQ, o texto aparece por
    cima, e clicar numa pergunta a abre: `elementFromPoint` no centro da última pergunta devolve
    o `summary` dela, não o canvas.

### Céu noturno

12. Em cada bloco decorado, as estrelas de fundo (`data-star="far"`) são pelo menos 220,
    espalhadas por um sorteio fixo por índice, sem fileiras. Ordenando os `top` (e, à parte, os
    `left`), o coeficiente de variação dos intervalos entre vizinhos fica acima de 0,5; numa rede
    regular ele é 0. As posições são as mesmas no servidor e no cliente.
13. As estrelas de fundo seguem magnitudes de céu real:
    - pelo menos 60% têm 1 px e opacidade até 0,5;
    - no máximo 5% têm 2,5 px ou mais;
    - há pelo menos 3 tons distintos: branco-azulado, branco e amarelado.

    As de 1,5 px ou mais cintilam fora de fase (`twinkle`, período de 3 s a 8 s); as fracas, de
    1 px, ficam fixas, como no céu real (decisão do usuário no build, 2026-11-04, para não ter 480
    animações na página). Todas ficam paradas sob movimento reduzido.
14. Cada bloco decorado tem uma faixa tênue da Via Láctea na camada de fundo
    (`data-milky-way`), com opacidade até 0,12. Ela é diagonal, e a densidade de estrelas dentro
    dela é pelo menos 2× a de fora.
15. As camadas (`back`, `mid`, `front`), as velocidades do parallax e a ordem de profundidade não
    mudam. As estrelas do meio e a poeira da frente também passam ao sorteio fixo, sem fileiras
    (o mesmo teste do critério 12).

## Out of scope

- O destino do botão e o aviso de privacidade (Unresolved 1, que vem da tarefa anterior).
- O hero: o céu do hero é o shader do Gargantua, que não muda.
- Arrastar ou inclinar o globo de outro jeito (teclado, giroscópio): o pedido é tirar a
  interação do globo.

## Observable

| Surface                      | Decision                       | Landing                                                                 |
| ---------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| screen `#contato`            | loading state                  | 8                                                                       |
| screen `#contato`            | error state (sem lugar)        | 8                                                                       |
| screen `#contato`            | empty state                    | n/a - não há lista nem dado do usuário a exibir                         |
| screen `#contato`            | estado aproximado              | 7                                                                       |
| screen `#contato`            | ação destrutiva                | n/a - nenhuma                                                           |
| copy `#contato`              | estrutura, tom, próximo passo  | 6 - o próximo passo é o botão "Vamos conversar"                         |
| screen `#contato`            | toque                          | 5                                                                       |
| screen fundo entre seções    | densidade e ordem              | 12, 13, 14                                                              |
| screen fundo entre seções    | movimento reduzido             | 13, 15 - existing: `motion-safe:` e `prefersReducedMotion` no parallax |

## Swept

- validation: n/a - nenhuma entrada do usuário.
- failure modes: 8 (sem lugar). Existing: a máscara de terra que não carrega deixa só o globo.
- idempotency and retry: existing - a busca do lugar acontece uma vez por visita.
- authorization: n/a - página pública.
- concurrency and ordering: 8 - a busca que responde com a seção já na tela troca o texto.
- data lifecycle: existing - nada é guardado.
- external-dependency failure: existing - `findVisitorPlace` cai no fuso e nunca lança erro.
- state transitions: 8 - carregando → cidade, aproximado ou sem lugar.
- observability: n/a - site estático, sem log no cliente.

## Impact

| Front       | What changes                                                                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain      | nothing new                                                                                                                                        |
| layout      | `YouAreHere`: o canvas passa da borda de cima da seção e fica sob o FAQ, no contexto de empilhamento do `Decorated`                                |
| layout      | `GlobeScene`: o layout do globo passa a ser medido a partir da parte do canvas que fica dentro da seção                                            |
| performance | canvas com bloom 50% mais alto: mais pixels por quadro; o `RenderGate` continua parando o desenho fora da tela                                     |
| tests       | `e2e/sections.spec.ts` (copy), `e2e/parallax.spec.ts` (tipos na camada de fundo), `e2e/backdrop.spec.ts` (estrelas) descrevem a tarefa anterior e mudam |
| stored data | nothing to migrate                                                                                                                                 |

## Decided

| Decision                                          | Shape | Alternative rejected |
| ------------------------------------------------- | ----- | -------------------- |
| None - tudo aqui é visual e reversível no próximo commit |       |                      |

## Sources

- Conversa com o usuário (2026-11-04), literal: "não quero o tooltip "VOCÊ ESTÁ AQUI" sobre o
  pinpoint", "o mouse deve interagir apenas com os nodes e arestas que circulam o globo e não com
  o globo", "o Copy dessa seção parece genérico demais e meio confuso, refatore mantendo o
  storytelling", "A luz emitida pelo globo está sendo cortada pela seção de cima, poderia ser uma
  coisa só", "as estrelas do backgrdound do site (fora a hero) estão ruins, elas estão
  enfileiradas, não parece um céu noturno de verdade".
- Escolhas do usuário na mesma conversa: copy "A · Do horizonte até você" (o texto dos critérios
  6 a 8) e "Com Via Láctea tênue".
- `.tasks/portfolio-lp-you-are-here.md`: os critérios 4, 5, 7 e 9 dela são substituídos por esta
  tarefa (rótulo, copy, arraste e inclinação, campo de estrelas). O resto continua valendo.

## Unresolved

| #   | Kind           | Question                                                                                                                    | Until answered                                       |
| --- | -------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | blocks go-live | Para onde leva "Vamos conversar" (WhatsApp, e-mail, agenda, formulário)? A política de privacidade cita a cidade obtida pelo IP? | O botão continua sem destino; a LGPD pede o aviso antes |
