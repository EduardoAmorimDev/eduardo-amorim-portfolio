# Landing page do portfólio — 60 FPS com CPU 6× mais lenta

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

Com a CPU 6× mais lenta (DevTools, aba Performance), a landing roda bem abaixo de 60 FPS em todas as
seções. Quem visita num aparelho fraco vê a página travar justamente onde ela mais quer impressionar.
Valores medidos em 2026-11-05, build de produção e Chromium do Playwright com GPU (ANGLE):

| Trecho | 1440×900, hoje | 390×844, hoje | Antes de `portfolio-lp-mobile` (`f778ae5`), 1440 / 390 |
|---|---|---|---|
| hero parada | 32–48 | 41 | 41 / 60 |
| rolagem até Soluções | 17–19 | 21 | 17 / 21 |
| rolagem do Alcance | 13–20 | 26 | 18 / 21 |
| rolagem de Cases a Workflow | 33–41 | 42 | 44 / 38 |
| Contato parado | 35–36 | 45 | 42 / 35 |

A queda não veio das duas rodadas anteriores: os números de antes e de agora são parecidos, com uma
oscilação de cerca de ±8 FPS entre execuções. A exceção é a hero no celular, que caiu de 60 para 41.
O thread principal fica cerca de 98% ocupado. Em 1440×900, desligar uma parte por vez mostra onde
está o custo:

- **Céu (parallax e brilhos):** sem ele, Cases vai de 33 para 60, Soluções de 17 para 51 e Contato
  de 35 para 56.
- **Globo:** sem ele, Contato vai de 35 para 57.
- **Canvas do Alcance:** sem ele, o Alcance vai de 13 para 22; sem o céu do palco, para 18.
- **Canvas da hero:** sem ele, a hero parada vai de 32 para 43.

Parada na hero, 22% do tempo vai em `getBoundingClientRect` lido a cada quadro (`gargantua.tsx`).
Isso força o recálculo de um estilo que a animação `glow-breathe` suja a cada quadro, porque ela usa
`var()` nos keyframes. O céu tem 192 estrelas piscando, cada uma numa camada própria, mais 54 fatias
movidas por JS a cada evento de rolagem.

Depois desta task, num aparelho que sustenta 60 FPS a página fica exatamente como está. Num aparelho
que não sustenta, ou com a CPU 6× mais lenta, ela passa a um modo leve e roda a 60 FPS.

10 critérios em 4 fatias · 3 one-way doors · 1 em aberto, nenhum bloqueia.

**Medição** (vale para todos os critérios de FPS):
- **Ambiente:** build de produção; o Chromium de `playwright.config.ts`, com as mesmas flags de GPU.
- **Lentidão:** CPU 6× mais lenta via CDP `Emulation.setCPUThrottlingRate`, ligada depois do
  carregamento.
- **Aquecimento:** 2 s parado no início do trecho, para o modo leve poder decidir.
- **Janela medida:** 3 s, parado ou com rolagem roteirizada (`scrollTo` a cada quadro, de ponta a
  ponta do trecho).
- **FPS:** quadros de `requestAnimationFrame` divididos pelo tempo decorrido.
- **Limiar de 58:** o `requestAnimationFrame` está limitado a 60 e oscila, então uma média de 60 não
  se sustenta; 58 é o limiar por isso.

## Criteria

### 60 FPS com CPU 6×

1. Dada a CPU 6× mais lenta em 1440×900, cada trecho mede pelo menos 58 FPS:
   - hero parada;
   - rolagem do topo de Prova social até 600 px depois do topo de Soluções;
   - rolagem do Alcance, do progresso 0 ao 1;
   - rolagem de uma tela abaixo do topo de Cases até 600 px depois do topo de Workflow;
   - Contato parado.
2. Dada a CPU 6× mais lenta em 390×844 (`isMobile`, `hasTouch`, DPR 3), os mesmos cinco trechos
   medem pelo menos 58 FPS.

### Qualidade intacta onde há fôlego

3. Sem lentidão de CPU em 1440×900, uma visita roteirizada da hero ao Contato (60 s) termina sem o
   modo leve: o `<html>` não tem `data-performance="lite"`.
4. Sem o modo leve, as suítes e2e existentes passam sem afrouxar nenhum valor, salvo a troca do
   critério 9. Isso cobre o céu a 0,2×, 0,5× e 1,3×, os brilhos que derivam e respiram, a sombra do
   notebook, o bloom do globo e a resolução adaptável.

### Modo leve

5. Quando a média dos últimos 2 s fica abaixo de 55 FPS, o modo leve liga (`<html
   data-performance="lite">`). Ele não desliga mais naquela visita; recarregar a página volta ao modo
   completo.
6. Enquanto o modo leve está ligado:
   - as camadas do céu rolam com o conteúdo, sem parallax;
   - nem estrelas nem brilhos animam (`getAnimations()` vazio em `[data-parallax-layer]` e
     `[data-testid="sections-glow"]`);
   - o notebook desenha sem `ContactShadows`;
   - o globo desenha sem bloom;
   - os ícones de vidro não giram;
   - cada canvas 3D desenha na sua resolução mínima: hero 0,4; notebook 0,75; globo 0,6; ícones 1.
7. Com movimento reduzido, a página continua como hoje (e2e `reduced-motion`), com ou sem o modo
   leve.

### Céu mais barato, sempre

8. Num navegador com `animation-timeline`, as fatias do céu se movem a 0,2×, 0,5× e 1,3× da
   rolagem sem nenhuma escrita de `transform` por JS durante a rolagem (0 mutações de `style` nas
   fatias). Sem suporte, o JS as move como hoje.
9. As estrelas distantes de 1,5 px ou mais piscam em 4 grupos de fase, cada grupo com seu período e
   seu atraso, e não cada uma por si. Há no máximo 4 animações `twinkle` por fatia da camada de trás.
   A amplitude continua a de hoje: o brilho próprio cai a um quarto e volta. Isso substitui o "out of
   step" de earth-and-sky 13.
10. Os brilhos respiram com a mesma amplitude de hoje (±0,1 em torno de 0,3 e 0,4) e os mesmos
    períodos (10 s e 9 s), com keyframes de números literais, sem `var()`.

## Out of scope

- Céu em WebGL: o usuário escolheu o DOM otimizado.
- Mudanças visuais fora do modo leve, além dos critérios 9 e 10.
- Telemetria de FPS em produção: o repositório não tem nenhuma.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen landing | modo leve: o que muda e o que fica | 6, 7 |
| screen landing | quando o modo leve liga e se volta | 5 |
| screen landing | empty / error / unauthorised | n/a - página estática pública |

## Swept

- validation: n/a - sem entrada.
- failure modes: 8 - sem `animation-timeline`, o JS move o céu como hoje.
- idempotency and retry: n/a.
- authorization: n/a - página pública.
- concurrency and ordering: 5 - o modo leve só vai num sentido, então quedas e voltas da taxa de
  quadros não o fazem oscilar.
- data lifecycle: 5 - vale para a visita; nada é guardado.
- external-dependency failure: n/a.
- state transitions: 5 - completo → leve, nunca o contrário na mesma visita.
- observability: Unresolved 2 - a medição é a do `e2e/performance.spec.ts` nesta máquina; não há
  telemetria.

## Impact

| Front | What changes |
|---|---|
| domain | new term: `lite` (modo leve), o estado da visita em que a página corta o que mais custa; vive em `lib/performance-tier.ts` e em `<html data-performance>` |
| domain | existing term: earth-and-sky 13, "far stars twinkle out of step", passa a ser "em 4 grupos de fase". Quem depende: e2e `backdrop.spec.ts` ("far stars twinkle out of step") e `parallax.spec.ts` (a animação `twinkle` por estrela) |
| domain | existing term: animação `glow-breathe`, hoje um keyframe com `var(--glow-opacity)`, passa a ser um keyframe por brilho. Quem depende: e2e `backdrop.spec.ts`, que procura a animação pelo nome |
| domain | existing term: `AdaptiveDpr` passa a respeitar o modo leve (fica no mínimo) |
| stored data | nothing to migrate |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| Um nível de desempenho global para a visita, decidido medindo os quadros | `lib/performance-tier.ts`: um laço de `requestAnimationFrame` mede a média em janelas de 2 s; abaixo de 55 FPS liga `lite` para sempre na visita; `useLiteMode()` (`useSyncExternalStore`) para os componentes; `<html data-performance="lite">` para o CSS | `PerformanceMonitor` do drei em cada canvas: só mede enquanto aquele canvas desenha e não alcança o céu nem o CSS. Decidir só no carregamento: não perceberia a CPU desacelerada ligada depois, no DevTools |
| Parallax por CSS scroll-driven animations onde houver suporte, JS como reserva | cada fatia com `animation-timeline` ligada à rolagem do bloco e keyframes de deslocamento; `CSS.supports('animation-timeline: view()')` escolhe o caminho | Só JS (hoje): 54 escritas de `transform` por evento de rolagem no thread principal |
| Teste de desempenho no e2e, com a CPU desacelerada por CDP | `e2e/performance.spec.ts`, com a medição descrita em Intent | Só a conferência manual no DevTools: não fica no repositório e não pega regressão |

## Sources

- Usuário (2026-11-05): "Preciso que todo site rode a 60FPS no mínimo mesmo com o 6x slowndown
  ativo. Não quero perder qualidade, Otimize o que der para otimizar. Se preciso for, faça
  workarounds ou downgrades de qualidade, se o custo benfício for ótimo."
- Respostas do usuário (2026-11-05): céu "DOM otimizado"; "Sim, modo leve automático".
- Medições por sonda (2026-11-05): FPS por trecho em `next start` do estado atual e de `f778ae5`;
  perfil e timeline do thread principal; variantes com partes desligadas por CSS.
- `.tasks/portfolio-lp-earth-and-sky.md`, critério 13: o "out of step" que o critério 9 substitui.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | open | A medição é do Chromium headless desta máquina; o DevTools da sua máquina pode dar números diferentes. | `e2e/performance.spec.ts` é a régua (usuário: "vemos depois") |

Respondidos pelo usuário (2026-11-05):

- Conteúdo dos aparelhos: "Podemos fazer com que o conteúdo de dentro dos devices seja algo mais
  leve." O builder pode trocar as páginas ao vivo por uma representação mais leve, desde que o Alcance
  chegue a 58 FPS (critérios 1–2) e a passagem do laptop para a página real continue sem mudança
  visível (`HANDOFF_MAX_SHARE`, 5%).
- Limiar do modo leve (55 FPS em janela de 2 s): "Certo".
