# Percursos e possibilidade de conclusão

Motor: `fidelity-22`. Dados S700 fixados em `5e05c42aa1aae3377790600eb6d27497101b79e7`.

Inventário: **41 mapas**, sendo 40 fases e a introdução; 10 fases são secretas. Há 47 conclusões a verificar, contando as saídas alternativas.

Nesta rodada: **4 percursos aprovados**, incluindo 2 chefes. São percursos isolados desde o spawn, com recursos iniciais explícitos. A aquisição dos equipamentos e a liberação dessas fases em uma campanha nova ainda não estão certificadas.

O executor aceita somente direção, ação e retorno ao checkpoint. Diálogos e edições de cena vêm dos mesmos gatilhos e intérprete usados no jogo. Não aceita posições, chaves, baús previamente abertos ou edições de mapa no arquivo de controles. Para aprovar um chefe, exige o evento de derrota concluída e zero de vida antes de terminar o percurso.

“Tentativa pendente” registra um percurso incompleto reproduzível. Ela não prova que a fase seja impossível. Os objetos listados para revisão indicam funções ainda ausentes/parciais; sua presença também não prova que bloqueiem a saída.

## Lista por mapa

| Fase (numeração do menu; índice interno entre parênteses) | Conclusões exigidas | Estado | Objetos a revisar |
|---|---|---|---|
| Angkor 1 (0) | Saída comum (22,9) | Percurso aprovado · [398 ticks](../tests/fixtures/routes/angkor-01-normal.json) | — |
| Angkor 2 (1) | Saída comum (23,2) | Tentativa pendente · [tentativa em (13,5)](../tests/fixtures/route-attempts/angkor-02-approach.json) | — |
| Angkor 3 (2) | Saída comum (23,21) | Ainda não verificada | — |
| Angkor 4 (3) | Saída comum (37,5) | Ainda não verificada | — |
| Angkor 5 (4) | Saída comum (2,10) | Ainda não verificada | 11 |
| Angkor 6 (5) | Saída comum (26,5) | Ainda não verificada | — |
| Angkor 7 (6) | Saída comum (19,4); Saída secreta (21,40) | Ainda não verificada | 11 |
| Angkor 8 (7) | Saída secreta (4,3); Saída comum (5,19) | Ainda não verificada | — |
| Angkor 9 · chefe (8) | Cristal após vencer o chefe (27,6) | Percurso aprovado · [964 ticks](../tests/fixtures/routes/angkor-boss-crystal.json) | — |
| Angkor 10 · secreta (9) | Saída secreta (42,11) | Ainda não verificada | — |
| Angkor 11 · secreta (10) | Saída secreta (43,27) | Ainda não verificada | — |
| Angkor 12 · secreta (11) | Saída secreta (35,25) | Ainda não verificada | — |
| Angkor 13 · secreta (12) | Saída secreta (39,27) | Ainda não verificada | — |
| Introdução (13) | Tutorial (61,3) | Percurso aprovado · [1428 ticks](../tests/fixtures/routes/angkor-introduction.json) | — |
| Bavaria 1 (0) | Saída comum (35,20) | Ainda não verificada | — |
| Bavaria 2 (1) | Saída comum (34,6) | Ainda não verificada | 11 |
| Bavaria 3 (2) | Saída comum (25,17) | Ainda não verificada | 11 |
| Bavaria 4 (3) | Saída comum (36,6); Saída secreta (2,10) | Ainda não verificada | — |
| Bavaria 5 (4) | Saída comum (40,29) | Ainda não verificada | 11, 18, 36 |
| Bavaria 6 (5) | Saída comum (36,6) | Ainda não verificada | 8, 18, 37 |
| Bavaria 7 (6) | Saída comum (30,21); Saída secreta (34,38) | Ainda não verificada | 8, 11, 18, 36, 37 |
| Bavaria 8 (7) | Saída comum (49,22) | Ainda não verificada | 8, 11, 18, 37, 38 |
| Bavaria 9 (8) | Saída comum (7,19) | Ainda não verificada | 8, 11, 18, 37, 38 |
| Bavaria 10 · chefe (9) | Cristal após vencer o chefe (29,13) | Percurso aprovado · [1629 ticks](../tests/fixtures/routes/bavaria-boss-crystal.json) | — |
| Bavaria 11 · secreta (10) | Saída secreta (32,20) | Ainda não verificada | 8, 18, 37, 38 |
| Bavaria 12 · secreta (11) | Saída secreta (56,5) | Ainda não verificada | 8, 18, 37, 38 |
| Bavaria 13 · secreta (12) | Saída secreta (10,3) | Ainda não verificada | 8, 11, 18, 36, 37, 38 |
| Tibet 1 (0) | Saída comum (51,9) | Ainda não verificada | 38 |
| Tibet 2 (1) | Saída comum (4,6); Saída secreta (4,33) | Ainda não verificada | 18 |
| Tibet 3 (2) | Saída comum (3,25) | Ainda não verificada | — |
| Tibet 4 (3) | Saída comum (33,3) | Ainda não verificada | 18, 47 |
| Tibet 5 (4) | Saída comum (41,3); Saída secreta (6,23) | Ainda não verificada | 18, 47 |
| Tibet 6 (5) | Saída comum (46,7) | Ainda não verificada | 18, 48 |
| Tibet 7 (6) | Saída comum (9,22) | Ainda não verificada | 18, 47, 48 |
| Tibet 8 (7) | Saída comum (5,14) | Ainda não verificada | 18, 47, 48 |
| Tibet 9 (8) | Saída comum (45,24) | Ainda não verificada | 18, 47, 48 |
| Tibet 10 (9) | Saída comum (99,15) | Ainda não verificada | 47, 48 |
| Tibet 11 · chefe (10) | Cristal após vencer o chefe (27,5) | Tentativa pendente · [tentativa em (14,18)](../tests/fixtures/route-attempts/tibet-boss-approach.json) | — |
| Tibet 12 · secreta (11) | Saída comum (39,23) | Ainda não verificada | 18 |
| Tibet 13 · secreta (12) | Saída comum (32,8) | Ainda não verificada | 18, 38, 47 |
| Tibet 14 · secreta (13) | Saída comum (5,21) | Ainda não verificada | 38, 47 |

## Percursos aprovados

- [Angkor 1](../tests/fixtures/routes/angkor-01-normal.json): 398 ticks de controles, 1 dano, 0 retornos; equipamento inicial 0; diálogos nenhum.
- [Angkor 9](../tests/fixtures/routes/angkor-boss-crystal.json): 964 ticks de controles, 0 danos, 0 retornos; equipamento inicial 1; diálogos 33, 32.
- [Angkor introdução](../tests/fixtures/routes/angkor-introduction.json): 1428 ticks de controles, 0 danos, 2 retornos; equipamento inicial 0; diálogos 29, 10, 11, 13, 15, 16, 17, 28.
- [Bavaria 10](../tests/fixtures/routes/bavaria-boss-crystal.json): 1629 ticks de controles, 2 danos, 0 retornos; equipamento inicial 2; diálogos 34, 30.

Angkor 1 comprova a saída comum, sem exigir coleta de todos os diamantes/baús. Angkor e Bavaria comprovam todos os golpes, reposição das pedras, derrota, cristal e diálogo final. A introdução cobre a caminhada automática e os oito roteiros, incluindo os dois retornos ao círculo.

## Próximas verificações

1. Resolver a aproximação de Angkor 2 com a gravidade e o empurrão atuais; a tentativa salva para em (13,5), antes de comprovar a saída.
2. Concluir os cinco golpes de Tibet, com as duas metades da ponte, geração de inimigos, congelamento e puxão. A tentativa salva é incompleta e inclui uma morte; não é um bloqueio confirmado.
3. Obter martelo, gancho e gelo durante uma campanha nova e encadear os percursos com os recursos, recompensas e save reais.
4. Aprovar cada saída comum/secreta e as dez fases secretas. Exigir todas as saídas de um mapa antes de marcá-lo como aprovado.
5. Repetir com mortes/checkpoints e recarga do save; depois comparar percursos e tempos com a execução Java.

## Objetos para revisão de cobertura

- 8: Objeto 8: queda e interações de method_351/331.
- 11: Objeto móvel 11: method_331.
- 18: Interruptores/ponte fora da arena de Tibet: method_240.
- 36: Objeto 36: method_318.
- 37: Objeto 37: method_330.
- 38: Mecanismo 38 e gatilhos associados.
- 47: Objeto 47: method_351/311.
- 48: Objeto 48: method_306/305 e puxão de method_263.

## Reproduzir

Após `npm run extract-assets`, execute `npm run verify:routes`. A verificação falha se os resultados gravados mudarem, se algum percurso aprovado não terminar ou se um chefe não tiver sido derrotado. `npm test` também executa os percursos e verifica a reconstrução dos replays.

Para regenerar esta tabela e `PLAYABILITY.json`: `npm run verify:routes -- --write-report`. Os arquivos de tentativa são conferidos separadamente e nunca entram na contagem de aprovação.
