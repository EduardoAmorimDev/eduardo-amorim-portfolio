# Landing page — a Terra sem rótulo, uma luz só e um céu de verdade

Sources:

- `.tasks/portfolio-lp-earth-and-sky.md` - os 15 critérios, o copy A e a Via Láctea tênue
  (escolhas do usuário, 2026-11-04)
- `.tasks/portfolio-lp-you-are-here.md` - critérios 4, 5, 7 e 9 substituídos; o resto vale

Profile: `light` (o repositório não declara outro). Handoff: um lote só (ver abaixo).

## Out of scope

- O destino do botão e o aviso de privacidade - Unresolved 1 da tarefa
- O céu do hero - é o shader do Gargantua

## Landing

Toca `components/organisms/you-are-here` (cena, vapor, seção), `components/organisms/parallax-field`
e `app/globals.css`. Reaproveita `RenderGate`, `Bloom`, os tokens de cor e os helpers de pixel de
`e2e/page-helpers.ts`.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Token novo de cor para estrelas quentes | `--color-dawn: #ffe6c4` em `@theme static` | hex solto no componente: fere o princípio IV (tokens) |
| O brilho de cada estrela é o alfa da sua cor | `style` define `--star-peak`; a classe é `bg-[rgb(from_var(--color-<tom>)_r_g_b/var(--star-peak))]`; o `twinkle` continua de `opacity: 1` a `0.25` | `opacity` inline: a animação a sobrescreve, e toda estrela piscaria até 1 |
| (substituída no build) `var(--star-peak)` dentro do `@keyframes twinkle` | - | o Chrome tira do compositor uma animação com `var()` nos keyframes: 480 estrelas recalculadas na thread principal a cada quadro, e três testes de glitch estouraram o tempo por isso |

- Nothing else in this change is hard to reverse.

## Checks

### S1 - Pin sem rótulo · 1 file · 14 KB · ~4k

**C1** - `#contato` não tem texto "Você está aqui" depois que o globo chega ao lugar
Proof: `npx playwright test e2e/you-are-here.spec.ts -g "no label over the pin"`

**C2** - O `GlobeScene` não monta o `<Html>` do drei
Proof: `! grep -n "@react-three/drei" components/organisms/you-are-here/globe-scene.tsx`

### S2 - O mouse só mexe no vapor · 3 files · 26 KB · ~7k

**C3** - Um arraste de 300 px sobre o globo, sob movimento reduzido e com o lugar fixado, muda
menos de 0,5% dos pixels do recorte do globo
Proof: `npx playwright test e2e/you-are-here.spec.ts -g "dragging does not turn the globe"`

**C4** - A rotação do globo não lê ponteiro: `globe-scene.tsx` não tem `pointer`, `hover`, `drag`
nem `tilt`
Proof: `! grep -niE "pointer|hover|drag|tilt" components/organisms/you-are-here/globe-scene.tsx`

**C5** - O vapor ainda se afasta do cursor num raio de 0,42 e escuta o ponteiro na janela
(o canvas não recebe eventos)
Proof: `grep -n "radius: 0.42" components/organisms/you-are-here/globe-vapor.tsx && grep -n "window.addEventListener('pointermove'" components/organisms/you-are-here/globe-vapor.tsx`

**C6** - O canvas não tem `cursor-grab` nem `touch-pan-y`: `touch-action` é `auto` e
`pointer-events` é `none`
Proof: `npx playwright test e2e/you-are-here.spec.ts -g "the canvas takes no gesture"`

### S3 - Copy A · 1 file · 4 KB · ~1k

**C7** - Com cidade: "Contato" / "Do horizonte de eventos até você." / "Começamos no limite do que
dá para construir. Agora o mapa aponta para Curitiba, de onde seu projeto parte." / "Para onde ele
vai, você decide." / botão "Vamos conversar"
Proof: `npx playwright test e2e/sections.spec.ts -g "contato invites the visitor from where they are"`

**C8** - Aproximado: "Agora o mapa aponta para perto de você, de onde seu projeto parte.", sem
"São Paulo"
Proof: `npx playwright test e2e/sections.spec.ts -g "contato names no city"`

**C9** - Sem lugar (204 e fuso desconhecido): "Agora a viagem volta para a Terra, onde seu projeto
começa."
Proof: `npx playwright test e2e/sections.spec.ts -g "contato with no place"`

**C10** - Enquanto a busca não respondeu, o texto é o de C9; quando ela responde, troca para o de C7
Proof: `npx playwright test e2e/sections.spec.ts -g "contato before the place arrives"`

### S4 - Uma luz só · 3 files · 20 KB · ~5k

**C11** - O topo do canvas fica 50% da altura da janela acima do topo de `#contato` (±2 px), com
`mask-image` em gradiente
Proof: `npx playwright test e2e/you-are-here.spec.ts -g "the light rises over the faq"`

**C12** - O globo fica centrado na parte do canvas que está dentro da seção (tela larga: x 20% da
largura à direita do centro; em pé: y 20% acima do centro da seção)
Proof: `node --test components/organisms/you-are-here/globe-layout.test.ts`

**C13** - Na linha do topo de `#contato`, na coluna do globo, a luminância 2 px acima e 2 px
abaixo difere menos de 0,02, em 1440 × 900 e 390 × 844
Proof: `npx playwright test e2e/you-are-here.spec.ts -g "no step in the light"`

**C14** - Na faixa em que o canvas sobe sobre o FAQ, `elementFromPoint` no centro da última
pergunta devolve o `summary` dela, e clicar nela a abre
Proof: `npx playwright test e2e/you-are-here.spec.ts -g "the faq stays above the light"`

### S5 - Céu noturno · 4 files · 30 KB · ~8k

**C15** - Cada bloco decorado tem pelo menos 220 `data-star="far"`
Proof: `npx playwright test e2e/parallax.spec.ts -g "a night sky"`

**C16** - Os intervalos entre `top` ordenados, e entre `left` ordenados, das estrelas de fundo têm
coeficiente de variação acima de 0,5
Proof: `npx playwright test e2e/parallax.spec.ts -g "a night sky"`

**C17** - Magnitudes: pelo menos 60% têm 1 px e `--star-peak` até 0,5; no máximo 5% têm 2,5 px ou
mais; pelo menos 3 cores de fundo distintas
Proof: `npx playwright test e2e/parallax.spec.ts -g "a night sky"`

**C18** - As estrelas de fundo de 1,5 px ou mais (`data-twinkle`) cintilam (`twinkle`, 3 s a 8 s),
fora de fase: a opacidade vai de 1 a 0,25 sobre o brilho próprio (o alfa `--star-peak` da cor). As
de 1 px não têm animação
Proof: `npx playwright test e2e/parallax.spec.ts -g "the field is far stars"`
Proof: `npx playwright test e2e/backdrop.spec.ts -g "far stars twinkle out of step"`

**C19** - A Via Láctea (`data-milky-way`) está na camada de fundo, tem opacidade até 0,12 e é
diagonal, com densidade de estrelas dentro da faixa pelo menos 2× a de fora
Proof: `npx playwright test e2e/parallax.spec.ts -g "the milky way"`

**C20** - As estrelas do meio e a poeira da frente também passam o teste de C16
Proof: `npx playwright test e2e/parallax.spec.ts -g "a night sky"`

**C21** - Camadas, profundidades e tipos continuam: `back` = estrelas de fundo (+ a faixa), `mid` =
estrelas próximas com halo, `front` = poeira desfocada
Proof: `npx playwright test e2e/parallax.spec.ts -g "the field is far stars"`

**C22** - O servidor e o cliente geram o mesmo céu: carregar `/` não loga erro de hidratação
Proof: `npx playwright test e2e/parallax.spec.ts -g "the sky hydrates"`

**C23** - Sob movimento reduzido, as camadas não se mexem e as estrelas não cintilam
Proof: `npx playwright test e2e/reduced-motion.spec.ts -g "parallax layers stay put under reduced motion"`

## Swept

- validation: n/a - nenhuma entrada do usuário
- failure modes: C9 (sem lugar); existing - a máscara de terra que não carrega deixa só o globo
- idempotency: existing - uma busca do lugar por visita
- authorization: n/a - página pública
- concurrency: C10 - a resposta que chega com a seção na tela troca o texto
- data lifecycle: existing - nada é guardado
- dependency failure: existing - `findVisitorPlace` cai no fuso e nunca lança erro
- state transitions: C10
- observability: n/a - site estático

## Handoff

Um lote só: S1-S5 somam ~25k de leitura, abaixo dos 150k, e as fatias dividem os mesmos arquivos
de `you-are-here`.

- Mid-build: o `twinkle` com `var()` nos keyframes foi abandonado (ver Landing); o brilho foi para
  o alfa da cor, e a animação voltou a ser de opacidade pura, que roda no compositor.
- Settled by the user mid-build (2026-11-04): only far stars of 1.5 px or more twinkle; the faint
  1 px ones hold still (240 twinkling stars per block made 480 layers and timed out the glitch specs).
- `e2e/glitch.spec.ts` "each heading draws its own wait" gets a 60 s timeout: its 2400 px window
  now reaches the globe's risen light, and nothing it asserts changed.
