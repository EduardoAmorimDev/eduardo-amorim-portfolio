# Verificação: portfolio-lp-black-hole-wide

Intervalo `9028b05..HEAD` (7 commits), `main`, árvore limpa (`git status --short` vazio).
Verificador independente, somente leitura; sem testes do repositório, por decisão do usuário.

**Veredito: APROVADO COM RESSALVAS.** C1, C2, C4, C5, C6, C7 e C8 passam. C3 passa nos valores,
mas diverge da letra quanto ao `GROWTH`. A saída rápida pode pular uma faixa subpixel de luz
desprezível, o que contraria o comentário de invariante.

## Checks

- **C1: PASSA.** O grep de `hero-planet|HeroPlanet|PLANET` fora de `node_modules`/`.next` só
  encontra `.tasks/`, `.checks/` e o estado do harness. `wanderBox` não usa `PLANET`.
- **C2: PASSA.** `space-sky.tsx:68` e `:130` aplicam `clamp(1.0 - y / uHero.y, 0.0, 1.0)` às
  estrelas pequenas e às de destaque. Há halo (`:88`) e raios (`vSpikes`, limiar 0,672, `:73`).
  Na captura, as estrelas brilham com cruz e ficam mais fracas no pé da Hero.
- **C3: PASSA COM DESVIO.** `DISK.outer` 8, `HOLE.topHeight` 1,8 e `HOLE.halfHeight` 1,39 foram
  conferidos por `source.ts` › disks. O shader, porém, não tem `GROWTH = 2`: usa
  `LOOK_OUT = 4` com `look(r) = DISK_IN + (r − DISK_IN)·(4 − 1,15)/(8 − 1,15)`, fator de cerca
  de 2,40 no disco, e `arcLook` com fator 2 nos arcos. O resultado (o disco de 8 com a cara do
  de 4) é coerente com o critério 4, mas não com a forma literal do check.
- **C4: PASSA.** `source.ts` › pose confere tilt 7° e slant 20°, e `uRoll` recebe
  `DISK_POSE.slant`. Na captura, a ponta direita do disco fica bem acima da esquerda ("/") e o
  disco aparece fino, visto de lado.
- **C5: PASSA.** `source.ts` › path: 20 sementes × 2 viewports, quatro quadrantes, nenhum
  segundo acima de 7,5 px.
- **C6: PASSA.** `source.ts` › lens: `FIELD.exponent` 0, `EINSTEIN.radius` 1,92,
  `FLOW.radius` 1,92.
- **C7: PASSA.** `gpu.mjs`, dsf 1, 2160×1350: média de 6,79 ms (p95 9,20) e 7,26 ms (p95 9,80),
  a 59,8–60 FPS. O diff de `package.json` está vazio. A sonda não mede pixel quente; na captura
  não aparece mancha branca.
- **C8: PASSA.** `tsc --noEmit` sai com 0; o lint responde "No issues found".

## Achados (por severidade)

1. **Baixa: o invariante da saída rápida é falso na margem, e a conta do comentário está
   errada.** O comentário diz que a banda do topo apaga em t = 1,1, no raio de plano 8,29. Mas
   `bandHeights6` dá rho(1,1) = 1,15 + 6,85·1,1 ≈ 8,69. Fora dos arcos, o pixel da banda tem
   `nearest < rho(t)`. Assim, pixels com `nearest > DISK_OUT + 0,4 = 8,4` ainda existem para
   t ≈ 1,06–1,1. Nessa faixa, `topBand ≤ ~0,03`, e a luz fica ≤ ~0,03·0,216·1,45 ≈ 0,01, cerca
   de 2–3/255. É uma lasca subpixel na ponta da elipse do topo. O efeito visual é desprezível,
   mas o comentário diz que nada é pulado. Correção: cortar em
   `DISK_IN + (DISK_OUT − DISK_IN)·1,1` (≈ 8,69), e não em `DISK_OUT + 0,4`, ou corrigir o
   comentário.
   As linhas do disco estão corretas: `nearest` é limite inferior do raio das três linhas
   (±THICK/2), e elas apagam em `radius ≥ DISK_OUT`. Arcos, pés e anel também: o fim da banda
   de baixo fica em ≤ 2,15 + 0,04 < 2,3, e o anel é cerca de exp(−2000) em r = 2,3.
   O caminho completo, com tudo zerado, sai igual ao da saída rápida (`outside` = 1).
2. **Baixa: desvio de C3.** `GROWTH = 2` não existe no shader (ver C3). Convém atualizar a
   decisão na task ou o check para registrar a troca por `LOOK_OUT`.
3. **Observação:** no repouso (canto superior esquerdo de `holeBox`), boa parte do disco de 8 R
   fica fora da tela, à esquerda e em cima. `wanderBox` só reserva
   `max(halfHeight, topHeight)`. Pela task, isso parece intencional.
4. **Observação:** a sonda de GPU ficou em 6,8–7,3 ms de média, mas o p95 passou de 9 ms nas
   duas rodadas. O check mede só a média, que passa.

Evidência: `node --test wide/source.ts` (4/4), duas rodadas de `perf/gpu.mjs` e a captura
`wide/verify.png` (`reduce`, 6000 ms), todos no scratchpad da sessão.
