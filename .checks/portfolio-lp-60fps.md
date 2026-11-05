# Landing page do portfólio — 60 FPS com CPU 6× mais lenta

Sources:

- `.tasks/portfolio-lp-60fps.md` - a task: 10 critérios, 3 Decided, as respostas do usuário.
- `.tasks/portfolio-lp-earth-and-sky.md`, critério 13 - o "out of step" que C9 substitui.

## Out of scope

- Céu em WebGL e telemetria - a task.
- Trocar as páginas dos aparelhos por algo mais leve fora do modo leve - o usuário permitiu
  ("algo mais leve"), mas só se for preciso para C1–C2; fica fora enquanto não for.

## Landing

Toca `lib/performance-tier.ts` (novo), `parallax-field` (grupos de piscar, linha do tempo de
rolagem), `app/globals.css` (keyframes dos brilhos e regras do modo leve), `hero`, `notebook`,
`you-are-here` e `glass-stage` (cortes do modo leve), além de `e2e/performance.spec.ts` (novo).
Reaproveita `useSyncExternalStore` como em `use-fine-pointer.ts` e o padrão de CDP de
`e2e/mobile.spec.ts`.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Nível de desempenho da visita (task, Decided 1) | `lib/performance-tier.ts`: janelas de 2 s de `requestAnimationFrame`, sem contar intervalos acima de 250 ms (compilação de shader, aba em segundo plano) e sem o primeiro 1 s depois do carregamento; média abaixo de 58 FPS em 3 das últimas 5 janelas → `lite` até o fim da visita (valores finais; ver "Mudanças durante o build"); `useLiteMode()`; `<html data-performance="lite">` | Média simples com as pausas: uma compilação de shader de 300 ms numa máquina rápida baixaria a janela para ~51 FPS e ligaria o modo leve sem motivo, o que quebra C3 |
| Parallax em linha do tempo de rolagem (task, Decided 2) | `view-timeline` no contêiner do céu; cada fatia com `animation-timeline` nela, keyframes de `translateY(var(--sky-from))` a `translateY(var(--sky-to))` e os dois valores em px escritos no `resize`; `CSS.supports('animation-timeline: view()')` escolhe esse caminho, e o JS de hoje fica como reserva | Uma variável `--sky-top` escrita a cada rolagem: ainda é JS e recálculo de estilo por evento |
| Teste de desempenho com a CPU desacelerada (task, Decided 3) | `e2e/performance.spec.ts`, CDP `Emulation.setCPUThrottlingRate` 6, a medição da task | Só a conferência manual no DevTools |
| Efeitos que o modo leve corta, visíveis no DOM para teste | `data-effects="full"` ou `"lite"` no `<Canvas>` do notebook (sombra de contato) e do globo (bloom) | Inspecionar a cena do three por dentro: o teste e2e não alcança a cena |

- Nada mais aqui é difícil de reverter

## Checks

### S1 - 60 FPS com CPU 6× · ~10k

**C1** - Em 1440×900, com CPU 6×, depois de 2 s de aquecimento, cada um dos 5 trechos mede ≥ 58 FPS
Proof: `npx playwright test e2e/performance.spec.ts -g "at 6x CPU on 1440x900"`

**C2** - O mesmo em 390×844 touch, DPR 3
Proof: `npx playwright test e2e/performance.spec.ts -g "at 6x CPU on 390x844"`

### S2 - Qualidade intacta onde há fôlego · ~3k

**C3** - Sem lentidão de CPU em 1440×900, uma visita roteirizada de 60 s da hero ao Contato termina sem `data-performance="lite"`
Proof: `npx playwright test e2e/performance.spec.ts -g "a full-speed visit keeps full quality"`

**C4** - Sem o modo leve, as suítes e2e existentes passam sem afrouxar valor nenhum (salvo os testes que C9 e C10 renomeiam)
Proof: `npx playwright test` (a suíte inteira; é o próprio objeto do claim)

### S3 - Modo leve · ~15k

**C5** - Média abaixo de 58 FPS em 3 das últimas 5 janelas de 2 s liga `lite`; ele não desliga mais na visita, mesmo com a CPU de volta ao normal; recarregar volta ao modo completo
Proof: `npx playwright test e2e/performance.spec.ts -g "lite mode switches on and stays for the visit"`
Proof: `node --test lib/performance-tier.test.ts`

**C6** - Em `lite`:
- as fatias do céu ficam sem `transform`;
- `[data-parallax-layer]` e `[data-testid="sections-glow"]` não têm animações;
- o notebook e o globo têm `data-effects="lite"`;
- os ícones de vidro não desenham com a página parada;
- cada canvas 3D fica na sua resolução mínima: hero 0,4; notebook 0,75; globo 0,6; ícones 1.

Proof: `npx playwright test e2e/performance.spec.ts -g "lite mode drops the costly effects"`

**C7** - Com movimento reduzido, a página continua como hoje
Proof: `npx playwright test e2e/reduced-motion.spec.ts`

### S4 - Céu mais barato, sempre · ~12k

**C8** - No Chromium, com `animation-timeline`, as fatias se movem a 0,2×, 0,5× e 1,3× com 0 mutações de `style` durante a rolagem
Proof: `npx playwright test e2e/performance.spec.ts -g "the sky moves on the scroll timeline"`
Proof: `npx playwright test e2e/parallax.spec.ts -g "layers move at 0.2x, 0.5x and 1.3x of the scroll"`

**C9** - As estrelas distantes de 1,5 px ou mais piscam em 4 grupos de fase:
- no máximo 4 animações `twinkle` por fatia de trás;
- os 4 grupos têm períodos e atrasos distintos;
- a opacidade vai de 1 a 0,25 e volta.

Proof: `npx playwright test e2e/backdrop.spec.ts -g "far stars twinkle in four groups"`
Proof: `npx playwright test e2e/parallax.spec.ts -g "the field is far stars, glowing near stars and blurred dust"`

**C10** - Os brilhos respiram ±0,1 em torno de 0,3 e 0,4, com períodos de 10 s e 9 s e keyframes sem `var()`
Proof: `npx playwright test e2e/backdrop.spec.ts -g "each glow breathes"`

## Swept

- validation, idempotency, authorization, external-dependency: n/a - a task.
- failure modes: C8 - sem `animation-timeline`, o JS move o céu como hoje.
- concurrency and ordering, data lifecycle, state transitions: C5.
- observability: a régua é `e2e/performance.spec.ts` (task, Unresolved 1).

## Mudanças durante o build

- **C1–C2, aquecimento:** em vez de "2 s parado no início do trecho", são 9 s rolando o trecho para
  frente e para trás. Parado no início de Soluções, mesmo com a CPU 6× mais lenta, a página fica
  acima de 55 FPS, e a lentidão só aparece ao rolar; o modo leve só pode decidir enquanto o trecho
  é rolado, como faria um visitante. O limiar de 58 FPS e a janela de 3 s não mudaram.
- **C5, gatilho:** o modo leve liga depois de 3 janelas lentas seguidas (6 s), e não de uma. Com
  uma janela só, ou com duas, uma visita em velocidade normal nesta máquina ligava o modo leve:
  modelos carregando e shaders compilando derrubavam janelas isoladas para 46–56 FPS entre janelas
  de 60. As janelas de 2 s não mudaram.
- **C5, limiar:** 58 FPS, e não 55. Com 55, Soluções no celular rodava a 55–56 FPS no modo completo:
  acima do gatilho e abaixo da meta de C2, numa faixa em que nem o modo leve ligava nem a meta era
  cumprida. Com três janelas seguidas, uma máquina que roda a 60 continua no modo completo (C3).
- **Achado de C1:** os céus dos blocos que ficam sob o palco opaco do Alcance custavam cerca de
  10 FPS (de 46 para 56 sem eles, no modo leve). Enquanto o palco cobre a janela, eles saem da página
  (`data-stage-covers`), em qualquer modo.

- **C6, cortes a mais no modo leve:** além da lista, o modo leve também desliga a rolagem suave do
  Lenis (a rolagem passa a ser a nativa), o desfoque de fundo dos cards (`backdrop-filter`) e o
  `blur` de 100 px dos brilhos, e tira das fatias do céu a camada própria (`will-change`).
  Medido: com eles ligados, o modo leve ainda ficava em 51–56 FPS nos trechos de rolagem.
- **C1–C2, medição:** vale a mediana de 3 medições de 3 s. A máquina tinha outro navegador
  desenhando WebGL na mesma GPU (um processo do Chrome a 100% de CPU por 2 h), e uma medição isolada
  variava ±5–15 FPS entre rodadas.

- **C6, notebook no celular:** no modo leve, ele fica em 1,25 e não em 0,75. Uma troca de
  resolução apaga o canvas e pisca, o que `portfolio-lp-mobile-alcance` (C3) proíbe no touch.
- **Achados finais:**
  - no modo leve, os canvas 3D desenham a cada 2 quadros (`RenderGate`);
  - as páginas dos aparelhos ficam numa escala e num empilhamento só, como no touch;
  - os títulos param os disparos de glitch;
  - os ouvintes de rolagem da hero e do notebook só leem o layout perto da seção.
- **Gatilho, valor final:** 3 janelas lentas entre as últimas 5. Exigir 3 seguidas deixava o modo
  leve desligado num trecho que só é lento enquanto rola, porque a rolagem vai e volta.

- **Não registrados antes, apontados pelo Verifier:**
  - a rolagem roteirizada passou de `scrollTo` a cada quadro para `Input.synthesizeScrollGesture`,
    que é a rolagem pelo compositor que uma roda de mouse ou um dedo produzem;
  - o céu do palco do notebook ficou parado em todos os modos (`ParallaxField still`). Ele só aparece
    com o palco já fixo, onde o deslocamento era zero.

## Handoff

Um lote só (~40k de leitura), sem handoff. A base da feature é `81f3ffd`.
