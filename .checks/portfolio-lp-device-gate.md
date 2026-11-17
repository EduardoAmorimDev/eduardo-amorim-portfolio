# Verificação do aparelho: 3D só onde a GPU aguenta 60 FPS, zero WebGL no toque

Profile: light (o repositório não declara um).

Sources:

- `.tasks/portfolio-lp-device-gate.md` - os 17 critérios, as duas portas de mão única e os 5 em aberto
- conversa, 2026-11-16 - o usuário escolheu `detect-gpu` e "Zero WebGL no toque"
- `detect-gpu` 5.0.70 (`dist/detect-gpu.esm.js`, README) - os `type`, os tiers e `benchmarksURL`

## Out of scope

- Medir FPS durante a visita como rede de segurança: a task decide uma vez por visita
- Guardar o tier entre visitas: a verificação repete o mesmo resultado
- O carrossel do Alcance em CSS 3D: não é WebGL
- Medir no aparelho real do usuário: fica com ele (Unresolved 5)

## Landing

O tier passa a ser decidido em `lib/performance-tier.ts`: uma função pura (`decideTier`) e quem
chama o `detect-gpu` (`checkDevice`), montado por `components/atoms/device-check` no lugar de
`PerformanceWatch`. `lib/scene-mode.ts` deriva o modo de cada cena (hero, reach e globe) do
ponteiro e do tier. O globo em imagem reutiliza `lib/stills.json`, `scripts/render-stills.mjs` e o
padrão de `<picture>` da `HeroStill`. A projeção do pin usa `three` (`PerspectiveCamera`,
`Object3D`), já no bundle, com as mesmas constantes da cena viva.

| One-way door                           | Literal shape                                                                                                                                                                        | Alternative rejected                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Dependência `detect-gpu`               | `"detect-gpu": "^5.0.70"` em `dependencies`; `getGPUTier({ benchmarksURL: '/detect-gpu/benchmarks', glContext })`                                                                    | regra à mão e benchmark ao carregar - decididos pelo usuário (task, Decided 1)                                              |
| Benchmarks servidos da própria origem  | `scripts/copy-gpu-benchmarks.mjs` copia `node_modules/detect-gpu/dist/benchmarks/*.json` para `public/detect-gpu/benchmarks/` em `predev` e `prebuild`; a pasta fica no `.gitignore` | versionar os 712 KB em `public/`: ficam presos a uma versão do pacote que o `npm install` pode trocar sem ninguém regenerar |
| Nenhuma troca de modo durante a visita | `PerformanceTier = 'full' \| 'lite'`, `null` enquanto pendente; `turnStill`, `watchPerformance` e `PerformanceWatch` removidos                                                       | manter o vigia - recusado pelo usuário (task, Decided 2)                                                                    |
| Testes fixam a GPU pelo renderer       | `e2e/fixtures.ts` instala por padrão um init script que responde `UNMASKED_RENDERER_WEBGL` com uma GPU de tier 3; `reportGpu(page, renderer)` troca por outra                        | um parâmetro de URL para forçar o tier: iria para produção                                                                  |
| Pose da imagem do globo                | `STILL_POSE = { latitude: -15, longitude: -50 }`, inclinada por `PLACE_ABOVE_MIDDLE`, exportada de `globe-scene.tsx` e usada pela captura e pela projeção do pin                     | girar a imagem por CSS até o local: a luz e o vapor girariam junto, e a Terra de outro ângulo não existe na imagem          |

- Nada mais nesta mudança é difícil de reverter

## Checks

### S1 - A verificação do aparelho · 6 files · 22 KB · ~6k

**C1** - `BENCHMARK` com `fps ≥ 60` dá `full`; `fps < 60`, `BLOCKLISTED`, `WEBGL_UNSUPPORTED` dão `lite` (critério 1)
Proof: `node --test lib/performance-tier.test.ts` (`a known gpu at 60 fps or more is full`, `below 60 fps, blocklisted or without webgl is lite`)

**C2** - `FALLBACK` dá `full` só com ponteiro fino e `hardwareConcurrency ≥ 8` (critério 2)
Proof: `node --test lib/performance-tier.test.ts` (`an unknown gpu is full only on a fine pointer with 8 cores or more`)

**C3** - Erro ou mais de 3000 ms sem resposta dá `lite` (critério 3)
Proof: `node --test lib/performance-tier.test.ts` (`a check that throws is lite`, `a check that takes over 3000 ms is lite`)

**C4** - Os mesmos dados dão o mesmo tier, e a verificação roda uma vez por visita (critério 4)
Proof: `node --test lib/performance-tier.test.ts` (`the tier is decided once`)

**C5** - Os benchmarks vêm da própria origem; nenhuma requisição vai para `unpkg.com` (critério 1)
Proof: `npx playwright test e2e/device-gate.spec.ts -g "reads its benchmarks from the site"`

**C6** - Enquanto pendente: sem `data-performance`, sem canvas e sem imagem na Hero, véu de pé (critério 5)
Proof: `npx playwright test e2e/device-gate.spec.ts -g "nothing mounts before the check answers"`

**C7** - O contexto WebGL da verificação é perdido (`loseContext`) antes de o tier ser publicado (critério 6)
Proof: `node --test lib/performance-tier.test.ts` (`the check's context is lost before the tier is told`)
Proof: `npx playwright test e2e/device-gate.spec.ts -g "the check's own context is lost"` (o `loseContext` real do `WEBGL_lose_context`)

### S2 - Toque: nenhum WebGL · 6 files · 40 KB · ~10k

**C8** - No toque, nos dois tiers, a página rolada de ponta a ponta não tem nenhum `<canvas>` WebGL, e Hero, Alcance e Contato marcam `data-scene="still"` (critério 7)
Proof: `npx playwright test e2e/device-gate.spec.ts -g "on touch no webgl"`

**C9** - A imagem do globo ocupa a caixa do canvas de hoje (`-50svh` acima da seção, mesma máscara) e é desenhada com ≤ 1 px do aparelho por px da imagem em 390×844 DPR 3, 820×1180 DPR 2 e 1440×900 DPR 2 (critério 8)
Proof: `npx playwright test e2e/device-gate.spec.ts -g "the globe image"`

**C10** - Com um local na face visível há um pin, com anel animado a cada 2,4 s; com um local do outro lado, nenhum pin; com movimento reduzido, o anel não anima (critério 9)
Proof: `npx playwright test e2e/device-gate.spec.ts -g "the still globe pins"` (inclui o anel até 3,2× e `the still globe pins nothing without a place`)

**C11** - Se a imagem do globo falha, o texto do Contato continua visível e nenhuma mensagem aparece (critério 10)
Proof: `npx playwright test e2e/device-gate.spec.ts -g "a globe image that fails"`

### S3 - Desktop aprovado · 3 files · 30 KB · ~8k

**C12** - Ponteiro fino e `full`: Hero, Alcance e globo `live`, `GlassStage` montado (critério 11)
Proof: `npx playwright test e2e/device-gate.spec.ts -g "a full desktop draws every scene live"`

**C13** - Com CPU 20× por 8 s, o desktop `full` continua `live` e `full` (critério 4)
Proof: `npx playwright test e2e/device-gate.spec.ts -g "a slow full desktop never swaps"`

### S4 - Versão leve · 8 files · 50 KB · ~13k

**C14** - Em `lite` no desktop: nenhum `<canvas>` WebGL, as três cenas `still`, sem `glass-stage` e o cursor do sistema visível (`html` sem a classe `glass-cursor`) (critério 12)
Proof: `npx playwright test e2e/device-gate.spec.ts -g "lite draws no webgl"`

**C15** - Em `lite`: `.glass-card` sem `backdrop-filter`, `html` sem a classe `lenis`, estrelas sem animação, ícones planos (critério 13)
Proof: `npx playwright test e2e/device-gate.spec.ts -g "lite stills the page"`

**C16** - Em `lite`, nenhum título faz glitch (critério 13)
Proof: `npx playwright test e2e/device-gate.spec.ts -g "lite never glitches"`

**C17** - Em `lite` a 1440×900, o laptop é o último aparelho e, em 0,96 do progresso, a tela dele cobre a janela (critério 14)
Proof: `npx playwright test e2e/device-gate.spec.ts -g "lite keeps the alcance story"`

### S5 - As imagens do globo · 4 files · 30 KB · ~8k

**C18** - `lib/stills.json` tem `globe` com as formas `wide`, `tablet` e `phone`, e todo arquivo do `srcset` existe em `public/` (critério 15)
Proof: `node --test lib/stills.test.ts` (`every globe shape is listed and on disk`)
Proof: `node scripts/render-stills.mjs http://localhost:3100 globe` (sai com 0)

**C19** - O local que fica de frente para a câmera é projetado a ≤ 4 px CSS do centro do globo, em 390×844 e em 1440×900; um local a mais de 75° dele não tem ponto (critério 16)
Proof: `node --test components/organisms/you-are-here/still-pin.test.ts` (`the place facing the camera lands on the globe's centre at 390x844`, `... at 1440x900`, `a place past 75 degrees has no pin`)

### S6 - Medição no celular · 1 file · 20 KB · ~5k

**C20** - Em 390×844 no toque, `lite` com CPU 6× e `full` com CPU 4×, parado na Hero e rolando Alcance e Contato, ≥ 58 FPS (critério 17)
Proof: `npx playwright test e2e/performance.spec.ts -g "on a phone the page holds 58 fps"`

## Handoff

S1-S6 ≈ 50k tokens de leitura, abaixo de 150k: um único lote, sem passagem de bastão.

## Swept

- validation: C1, C2 - o resultado do `detect-gpu` é tratado por `type` e `fps`
- failure modes: C3, C11
- idempotency: C4
- authorization: n/a - página pública
- concurrency: C6 - nenhuma cena monta antes do tier
- data lifecycle: n/a - imagens e benchmarks estáticos
- dependency failure: C3 - benchmark que não carrega cai em `FALLBACK` ou erro
- state transitions: C1, C2, C3, C13
- observability: n/a - `data-performance` e `data-scene` são a inspeção

## Coverage

| Set (size)                      | Member -> proof                                                                                                               | Unproven |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- |
| `type` do `getGPUTier` (5)      | `BENCHMARK` C1 · `BLOCKLISTED` C1 · `WEBGL_UNSUPPORTED` C1 · `FALLBACK` C2 · `SSR` n/a (só no servidor, onde nada é decidido) | -        |
| cenas com imagem (3)            | hero C8 C14 · reach C8 C14 · globe C8 C9 C14                                                                                  | -        |
| tiers × ponteiro (4)            | touch+full C8 · touch+lite C8 · fine+full C12 · fine+lite C14                                                                 | -        |
| tamanhos da imagem do globo (3) | 390×844 C9 · 820×1180 C9 · 1440×900 C9                                                                                        | -        |

- Nenhum check afirma código de status, rota ou forma de resposta
