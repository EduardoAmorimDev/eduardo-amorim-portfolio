# Landing page — a Terra sem rótulo, uma luz só e um céu de verdade · Verification

**Verdict**: FAIL — proof gaps, no product defect found. All 23 named proofs exist and are green at `184dbd7`, but three of them (C18, C22, C23) do not fully reach the claim as written. Each claim does hold by other evidence (below), so the fix is in the tests or the checklist, not in the product.
**Profile**: light (the repo declares none)
**Diff range**: 6b4b26e..184dbd7 (4 commits, including `184dbd7` fix(app/globals), added mid-verification)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

## Steps run

- Step 1 (binding sources vs checklist, `ui`): skipped, profile is light. The task's criteria 1–15 were still compared against C1–C23 (see Coverage).
- Fault injection (`standard`/`ui`): skipped, profile is light.
- Coverage join / Test policy verdicts (`standard`/`ui`): skipped, profile is light. The checklist has no Test policy section.

## Gate (at 184dbd7)

- `npx playwright test e2e/you-are-here.spec.ts e2e/sections.spec.ts e2e/parallax.spec.ts e2e/backdrop.spec.ts e2e/reduced-motion.spec.ts -g "contato|label|gesture|drag|light|faq|night sky|far stars|milky way|hydrates|parallax layers stay put|background holds still|layers move"`: **22 passed**, 0 failed. Earlier runs at `698f72f` (13 + 5 + 3) were also all green.
- `node --test components/organisms/you-are-here/globe-layout.test.ts`: 3 pass, 0 fail
- `npx tsc --noEmit -p .`: exit 0 · `npx eslint components e2e lib app`: exit 0
- Built CSS `.next/static/chunks/*.css` contains no `<tom>` rule and does contain `color-dawn` and `star-peak`. No stale CSS was seen in any build.
- Not run: the full suite, including the `glitch.spec.ts` 60 s timeout from the Handoff. The author reports 116 passed.

## Checks

| Check | Proof | Ran | Result | Evidence / finding |
|---|---|---|---|---|
| C1 | you-are-here "no label over the pin" | yes | PASS | `you-are-here.spec.ts:47` `contato.getByText(/você está aqui/i)).toHaveCount(0)` |
| C2 | `! grep drei globe-scene.tsx` | yes | PASS | no match |
| C3 | "dragging does not turn the globe" | yes | PASS | `:94` `changedShare(before, after) < 0.005` (300 px drag, reduced motion, place fixed) |
| C4 | `! grep -niE pointer\|hover\|drag\|tilt` | yes | PASS | no match. Checks one file only, so C3 carries the behaviour |
| C5 | grep radius / window listener | yes | PASS | `globe-vapor.tsx:26`, `:90`. Grep level only (see F6) |
| C6 | "the canvas takes no gesture" | yes | PASS | `:62-64` touchAction `auto`, pointerEvents `none`, class `!~ cursor-grab\|touch-pan-y` |
| C7 | "contato invites…" | yes | PASS | `sections.spec.ts:145-156` exact span/h2/p/button texts. Order and line break not asserted (F7) |
| C8 | "contato names no city" | yes | PASS | `:166-169` approximate line; `not.toContainText('São Paulo')` |
| C9 | "contato with no place" | yes | PASS | `:180` 204 + `Pacific/Galapagos` → `${OPENING} ${NO_PLACE}` |
| C10 | "contato before the place arrives" | yes | PASS | `:202` NO_PLACE while held → `:204` Curitiba line after answer |
| C11 | "the light rises over the faq" | yes | PASS | `:105` `|section.y - canvas.y - innerHeight*0.5| <= 2`; `:109` mask `/linear-gradient/` (direction not asserted, F8) |
| C12 | node globe-layout test | yes | PASS | `globe-layout.test.ts:22-24,29-31`. Unit level only (F5) |
| C13 | "no step in the light" ×2 | yes | PASS | `:147` `|above - below| < 0.02` at 1440×900 and 390×844. Discrimination unproven (F9) |
| C14 | "the faq stays above the light" | yes | PASS | `:174-175` question inside the risen band; `:180` elementFromPoint→summary; `:182` `data-state=open` |
| C15 | parallax "a night sky" | yes | PASS | `parallax.spec.ts:163` `far.length >= 220` (one block sampled; both blocks share `FAR`, 480 = 2×240 seen in server HTML) |
| C16 | parallax "a night sky" | yes | PASS | `:170-177` gap CV > 0.5 for tops and lefts |
| C17 | parallax "a night sky" | yes | PASS | `:181-185` faint ≥ 0.6, bright ≤ 0.05, ≥ 3 colours (tints not named, F7) |
| C18 | parallax "the field is far stars" + backdrop "far stars twinkle out of step" | yes | **PARTIAL** | `parallax.spec.ts:111` animation `twinkle` iff `data-twinkle`; `backdrop.spec.ts:156-157,165-174` ≥ 5 distinct periods and phases, 3–8 s, opacity 0.25→1. Nothing asserts that `data-twinkle` ⇔ size ≥ 1.5 px (F2) |
| C19 | parallax "the milky way" | yes | PASS | `:203-206,223` opacity ≤ 0.12, `|end-start| >= 30`, density ratio ≥ 2. Geometry read from `data-band-*`, not paint (F10) |
| C20 | parallax "a night sky" | yes | PASS | `:169-178` near/dust CV. Dust lefts pass by edge-split construction (F10) |
| C21 | parallax "the field is far stars" | yes | PASS | `:97-101` kinds `{back:[milky-way,far], mid:[near], front:[dust]}`; `:105-106` depths |
| C22 | parallax "the sky hydrates" | yes | **PROOF CANNOT REACH CLAIM** | `:234` `errors.filter(/hydrat/i)` is empty. See F1. The claim was verified independently: 480/480 far-star `style` attributes identical between server HTML and the hydrated DOM |
| C23 | reduced-motion "parallax layers stay put" | yes | **PARTIAL** | `reduced-motion.spec.ts:196-199` covers the layers. "Stars don't twinkle" is not asserted there; `:135-158` "the sections' background holds still" (`expect(moving).toEqual([])`) covers it and is green (F3) |

## Criteria 1–15 vs checks

No check contradicts the task. The following parts of the criteria have no check:

- Criterion 1, "the pin keeps the dot and the ring pulsing every 2.4 s": no check. The code is present at `globe-scene.tsx:32-33,207-209,263-264`.
- Criterion 15, "parallax speeds do not change": not in C21. It is covered by the existing test `parallax.spec.ts:28`, which is green.
- Criterion 4, "under reduced motion the vapour stays still": covered only indirectly through C3.

The Handoff decisions (only stars of 1.5 px or more twinkle; 60 s timeout on the glitch test) are honoured as settled. The Swept rows marked "existing" are confirmed in the code:

- land mask failure: `globe-scene.tsx:124` `.catch(() => undefined)`
- one lookup per visit: `you-are-here.tsx` `place !== undefined` guard
- never throws: `lib/visitor-place.ts:158` catch

## Findings (by severity)

1. **F1 (medium): C22's proof cannot fail.** The E2E server is a production build. Its bundle has 0 occurrences of "Hydration failed" and only minified `react.dev/errors/…` messages, which `/hydrat/i` never matches. On top of that, React 19 does not report attribute (style) mismatches in production. A `Math.random` sky would pass this test. The claim itself holds: `night-sky.ts` uses seeded mulberry32 with no `Math.random`/`Date`, and the server and client styles compared equal. Replace the proof with a comparison of server HTML against the DOM.
2. **F2 (medium): C18 does not tie twinkling to size.** "1.5 px or more twinkle; 1 px do not" would pass with `data-twinkle` on any subset larger than 10. It is correct by inspection only: `parallax-field.tsx:171,173` (`size > 1`).
3. **F3 (low): C23 names the wrong proof for "stars do not twinkle".** The covering test exists and is green; the checklist should name it.
4. **F4 (low): criterion gaps.** No check covers the 2.4 s pin pulse (criterion 1). Criterion 15's speeds are covered only by an unnamed existing test.
5. **F5 (low, level): C12 is unit-only.** The wiring `lift = clamp(1 - stageHeight/canvasHeight)` (`globe-scene.tsx:103-107`) and the on-screen position of the globe have no E2E check. C3's clip would pass even with a misplaced globe.
6. **F6 (low, level): C5 is grep-only.** It does not prove that the nodes move away and spring back. That is existing behaviour; the push code is at `globe-vapor.tsx:126`.
7. **F7 (low, precision):**
   - C7 asserts neither the span→h2→p→button order nor the line break.
   - C17 checks "≥ 3 distinct colours", not the three tones the task names.
8. **F8 (low): C11 does not assert the mask direction** (transparent at the top, opaque at the section edge). The code is correct: `you-are-here.tsx`, `linear-gradient(to_bottom,transparent,black_50svh)`.
9. **F9 (light-profile gap): C13's threshold was never shown to fail.** No run showed that the old, clipped canvas fails the 0.02 limit, so the test may also pass on a dark column. Fault injection is out of profile.
10. **F10 (low, sampling):**
    - C15/C16/C17/C19/C20 sample only the `#solucoes` block. Both blocks render the same `FAR`, so the risk is low.
    - C19 reads the band geometry from `data-band-*`, which comes from the same `MILKY_WAY` constant as the painted gradient.
    - Dust lefts are split across the 2–8 % and 88–96 % edges, which makes their CV high regardless of rows.
11. **Note: the planning docs leaked into the CSS build.** At `698f72f`, Tailwind scanned `.checks/` and `.tasks/`. Commit `184dbd7` fixes this; my production builds before and after it were clean.
