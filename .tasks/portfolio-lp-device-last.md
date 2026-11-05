# Landing page do portfólio — Alcance termina no aparelho de quem visita

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

O Alcance sempre termina no laptop: o carrossel é celular → tablet → laptop, e a câmera mergulha na
tela do laptop até a página dele virar a seção real de Cases. Quem visita pelo celular vê o mergulho
num laptop, que não é o aparelho na mão dele. O usuário (2026-11-05): "Podemos mostrar o smartphone
por último, se está vendo pelo laptop, mantém o laptop por último, apenas porque ficaria melhor
quando o device vem de encontro ao usuário, se for um tablet, o último device viria como um tablet."

Depois desta task, o último aparelho do carrossel é o de quem visita, escolhido pela largura da
janela. O mergulho acontece na tela desse aparelho e a passagem para Cases continua sem mudança
visível. O texto de cada capítulo acompanha o seu aparelho.

12 critérios em 4 fatias · 1 one-way door · 1 em aberto, nenhum bloqueia.

## Criteria

### Aparelho de quem visita

1. A largura da janela escolhe o aparelho de quem visita: abaixo de 768 px é o celular, de 768 a
   1023 px é o tablet, e 1024 px ou mais é o laptop. Os limites são o `md` e o `lg` do Tailwind; o
   `lg` já separa o texto ao lado do texto embaixo (`isSideLayout`).
2. Quando a janela é redimensionada e cruza um dos limites, a ordem é recalculada. Cruzar um limite
   no meio do Alcance não deixa nenhum aparelho em duas posições, nem duas vezes em cena.

### Ordem do carrossel

3. O último aparelho é o de quem visita. Os outros dois mantêm a ordem de hoje entre si:
   - laptop: celular → tablet → laptop (como hoje);
   - tablet: celular → laptop → tablet;
   - celular: tablet → laptop → celular.
4. Cada aparelho mantém o seu gesto em qualquer posição: o laptop abre e liga, o celular chega de
   frente. O tablet só vira para paisagem quando não é o último. Sendo o último, ele termina na
   orientação da janela: retrato se a janela é mais alta que larga, paisagem se não.
5. Os capítulos acompanham o seu aparelho:
   - Apps fica com o celular, Sites e landing pages com o tablet, Sistemas com o laptop;
   - a numeração segue a ordem em que aparecem: no celular, "01 · Sites e landing pages",
     "02 · Sistemas", "03 · Apps";
   - os títulos e os textos dos capítulos não mudam.

### Mergulho e passagem

6. A câmera mergulha na tela do último aparelho, qualquer que seja ele, até a página daquela tela
   encher a janela.
7. A página do último aparelho é diagramada na largura e na altura da janela de quem visita, como a
   do laptop é hoje. O corpo do celular e o do tablet acompanham a proporção dessa página.
8. Nos aparelhos que não são o último, a página é diagramada na largura do próprio aparelho: celular
   390 px, tablet 820 px (retrato) ou 1180 px (paisagem), laptop 1280 px.
9. A passagem do último aparelho para a página real difere no máximo 5% dos pixels
   (`HANDOFF_MAX_SHARE`): em 1440×900, 1920×1080 e 1280×720 (laptop), 820×1180 (tablet) e 390×844
   (celular).

### O que não pode regredir

10. No touch e no modo leve, cada página continua numa única escala e num único empilhamento, e o
    canvas do Alcance não muda de tamanho (`portfolio-lp-mobile-alcance`, C2–C4).
11. Nenhum ancestral de iframe usa CSS `zoom`, e a página de cada aparelho fica dentro do vidro
    (`portfolio-lp-mobile`, C8).
12. As suítes e2e existentes passam sem afrouxar valor nenhum, exceto os testes que fixam a ordem
    antiga ou as larguras antigas das páginas. Esses passam a seguir os critérios 3, 5, 7 e 8.

## Out of scope

- Mudar os gestos de entrada dos aparelhos, as janelas de tempo do carrossel ou o texto dos
  capítulos, além do que os critérios 4 e 5 exigem.
- Escolher o aparelho pelo user agent ou pelo tipo de ponteiro: o usuário escolheu a largura da
  janela.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen landing, Alcance | ordem e densidade | 3, 4, 5 |
| screen landing, Alcance | redimensionar no meio | 2 |
| screen landing, Alcance | loading / error | existing - vidro preto até a página carregar ou se falhar (`useStaticPage`) |
| screen landing, Alcance | empty / unauthorised | n/a - página estática pública |

## Swept

- validation, idempotency, authorization, data lifecycle, external-dependency: n/a - visual, sem
  entrada nem dados.
- failure modes: existing - página que não carrega deixa o vidro preto.
- concurrency and ordering: 2 - redimensionar no meio do Alcance.
- state transitions: 2.
- observability: n/a.

## Impact

| Front | What changes |
|---|---|
| domain | new term: o aparelho de quem visita (`viewerDevice`), escolhido pela largura da janela |
| domain | existing term: `STAGES` e as poses do carrossel (`stages.ts`, `device-carousel.tsx`), escritos para celular → tablet → laptop, passam a valer por posição (1º, 2º, último) |
| domain | existing term: `ScreenView` e o mergulho saem do laptop e servem a qualquer aparelho. `notebook.spec.ts` e `mobile.spec.ts` fixam a ordem antiga e as larguras antigas das páginas |
| stored data | nothing to migrate |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| A ordem do carrossel depende do aparelho de quem visita, e o mergulho serve a qualquer aparelho | `viewerDevice(width): 'phone' \| 'tablet' \| 'laptop'`; a ordem é `[...outros na ordem de hoje, viewerDevice]`; cada aparelho expõe a sua `ScreenView` | Ordem fixa com o laptop por último (hoje): o mergulho acontece num aparelho que quem visita não tem na mão |

## Sources

- Usuário (2026-11-05), pedido acima, e as respostas: o texto segue o aparelho, a numeração segue a
  ordem de aparição; os outros dois mantêm a ordem atual; os limites são o md e o lg do Tailwind
  (768 e 1024 px), reavaliados ao redimensionar.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | open | Um tablet deitado com 1024 px ou mais conta como laptop, pela regra escolhida. | Escrito assim |
