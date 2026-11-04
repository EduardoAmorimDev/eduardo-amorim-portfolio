# Verificação — portfolio-lp-reach-and-seams

Profile: `light` (sem passo ui, sem Coverage join, sem injeção de falhas). Range `main..feat/reach-and-seams`.

## Rodada 1 — FAIL
C9, C27 (vapor) e C28 sem asserção; C22 sem a altura de 32 px; C24 só `summary`; C26 com prova que
não alcança a página real (as telas dos aparelhos são `pointer-events: none`). Corrigido em `fc226ba`:
provas novas, critério 26 emendado na task, `interaction.spec` lido sem o vidro, linha da timeline contínua.

## Rodada 2 — FAIL (1 defeito)
26/28 provadas. C27 citava um teste apagado por engano em `fc226ba` (`the glass cursor lets clicks
through`). Restaurado no commit seguinte, junto com três comentários obsoletos.

Gates da rodada 2 em `fc226ba`: e2e 138/139 (a falha, `faq.spec.ts:210`, fora do diff, passou 5/5
isolada e passou de novo na reexecução após a correção); `npm test` 31/31; `tsc` e `eslint` limpos;
`git diff --quiet a7cf52c^ -- public/models/glass` exit 0.

Após a correção: `reach-and-seams.spec.ts`, `sections.spec.ts`, `faq.spec.ts` — 56/56.

## Fraquezas residuais aceitas como estão
- C2: o "sumiu a 50svh" mede um pixel a 52svh.
- C18: a cor contínua da linha não tem asserção.
- C24: para `button` e `a[href]` só o atributo `data-control`; o 1,2× é medido sobre `summary`.
- C25: o estado "ainda carregando" segue o mesmo ramo da falha, sem teste próprio.
- C26: a saída da janela é um `pointerout` sintético.
- C27: o vapor é provado por o vidro não interceptar o ponteiro, não pelo vapor em si.
