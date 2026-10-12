# Percursos e possibilidade de conclusão

Motor: núcleo gerado da decompilação S700 (`4bfa92539bc374a6`). Gerado por `npm run verify:routes -- --write-report`; não edite à mão.

Inventário: **41 mapas** (40 fases e a introdução) e **47 objetivos de conclusão**, contando saídas comuns, secretas, cristais dos chefes e o fim do tutorial.

Cobertura atual: **47 de 47 objetivos** com percurso aprovado; **41 mapas** com todos os objetivos aprovados; 47 percursos, dos quais **47** também conferidos na decompilação recompilada em Java.

Um percurso aprovado começa no carregamento original da fase (entrada automática desde a coluna 0) e contém apenas controles por tick: direção, ação e retorno ao checkpoint. O motor é a lógica original traduzida, com semente fixa de `java.util.Random` e relógio exato de 20 quadros por segundo ([NUCLEO_S700.md](NUCLEO_S700.md)); a marca ✓JVM indica que o mesmo fluxo de controles também concluiu na decompilação recompilada. Um percurso que não sorteia números conclui no jogo original com qualquer semente. Os que sorteiam (marcados com "sorteios") foram repetidos com outras sementes, como um aparelho que semeia pelo relógio, e a fração indica com quantas ainda concluem. Os recursos iniciais (vidas, equipamento, vida máxima) ficam declarados em cada arquivo.

| Fase (numeração do menu; índice interno entre parênteses) | Objetivos | Estado |
|---|---|---|
| Angkor 1 (0) | Saída comum (22,9) | Percurso aprovado · [493 ticks](../tests/fixtures/core-routes/0-angkor-01-normal.json) ✓JVM |
| Angkor 2 (1) | Saída comum (23,2) | Percurso aprovado · [1099 ticks](../tests/fixtures/core-routes/0-angkor-02-normal.json) ✓JVM |
| Angkor 3 (2) | Saída comum (23,21) | Percurso aprovado · [1722 ticks](../tests/fixtures/core-routes/0-angkor-03-normal.json) ✓JVM |
| Angkor 4 (3) | Saída comum (37,5) | Percurso aprovado · [2354 ticks](../tests/fixtures/core-routes/0-angkor-04-hammer-normal.json) ✓JVM |
| Angkor 5 (4) | Saída comum (2,10) | Percurso aprovado · [2326 ticks](../tests/fixtures/core-routes/0-angkor-05-normal.json) ✓JVM |
| Angkor 6 (5) | Saída comum (26,5) | Percurso aprovado · [858 ticks](../tests/fixtures/core-routes/0-angkor-06-normal.json) ✓JVM |
| Angkor 7 (6) | Saída comum (19,4); Saída secreta (21,40) | Percurso aprovado · [1354 ticks](../tests/fixtures/core-routes/0-angkor-07-normal.json) ✓JVM, [1443 ticks](../tests/fixtures/core-routes/0-angkor-07-secret-hook.json) ✓JVM |
| Angkor 8 (7) | Saída secreta (4,3); Saída comum (5,19) | Percurso aprovado · [848 ticks](../tests/fixtures/core-routes/0-angkor-08-secret-ice.json) ✓JVM, [3529 ticks](../tests/fixtures/core-routes/0-angkor-08-normal.json) ✓JVM |
| Angkor 9 · chefe (8) | Cristal do chefe (27,6) | Percurso aprovado · [1074 ticks](../tests/fixtures/core-routes/0-angkor-09-boss-crystal.json) ✓JVM |
| Angkor 10 · secreta (9) | Saída secreta (42,11) | Percurso aprovado · [4359 ticks](../tests/fixtures/core-routes/0-angkor-10-secret.json) ✓JVM |
| Angkor 11 · secreta (10) | Saída secreta (43,27) | Percurso aprovado · [1752 ticks](../tests/fixtures/core-routes/0-angkor-11-secret.json) ✓JVM |
| Angkor 12 · secreta (11) | Saída secreta (35,25) | Percurso aprovado · [989 ticks](../tests/fixtures/core-routes/0-angkor-12-secret.json) ✓JVM |
| Angkor 13 · secreta (12) | Saída secreta (39,27) | Percurso aprovado · [573 ticks](../tests/fixtures/core-routes/0-angkor-13-secret.json) ✓JVM |
| Introdução (13) | Fim do tutorial (60,3) | Percurso aprovado · [1463 ticks](../tests/fixtures/core-routes/0-angkor-intro.json) ✓JVM |
| Bavaria 1 (0) | Saída comum (35,20) | Percurso aprovado · [2038 ticks](../tests/fixtures/core-routes/1-bavaria-01-normal.json) ✓JVM |
| Bavaria 2 (1) | Saída comum (34,6) | Percurso aprovado · [1421 ticks](../tests/fixtures/core-routes/1-bavaria-02-normal.json) ✓JVM |
| Bavaria 3 (2) | Saída comum (25,17) | Percurso aprovado · [1639 ticks](../tests/fixtures/core-routes/1-bavaria-03-normal.json) ✓JVM |
| Bavaria 4 (3) | Saída comum (36,6); Saída secreta (2,10) | Percurso aprovado · [3767 ticks](../tests/fixtures/core-routes/1-bavaria-04-normal.json) ✓JVM, [1858 ticks](../tests/fixtures/core-routes/1-bavaria-04-secret.json) ✓JVM |
| Bavaria 5 (4) | Saída comum (40,29) | Percurso aprovado · [2941 ticks](../tests/fixtures/core-routes/1-bavaria-05-normal.json) ✓JVM |
| Bavaria 6 (5) | Saída comum (36,6) | Percurso aprovado · [2129 ticks](../tests/fixtures/core-routes/1-bavaria-06-normal.json) ✓JVM |
| Bavaria 7 (6) | Saída comum (30,21); Saída secreta (34,38) | Percurso aprovado · [3823 ticks](../tests/fixtures/core-routes/1-bavaria-07-normal.json) ✓JVM, [603 ticks](../tests/fixtures/core-routes/1-bavaria-07-secret.json) ✓JVM |
| Bavaria 8 (7) | Saída comum (49,22) | Percurso aprovado · [3126 ticks](../tests/fixtures/core-routes/1-bavaria-08-normal.json) ✓JVM |
| Bavaria 9 (8) | Saída comum (7,19) | Percurso aprovado · [2668 ticks](../tests/fixtures/core-routes/1-bavaria-09-normal.json) ✓JVM |
| Bavaria 10 · chefe (9) | Cristal do chefe (29,13) | Percurso aprovado · [1388 ticks](../tests/fixtures/core-routes/1-bavaria-10-boss-crystal.json) ✓JVM |
| Bavaria 11 · secreta (10) | Saída secreta (32,20) | Percurso aprovado · [2412 ticks](../tests/fixtures/core-routes/1-bavaria-11-secret.json) ✓JVM |
| Bavaria 12 · secreta (11) | Saída secreta (56,5) | Percurso aprovado · [4141 ticks](../tests/fixtures/core-routes/1-bavaria-12-secret.json) ✓JVM |
| Bavaria 13 · secreta (12) | Saída secreta (10,3) | Percurso aprovado · [3118 ticks](../tests/fixtures/core-routes/1-bavaria-13-secret.json) ✓JVM |
| Tibet 1 (0) | Saída comum (51,9) | Percurso aprovado · [2240 ticks](../tests/fixtures/core-routes/2-tibet-01-normal.json) ✓JVM |
| Tibet 2 (1) | Saída comum (4,6); Saída secreta (4,33) | Percurso aprovado · [2740 ticks](../tests/fixtures/core-routes/2-tibet-02-normal.json) ✓JVM, [431 ticks](../tests/fixtures/core-routes/2-tibet-02-secret.json) ✓JVM |
| Tibet 3 (2) | Saída comum (3,25) | Percurso aprovado · [2079 ticks](../tests/fixtures/core-routes/2-tibet-03-normal.json) ✓JVM |
| Tibet 4 (3) | Saída comum (33,3) | Percurso aprovado · [2617 ticks](../tests/fixtures/core-routes/2-tibet-04-normal.json) ✓JVM |
| Tibet 5 (4) | Saída comum (41,3); Saída secreta (6,23) | Percurso aprovado · [3350 ticks](../tests/fixtures/core-routes/2-tibet-05-normal.json) ✓JVM, [281 ticks](../tests/fixtures/core-routes/2-tibet-05-secret.json) ✓JVM |
| Tibet 6 (5) | Saída comum (46,7) | Percurso aprovado · [3406 ticks](../tests/fixtures/core-routes/2-tibet-06-normal.json) ✓JVM |
| Tibet 7 (6) | Saída comum (9,22) | Percurso aprovado · [1616 ticks](../tests/fixtures/core-routes/2-tibet-07-normal.json) ✓JVM |
| Tibet 8 (7) | Saída comum (5,14) | Percurso aprovado · [2927 ticks](../tests/fixtures/core-routes/2-tibet-08-normal.json) ✓JVM |
| Tibet 9 (8) | Saída comum (45,24) | Percurso aprovado · [5189 ticks](../tests/fixtures/core-routes/2-tibet-09-normal.json) ✓JVM |
| Tibet 10 (9) | Saída comum (99,15) | Percurso aprovado · [5562 ticks](../tests/fixtures/core-routes/2-tibet-10-normal.json) ✓JVM |
| Tibet 11 · chefe (10) | Cristal do chefe (27,5) | Percurso aprovado · [1924 ticks](../tests/fixtures/core-routes/2-tibet-11-boss-crystal.json) ✓JVM (sorteios: 50/50 sementes) |
| Tibet 12 · secreta (11) | Saída comum (39,23) | Percurso aprovado · [1978 ticks](../tests/fixtures/core-routes/2-tibet-12-exit.json) ✓JVM |
| Tibet 13 · secreta (12) | Saída comum (32,8) | Percurso aprovado · [3787 ticks](../tests/fixtures/core-routes/2-tibet-13-exit.json) ✓JVM |
| Tibet 14 · secreta (13) | Saída comum (5,21) | Percurso aprovado · [1354 ticks](../tests/fixtures/core-routes/2-tibet-14-exit.json) ✓JVM |
