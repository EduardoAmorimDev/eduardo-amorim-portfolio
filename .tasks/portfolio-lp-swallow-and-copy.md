# O buraco negro engole, a costura some, a tela do laptop enche e o copy final

> Build this with **tlc-implement**.
> Every criterion below becomes a check with a proof, referenced by its number. Nothing under
> `Unresolved` gets settled while building.

## Intent

Ao rolar para fora da hero, o buraco negro só se aproxima um pouco (a câmera vai de 26 a 19
unidades, `gargantua-shader.ts:147`) e sobe junto com a seção, saindo pelo topo da tela; medido
a 1440×900, a maior faixa contínua de pixels escuros (luminância ≤ 12) ocupa 44% da largura com
a hero rolada 25%, 45% com 50% e 38% com 75%, e boa parte disso é céu, não sombra. A saída não tem impacto. Entre `#solucoes` e o palco
de Alcance (`#notebook`) ainda se vê uma linha horizontal na borda do palco: a média de
luminância por linha salta de 17,3 para 18,4 de uma linha para a outra (screenshot com o topo do
palco a 50% da viewport), um degrau pequeno, mas reto e da largura inteira, que o olho pega. O
critério antigo (diferença ≤ 3 entre médias de 8 linhas) passa e não captura isso. A página
dentro do laptop é montada no tamanho da janela (1440×900, proporção 1,6) e encaixada no vidro
(1280×879, proporção ≈ 1,457) por "contain", o que deixa ≈ 40 px de fundo `bg-ink` em cima e
embaixo do vidro: tarjas pretas. O fechamento (`#contato`) e o "Sobre" ainda têm copy provisório
(o segundo é lorem ipsum). O source não traz métrica de impacto; o custo é a percepção de
acabamento de um portfólio que vende acabamento.

Quando isto entrar: ao sair da hero, o buraco negro avança em direção ao visitante e sobe ao
mesmo tempo, saindo por cima da tela enquanto a sombra quase a toma, e então se dissolve no céu
da seção seguinte; Soluções e Alcance são um só céu,
sem linha; o vidro do laptop é tomado pela página de ponta a ponta; o contato fecha com o copy
novo; e o "Sobre" apresenta o Eduardo.

17 critérios em 5 fatias · 0 one-way doors · 6 open, dos quais 0 block

## Criteria

Medições usadas abaixo, todas em screenshot da viewport a 1440×900 com o tema padrão:

- **faixa escura**: em cada linha de pixels, a maior sequência contínua de pixels com luminância
  (média de R, G, B, 0–255) ≤ 12 (o interior da sombra tem névoa e grão entre 5 e 12); o valor da medição é a maior dessas sequências na viewport,
  como fração da largura.
- **degrau**: para cada linha `y` a até 40 px da borda superior do palco, |média de luminância
  (Rec. 601) das linhas `y−4..y−1` − média das linhas `y..y+3`|; o valor da medição é o maior
  desses degraus. Hoje: 1,1 com a borda a 50% da viewport e 1,9 com ela a 25%.
- "hero rolada `f`" = `scrollY = f × innerHeight`.

### O buraco negro quase engole o visitante

1. Quando a hero está rolada 0,25, a faixa escura é ≥ 0,55 da largura (hoje 0,44), na metade
   superior da viewport, e o pixel central dela está no terço central da largura.
2. Enquanto a hero sai, o buraco negro sobe ao mesmo tempo que cresce, como quem sai por cima da
   tela: a linha da faixa escura mais larga com a hero rolada 0,25 fica acima da linha com ela
   rolada 0,15, e com a hero rolada 0,75 a faixa escura é ≤ 0,10 da largura.
3. Sempre, entre a hero rolada 0,25 e rolada 1,5, a faixa escura é < 0,90 da largura: a sombra
   nunca cobre a tela inteira ("quase"). Em repouso o céu ao lado do buraco negro é tão escuro
   quanto a sombra, e o quadro de repouso é o do critério 5.
4. Quando a hero está rolada 1,0, a faixa escura é ≤ 0,10 da largura (hoje 0,26): o buraco
   negro já se dissolveu no céu.
5. Sempre, no primeiro ecrã (scroll 0), a posição, o tamanho e o enquadramento do buraco negro são
   os de hoje: as asserções de `e2e/hero.spec.ts` passam sem alteração de valores.
6. Enquanto `prefers-reduced-motion: reduce` vale, rolar não aproxima o buraco negro (o quadro
   parado de hoje, `uPush = 0`).
7. Sempre, o texto de `#prova-social` fica acima do canvas da hero e recebe cliques (critério 5 de
   reach-and-seams preservado).

### Soluções e Alcance são um só céu

8. Quando o topo de `#notebook` está a 75%, 50% e 25% da altura da viewport, rolando a partir de
   `#solucoes`, o degrau é ≤ 0,5.
9. Enquanto o palco do notebook está fixo, ele mostra estrelas e os dois brilhos `sections-glow`
   (`primary` e `steel`) atrás dos aparelhos (critério 8 de reach-and-seams preservado).
10. Sempre, `#cases`, puxado para baixo do último ecrã do notebook, não aparece através do palco
    antes do hand-off (`e2e/notebook.spec.ts` passa sem alteração de valores).

### O vidro do laptop é tomado pela página

11. Quando o laptop está aberto e ligado, antes do mergulho, em janelas de proporção ≥ 1,457
    (testado em 1440×900, 1920×1080 e 1280×720), a página embutida cobre 100% do vidro: o
    retângulo renderizado do iframe contém o retângulo do backing (`bg-ink`) do vidro, sem faixa
    de backing visível em cima, embaixo ou nos lados.
12. Quando a câmera termina o mergulho, o hand-off continua invisível: o teste
    `the stage hands over to the real page with no visible change` de `e2e/notebook.spec.ts` passa
    com o mesmo `HANDOFF_MAX_SHARE` de hoje, nas três janelas de 11.

### O contato fecha com o copy novo

13. Sempre, o `<h2>` de `#contato` diz `Posso trazer um horizonte de possibilidades até você`.
14. Sempre, o parágrafo logo abaixo dele diz
    `Você viu onde podemos chegar. Já sabemos nosso ponto de partida.`; o restante da seção
    (`A escolha é sua...`, o botão `Vamos conversar` e seu pulso, o globo) não muda.

### O "Sobre" apresenta o Eduardo

15. Sempre, `#sobre` tem o rótulo `Sobre` e o `<h2>` `A cara por trás do resultado`.
16. Sempre, o texto de `#sobre` são estes quatro parágrafos, nesta ordem, literalmente:
    1. `Meu nome é Eduardo Amorim. Sou desenvolvedor front-end e construo aplicações web modernas com Next.js, React e TypeScript, com Tailwind, Material UI e as bibliotecas que encurtam o caminho entre a ideia e a tela. Testo com Cypress para que o que funciona hoje continue funcionando amanhã, e transito pelo back-end com Java, Spring e Quarkus. Minha obsessão é performance e experiência do usuário.`
    2. `Na Syonet, tive papel central na modernização do front-end: um sistema legado em AngularJS virou uma plataforma em React, moderna e de alta performance. Reestruturei componentes, melhorei a arquitetura e otimizei o desempenho para um sistema mais eficiente e escalável. O resultado foi uma experiência melhor, mais engajamento e impacto direto na receita da empresa.`
    3. `Além do código, atuo em mentorias e em decisões de arquitetura. Meu caminho é a liderança técnica: unir profundidade em desenvolvimento a visão estratégica para impulsionar inovação e crescimento.`
    4. `Fora do trabalho, sigo explorando novas tecnologias, aprendendo sempre e investindo com estratégia. No tempo livre, equilibro corpo e mente entre vôlei, musculação e xadrez.`
17. Sempre, o bloco do retrato de `#sobre` continua o de hoje (placeholder com
    `aria-label="Foto de exemplo"`).

## Out of scope

- Foto real no "Sobre" - não foi fornecida; o placeholder fica (Unresolved 5).
- Destino do botão `Vamos conversar` - herdado em aberto de earth-and-sky; o usuário disse que o
  restante do footer está perfeito.
- Copy de Soluções, Prova social e hero (ainda lorem) - não pedido.
- Fixar (pin) a hero por mais tempo de rolagem - muda o comprimento da página; os critérios 1–4
  são atingíveis com a rolagem atual (decisão de implementação, revisada no diff).

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| tela `#hero` (saída) | quanto a sombra cresce e onde fica | 1, 2, 3 |
| tela `#hero` (saída) | como termina | 4 |
| tela `#hero` | estado inicial | 5 |
| tela `#hero` | movimento reduzido | 6 |
| tela `#hero` | clique no conteúdo seguinte | 7 |
| tela `#hero` | vazio, carregando, erro, não autorizado | existing - canvas decorativo `aria-hidden`; sem WebGL a seção fica no fundo `--color-ink` (comportamento atual) |
| tela `#solucoes` → `#notebook` | transição | 8, 9, 10 |
| tela `#notebook` (laptop) | página no vidro | 11 |
| tela `#notebook` (laptop) | hand-off ao fim do mergulho | 12 |
| tela `#notebook` (laptop) | página ainda não carregada | existing - backing `bg-ink` e iframe em opacidade 0 até `POWER_ON` |
| tela `#notebook` (laptop) | janelas de proporção < 1,457 | Unresolved 2 |
| copy `#contato` | estrutura, tom, próximo passo do leitor | 13, 14 (o próximo passo continua `Vamos conversar`) |
| copy `#sobre` | estrutura, tom, profundidade | 15, 16 |
| copy `#sobre` | próximo passo do leitor | n/a - seção de apresentação; o convite é do `#contato` |
| copy `#sobre` | retrato | 17, Unresolved 5 |

## Swept

- validation: n/a - não há entrada do usuário
- failure modes: existing - sem WebGL as cenas não desenham e o fundo é `--color-ink`; sem a página embutida o vidro fica no backing (Observable)
- idempotency and retry: n/a - nada é enviado ou gravado
- authorization: n/a - página pública estática
- concurrency and ordering: n/a - a única ordem é a da rolagem, coberta por 1–4 e 8
- data lifecycle: n/a - nada é persistido
- external-dependency failure: n/a - `/embed/projetos` é servido pela própria aplicação (existing)
- state transitions: n/a - nenhum ciclo de vida muda
- observability: n/a - site estático sem telemetria; custo de GPU segue nos gates `AdaptiveDpr` e `VisibleScissor` existentes

## Impact

| Front | What changes |
|---|---|
| domain | nada - nenhum termo novo ou com novo sentido |
| stored data | nothing to migrate |
| testes | `e2e/sections.spec.ts:135-136` afirma o copy antigo do contato e muda junto com 13 e 14; o critério 7 de reach-and-seams (diferença ≤ 3) é substituído pelo 8 daqui, mais estrito |
| hand-off do notebook | 11 muda a caixa da página no vidro e, portanto, o alvo do mergulho (`pageHeight` em `laptop.tsx`, lido por `device-carousel.tsx:174`); 12 é o que protege o hand-off |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| None - copy, shader e layout do palco são reversíveis no próximo commit; nenhuma dependência, schema ou contrato externo | | |

## Sources

- Pedido do usuário nesta conversa (sem endereço; trechos decisivos citados):
  - "Ao scrollar para sair da Hero, o buraco negro deve vir mais para tela do que já vem hoje, quase "engolindo" o usuário." → 1–7
  - "O buraco negro, mesmo vindo em direção ao usuário deve ir para cima [...] como se fosse sair por cima da tela, ao mesmo tempo que o zoom é feito nele" → 1, 2
  - "ainda consigo ver a diferença entre a seção soluções e a seção de alcance que contém os devices." → 8–10
  - "o conteúdo do laptop está com tarjas pretas, encima e embaixo, isso não pode acontecer." → 11, 12
  - "O copy do footer pode ser "Posso trazer um horizonte de possibilidades até você." "Você viu onde podemos chegar. Já sabemos nosso ponto de partida.", o restante do footer está perfeito!" → 13, 14
  - "use essa referência para montar um copy me apresentando, algo como "A cara por trás do resultado"" + bio de referência colada pelo usuário (front-end, Next.js/React/TypeScript, Tailwind, Material UI, Cypress, Java/Spring/Quarkus; modernização AngularJS → React na Syonet; mentoria e arquitetura; liderança técnica; vôlei, musculação e xadrez) → 15, 16
  - "Faça tudo na main, commit e push também, isso ainda não está em prod." → entrega
- `.tasks/portfolio-lp-reach-and-seams.md` - critérios 5, 7 e 8 de lá, preservados (7, 9) ou substituídos (8) aqui.
- Medições de hoje: screenshots a 1440×900 do servidor de dev em `bf72955`.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | open | Intensidade do "engolir": sombra ≥ 55% da largura com a hero rolada 25%, nunca 90%; o buraco negro vai para a coluna central, sobe com a rolagem (pedido do usuário: "deve ir para cima, como se fosse sair por cima da tela, ao mesmo tempo que o zoom é feito nele") e a luz do disco escurece até 12% ao avançar, para o copy de `#prova-social` continuar legível sobre o disco. | Escrito em 1–4; ajustar os números na revisão visual. |
| 2 | open | Em janelas mais estreitas que o vidro (proporção < 1,457: tablet 4:3, celular em pé), cobrir o vidro quebraria o hand-off (a página teria de ser montada em outra largura). Padrão: nessas janelas fica como hoje (faixas laterais). | 11 vale só para proporção ≥ 1,457. |
| 3 | open | `<h2>` do contato sem ponto final, como todos os títulos da página; o parágrafo mantém o ponto. | Escrito em 13 sem ponto. |
| 4 | open | Copy do "Sobre" redigido a partir da bio: "desempenhei um papel fundamental" virou "tive papel central" (não "liderei", para não exagerar); "independência financeira" virou "investindo com estratégia". Aprovar ou ajustar. | Escrito em 16 como está. |
| 5 | open | Foto real do Eduardo para o "Sobre". | 17 mantém o placeholder. |
| 6 | open | A memória do projeto registra que o usuário pediu "sem testes" no trabalho visual; o princípio I da constituição exige teste. Padrão: provas por e2e (medições em screenshot e asserções de copy), sem rodadas longas de verificação. | Provas de 1–17 em e2e. |
