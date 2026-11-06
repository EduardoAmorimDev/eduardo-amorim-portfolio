# Landing page do portfólio — celular fluido: buraco negro, Soluções, Alcance e a luz do globo

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

No celular, a landing ainda trava onde mais quer impressionar (usuário, 2026-11-06):

- "buraco negro está pesado, animação dele vindo de encontro a tela está travada";
- "Seção de soluções, os icones 3D demoram muito para carregar";
- "Seção de alcance extremamente travada, e o celular [...] 'sai de dentro do laptop', causando
  sobreposição";
- "Globo terrestre no footer está com pouca luz emitida pelos continentes".

O que o código e a última verificação mostram (fato, salvo onde marcado):

- **A régua deixa passar 30 quadros por segundo.** No modo leve, `RenderGate` desenha cada canvas
  3D a cada 2 quadros (`LITE_FRAME_EVERY = 2`), e `e2e/performance.spec.ts` só conta quadros de
  `requestAnimationFrame` da página. Uma cena que se move a ~30 desenhos/s passa como 60 FPS. É a
  forma mais provável (suposição) do "travado" no mergulho da hero e no carrossel, que são guiados
  pela rolagem.
- **A meta de `portfolio-lp-60fps` não foi cumprida no celular.** `.checks/portfolio-lp-60fps.verified.md`,
  achado 1: em 390×844 com CPU 6×, a hero parada mediu 46,82 FPS já em modo leve; a 1440×900, o
  Alcance mediu 53,16.
- **Hero:** um raio por pixel com até 170 passos (`gargantua-shader.ts`), num canvas de duas telas
  de altura (`BLEED = 1`), com `dpr` de 1 a 2 também no touch. A hero não usa `touchDpr`, ao
  contrário do Alcance e das Soluções, e o `AdaptiveDpr` troca de degrau durante a rolagem. Cada
  troca redimensiona o canvas, e redimensionar apaga o canvas (`portfolio-lp-mobile-alcance`).
- **Soluções:** no touch, os ícones são 6 modelos `.glb` que somam 509 KB (`atom` 124,6, `brick`
  71,5, `cursor` 5,5, `flag` 103,4, `note` 122,8, `wave` 81,3), desenhados com
  `MeshTransmissionMaterial` num canvas WebGL próprio (`GlassShelf`). Até carregar, o cartão mostra
  um glifo SVG.
- **Sobreposição no Alcance:** no celular a ordem é tablet → laptop → celular
  (`portfolio-lp-device-last`). O celular sempre entra vindo de trás do palco, no centro (`z` de −5
  a 0), na mesma janela de rolagem em que o laptop sai pela esquerda (`[0,42; 0,52]`, `SLOTS` em
  `stages.ts`). Quando o celular era o primeiro, o palco estava vazio. Agora ele atravessa o laptop
  que ainda está saindo.
- **Globo:** o bloom existe só fora do modo leve (`{!lite && <Bloom … />}`, `you-are-here.tsx`). Sem
  ele, os continentes perdem a luz que espalhavam (`portfolio-lp-you-are-here`, critério 8). Não foi
  um visual escolhido: é um efeito colateral do corte decidido em `portfolio-lp-60fps` (critério 6,
  "o globo desenha sem bloom"). Que o celular do usuário estava em modo leve é suposição. Dá para
  conferir em `<html data-performance="lite">`.

Depois desta task, no celular, o buraco negro e o carrossel se movem a cada quadro, sem travar. Os
ícones de Soluções aparecem já como ícones 2D desenhados, minimalistas, de cada objeto. O celular só entra no
palco depois que o laptop saiu. O globo brilha no modo leve como brilha no completo.

15 critérios em 4 fatias · 0 one-way doors · 1 em aberto, nenhum bloqueia.

**Medição** (vale para todos os critérios de FPS; é a de `portfolio-lp-60fps`, com uma régua a mais):

- **Ambiente:** build de produção; Chromium de `playwright.config.ts` com as flags de GPU; 390×844,
  `isMobile`, `hasTouch`, DPR 3.
- **Lentidão:** CPU 6× via CDP `Emulation.setCPUThrottlingRate`, ligada depois do carregamento.
- **Janela:** 3 s, depois de aquecer no início do trecho, parado ou com `scrollTo` a cada quadro, de
  ponta a ponta do trecho.
- **FPS:** quadros de `requestAnimationFrame` divididos pelo tempo.
- **Desenhos/s (novo):** quadros em que aquele canvas foi de fato redesenhado, divididos pelo tempo.
- **Limiar:** 58, pelo mesmo motivo de `portfolio-lp-60fps`.

## Criteria

### O buraco negro sem travar

1. Dado o celular com CPU 6×, com ou sem modo leve, cada trecho abaixo mede ≥ 58 FPS e o canvas da
   hero é desenhado ≥ 58 vezes por segundo:
   - hero parada;
   - rolagem da hero de 0 a 1 tela (o mergulho de `portfolio-lp-swallow-and-copy`, 1–4).
2. Sempre, o mergulho e o primeiro ecrã continuam como hoje. `e2e/hero.spec.ts` e
   `e2e/swallow-and-copy.spec.ts` passam sem afrouxar nenhum valor.

### Ícones de Soluções como ícones 2D desenhados

3. Dado touch ou modo leve, cada um dos 6 cartões de `#solucoes` mostra, numa caixa de 64×64 CSS px,
   um ícone 2D desenhado do seu objeto, na ordem de `SOLUTION_MODELS`: `atom`, `brick`, `cursor`,
   `flag`, `note`, `wave`. A seção não monta canvas WebGL (`[data-testid="glass-shelf"]` ausente) e
   não baixa nenhum `.glb`.
4. Cada ícone é um SVG minimalista de traço, na linguagem dos glifos de hoje (`stroke-primary`, sem
   preenchimento, sobre `bg-primary/15`), que lembra o objeto do seu modelo: `atom` um núcleo com
   órbitas; `brick` um tijolo; `cursor` a seta de ponteiro; `flag` uma bandeira no mastro; `note` uma
   folha de anotação; `wave` uma onda. Prova: screenshot dos seis cartões a 390×844, revisado pelo
   usuário.
5. Os seis ícones somam ≤ 60 KB e vêm no HTML da página, sem requisição própria.
6. Sempre, o ícone 2D é o que aparece no lugar do 3D até o modelo carregar, e para sempre se ele
   falhar, substituindo os glifos de hoje (círculo, quadrado, triângulo, losango, hexágono, arco).
   Enquanto isso, o cartão não marca `data-ready`.
7. Quando o modo leve liga no meio da visita com ponteiro fino, cada ícone 3D passa a ser o seu ícone
   2D, e a caixa de 64×64 do cartão não muda de tamanho nem de posição.
8. Com ponteiro fino e sem modo leve, nada muda: os ícones de vidro 3D giram no `GlassStage` como
   hoje. `e2e/cards.spec.ts`, `e2e/interaction.spec.ts` e `e2e/reach-and-seams.spec.ts` passam, salvo
   as asserções do caminho de touch que este critério 3 substitui.

### Alcance sem travar e sem sobreposição

9. Dado o celular com CPU 6×, com ou sem modo leve, a rolagem do Alcance do progresso 0 ao 1 mede
   ≥ 58 FPS, e o canvas do Alcance é desenhado ≥ 58 vezes por segundo.
10. Quando o celular não é o primeiro aparelho, ele só começa a entrar depois que o aparelho
    anterior deixou a área do celular na tela. Em nenhum progresso a caixa projetada do corpo do
    celular cruza a do aparelho que sai. O celular mantém o seu gesto: vem de trás e vira de frente
    (`portfolio-lp-device-last`, 4).
11. Quando o celular é o primeiro (janela de tablet ou laptop), as janelas de rolagem e os
    cruzamentos entre tablet e laptop são os de hoje.
12. Sempre, os critérios de `portfolio-lp-device-last` e `portfolio-lp-mobile-alcance` continuam
    valendo, inclusive a passagem para a página real com no máximo 5% de pixels diferentes
    (`HANDOFF_MAX_SHARE`) em 390×844. `e2e/notebook.spec.ts`, `e2e/mobile.spec.ts` e
    `e2e/reach-and-seams.spec.ts` passam sem afrouxar valores, salvo os testes que fixam a janela
    antiga de entrada do celular quando ele vem por último.

### A luz do globo no modo leve

13. Dado o modo leve, a luz do globo vale a do modo completo. Em 390×844, com movimento reduzido
    (globo parado) e `#contato` na mesma posição, a luminância média da região do globo (o disco mais
    um anel até 1,3 raio) fica a ±15% da do modo completo.
14. Dado o celular com CPU 6× e modo leve, `#contato` parado mede ≥ 58 FPS (`portfolio-lp-60fps`, 2).
15. Sem modo leve, o globo continua como hoje: bloom com força 0,75, raio 0,45 e limiar 0,45, e
    `e2e/you-are-here.spec.ts` passa sem alteração de valores.

## Out of scope

- 60 FPS no desktop (1440×900): o pedido é "No celular". Os números a 1440 que falharam em
  `portfolio-lp-60fps` continuam lá.
- Mudar o visual do modo completo no desktop, em qualquer das quatro seções.
- Telemetria de FPS em produção: o repositório não tem nenhuma (`portfolio-lp-60fps`).

## Observable

| Surface                  | Decision                         | Landing                                                            |
| ------------------------ | -------------------------------- | ------------------------------------------------------------------ |
| screen landing, hero     | fluidez parada e no mergulho     | 1                                                                  |
| screen landing, hero     | visual do mergulho               | 2                                                                  |
| screen landing, Soluções | ícone mostrado                   | 3, 4, 5                                                            |
| screen landing, Soluções | loading / error do 3D            | 6                                                                  |
| screen landing, Soluções | troca para o modo leve no meio   | 7                                                                  |
| screen landing, Alcance  | ordem e densidade (sobreposição) | 10, 11                                                             |
| screen landing, Alcance  | loading / error das páginas      | existing - vidro preto até carregar ou se falhar (`useStaticPage`) |
| screen landing, Contato  | luz do globo no modo leve        | 13                                                                 |
| screen landing           | empty / unauthorised             | n/a - página estática pública                                      |

## Swept

- validation: n/a - sem entrada.
- failure modes: 6 - modelo 3D que não carrega deixa o ícone 2D; existing - página de aparelho que não
  carrega deixa o vidro preto.
- idempotency and retry: n/a.
- authorization: n/a - página pública.
- concurrency and ordering: 10 - o celular entra só depois que o aparelho anterior sai; 7 - o modo
  leve liga com os ícones já na tela.
- data lifecycle: n/a - nada é guardado.
- external-dependency failure: 6 - a requisição do `.glb` falha.
- state transitions: 7 - completo → leve troca 3D pelo ícone 2D; existing - leve nunca volta a
  completo na visita (`portfolio-lp-60fps`, 5).
- observability: Unresolved 5 - a régua é o Chromium emulado nesta máquina; não há telemetria.

## Impact

| Front       | What changes                                                                                                                                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| domain      | new term: desenhos por segundo de um canvas, a segunda régua de `e2e/performance.spec.ts`, ao lado dos FPS de `requestAnimationFrame`                                                                                                                                                                              |
| domain      | existing term: `RenderGate` em modo leve desenha a cada `LITE_FRAME_EVERY` (2) quadros; os critérios 1 e 9 exigem a hero e o Alcance a cada quadro no celular. Quem depende: `hero.tsx`, `notebook.tsx`, `you-are-here.tsx` e o julgamento "Cumpre a letra da métrica" em `.checks/portfolio-lp-60fps.verified.md` |
| domain      | existing term: `GlassShelf`, hoje o canvas dos ícones no touch e no modo leve, perde essa função para os ícones 2D. Quem depende: `e2e/mobile.spec.ts` (`glass-shelf`, l. 126–241) e `e2e/reach-and-seams.spec.ts` (`data-ready`, l. 246–284)                                                                      |
| domain      | existing term: `slotOf` / `SLOTS` (`stages.ts`), em que a entrada do último coincide com a saída do segundo, passa a ter outra janela quando o último é o celular. Quem depende: `stages.test.ts`, `e2e/notebook.spec.ts`, `e2e/mobile.spec.ts`                                                                    |
| domain      | existing term: `portfolio-lp-60fps` 6, "o globo desenha sem bloom", passa a "sem bloom, com a luz equivalente" (critério 13)                                                                                                                                                                                       |
| domain      | existing term: os glifos de `solutions.tsx` (círculo, quadrado...) dão lugar aos ícones 2D, também como espera do 3D no desktop                                                                                                                                                                                    |
| stored data | nothing to migrate                                                                                                                                                                                                                                                                                                 |

## Decided

| Decision                                                                                 | Shape | Alternative rejected |
| ---------------------------------------------------------------------------------------- | ----- | -------------------- |
| None - tudo é reversível: ícones SVG no código, janelas de rolagem e cortes do modo leve | -     | -                    |

## Sources

- Usuário (2026-11-06), pedido literal: "No celular: 1 - buraco negro está pesado, animação dele
  vindo de encontro a tela está travada. 2 - Seção de soluções, os icones 3D demoram muito para
  carregar, deixe eles como imagens que remetam aos objetos 3d, parecido com icones 2D. Dessa forma
  em dispositivos com pouco poder de processamento, não fica travado. 3 - Seção de alcance
  extremamente travada, e o celular (do ultimo slide do carossel por que estamos no celular nesse
  caso) 'sai de dentro do laptop, causando sobreposição. 4 - Globo terrestre no footer está com pouca
  luz emitida pelos continentes, está correto? Foi proposital? Se não, corrija também"
- `.checks/portfolio-lp-60fps.verified.md`, achado 1: os FPS no celular que não chegaram a 58.
- `.tasks/portfolio-lp-60fps.md`, respostas do usuário: o conteúdo dos aparelhos pode ficar "mais
  leve", desde que a passagem continue em ≤ 5% (vale como alavanca para o critério 9).
- `.tasks/portfolio-lp-device-last.md`, critérios 3, 4 e 9: a ordem, o gesto do celular e a passagem.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| #   | Kind | Question                                                                                                                   | Until answered                                                                      |
| --- | ---- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 5   | open | A régua é o Chromium com CPU 6× nesta máquina; o aparelho do usuário é um Redmi Note 11 Pro, que pode dar outro resultado. | Provas em Chromium; o usuário confirma no aparelho com `npm run build && npm start` |

Respondidos pelo usuário (2026-11-06):

1. Estilo dos ícones: "quero algo mais minimalista nesse caso um icone 2d desenhado" (critérios 4–6).
2. O celular espera o laptop sair e vem de trás: "Sim, correto." (critério 10).
3. Ícones 2D no touch e no modo leve: "Certo." (critérios 3 e 7).
4. Orçamento de 60 KB: "Ta." (critério 5).
5. Luz do globo a ±15%: "De acordo." (critério 13).
