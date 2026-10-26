# Landing page do portfólio — Hero cósmica e refinamentos: verificação

**Veredito**: PASS
**Perfil**: `light` (o `AGENTS.md` do repositório não declara perfil)
**Intervalo do diff**: `c625ce9..26d8d8b` (branch `main`). A correção desta rodada está em `b4d6bad..26d8d8b`: `cd690e8` muda testes; `26d8d8b` só mexe em documentação.
**Rodada**: 3 - scoped
**Verificador**: subagente independente (autor != verificador), somente leitura

Placar: **76 de 76 checks provados**, sem nenhum FAIL ou PARCIAL. As três pendências da rodada 2 —
C23 PARCIAL, C7 PASS\* e C41 PASS\* — agora são PASS. A lacuna declarada do critério 31 (cor da luz,
só no código) continua aceita, como na rodada 2.

## Escopo desta rodada

- **Provas:** todas rodaram de novo, completas, em `26d8d8b`.
- **Re-julgados:** C23, C7 e C41, os únicos vereditos da rodada 2 que não foram PASS.
- **Diff da correção:** toca só três testes, um de cada um desses checks:
  - `e2e/hero.spec.ts`: "the logo still takes the pointer";
  - `e2e/faq.spec.ts`: "a closing answer shrinks…", além do gravador `recordTransitions`, que
    também serve ao C6;
  - `e2e/lens.spec.ts`: "inside the lens the title is an outline…".
- **Citações atualizadas:** nesses três arquivos. Como `recordTransitions` mudou, o C6 também foi
  re-julgado.
- **Código de produção:** nenhum arquivo mudou (o diff não toca `components/`, `app/` nem `lib/`).
  Por isso o `Swept` e a lacuna declarada são herdados.

## Passos do verify.md neste perfil (`carried from a0ad62b`)

| Passo | Rodou | Observação |
|---|---|---|
| 1. Checklist × fontes binding | não | Não há fonte binding. |
| 2. Rodar todas as provas | sim, em `26d8d8b` | Comandos em Gate. |
| 3. Asserção, não presença | sim | Não há `Coverage` nem `Test policy`. |
| 4. Injeção de falhas | não | Não faz parte do perfil `light`. |
| 5. Relatório | sim | Este arquivo. |

## Fontes binding (`carried from a0ad62b`)

| Fonte | Aberta | Contradição | Sem cobertura |
|---|---|---|---|
| — | n/a: nenhuma fonte binding | — | — |

## Checks re-julgados (`verified at 26d8d8b`)

| Check | Prova | Evidência (`arquivo:linha` — asserção) | Resultado |
|---|---|---|---|
| C23 | unit ✔ ✔, e2e #61 ✓ (`e2e/hero.spec.ts:189`) | unit: `glass-motion.test.ts:54-55,63`, com `1.06` fixado em `:38`. e2e: `e2e/hero.spec.ts:196-199` limpa `visibility` de todo `#hero *` **antes** do hit test; `:208` — `expect(hit).toBe(true)` | PASS. Agora a malha, a lente e todo o texto estão visíveis no `elementFromPoint`, então qualquer um deles que tomasse o ponteiro no vidro do `logo` faria o teste falhar. O ponto `onGlass` é calculado com a cena isolada, o que só localiza o vidro e não influi no veredito. |
| C7 | e2e #25 ✓ (`e2e/faq.spec.ts:210`) | `e2e/faq.spec.ts:242-243` — `open` e altura > 0 no meio; `:249` — altura inicial `> 20` (1fr); `:250-253` — com o `<details>` ainda aberto, passa por altura intermediária; `:255` — mínimo `< 2` px ainda aberto (0fr); `:265-266` — 300 ms e `ease-out`; `:270` — `+` a `0deg`/`none` | PASS. Fica uma folga de 2 px no "0fr", aceitável para uma leitura por quadro. |
| C41 | e2e #69 ✓ (`e2e/lens.spec.ts:205`) | `e2e/lens.spec.ts:238` — o canvas `hero-lens` fica escondido só nesta captura; `:252-253` — `share(inside, lum < 0.3)).toBe(1)`; `:256` — 95% aceso fora; `:271` — `stroke > 50`; `:272` — traço a `<= 12` de `mist` | PASS. Esconder o canvas das estrelas não enfraquece a afirmação: o contorno é o `span` `data-lens="outline"` e a máscara do título sólido é CSS, e nenhum dos dois depende desse canvas. Sem as estrelas, elas também não podem passar por traço. A largura de 1 px do critério 26 continua provada só no código (`app/globals.css:142`), o que não é afirmação do check. |
| C6 | e2e #24 ✓ | `e2e/faq.spec.ts:170-171` — 300 ms e `ease-out`; `:196-200` — altura final = altura do conteúdo, ±1 (1fr); `:201-205` — mínimo `< 1` e crescimento gradual. O gravador ganhou só o campo `open` (`:109-113,141`), sem mudar o que o C6 lê | PASS (re-julgado porque o gravador mudou; o veredito não muda) |

## Demais checks (`carried from b4d6bad`; provas re-executadas verdes em `26d8d8b`)

As linhas abaixo trazem o veredito e a citação da rodada 2. Nos arquivos tocados agora
(`hero.spec`, `faq.spec`, `lens.spec`), as linhas citadas foram conferidas em `26d8d8b`.

| Check | Evidência | Resultado |
|---|---|---|
| C1–C4 | `e2e/interaction.spec.ts:16,22` · `:30` · `:40-48` · `:70` | PASS |
| C5, C11–C13, C15, C16 | `e2e/glitch.spec.ts:117-123` · `:70-71,75-76` · `:96-97` · `:107-112` · `:197,199,204-205` · `:135,140-141` | PASS |
| C8 | `e2e/reduced-motion.spec.ts:157-158,161-162` — `<= 50` ms, `animations()` vazio | PASS |
| C9 | `e2e/faq.spec.ts:85` — `elapsed <= 300` (conferido em `26d8d8b`) e os demais testes do FAQ | PASS |
| C10, C14 | `lib/glitch.test.ts:64-73` · `:25-31,41-50` | PASS |
| C17 | `e2e/reduced-motion.spec.ts:23,71` — 15 s | PASS |
| C18, C19, C21 | `e2e/hero.spec.ts:103,107-112` · `:105-106` · `:66` (conferido em `26d8d8b`) | PASS |
| C20 | `e2e/sections.spec.ts:56-58` | PASS |
| C22 | `e2e/hero.spec.ts:24,174,184` — exclusão y ±95; sem ponteiro e nos 4 cantos, `crosses).toBe(false)` (conferido em `26d8d8b`) | PASS |
| C24 | `e2e/hero.spec.ts:78`; `e2e/hero-grid.spec.ts:164` | PASS |
| C25, C27, C29–C32, C34, C35, C37 | `e2e/hero-grid.spec.ts:191,196` · `:245` · `:260,278-279` · `:301,304` · `:325,330-333` · `:356,139` · `:224-225` · `:235` · `:365,381,388` | PASS |
| C26, C28, C33 | `grid-motion.test.ts:28,32,40,45` · `:66` · `:88,94,98` | PASS |
| C36, C45, C58, C68 | `e2e/reduced-motion.spec.ts:95` · `:103` · `:114,119` · `:187,229` | PASS |
| C38, C39, C43, C44 | `e2e/lens.spec.ts:141-142,145` · `:166,173-174,185-186,188` · `:285,289` · `:307` (conferido em `26d8d8b`) | PASS |
| C40 | `lens.test.ts:28,31,33,41-42` | PASS |
| C42, C74, C76 | `e2e/a11y.spec.ts:17,24,28` · `:15,17,24` · `:34-35,45`; `hero.tsx:47-50` | PASS |
| C46, C73 | comandos literais, exit 0 em `26d8d8b` | PASS |
| C47–C52, C57, C59, C60 | `e2e/black-hole.spec.ts:98` · `:128` · `:148,150-151,171-172,180` · `:201,204` · `:221-222,224` · `:267` · `:281` · `:331` · `:248`; `black-hole.test.ts:21,30-33,41` | PASS |
| C53–C57 | `black-hole-path.test.ts:59,62` · `:82,101` · `:115` · `:129` · `:151` | PASS |
| C61 | `e2e/hero.spec.ts:226` (conferido em `26d8d8b`); `e2e/sections.spec.ts:60-63` | PASS |
| C62–C66 | `e2e/backdrop.spec.ts:79,86,111-114` · `:127,132` · `:154-156,162,167` · `:181,185` · `:210,216` | PASS |
| C67 | `e2e/parallax.spec.ts` (teste na linha 33) | PASS |
| C69, C70 | `e2e/cards.spec.ts:42,54-63` · `:114-117` | PASS |
| C71, C72 | `e2e/offscreen.spec.ts:122-123,144-149` · `:182` | PASS |
| C75 | ver Gate | PASS |

## Lacuna declarada: critério 31, "com a cor do disco" (`carried from b4d6bad`)

Aceita, com evidência só de código:

- `black-hole-mesh.tsx:169-170` faz `mist` × `primary` a 40%;
- `black-hole-mesh.tsx:240` aplica essa cor na `pointLight`.

A outra metade do critério 31, o lado do `logo` voltado ao buraco negro mais claro, segue provada em
C60. Esta rodada não tocou o código de produção.

## `Swept`, política de testes e injeção de falhas (`carried from a0ad62b`)

- **`Swept`:** as restrições citadas (`hero-scene.tsx:26-30`, `glitch-text.tsx:84`) estão fora de
  todo diff de correção.
- **Política de testes:** não há `## Test policy`.
- **Injeção de falhas:** não faz parte do perfil `light`.

## Gate (`verified at 26d8d8b`)

- `npx tsc --noEmit`: exit 0
- `npm run lint`: exit 0
- `npm test`: exit 0, 40 passed, 0 failed
- `npm run test:e2e`: exit 0, **119 passed**, 0 failed (6,1 min), uma execução completa

## Lacunas

Nenhuma bloqueante. Ficam registradas, sem bloquear:

- **Critério 31, cor da luz:** lacuna declarada e aceita, provada só no código.
- **Critério 26, 1 px do traço:** provado só no código. Não é afirmação de check.
- **Gradiente do disco (critério 28):** asserido no teste do C49 (`e2e/black-hole.spec.ts:171-172`),
  mas o texto do C49 não o menciona. É só uma questão de documentação.
