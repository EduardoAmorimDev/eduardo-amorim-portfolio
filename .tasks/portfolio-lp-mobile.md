# Landing page do portfólio — correções no celular

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

No celular, a página se desfaz em seis pontos (vídeo `evidência_iphone_6s.mp4`, 39 s, gravado no
iPhone do usuário em 2026-11-05). (1) A Via Láctea aparece esticada na vertical e serrilhada: o SVG
`preserveAspectRatio="none"` com filtro `feTurbulence` é esticado até a camada, que a 390×844 mede
390×1773 e 390×2006 px (razões de 4,55 e 5,14; em 1440×900 elas ficam entre 0,75 e 1,25). (2) Os
ícones de vidro de Soluções saem dos cards durante a rolagem e, aos 12 s, ficam na tela depois que
os cards já saíram: o canvas fixo de janela inteira redesenha a posição a cada quadro, mas a rolagem
nativa chega antes. (3) No Alcance, a página dentro do celular vaza como um retângulo branco à
direita do vidro (16–18 s) e, no laptop, o título dos cases sai cortado em "Lorer" (21–23 s).
(4) Uma faixa preta de cerca de 60 px fica sob o palco do Alcance (14–22 s), que tem `h-svh`, menor
que a janela quando a barra do navegador se recolhe. (5) Depois do Alcance, os Cases somem e só o
fundo aparece (25 s e 27 s), até o Workflow. (6) A rolagem trava: em 390×844 as camadas da frente do
parallax medem 6.884 e 8.397 px de altura com `will-change: transform`, há 3 filtros `feTurbulence`
vivos e 4 contextos WebGL. Quem paga é qualquer visitante no celular, que vê um portfólio quebrado.

Depois desta task, quem rola a landing no iPhone vê o mesmo céu do desktop sem distorção, os ícones
presos aos cards, os aparelhos do Alcance com a página dentro da tela, nenhuma faixa preta, os Cases
sempre presentes, e uma rolagem mais leve, com o visual igual à primeira vista.

17 critérios em 6 fatias · 1 one-way door · 5 em aberto, nenhum bloqueia.

**Termos.** *Touch*: quando `(hover: hover) and (pointer: fine)` (`FINE_POINTER`, `glass-cursor.tsx`)
não casa. *iPhone*: o aparelho do usuário, no WebKit do iOS (ver Unresolved 1).

## Criteria

### Céu sem distorção (problema 1)

1. Sempre, em 390×844 e em 1440×900, as nuvens da Via Láctea são desenhadas em escala uniforme:
   a razão entre as escalas vertical e horizontal da textura fica entre 0,95 e 1,05 (hoje, em
   390×844: 4,55 e 5,14).
2. Sempre, a faixa da Via Láctea atravessa a camada de 10% da altura, na borda esquerda, a 90%, na
   borda direita, com meia-largura de 9% (`MILKY_WAY`), por cima das estrelas que se aglomeram nela.
3. Sempre, a página não tem nenhum filtro `feTurbulence` (hoje são 3). As nuvens são uma imagem
   pré-renderizada, nunca ampliada mais de 2× sobre a resolução nativa em pixels de dispositivo.

### Ícones presos aos cards (problema 2)

4. Dado touch, enquanto a seção Soluções rola, inclusive na inércia de um flick, cada ícone de vidro
   fica no seu slot de 64×64 px. O canvas que desenha os ícones rola com a lista: a distância entre
   o topo do canvas e o topo da `ul` de `#solucoes` varia 0 px, e nenhum pixel de ícone aparece fora
   do card.
5. Dado touch, o canvas fixo de janela inteira (`data-testid="glass-stage"`) não existe na página.
   Dado ponteiro fino, ele existe, e os ícones e o cursor de vidro se comportam como hoje (e2e
   existentes de `reach-and-seams`).
6. Dado touch, se o modelo de um ícone não carregar, o card mostra o glifo SVG atual (reach-and-seams,
   16).
7. Dado touch, o canvas dos ícones desenha só enquanto a lista está a até 25% de tela da janela, e
   não desenha nenhum quadro fora dessa margem.

### Aparelhos inteiros no Alcance (problema 3)

8. Dado o iPhone, em todo o carrossel, a página de cada aparelho fica dentro do vidro: nenhum pixel
   da página aparece fora do retângulo arredondado da tela (hoje há um retângulo branco à direita do
   celular, aos 16–18 s).
9. Dado o iPhone, a página de cada aparelho é diagramada na largura dele: 390 px no celular, 820 px
   (retrato) e 1180 px (paisagem) no tablet, e a largura da janela no laptop. O título dos cases
   aparece inteiro, "Lorem ipsum dolor sit" (hoje "Lorer", aos 21–23 s).
10. Sempre, ao fim do mergulho, a passagem do laptop para a seção real continua com no máximo 5% de
    pixels diferentes (`HANDOFF_MAX_SHARE`, `e2e/notebook.spec.ts`; medido hoje: 2,66% em 1440×900).

### Sem tarja no Alcance (problema 4)

11. Dado o iPhone, enquanto o palco do Alcance está fixo, ele cobre a janela visível inteira, com a
    barra do navegador recolhida ou expandida: 0 px de faixa abaixo do palco (hoje cerca de 60 px
    pretos, aos 14–22 s).
12. Dado o iPhone com a barra do navegador expandida, o texto do capítulo (rótulo, título e corpo)
    continua inteiro acima da barra inferior.

### Cases presentes depois do Alcance (problema 5)

13. Dado o iPhone, ao rolar do fim do Alcance até o Workflow, devagar e com flick rápido, para baixo
    e para cima, o título e os cards dos Cases aparecem em todo quadro em que sua área está na
    janela. Nenhum quadro mostra só o fundo (hoje, aos 25 s e 27 s).

### Fluidez no celular (problema 6)

14. Sempre, em touch, nenhuma camada do parallax passa de 2 telas de altura (2 × `innerHeight`; hoje,
    em 390×844, a da frente mede 6.884 e 8.397 px). Estrelas, poeira e Via Láctea continuam cobrindo
    o bloco inteiro em toda posição de rolagem (e2e de parallax existentes).
15. Sempre, em touch, nenhum canvas desenha com pixel ratio acima de 1,5 (hoje notebook e globo
    começam em `[1.5, 2]` e desenham a 2 num iPhone de DPR 3). Os pisos adaptativos não mudam: 0,75
    no notebook, 0,6 no globo e 0,4 na hero.
16. Sempre, em touch, a página tem no máximo 4 contextos WebGL ao mesmo tempo (hero, notebook, globo
    e ícones de Soluções; hoje também são 4, com o palco fixo no lugar dos ícones).
17. Quando o usuário compara, em 390×844, a página nova com a atual lado a lado, não encontra
    diferença visual além das correções dos critérios 1–13.

## Out of scope

- Mudanças no desktop (ponteiro fino) além dos critérios 1–3, que valem em todas as larguras porque o
  componente é um só. O resto do desktop fica como está.
- Simplificar o visual no celular (parar o parallax, o brilho das estrelas ou a sombra de contato):
  o usuário escolheu "mesmo visual, mais leve".
- Suporte a iOS 15 (o iPhone 6s real): veja Unresolved 1.
- Glifo estático no lugar do vidro em touch: o usuário escolheu manter o 3D.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen landing, Soluções (touch) | loading state | existing - o glifo SVG aparece até o modelo desenhar (`GlassIcon`, `data-ready`) |
| screen landing, Soluções (touch) | error state | 6 |
| screen landing, Soluções (touch) | empty state | n/a - 6 cards fixos, nunca vazia |
| screen landing, Alcance | loading state | existing - vidro preto até a página carregar (`useStaticPage`) |
| screen landing, Alcance | error state | existing - vidro preto se a página não carregar (`useStaticPage`) |
| screen landing, Alcance | density and ordering | 9, 11, 12 |
| screen landing, céu | density and ordering | 1, 2, 14 |
| screen landing | unauthorised state | n/a - página pública |
| screen landing | destructive action confirms | n/a - nenhuma ação destrutiva |

## Swept

- validation: n/a - sem entrada do usuário.
- failure modes: 6 (modelo do ícone); existing - `useStaticPage` deixa o vidro preto se a página
  dos aparelhos falhar.
- idempotency and retry: n/a - nada é enviado nem persistido.
- authorization: n/a - página pública, sem sessão.
- concurrency and ordering: 4 - a ordem entre a rolagem nativa e o quadro do canvas é o próprio
  problema 2; 11 - a barra do navegador muda a janela no meio da rolagem.
- data lifecycle: n/a - nada é guardado.
- external-dependency failure: n/a - o WebGL ausente afeta o canvas dos ícones como já afeta o palco
  fixo de hoje; esta task não muda esse caminho.
- state transitions: Unresolved 5 - ponteiro que muda de tipo com a página aberta.
- observability: Unresolved 4 - meta de quadros por segundo.

## Impact

| Front | What changes |
|---|---|
| domain | existing term: `GlassStage` era "o único canvas de todo vidro da página" (reach-and-seams, Decided 1); passa a existir só com ponteiro fino. Quem depende dele: `app/page.tsx`, `GlassIcon` (`<View>`), `GlassCursor`, e2e `reach-and-seams`, `a11y` e `reduced-motion` (todos em Chromium desktop, ponteiro fino) |
| domain | existing term: `MILKY_WAY` (percentuais da faixa) segue valendo para as estrelas (`night-sky.test.ts`) e passa a posicionar uma imagem em vez do gradiente com máscara de ruído |
| domain | existing term: `layerHeight` (`lib/parallax.ts`, `parallax.test.ts`) fixa a camada em `speed × bloco + 100svh`; em touch, passa a ter teto de 2 telas |
| domain | existing term: altura do palco do Alcance (`h-svh`) é a mesma tela que `-bottom-[100svh]` e `-mt-[100svh]` (`app/page.tsx`) e o `size.height` do mergulho do laptop pressupõem; mudar uma sem as outras desalinha a passagem (critério 10) |
| stored data | nothing to migrate |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| Em touch, os ícones de vidro são desenhados num `<Canvas>` dentro de `#solucoes`, que rola com a página; com ponteiro fino, o `GlassStage` fixo continua desenhando ícones e cursor. Reverte, só para touch, o Decided 1 de reach-and-seams | Um canvas `position: absolute` sobre a `ul` de `#solucoes`, montado só em touch, com `View.Port`; cada `GlassIcon` usa o canvas certo para o ponteiro; o `GlassStage` só monta com `FINE_POINTER` | Canvas fixo sincronizado a cada quadro: a rolagem nativa do iOS chega antes do quadro, e os ícones ficam para trás (vídeo, 5–12 s). Glifo estático em touch: perde o vidro no celular, recusado pelo usuário |

## Sources

- Vídeo `/home/joao-eduardo/Downloads/evidência_iphone_6s.mp4` (fora do repositório; 384×832,
  39 s): quadros de 1 em 1 s e de 0,5 em 0,5 s entre 4–12 s e 13–24 s. É a evidência dos problemas
  1–5; os tempos citados vêm dele.
- Medição em Chromium a 390×844 (isMobile, DPR 3) e a 1440×900, contra o servidor de dev, em
  2026-11-05: tamanhos dos SVGs da Via Láctea e das camadas de parallax, 4 canvas, citados acima.
- Conversa com o usuário (2026-11-05), que lista os problemas: "O background fica esticado
  verticalmente, a poeira cosmica do fundo parece esticada e serrilhada"; "Os ícones da seção
  'soluções' parecem não estar fixos dentro dos cards"; "o conteúdo dos aparelhos está
  completamente quebrado, estão vazando das telas, deformados"; "aparece uma tarja preta na parte de
  baixo da seção [...] a tarja preta não deve existir"; "Ao sair da seção alcance, parece que o
  conteúdo do site buga e some, só volta no workflow"; "O site, de modo geral parece um pouco travado
  no celular, corrija isso também".
- Respostas do usuário (2026-11-05): ícones em touch, "Canvas rola com cards"; performance, "Mesmo
  visual, mais leve" (Via Láctea como imagem pré-renderizada, camadas de parallax com teto de altura,
  DPR máximo menor em touch).
- `.tasks/portfolio-lp-reach-and-seams.md`, Decided 1: o canvas único que esta task restringe ao
  ponteiro fino.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | open | Qual é o aparelho-alvo? O vídeo tem proporção 19,5:9 e o indicador de gravação de um iPhone com notch, não a tela 16:9 do 6s. O 6s vai até o iOS 15.8, que não entende `rgb(from …)` (Safari 16.4+), usado nas estrelas e no `glass-card`. | Escrito para o WebKit do iOS 16.4 ou mais novo; o iOS 15 fica fora |
| 2 | open | Como provar 8, 9, 11, 12 e 13, que dependem do WebKit do iOS (barra do navegador, iframe), se o Playwright do repositório só tem Chromium? | Provas automáticas em Chromium com emulação móvel (390×844, `isMobile`, `hasTouch`) onde o problema se reproduz; a confirmação final é do usuário no iPhone |
| 3 | open | Os tetos de touch, 2 telas por camada de parallax (14) e pixel ratio 1,5 (15), foram propostos por mim, não medidos no aparelho. | Escritos com esses valores; o usuário ajusta se o iPhone continuar travando ou ficar borrado |
| 4 | open | Qual é a meta de fluidez (por exemplo, quadros por segundo durante a rolagem no iPhone)? Uma meta de distribuição não é critério de uma execução só. | Sem número; o usuário julga a fluidez no aparelho junto com o critério 17 |
| 5 | open | Se o tipo de ponteiro mudar com a página aberta (iPad que conecta um trackpad), os ícones trocam de canvas? | Tipo de ponteiro lido no carregamento; não troca até recarregar |
