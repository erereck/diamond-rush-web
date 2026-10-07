# Varredura automática das 40 fases

Cada mapa é iniciado no spawn original com recursos isolados explícitos. O explorador anda por células abertas, grama e pedras empurráveis, sem editar o mapa ou atravessar portões fechados. A introdução tem um percurso completo separado. Esta varredura **não comprova saída, solução de puzzle ou paridade com Java**; os percursos de conclusão ficam em [PLAYABILITY.md](PLAYABILITY.md).

Foram visitadas 976 células ao todo; acionados 12 checkpoints e abertos 3 baús em 40 mapas. O limite é 900 entradas por fase.

| Fase | Entradas | Células | Checkpoints | Baús | Danos | Posição final |
|---|---:|---:|---:|---:|---:|---|
| Angkor 1 | 194 | 41 | 0 | 0 | 2 | (23,18) |
| Angkor 2 | 121 | 24 | 0 | 0 | 0 | (21,4) |
| Angkor 3 | 109 | 12 | 0 | 0 | 0 | (6,22) |
| Angkor 4 | 32 | 4 | 0 | 0 | 0 | (6,17) |
| Angkor 5 | 89 | 16 | 0 | 1 | 0 | (9,22) |
| Angkor 6 | 85 | 15 | 0 | 0 | 1 | (10,68) |
| Angkor 7 | 104 | 22 | 0 | 0 | 0 | (18,11) |
| Angkor 8 | 48 | 8 | 0 | 0 | 0 | (9,11) |
| Angkor 9 (chefe) | 283 | 21 | 1 | 0 | 0 | (17,8) |
| Angkor 10 | 80 | 15 | 0 | 0 | 0 | (10,7) |
| Angkor 11 | 100 | 21 | 0 | 0 | 0 | (15,24) |
| Angkor 12 | 470 | 69 | 1 | 0 | 0 | (32,6) |
| Angkor 13 | 128 | 27 | 0 | 0 | 0 | (22,21) |
| Bavaria 1 | 221 | 36 | 1 | 0 | 2 | (27,18) |
| Bavaria 2 | 195 | 31 | 1 | 0 | 2 | (21,4) |
| Bavaria 3 | 82 | 16 | 0 | 1 | 1 | (9,7) |
| Bavaria 4 | 48 | 8 | 0 | 0 | 0 | (7,7) |
| Bavaria 5 | 164 | 37 | 0 | 0 | 0 | (14,23) |
| Bavaria 6 | 94 | 18 | 0 | 0 | 0 | (13,7) |
| Bavaria 7 | 148 | 33 | 1 | 0 | 0 | (26,39) |
| Bavaria 8 | 264 | 31 | 1 | 0 | 0 | (20,12) |
| Bavaria 9 | 36 | 5 | 0 | 0 | 0 | (4,11) |
| Bavaria 10 (chefe) | 371 | 32 | 1 | 0 | 0 | (21,22) |
| Bavaria 11 | 199 | 37 | 1 | 0 | 0 | (17,6) |
| Bavaria 12 | 40 | 6 | 0 | 0 | 0 | (5,7) |
| Bavaria 13 | 40 | 6 | 0 | 0 | 0 | (5,53) |
| Tibet 1 | 72 | 9 | 0 | 0 | 0 | (4,13) |
| Tibet 2 | 110 | 18 | 0 | 0 | 1 | (16,23) |
| Tibet 3 | 40 | 6 | 0 | 0 | 0 | (7,38) |
| Tibet 4 | 156 | 35 | 1 | 0 | 0 | (22,5) |
| Tibet 5 | 122 | 22 | 0 | 0 | 1 | (17,15) |
| Tibet 6 | 112 | 24 | 0 | 1 | 0 | (22,2) |
| Tibet 7 | 108 | 23 | 0 | 0 | 0 | (13,25) |
| Tibet 8 | 397 | 50 | 1 | 0 | 2 | (18,11) |
| Tibet 9 | 142 | 19 | 0 | 0 | 1 | (12,26) |
| Tibet 10 | 386 | 36 | 0 | 0 | 2 | (27,4) |
| Tibet 11 (chefe) | 401 | 31 | 1 | 0 | 0 | (32,19) |
| Tibet 12 | 315 | 60 | 1 | 0 | 1 | (42,10) |
| Tibet 13 | 188 | 32 | 0 | 0 | 0 | (24,9) |
| Tibet 14 | 105 | 20 | 0 | 0 | 0 | (20,15) |

A mesma sequência é executada novamente a partir do replay em `tests/stage-smoke.test.ts`, que compara o estado integral de cada mapa. Os casos com poucos passos indicam uma fronteira de navegação para análise manual; não são classificados como falha da fase.
