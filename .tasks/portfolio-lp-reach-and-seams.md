# Costuras suaves, vidro nas soluções, alcance, timeline e o convite final

> Build this with **tlc-implement**.
> Every criterion below becomes a check with a proof, referenced by its number. Nothing under
> `Unresolved` gets settled while building.

## Intent

Hoje a página se lê como blocos empilhados. A hero termina numa borda reta: o canvas do buraco
negro é cortado pelo `overflow-clip` da `<section id="hero">`, o fundo dela é `bg-black` (`#000`)
enquanto a página é `--color-ink` (`#101113`), e o céu (estrelas e brilhos) só começa no bloco
seguinte, então a lente some numa linha horizontal. O palco do notebook (`#notebook`) repete o
problema: é `bg-background` opaco, sem estrelas nem brilhos, e entra na tela como um retângulo
liso depois de Soluções. A seção do notebook vende "responsividade", que o visitante já espera de
qualquer site e não diferencia o trabalho. Os ícones de vidro da marca saíram do projeto junto com
a hero antiga (commit `a7cf52c`), e os cards de Soluções ficaram com glifos SVG genéricos. O
Workflow é uma grade de cards, que não comunica sequência. O fechamento da página usa um copy que
o autor quer trocar. O source não traz métrica de impacto; o custo é a percepção de acabamento de
um portfólio que vende acabamento.

Quando isto entrar: a lente da hero se dissolve no céu sem linha; o palco do notebook continua o
mesmo céu; a seção do notebook fala de alcance (apps, sites e LPs, sistemas); cada card de
Soluções mostra um ícone 3D de vidro da marca; o Workflow é uma timeline de nós; o contato fecha
com o copy novo e um botão pulsante; e, num mouse, o ponteiro do visitante é o cursor 3D de vidro
da marca.

28 critérios em 7 fatias · 1 one-way door · 7 open, dos quais 1 blocks go-live

## Criteria

Medição de costura usada abaixo: screenshot da viewport a 1440×900, luminância média (0–255) de
cada linha de pixels; "sem costura" = a diferença entre a média das 8 linhas acima e das 8 linhas
abaixo da borda indicada é ≤ 3.

### A hero se dissolve no céu

1. Quando a página está rolada de modo que o fim da `<section id="hero">` fica a 50% da altura da
   viewport, a borda da seção não tem costura (medição acima).
2. Quando a página está rolada como em 1, a imagem do buraco negro continua visível abaixo do fim
   da seção: o canvas `hero-scene` desenha pixels não-pretos em pelo menos 25svh abaixo da borda,
   com opacidade decrescendo até 0 em 50svh abaixo dela.
3. Sempre, o fundo da `<section id="hero">` é `--color-ink`, nunca `#000`.
4. Quando a página está rolada como em 1, as estrelas e os brilhos `sections-glow` do primeiro
   bloco decorado aparecem através da faixa em que a hero se dissolve.
5. Sempre, o texto de `#prova-social` fica acima do canvas da hero
   e recebe cliques: o canvas tem `pointer-events: none` na faixa que invade o bloco seguinte.
6. Sempre, no primeiro ecrã (scroll 0), a posição, o tamanho e o enquadramento do buraco negro são
   os mesmos de hoje: as asserções de layout de `e2e/hero.spec.ts` continuam passando sem
   alteração de valores.

### O palco do notebook continua o céu

7. Quando o topo do palco do notebook está a 50% da altura da viewport, rolando a partir de
   `#solucoes`, a borda superior do palco não tem costura (medição acima).
8. Enquanto o palco do notebook está fixo, ele mostra estrelas e os dois brilhos `sections-glow`
   (`primary` e `steel`) atrás dos aparelhos.
9. Sempre, a seção puxada para baixo do último ecrã do notebook (`#cases`) não aparece através do
   palco antes do hand-off (comportamento atual de `notebook.spec.ts` preservado).

### O notebook fala de alcance

10. Quando o palco do notebook está visível, o rótulo é `Alcance` e o `<h2 id="notebook-title">` é
    `Vá onde o concorrente não foi`.
11. Quando cada aparelho está em cena, o capítulo correspondente mostra, literalmente:
    - celular: `01 · Apps` / `No bolso do seu cliente` / `Aplicativos e PWAs que vivem na tela
      inicial, avisam na hora certa e abrem até com sinal fraco. Seu cliente chega até você com
      um toque.`
    - tablet: `02 · Sites e landing pages` / `A vitrine que nunca fecha` / `Sites e landing pages
      rápidos, fáceis de achar no Google e feitos para converter, em qualquer tela que o cliente
      tiver na mão.`
    - notebook: `03 · Sistemas` / `E a operação inteira, por dentro` / `ERPs, CRMs, painéis e web
      apps sob medida: o que sua equipe usa todo dia, do estoque ao atendimento, no navegador de
      qualquer máquina.`

### Ícones de vidro nas Soluções

12. Os sete arquivos `public/models/glass/{atom,brick,cursor,flag,logo,note,wave}.glb` existem e são
    byte a byte iguais aos de `a7cf52c^`.
13. Quando `#solucoes` está na tela e os modelos carregaram, cada um dos 6 cards mostra, no lugar
    do glifo SVG, um ícone 3D de vidro de 64×64 CSS px, na ordem `atom`, `brick`, `cursor`, `flag`,
    `note`, `wave`.
14. Sempre, o vidro usa os parâmetros de `MeshTransmissionMaterial` de
    `components/organisms/hero/glass-elements.tsx` em `a7cf52c^` (`ior` 1.45, `thickness` 0.35,
    `chromaticAberration` 0.3, `iridescence` 1, `opacity` 0.7, faixas `steel`/`primary`/`mist`
    como `buffer`).
15. Enquanto o movimento é permitido, cada ícone gira em torno do eixo Y a 0,3 rad/s; sob
    `prefers-reduced-motion: reduce`, fica parado.
16. Enquanto um modelo carrega, ou se ele falhar ao carregar, o card mostra o glifo SVG atual no
    lugar do ícone, e título e texto continuam visíveis.
17. Sempre, os 6 ícones e o cursor de vidro (22–28) somam um único elemento `<canvas>` na página,
    fixo cobrindo a viewport e com `pointer-events: none`; com o ponteiro parado há 1 s e
    `#solucoes` a mais de uma tela da viewport, esse canvas não desenha quadros.

### Workflow como timeline

18. `#workflow` renderiza um `<ol>` com 6 `<li>`, nenhum com a classe `glass-card`, ligados por uma
    linha contínua; cada `<li>` tem sobre a linha um marcador circular com o número `01`–`06`
    (`data-step-number`) e, ao lado, o título e o texto do passo.
19. Em viewports ≥ 1024px de largura, a linha fica no centro e os passos alternam de lado (ímpares
    à esquerda, pares à direita); abaixo disso, a linha fica à esquerda e todos os passos à direita
    dela.

### O convite final

20. Em `#contato`, o `<h2>` é `Trago o horizonte de possibilidades, até você`, seguido de um
    parágrafo `Você viu onde podemos chegar. O mapa aponta nosso ponto de partida.`, idêntico para
    cidade encontrada, local aproximado e local não encontrado; abaixo, um parágrafo
    `A escolha é sua...` e o botão `Vamos conversar`.
21. Enquanto o movimento é permitido, o botão `Vamos conversar` emite um anel em `--color-primary`
    que cresce de 100% a 125% do tamanho do botão e some, em ciclos de 2 s, sem mudar o tamanho do
    próprio botão; sob `prefers-reduced-motion: reduce`, não há anel.

### O cursor de vidro

22. Em dispositivos que casam `(hover: hover) and (pointer: fine)`, depois que `cursor.glb`
    carregou, o cursor nativo fica oculto (`cursor: none`) em toda a página e um cursor 3D de vidro
    (`cursor.glb`, material de 14), de 32 CSS px de altura, segue o ponteiro: com o ponteiro
    parado, a ponta do modelo fica a ≤ 2 px de `clientX`/`clientY`.
23. Enquanto o ponteiro se move e o movimento é permitido, o cursor inclina até 15° na direção do
    movimento e volta a 0° quando ele para; sob `prefers-reduced-motion: reduce`, a inclinação é
    sempre 0°.
24. Quando o ponteiro está sobre um controle que hoje mostra `cursor: pointer` (`button`,
    `a[href]`, `summary` e descendentes), o cursor de vidro fica em 1,2× o tamanho; fora deles,
    1×.
25. Se o dispositivo não casa `(hover: hover) and (pointer: fine)`, ou enquanto `cursor.glb` não
    carregou, ou se ele falhar ao carregar, o cursor nativo permanece e nenhum cursor 3D é
    desenhado.
26. Quando o ponteiro sai da janela ou entra numa tela de aparelho do notebook (`<iframe>`), o
    cursor 3D some e volta ao ponteiro quando ele reentra na página.
27. Sempre, o cursor 3D fica acima de todo o conteúdo e não intercepta eventos: um clique com ele
    sobre `Vamos conversar` aciona o botão, e o vapor do globo (`globe-vapor.tsx`) continua
    seguindo o ponteiro.
28. Sempre, a navegação por teclado não muda: o foco visível e a ordem de tabulação são os de hoje,
    e o cursor 3D não se move com o foco.

## Out of scope

- Destino do botão `Vamos conversar` - continua sem destino (Unresolved 1, herdado).
- Copy dos passos intermediários do Workflow e dos títulos/textos dos cards de Soluções - continuam
  lorem; nenhuma fonte os decidiu.
- Linha da timeline que se preenche com o scroll ou nó ativo destacado - não foi pedido.
- Uso do `logo.glb` em algum lugar da página - o pedido é ter os modelos de volta e usá-los nos
  cards; o logo volta como arquivo, sem uso.
- Trocar os aparelhos 3D do notebook (celular, tablet, laptop) por outros que representem apps,
  sites e sistemas - só o copy muda.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| tela `#hero` → primeiro bloco | transição | 1, 2, 3, 4 |
| tela `#hero` → primeiro bloco | interação na faixa sobreposta | 5 |
| tela `#hero` | layout do primeiro ecrã | 6 |
| tela `#notebook` | transição de entrada | 7, 8 |
| tela `#notebook` | transição de saída | existing - hand-off por opacidade em `notebook.tsx` (`HANDOFF`), 9 |
| tela `#notebook` | copy (estrutura, tom, próxima ação) | 10, 11; aprovação do texto Unresolved 2 |
| tela `#solucoes` | loading | 16 |
| tela `#solucoes` | error | 16 |
| tela `#solucoes` | empty | n/a - lista fixa de 6 cards no código |
| tela `#solucoes` | movimento reduzido | 15 |
| tela `#solucoes` | densidade e ordem | 13; mapeamento modelo→card Unresolved 3 |
| tela `#workflow` | densidade e ordem | 18, 19 |
| tela `#workflow` | empty / loading / error | n/a - conteúdo estático |
| tela `#contato` | copy (estrutura, tom, próxima ação) | 20 |
| tela `#contato` | próxima ação (destino do botão) | Unresolved 1 |
| tela `#contato` | movimento reduzido | 21 |
| tela `#contato` | erro da busca do local | 20 (texto não depende dela); pin: existing - `globe-scene.tsx` |
| ponteiro (página toda) | aparência e posição | 22, 23 |
| ponteiro (página toda) | affordance sobre controles | 24; tamanho Unresolved 7 |
| ponteiro (página toda) | loading / error / touch | 25 |
| ponteiro (página toda) | fora da janela e sobre iframes | 26 |
| ponteiro (página toda) | interação e teclado | 27, 28 |
| ponteiro (página toda) | movimento reduzido | 23 |
| todas | não autorizado | n/a - página pública, sem sessão |

## Swept

- validation: n/a - nenhuma entrada do usuário nesta tarefa.
- failure modes: 16 e 25 (modelo não carrega); WebGL indisponível: existing - `RenderGate`/fallbacks dos canvases atuais.
- idempotency and retry: n/a - sem escrita nem requisição nova.
- authorization: n/a - página pública.
- concurrency and ordering: n/a - sem estado compartilhado nem requisições concorrentes; a ordem visual dos passos está em 18.
- data lifecycle: n/a - nada é persistido.
- external-dependency failure: 20 - o texto do contato deixa de depender de `/api/onde-estou`; a falha da busca segue tratada em `you-are-here.tsx` (existing).
- state transitions: n/a - nenhum ciclo de vida muda.
- observability: 17 - número de contextos WebGL e pausa fora da tela; nenhum alvo de FPS foi decidido (n/a como critério).

## Impact

| Front | What changes |
|---|---|
| domain | termo existente: a seção `#notebook` era "Responsividade"; passa a ser "Alcance". O `id` `notebook` e o `aria-labelledby` não mudam |
| domain | termo existente: o parágrafo de `#contato` mudava com o local do visitante (`mapLine`); passa a ser fixo. A busca do local continua, só para o pin do globo |
| stored data | nada a migrar |
| assets | +7 arquivos `.glb` (~530 KB) em `public/models/glass/`, baixados só quando `#solucoes` se aproxima |
| testes | `e2e/notebook.spec.ts` (`HEADING`), `e2e/sections.spec.ts` (título e linhas do contato, 146–205), `e2e/cards.spec.ts` (`'#workflow ol > li'` deixa de ser card de vidro; `'#solucoes li'` continua), `e2e/offscreen.spec.ts` (canvas novo), `e2e/hero.spec.ts` (fim de `bg-black` e da faixa `h-1/4`), `e2e/reduced-motion.spec.ts` (giro e pulso) |
| hero | `overflow-clip` da seção e o gradiente `h-1/4` de saída são substituídos pela faixa de dissolução; o shader não pode re-enquadrar o buraco negro por o canvas ficar mais alto (6) |
| ponteiro | as regras `cursor: default`/`cursor: pointer` de `app/globals.css` (task cosmos, 1–2) passam a valer só sem o cursor 3D; com ele, a affordance de controle é 24. Testes que movem o mouse (`e2e/page-helpers.ts`, `globe-vapor`) seguem valendo porque o canvas não captura eventos |
| componentes | `StudioEnvironment` (já usado por `notebook-scene.tsx`) passa a servir também os ícones |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| Os 6 ícones de vidro e o cursor compartilham um único `<Canvas>` via drei `<View>` - padrão novo no repositório | 1 canvas `position: fixed; inset: 0; pointer-events: none` no topo da pilha, montado no layout da página, `View.Port` dentro dele, um `<View>` em cada `li` de `#solucoes` e um para o cursor | Um `<Canvas>` por card e outro para o cursor: 7 contextos WebGL a mais (10 na página), cada um recompilando o shader de transmissão; navegadores descartam os contextos mais antigos acima de ~16, o que derrubaria a hero ou o globo |
| O cursor 3D é renderizado ao vivo, não uma imagem | `View` do cursor posicionado em `clientX/clientY` a cada quadro | `cursor: url(cursor.png)` com o vidro pré-renderizado: zero custo e zero atraso, mas estático (sem inclinação nem refração mudando) e limitado a 32×32 px em parte dos navegadores |

## Sources

- Pedido do usuário nesta sessão (conversa, sem endereço). Linhas que decidem, literais:
  - "A hero parece um bloco, não tem uma transição suave para o resto do site, a distorção do
    buraco negro some, assim como o background do site, está bem definido essa separação, gostaria
    que fosse suave." → 1–6
  - "eram icones 3D de vidro, podiamos usar eles substituindo os icones de cada card da seção
    \"Soluções\"" → 12–17
  - "A seção responsividade parece um bloco também, a transição não está suave." → 7–9
  - "podemos puxar o copy para um lado \"Atinja todos seus clientes\" ou \"Vá onde o concorrente não
    foi\" algo assim... Remetendo a APPs, Sites, LPs, sistemas, ERPs, CRMs, web apps" → 10–11,
    redação `user delegated` ("algo assim")
  - "A seção de Workflow deve ser uma timeline contendo cada node de trabalho, e não cards de cada
    etapa." → 18–19
  - "\"Trago o horizonte de possibilidades, até você\", \"Você viu onde podemos chegar. O mapa aponta
    nosso ponto de partida.\" Logo a baixo: \"A escolha é sua...\" Ai um botão pulsante \"Vamos
    conversar\"" → 20–21
- Pedido do usuário, segunda mensagem: "será que da pra usar o elemento 3D cursor como cursor do
  usuário enquanto estiver na LP? Se sim, pode adicionar isso ao plano." → 22–28
- Commit `a7cf52c` - onde os modelos e o material de vidro foram removidos; `a7cf52c^` é a fonte
  de 12 e 14.
- `.tasks/portfolio-lp-earth-and-sky.md` - Unresolved 1 (destino do botão), herdado.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | blocks go-live | Para onde leva `Vamos conversar` (WhatsApp, e-mail, agenda, formulário)? Herdado de earth-and-sky. | O botão continua `<button>` sem destino; pulsa, mas não converte. |
| 2 | open | O copy de "Alcance" (10, 11) foi redigido a partir da direção dada. Aprovar ou ajustar? | Escrito em 10 e 11 como está. |
| 3 | open | Ícones: ordem `atom, brick, cursor, flag, note, wave` nos cards (títulos ainda lorem), 64 px, giro de 0,3 rad/s, `logo` fora, glifo SVG como fallback. | Escrito em 13, 15, 16; trocar a ordem quando os títulos dos cards existirem. |
| 4 | open | Timeline: alternada com linha central no desktop, linha à esquerda no mobile. | Escrito em 19. |
| 5 | open | O contato deixa de citar a cidade do visitante no texto (o pin no globo continua). Confirmar que é isso. | Escrito em 20 como texto fixo. |
| 6 | open | Pulso do botão: anel de 100%→125% em 2 s (o `ring-pulse` removido em `a7cf52c` era de 12 s e servia a outra coisa). | Escrito em 21. |
| 7 | open | Cursor 3D: 32 px, inclinação até 15°, 1,2× sobre controles, oculto em iframes e fora da janela, só em mouse/trackpad. | Escrito em 22–26. |
