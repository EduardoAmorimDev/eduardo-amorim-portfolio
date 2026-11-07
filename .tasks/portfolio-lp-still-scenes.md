# Landing page do portfólio — cenas em imagem: Hero e Alcance estáticos onde o 3D não aguenta

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

No celular, a landing continua com desempenho inaceitável, mesmo depois de `portfolio-lp-mobile-smooth`
(usuário, 2026-11-07: "Em dispositivos smartphones o site ainda está com uma performânce
inaceitável", "Isso tudo que descrevi é a ultima esperança de melhorar a performance"). No desktop, quem
fica um tempo na landing vê o buraco negro piorar: "ao permanecer um tempo na LP o buraco negro fica
serrilhado e desfocado, isso não pode acontecer".

O que o código mostra (fato, salvo onde marcado):

- **O serrilhado e o desfoque são intencionais.** `AdaptiveDpr` (`components/atoms/adaptive-dpr`)
  baixa o pixel ratio da Hero de 2 até 0,4 (`DPR.reduced` em `hero.tsx`) quando o FPS fica abaixo de
  90% da taxa de atualização, em degraus de 0,25. O Alcance desce até 0,75 e o globo até 0,6. No
  modo leve (`lib/performance-tier.ts`, abaixo de 58 FPS), `RenderGate` desenha cada canvas a cada 2
  quadros (`LITE_FRAME_EVERY`) e o Alcance vai direto para 0,75.
- **A Hero traça um raio por pixel com até 170 passos** (`gargantua-shader.ts`) num canvas de duas
  telas de altura (`BLEED = 1`), e faz isso em todo quadro, inclusive no celular.
- **O Alcance são três modelos 3D** (celular, tablet e `laptop.glb`, 433 KB), cada um com a página
  `/embed/projetos` viva na tela via `<Html transform>`, num palco com chão e dois spots.
- **O globo do rodapé** é o terceiro canvas pesado. O usuário diz que ele não tem problema de
  desempenho, e por isso ele fica.
- A última medição registrada (`.checks/portfolio-lp-60fps.verified.md`, achado 1) é a Hero parada a
  46,82 FPS em 390×844 com CPU 6×, já no modo leve.

Depois desta task, celulares e tablets nunca rodam a Hero nem o Alcance em 3D. A Hero é uma imagem
nítida do buraco negro, com a lente e o disco como hoje, e o Alcance é o mesmo carrossel feito de
imagens: o aparelho do visitante por último e o zoom na tela dele no fim. No desktop, as duas cenas
começam em 3D na qualidade cheia, e cada uma vira a sua imagem, para o resto da visita, se não
sustentar 50 FPS. Nenhum canvas perde resolução nem quadros por causa do aparelho. O globo continua
3D em todo dispositivo.

17 critérios em 5 fatias · 1 one-way door · 4 em aberto, nenhum bloqueia.

**Medição** (vale para os critérios de FPS; é a de `portfolio-lp-mobile-smooth`, com o limiar do
usuário):

- **Ambiente:** build de produção; Chromium de `playwright.config.ts` com as flags de GPU.
- **Celular:** 390×844, `isMobile`, `hasTouch`, DPR 3. **Desktop:** 1440×900, DPR 1.
- **Lentidão:** CPU 6× via CDP `Emulation.setCPUThrottlingRate`, ligada depois do carregamento.
- **FPS:** quadros de `requestAnimationFrame` divididos pelo tempo de uma janela de 3 s.
- **Limiar:** 50 FPS ("caso for um dispositivo que não consiga renderizar tudo a no mínimo 50FPS,
  renderize imagens").

**Toque** = `(hover: hover) and (pointer: fine)` falso (`FINE_POINTER`, `lib/media-preferences.ts`),
lido uma vez por visita (`useFinePointer`). Celulares e tablets caem aqui.

## Criteria

### Hero em imagem no celular e no tablet

1. Dado um dispositivo de toque, quando a landing carrega, então a Hero mostra uma imagem estática do
   buraco negro (sombra, lente, disco e céu na pose de hoje sob movimento reduzido: `STILL_TIME`, sem
   olhar do ponteiro, sem mergulho), a seção marca `data-scene="still"` e nenhum canvas WebGL é
   criado dentro da Hero.
2. Sempre, a imagem da Hero é desenhada com no máximo 1 px do aparelho por px da imagem
   (`object-fit: cover` × `devicePixelRatio` ≤ 1) em 390×844 DPR 3, 820×1180 DPR 2 e 1440×900 DPR 2.
   Assim ela nunca é ampliada, nem serrilhada, nem desfocada.
3. Quando a Hero rola para fora, a imagem sobe com ela e se dissolve no céu da página: opacidade 1 até
   0,6 tela rolada e 0 a partir de 0,95 (`VANISH`). Ela não cresce (Unresolved 1).
4. Quando a imagem da Hero termina de decodificar, o véu de carregamento se levanta (o mesmo evento
   `hero-ready`). Se a imagem falhar, o véu se levanta na hora e a Hero mostra o texto sobre o fundo da
   página.

### Alcance em imagens no celular e no tablet

5. Dado um dispositivo de toque, no Alcance nenhum canvas WebGL é criado. Cada aparelho é uma imagem
   com a seção de projetos na tela, a seção marca `data-scene="still"`, e os aparelhos entram e saem
   nas janelas de `SLOTS`/`slotOf` (`stages.ts`), na ordem de `deviceOrder`: o do visitante por
   último, o celular abaixo de 768 px, o tablet de 768 a 1023 px e o laptop a partir de 1024 px.
6. Quando o progresso do Alcance atravessa `STAGES.zoom` (0,80 a 0,96), a imagem do último aparelho
   cresce centrada na tela dele, até que em 0,96 a tela cubra a janela inteira. Depois disso, a
   passagem para a seção de projetos real é a de hoje (`HANDOFF`, a opacidade do palco cai até 0 e ele
   some).
7. Sempre, no Alcance em imagens, a imagem de um aparelho é desenhada com no máximo 1 px do aparelho
   por px da imagem em repouso, e no máximo 1,5 no fim do zoom.
8. Se a imagem de um aparelho falhar, o palco mantém o texto dos capítulos e os outros aparelhos, e a
   passagem para a seção real acontece do mesmo jeito.
9. Em 390×844 no celular com CPU 6×, parado na Hero e rolando o Alcance de ponta a ponta, a página
   mantém pelo menos 50 FPS.

### 3D no desktop só enquanto aguenta 50 FPS

10. Dado um ponteiro fino, a Hero e o Alcance começam em 3D (`data-scene="live"`, canvas como hoje).
11. Se, enquanto uma dessas cenas desenha, 3 das últimas 5 janelas de 1 s ficam abaixo de 50 FPS
    (sem contar o primeiro 1 s em que ela desenha; travadas de 250 ms a 2 s ficam de fora enquanto
    os quadros comuns cobrem meia janela, e contam quando a enchem, como num aparelho a 1 FPS; pausas
    acima de 2 s, como a aba oculta, nunca contam), então essa cena, e só
    ela, troca para a sua imagem num crossfade de 600 ms. O canvas dela é desmontado e ela segue como
    imagem até o fim da visita (`data-scene="still"`).
12. Dado um desktop que mantém pelo menos 50 FPS, a Hero continua 3D por 10 s parada e o Alcance
    continua 3D por uma rolagem completa, sem trocar.
13. Quando o Alcance troca para imagens no meio da rolagem, os aparelhos ficam no ponto do progresso
    atual, sem voltar ao início da sequência.

### Nenhuma qualidade relativa ao aparelho

14. Sempre, nenhum canvas muda de pixel ratio durante a visita, a não ser num resize da janela. A Hero
    fica em `[1, 2]`, o Alcance em `[1.5, 2]`, o globo em `[1.5, 2]` e o GlassStage em `[1, 2]`.
    `AdaptiveDpr` deixa de existir.
15. Sempre, cada canvas 3D na tela desenha em todo quadro (`LITE_FRAME_EVERY` deixa de existir).
16. O modo leve só desliga efeitos da página (céu parado, sem blur, ícones planos, sem Lenis, sem
    glitch) e liga abaixo de 50 FPS. Ele conta apenas as janelas em que nenhuma cena trocável estava
    em 3D (Unresolved 3).

### Globo

17. Em todo dispositivo, o globo do rodapé continua 3D (canvas `you-are-here`), com o pixel ratio
    fixo do critério 14.

## Out of scope

- Trocar o globo por imagem: o usuário pediu para mantê-lo ("este parece que não tem problemas de
  performance").
- Medir no aparelho real (Redmi Note 11 Pro): as provas são em Chromium com CPU 6×; fica com o
  usuário (Unresolved 4).
- Nova direção de arte para a Hero ou para os aparelhos: as imagens são renders das cenas de hoje.
- Os ícones de vidro das Soluções: no toque já são planos (`portfolio-lp-mobile-smooth`) e no desktop
  continuam como estão.

## Observable

| Surface                  | Decision                                  | Landing                                                                        |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------ |
| screen landing, Hero     | o que mostra no toque                     | 1, 2                                                                           |
| screen landing, Hero     | saída na rolagem                          | 3, Unresolved 1                                                                |
| screen landing, Hero     | loading (véu)                             | 4                                                                              |
| screen landing, Hero     | error (imagem não carrega)                | 4                                                                              |
| screen landing, Hero     | troca 3D → imagem no desktop              | 11                                                                             |
| screen landing, Alcance  | ordem e densidade dos aparelhos           | 5                                                                              |
| screen landing, Alcance  | gestos de cada aparelho                   | Unresolved 2                                                                   |
| screen landing, Alcance  | fim (zoom e passagem)                     | 6                                                                              |
| screen landing, Alcance  | loading / error das imagens               | 8                                                                              |
| screen landing, Alcance  | troca 3D → imagem no meio                 | 13                                                                             |
| screen landing, Contato  | globo                                     | 17                                                                             |
| screen landing           | empty / unauthorised / ação destrutiva    | n/a - página estática pública, sem dados nem ações                             |
| command `render-stills`  | saída, flags e falha no meio              | n/a - ferramenta de quem desenvolve, como `scripts/milky-way-clouds.mjs`, que falha com exceção |

## Swept

- validation: n/a - não há entrada do usuário
- failure modes: 4, 8
- idempotency and retry: n/a - nada é gravado. A troca para imagem é de mão única por visita (11), e um recarregamento começa do zero
- authorization: n/a - página pública
- concurrency and ordering: 13 (a troca no meio da rolagem preserva o progresso)
- data lifecycle: n/a - imagens estáticas em `public/`, versionadas com o código
- external-dependency failure: n/a - as imagens vêm da mesma origem, e a falha delas é o 4 e o 8
- state transitions: 11, 13 (live → still, nunca de volta)
- observability: n/a - site pessoal sem telemetria. `data-scene` e `data-performance` em `<html>` e nas seções são o que se inspeciona no aparelho

## Impact

| Front       | What changes |
| ----------- | ------------ |
| domain      | new term: `data-scene` (`live` \| `still`): o modo de uma cena trocável (Hero, Alcance), marcado na própria seção |
| domain      | new term: imagens das cenas (stills): renders da Hero e dos aparelhos do Alcance, versionados em `public/`, gerados por script a partir das cenas vivas |
| domain      | existing term: modo leve (`PerformanceTier` `lite`) ligava abaixo de 58 FPS e baixava a resolução e os quadros dos canvas. Passa a ligar abaixo de 50 e só a desligar efeitos da página. Quem depende: `render-gate.tsx`, `notebook.tsx`, `glass-stage.tsx`, `you-are-here.tsx`, `handheld.tsx`, `laptop.tsx`, `e2e/performance.spec.ts` (testes de lite e de 58 FPS) |
| domain      | existing term: `AdaptiveDpr` / `lib/adaptive-dpr.ts` (`dprAt`, `frameRateBounds`, `touchDpr`) são removidos. Quem depende: `hero.tsx`, `notebook.tsx`, `you-are-here.tsx`, `lib/adaptive-dpr.test.ts`, `bloom.tsx` (comentário) |
| domain      | existing term: no toque, as telas dos aparelhos mostravam a página `/embed/projetos` viva. Agora mostram um snapshot dela. Quem depende: `e2e/mobile.spec.ts` (páginas dos aparelhos, l. 181–527), `e2e/notebook.spec.ts` (no desktop, inalterado) |
| domain      | existing term: o evento `hero-ready` era o primeiro quadro do shader. Passa a ser também a imagem decodificada. Quem depende: `loading-veil.tsx`, `e2e/loading-veil.spec.ts` |
| stored data | nothing to migrate |

## Decided

| Decision | Shape | Alternative rejected |
| -------- | ----- | -------------------- |
| As telas dos aparelhos em imagem mostram um snapshot da seção de projetos, gerado por script e versionado. Quando os projetos mudarem, as imagens precisam ser geradas de novo, ou o Alcance mostra o conteúdo antigo até a passagem para a seção real | arquivos em `public/stills/`, gerados por `node scripts/render-stills.mjs` contra o build local (padrão de `scripts/milky-way-clouds.mjs`) | página viva (`srcdoc`) dentro da imagem do aparelho: é o custo de pintar e transformar a página a cada quadro, o mesmo que este trabalho tira do celular |

## Sources

- Mensagem do usuário, 2026-11-07 (sem endereço). Trechos que decidem:
  - "Mude a Hero para usar uma imagem do buraco negro com a distorção e tals, algo como o que vemos
    hoje, mas bem nítido, sem perder qualidade, porém estático"
  - "Na seção de alcance, troque os modelos 3D por imagens [...] deve ter o mesmo comportamento nos
    smartphones, dispositivo celular no fim e zoom in no final do scroll, mantenha o globo do fim do
    site (footer)"
  - "Isso que descrevi vale também para tablets, deve ter o mesmo comportamento."
  - "hoje temos uma qualidade relativa ao poder de processamento do dispositivo, quero que isso seja
    removido [...] inclusive para laptop, notebooks e afins, caso for um dispositivo que não consiga
    renderizar tudo a no mínimo 50FPS, renderize imagens. Pode calcular também, talvez renderizar só o
    buraco negro na HERO e o globo no footer e o resto no corpo ser imagens"
  - "ele deve 'virar' uma imagem estática quando o aparelho não conseguir lidar com ele"
- `.tasks/portfolio-lp-mobile-smooth.md`: a régua de medição no celular.
- `.tasks/portfolio-lp-device-last.md` e `.tasks/portfolio-lp-mobile-alcance.md`: a ordem do Alcance e
  o zoom no aparelho do visitante.

**A abordagem calculada** (o usuário pediu para analisar): a troca é **por cena**, não da página
inteira. Uma janela lenta conta contra as cenas trocáveis que estavam desenhando nela. No desktop
intermediário, isso dá exatamente o "só o buraco negro na HERO e o globo no footer" quando o Alcance é
o que não aguenta, sem tirar o 3D de uma cena que se sustenta. O globo não tem imagem e nunca troca.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| # | Kind | Question | Until answered |
| - | ---- | -------- | -------------- |
| 1 | open | A Hero em imagem perde o mergulho, a câmera que avança no buraco negro com a rolagem. Ampliar uma imagem desfocaria, que é o que o usuário proibiu. | Critério 3: a imagem sobe com a Hero e se dissolve, sem zoom. |
| 2 | open | Quais gestos o Alcance em imagens mantém? | Assumido: entrada e saída laterais; o celular vem do fundo (escala e opacidade); o tablet gira com duas imagens (retrato e paisagem); o laptop entra já aberto e aceso, sem abrir a tampa. |
| 3 | open | O modo leve mantém os cortes de efeitos da página (céu parado, sem blur, ícones planos, sem Lenis, sem glitch)? Eles não tiram nitidez, mas também são "qualidade relativa". | Critério 16: mantidos, agora abaixo de 50 FPS e contando só janelas sem cena 3D trocável. |
| 4 | open | A régua é o Chromium com CPU 6× nesta máquina. O aparelho do usuário (Redmi Note 11 Pro) pode dar outro resultado. | Provas em Chromium. O usuário confirma no aparelho. |
