# Landing page do portfólio — "Você está aqui": a Terra no fim da viagem

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

A página abre no buraco negro ("onde podemos chegar") e termina numa seção de contato genérica,
sem ligação com essa abertura. Entre as duas, as formas geométricas do parallax (octaedros, cubos
e barras de "código") destoam do hero novo.

A página passa a ser uma viagem:

- o buraco negro no começo;
- estrelas em profundidade entre as seções;
- no fim, a Terra em pontos com um pin na cidade do visitante e o convite do usuário: "Até aqui,
  você viu onde podemos chegar. No momento, você está aqui. A escolha é sua.", com o botão
  "Entrar em contato".

9 critérios · 1 one-way door · 1 em aberto, que bloqueia o go-live.

## Criteria

1. Quando `GET /api/onde-estou` recebe `x-vercel-ip-latitude` e `x-vercel-ip-longitude` válidos,
   então responde 200 com `{ latitude, longitude, city?, country? }`. Sem eles, ou com valores
   fora de ±90 / ±180, responde 204. Sempre com `Cache-Control: private, no-store`.
2. Quando a rota não dá um lugar (fora da Vercel, localhost, falha de rede), o lugar vem do fuso
   do navegador por uma tabela de 52 fusos comuns. Esse lugar é aproximado: o pin vai para a
   cidade que dá nome ao fuso, mas o texto não cita cidade ("No momento, você está por aqui."),
   porque um fuso cobre muitas (`America/Sao_Paulo` cobre o RS). Sem fuso conhecido, não há pin
   e o texto diz "No momento, você está em algum lugar deste planeta.".
3. A busca do lugar só acontece quando a seção chega a uma tela de distância, uma vez por visita.
   Nada é guardado.
4. A seção `#contato` mostra um globo de pontos nos continentes, a partir da máscara
   `public/textures/land-mask.png` (720 × 360, rasterizada do Natural Earth 1:110m, domínio
   público). Quando há lugar, o globo gira pelo caminho mais curto até deixá-lo à frente, um
   pouco acima do meio. O pin tem um anel que pulsa a cada 2,4 s e o rótulo "Você está aqui", que
   aparece quando o lugar chega à frente.
5. O texto da seção é: `Contato` / "Até aqui, você viu onde podemos chegar." / "No momento, você
   está aqui, em {cidade}." / "A escolha é sua." / botão "Entrar em contato".
6. Em telas largas o globo fica à direita do texto; em telas em pé, acima dele.
7. Quando o visitante arrasta sobre a seção, o globo gira 0,006 rad por px e continua girando
   por inércia depois de solto. Três segundos depois do último toque, volta para o pin. O cursor
   inclina o globo até 0,18 rad na direção dele. No toque, só o gesto horizontal gira o globo
   (`touch-action: pan-y`), e o vertical continua rolando a página. Sob movimento reduzido, o
   arraste gira sem inércia e o cursor não inclina.
8. O globo é translúcido e emite luz azul-clara (`--color-sky: #7cc7ff`). Atrás dele há um
   brilho que cai suavemente para o espaço, mais forte na borda. O núcleo tem cerca de 30% de
   opacidade, com um brilho de borda na mesma cor. Os pontos do lado de trás aparecem com 32% do
   brilho. Em volta flutua um "vapor": 240 nós numa casca de 1,06 a 1,5 raio, ligados por linhas
   quando estão a menos de 0,4 raio. Ele é desenhado num canvas próprio sobre o globo, com
   `blur(2.5px)`, para ler como névoa e não como arame. O cursor afasta os nós num raio de 0,42 e
   eles voltam com mola quando ele passa. Sob movimento reduzido, o vapor fica parado. A
   referência de estilo foi uma imagem de banco (Shutterstock) enviada pelo usuário; foi usado só
   o estilo, nada da imagem.
9. O parallax entre as seções é um campo de estrelas: estrelas finas que cintilam no fundo,
   estrelas mais brilhantes com halo no meio e poeira desfocada na frente. As camadas e as
   velocidades continuam as mesmas.

## Out of scope

- O destino do botão "Entrar em contato" (já estava em aberto na seção de contato antiga).
- Testes (vão no passo de testes já pedido).

## Swept

- validation: 1 - coordenadas fora da faixa viram 204; no cliente, `asPlace` valida a resposta.
- failure modes: 2 - qualquer falha cai no fuso; a máscara que não carrega deixa só o globo.
- idempotency and retry: 3 - uma busca por visita.
- authorization: n/a - rota pública que só devolve dados do próprio pedido.
- concurrency and ordering: n/a.
- data lifecycle: 3 - nada é guardado, nem em log.
- external-dependency failure: 2.
- state transitions: n/a.
- observability: n/a - por decisão, a rota não registra nada (dado pessoal).

## Impact

| Front       | What changes                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------- |
| domain      | `GET /api/onde-estou` (nova rota, dinâmica)                                                     |
| domain      | `YouAreHere` (`components/organisms/you-are-here`) substitui `Contact`, mantendo `id="contato"` |
| domain      | `findVisitorPlace` (`lib/visitor-place.ts`)                                                     |
| layout      | `ParallaxField`: formas e barras viram estrelas e poeira (`data-star`, `data-dust`)             |
| stored data | nothing to migrate                                                                              |

## Decided

| Decision                                   | Shape                                                                                 | Alternative rejected                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| O lugar vem dos cabeçalhos de IP da Vercel | `GET /api/onde-estou` → `{ latitude, longitude, city?, country? }` ou 204, `no-store` | API de IP de terceiro: envia o IP do visitante a outra empresa; só fuso: precisão de país (escolha do usuário) |

## Sources

- Conversa com o usuário (2026-11-03): "A minha ideia é "mostrar onde podemos chegar" e ao fim
  "mostrar onde o usuário está", no caso no planeta terra, talvez pegar o ip do consumidor do
  site e colocar um pinpoint encima do planeta. algo assim, e um CTA, "Até aqui, você viu onde
  podemos chegar, no momento você está aqui, a escolha é sua" e ai um botão entrar em contato" e
  "pode modificar o que achar necessário no site".
- Escolhas do usuário: "Cabeçalhos da Vercel" e "Globo de pontos estilizado".

## Unresolved

| #   | Kind           | Question                                                                                                                     | Until answered                                     |
| --- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | blocks go-live | Para onde leva "Entrar em contato" (WhatsApp, e-mail, agenda, formulário)? E a política de privacidade cita a cidade por IP? | O botão não tem destino; a LGPD pede o aviso antes |
