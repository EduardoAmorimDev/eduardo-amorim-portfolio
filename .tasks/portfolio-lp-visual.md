# Landing page do portfólio — estrutura e efeitos visuais (lorem ipsum)

> Implemente com **tlc-implement**.
> Cada critério abaixo vira uma verificação com prova, citada pelo número. Nada em
> `Unresolved` é decidido durante a implementação.

## Intent

Hoje `/` mostra só o hero 3D (laptop que abre com a rolagem e ícones de vidro), com
`<header>` e `<footer>` vazios. Quem visita não encontra nada além do hero: não há seções de
apresentação, prova social, cases, processo nem CTA. O dono do portfólio também não consegue
avaliar a direção visual da página inteira, porque os efeitos que pediu (parallax, iluminação,
malha interativa, glitch) ainda não existem. A fonte não traz métrica nem prazo.

Com esta tarefa, `/` passa a ter as nove seções da LP, com conteúdo lorem ipsum, e os cinco
efeitos visuais inspirados nas referências listadas em `Sources`. O hero 3D atual continua como
é. Funcionalidades de produção (destino real do CTA, conteúdo real, analytics) ficam para
depois, por pedido explícito: "Depois vemos sobre funcionalidades em produção e tal...".

29 critérios em 8 fatias · 1 decisão de mão única · 10 em aberto, 2 bloqueiam o go-live

## Criteria

### Estrutura da LP com conteúdo lorem ipsum

1. Quando `/` carrega, então `<main>` contém nove `<section>`, nesta ordem e com estes `id`:
   `hero`, `prova-social`, `sobre`, `solucoes`, `cases`, `workflow`, `depoimentos`, `faq`,
   `contato`. Todas, exceto `hero`, têm um `<h2>` e texto lorem ipsum.
2. Quando `/` carrega com a rolagem em 0, então o `<h1>` lorem, um subtítulo lorem e o botão de
   CTA do hero aparecem por cima da cena 3D, inteiros na primeira tela em 1440×900 e em 375×667.
3. Quando o visitante aciona o CTA do hero, então a página rola até `#contato`.
4. `#contato` mostra um `<h2>` lorem, um parágrafo lorem e um botão de CTA final.
5. `#prova-social` mostra uma faixa de 6 logos de exemplo (placeholders, não marcas reais).
6. `#sobre` mostra um espaço reservado para foto e 2 parágrafos lorem.
7. `#solucoes` mostra 6 cards, cada um com ícone de exemplo, título lorem e descrição lorem.
8. `#cases` mostra 3 cases, cada um com imagem de exemplo, título lorem, descrição lorem e 3
   tags de stack.
9. `#workflow` mostra 6 etapas em sequência numeradas de `01` a `06`: a primeira com o título
   `Discovery`, a última com o título `Deploy` e as intermediárias com títulos lorem.
10. `#depoimentos` mostra 3 depoimentos, cada um com texto lorem, nome e cargo de exemplo e um
    avatar de exemplo.
11. `#faq` mostra 5 perguntas lorem, todas fechadas ao carregar. Quando o visitante aciona uma
    pergunta fechada, a resposta aparece; quando aciona de novo, a resposta some.

### Malha interativa no hero

12. Enquanto o ponteiro está fora do hero, o hero mostra por trás do laptop e dos ícones de
    vidro uma malha de linhas retas, horizontais e verticais, com 48 px de espaçamento.
13. Quando o ponteiro se move sobre o hero, as linhas a até 160 px dele se curvam, com
    deslocamento máximo de 12 px; as linhas a mais de 160 px continuam retas.
14. Quando o ponteiro para ou sai do hero, as linhas curvadas voltam a ficar retas em até
    800 ms.
15. Sempre, com a malha ativa, passar o ponteiro sobre um ícone de vidro continua a incliná-lo
    e a aumentá-lo para 1,06× (`MOTION.hoverScale`), como hoje.

### Iluminação do hero

16. Quando o hero renderiza, então aparece uma fonte de luz visível acima e atrás do laptop: um
    núcleo esférico emissivo com um halo difuso em volta.
17. Quando o hero renderiza, então as superfícies do laptop e do piso voltadas para essa luz
    ficam mais claras que as superfícies opostas.

### Parallax entre as seções

18. Quando o visitante rola de uma seção para a seguinte, as camadas decorativas se movem em
    três velocidades diferentes da rolagem: fundo a 0,2×, meio a 0,5× e primeiro plano a 1,3×.
19. O primeiro plano do parallax são grupos de barras arredondadas, como linhas de código, nas
    cores `primary`, `steel` e `mist`, com desfoque de pelo menos 8 px, junto às bordas laterais
    da tela.
20. A camada do meio são formas geométricas flutuantes (octaedro, cubo arredondado) com um
    brilho suave.

### Glitch e malha de fundo

21. O `<h1>` do hero e os `<h2>` das seções exibem uma rajada de glitch de até 600 ms quando o
    título entra na tela e quando o ponteiro passa sobre ele; fora disso o texto fica limpo, sem
    repetição automática. Durante a rajada aparecem duas cópias do texto, uma em `primary` e
    outra em `mist`, deslocadas até 4 px na horizontal e recortadas em faixas horizontais.
22. Sempre, o glitch muda o texto no máximo 3 vezes por segundo, e as cópias têm
    `aria-hidden="true"`: o leitor de tela lê cada título uma única vez.
23. Fora do hero, o fundo das seções mostra uma malha estática de linhas de 1 px, com células de
    80 px e opacidade de até 6%, e dois brilhos radiais desfocados, um em `primary` e outro em
    `steel`.

### Hero 3D preservado

24. Sempre, a animação atual do hero continua igual: o laptop endireita, abre e liga com a
    rolagem nas janelas `STRAIGHTEN`, `OPEN` e `POWER_ON`, e os ícones de vidro seguem o
    ponteiro com `MOTION` e `ORBIT` inalterados.

### Tema claro e tema escuro, conforme o navegador

25. Quando o navegador está em `prefers-color-scheme: dark`, todas as seções usam fundo `ink` e
    texto `mist`; quando está em `light`, fundo branco (`--color-white`) e texto `ink`.
26. Em cada tema, a cena 3D do hero usa a cor de fundo do tema no fundo, na névoa e no piso:
    `ink` no escuro, branco no claro.
27. No tema claro, as cópias do glitch (21) usam `primary` e `steel` em vez de `primary` e
    `mist`, e as linhas das duas malhas (12, 23) usam `steel`.
28. Quando o visitante troca o tema do sistema com a página aberta, a página inteira passa ao
    outro tema sem recarregar, incluindo a cena 3D (fundo, névoa e piso, 26) e as cores dos
    efeitos (27).

### Movimento reduzido, conforme o sistema

29. Enquanto o navegador está em `prefers-reduced-motion: reduce`, o glitch (21) não dispara, a
    malha do hero continua reta sob o ponteiro (13–14 não acontecem) e as camadas do parallax
    (18) ficam paradas; a animação do laptop guiada pela rolagem (24) continua.

## Out of scope

- Destino real dos CTAs (WhatsApp, e-mail, agenda) — produção, "depois vemos"; ver Unresolved 1.
- Conteúdo real (textos, logos de clientes, depoimentos, cases) — o pedido é lorem ipsum.
- Navegação no `<header>` e conteúdo do `<footer>` — não foram pedidos.
- Cursor customizado e textura de granulação (vistos em itssharl.ee e codewonders.dev) — não
  foram pedidos.
- Metadados de SEO (`title` ainda é `Create Next App`) e `lang` do `<html>` — produção.
- Seletor de tema na página — o tema segue o navegador, por decisão do usuário.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| tela `/` | estado vazio | n/a - conteúdo estático, nunca fica vazio |
| tela `/` | carregamento | existing - `Suspense fallback={null}` mantém o canvas na cor `ink` até os modelos GLB carregarem |
| tela `/` | erro (WebGL indisponível, GLB ausente) | existing - sem tratamento hoje; `findParts` lança erro se faltar um nó do modelo |
| tela `/` | não autorizado | n/a - página pública |
| tela `/` | ordem e densidade das seções | 1, 5–11 |
| tela `/` | ação destrutiva | n/a - nenhuma |
| tela `/` | largura móvel e toque | Unresolved 3 |
| tela `/` | movimento reduzido | 29 |
| tela `/` | tema claro e escuro | 25, 26, 27, 28 |
| texto da página | estrutura | 1 |
| texto da página | tom e profundidade | n/a - lorem ipsum por decisão da fonte |
| texto da página | próximo passo do leitor | 2, 3, 4; destino real em Unresolved 1 |
| FAQ | estado inicial e alternância | 11 |

## Swept

- validation: n/a - não há campo de entrada; o único controle com estado é o FAQ (11)
- failure modes: existing - um GLB sem os nós esperados lança erro em `findParts`; sem WebGL a cena não renderiza; nada disso muda aqui
- idempotency and retry: n/a - nada é gravado nem enviado
- authorization: n/a - página pública, sem sessão
- concurrency and ordering: n/a - sem requisições nem estado compartilhado; a ordem dos frames (`BEFORE_HTML = -1`) é existente e fica preservada por 24
- data lifecycle: n/a - nenhum dado persistido
- external-dependency failure: existing - o iframe do `SCREEN_URL` (Kune na Vercel) fica preto se falhar; fontes via `next/font` resolvidas no build
- state transitions: 11 (pergunta do FAQ aberta ↔ fechada), 21 (glitch limpo ↔ rajada), 28 (tema claro ↔ escuro com a página aberta)
- observability: n/a - página estática sem telemetria; FPS é meta, medida à mão no DevTools, não um critério

## Impact

| Front | What changes |
|---|---|
| domain | Nothing - nenhum termo de domínio novo; os `id` das seções (1) passam a ser âncoras públicas da URL |
| hero | `components/organisms/laptop-hero`: a cena ganha a malha (12–15) e a luz (16–17). Hoje o fundo da cena é `ink` opaco (`<color attach="background">` + `fog`), então a malha precisa ficar dentro da cena ou o canvas precisa ficar transparente |
| hero | o novo ponto de luz muda o visual do alumínio e do vidro, hoje calibrado com dois `spotLight` e os `Lightformer`; 24 protege o movimento, não o sombreamento |
| tokens | as cores saem de `app/globals.css` via `readColorToken`; um token novo (ex.: luz quente, Unresolved 7) exige atualizar `COLOR_TOKENS`, senão `lib/color-tokens.test.ts` falha. A estrutura dos tokens de tema (`--background`/`--foreground` e afins) pode mudar para atender 25–28, por autorização do usuário |
| tema | `globals.css` já alterna `--background`/`--foreground` com `prefers-color-scheme`, mas a cena 3D é sempre `ink` (`hero-scene.tsx`, `glass-elements.tsx`). Ela lê as cores uma vez, em `useMemo`, ao montar; para seguir o tema (26) precisa ler a cor de fundo do tema, e não `ink` fixo |
| tema | o fundo do vidro (`createBackdrop`) e as luzes foram calibrados contra fundo escuro; no tema claro o vidro e o alumínio podem precisar de outra calibração (revisão visual, Unresolved 9) |
| rolagem | `ReactLenis root` já suaviza a rolagem; o parallax (18) e a rolagem até `#contato` (3) passam por ela |
| stored data | nothing to migrate |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| Nenhuma dependência nova de runtime para os efeitos | `dependencies` do `package.json` inalterado: efeitos com `three`, `@react-three/fiber`, `@react-three/drei`, `lenis` e CSS | `@react-three/postprocessing` (bloom): adiciona um passe de tela cheia em cima de seis `MeshTransmissionMaterial`; um halo em sprite atende 16. `gsap`/`ScrollTrigger`: o projeto já tem Lenis e o padrão `useScrollProgress` (ref lida no frame, sem re-render) |

## Sources

- Pedido do usuário nesta conversa (sem endereço; trechos decisivos citados):
  "crie seções com lorem ipsum. Eu estou preocupado agora com questões visuais apenas";
  "Vai ter uma hero, uma seção com social proof, talvez uma seção com perguntas frequentes,
  soluções que eu construo, cases reais em produção, talvez uma seção sobre 'o que dizem os que
  trabalharam comigo' [...], meu workflow técnico de trabalho, desde o discovery dos requisitos
  até o deploy, uma seção de projetos, mas ai seriam cases reais em produção, não sei... [...]
  uma seção de apresentação sobre mim também, CTA no início e no fim da LP";
  "malha que parece um grid, as linhas devem se curvar brevemente em resposta ao hover do mouse".
- Respostas do usuário às perguntas do plano (sem endereço): tema — "da pra criar 1 tema dark e
  1 tema light para cada tema selecionado no navegador, use os tokens do figma para fazer isso"
  (25–27); rolagem — "Pode ir continua" (18). Segunda rodada: tokens — "use os que estão no
  globals.css, pode mudar a estrutura para atingir a convenção de temas dark e light se
  necessário" (25); movimento — "Pode seguir a recomendação" (21, 29); troca de tema — "pode
  fazer ela mudar na hora quando o usuário trocar de tema" (28).
- https://dvlpr.pro/ — **binding para 18–20.** Observado com rolagem por roda: rolagem em tela
  cheia (fullpage, uma seção por gesto, indicador `00`–`04`). Na transição, a ilustração sobe
  mais rápido que o texto, o octaedro roxo flutuante se move menos e as barras desfocadas de
  "código" (azul, roxo, laranja) nas bordas quase não se movem. Fundo com malha de pontos fixa.
  O ponteiro não mexe em nada.
- https://tamalsen.dev/ — **binding para 16–17.** Observado: hero escuro (azul-marinho) com
  sólidos geométricos; uma esfera quente (laranja-pêssego) com halo amplo ilumina as faces de
  cima dos sólidos em laranja, com queda até a sombra. A luz ficou parada com o ponteiro em
  cantos opostos. Não há `<canvas>`: é mídia pré-renderizada.
- https://thainanprado.com.br/ — **diverge da fonte em 12–14.** Observado: o hero tem uma malha
  fina estática de CSS, nos temas claro e escuro. O script da página trata o ponteiro só em
  `.card-hover` (variáveis `--mx`/`--my`), `[data-tilt]` (inclinação com `[data-depth]`) e
  `[data-parallax]` (parallax de rolagem). Nenhuma linha se curvou em três capturas com o
  ponteiro em movimento. A descrição do usuário ("as linhas devem se curvar brevemente") é a
  especificação; a referência vale só pelo visual da malha.
- https://itssharl.ee/ — **referência para 15 e 24.** Observado: formas 3D iridescentes (R3F +
  Locomotive Scroll) que se deslocam cerca de 20–30 px e giram levemente com o ponteiro, com o
  brilho especular acompanhando. Arrastar não faz nada. Os ícones de vidro atuais já fazem isso
  (`MOTION.parallaxTilt`, `parallaxShift`, `hoverTilt`, `hoverScale`), por isso não há critério
  novo; ver Unresolved 8.
- https://www.codewonders.dev/ — **binding para 21–23.** Observado em 8 quadros a cada 120 ms:
  o título alterna entre quadros limpos, quadros com cópia rosa deslocada e quadros com faixas
  horizontais desalinhadas (keyframes CSS `noise-anim`, `noise-anim-2`). Fundo azul-petróleo com
  malha fina de linhas, dois brilhos radiais (petróleo e oliva) e um `CW.` serifado gigante como
  marca d'água.
- Capturas de tela desta análise (temporárias, apagadas no fim da sessão):
  `/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/1bde07af-acc8-445e-9d0b-e299eb29919a/scratchpad/refs/`.

Esta tarefa é o registro da decisão. Se um documento citado divergir, pergunte antes de
implementar.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | blocks go-live | Para onde vão os CTAs: WhatsApp, e-mail, agenda (Calendly/Cal.com) ou formulário? | O CTA do hero rola até `#contato` (3); o botão de `#contato` (4) não tem destino real |
| 2 | blocks go-live | Conteúdo real: textos, logos de clientes (com autorização de uso de marca), depoimentos (com consentimento de quem aparece, LGPD) e cases | Tudo é lorem ipsum e placeholder (1, 5–10) |
| 3 | open | Celular e toque: a partir de qual largura o layout precisa funcionar, e o que fazem os efeitos de hover sem ponteiro? | Padrão assumido: layout sem rolagem horizontal a partir de 375 px; em toque a malha fica reta e o hover dos ícones não existe |
| 4 | open | "Projetos" e "cases em produção" são uma seção ou duas? | Uma só: `#cases` (8) |
| 5 | open | FAQ e depoimentos ("talvez") entram? | Os dois entram (10, 11); remover uma seção não afeta as outras |
| 6 | open | Ordem das seções | A ordem de 1 (hero → prova social → sobre → soluções → cases → workflow → depoimentos → FAQ → contato) |
| 7 | open | Cor da luz do hero: violeta da marca, ou quente/laranja como em tamalsen.dev (token novo)? | Núcleo em `mist` e halo em `primary`, sem token novo (16) |
| 8 | open | A interação 3D precisa de algo além do que os ícones de vidro já fazem (ex.: arrastar, cursor customizado)? | Nada novo; o comportamento atual (15, 24) já corresponde ao itssharl.ee |
| 9 | open | Valores de ajuste visual: espaçamentos, raios, deslocamentos, velocidades, tempos e cores por tema | Os valores de 12–14, 18–19, 21–23 e 27 são padrões propostos, não pedidos; podem mudar na revisão visual |
| 10 | open | Quais são as etapas intermediárias do workflow? | Seis etapas: `Discovery` (01), quatro com títulos lorem, `Deploy` (06) (9) |
