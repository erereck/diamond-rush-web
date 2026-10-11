# Percursos e possibilidade de conclusão

Motor: `fidelity-24`. Dados S700 fixados em `5e05c42aa1aae3377790600eb6d27497101b79e7`.

Inventário: **41 mapas**, sendo 40 fases e a introdução; 10 fases são secretas. Há 47 conclusões a verificar, contando as saídas alternativas.

Cobertura atual: **22 percursos aprovados**, incluindo os 3 chefes. Os percursos isolados partem do spawn, com recursos iniciais explícitos. Os chefes usam armas predefinidas; obter essas armas e liberar os chefes durante uma campanha nova ainda não está certificado.

O executor aceita somente direção, ação e retorno ao checkpoint. Diálogos e edições de cena vêm dos mesmos gatilhos e intérprete usados no jogo. Não aceita posições, chaves, baús previamente abertos ou edições de mapa no arquivo de controles. Para aprovar um chefe, exige o evento de derrota concluída e zero de vida antes de terminar o percurso.

Uma [varredura exploratória separada](STAGE_SMOKE.md) executa controles em todos os 40 mapas e confere seus replays. Ela não altera o estado de aprovação de saídas nesta tabela.

“Tentativa pendente” registra um percurso incompleto reproduzível. Ela não prova que a fase seja impossível. Tentativas antigas continuam vinculadas para registrar onde o planejamento anterior parava, mesmo quando outro percurso já aprovou a fase. Os objetos listados para revisão indicam funções ainda ausentes/parciais; sua presença também não prova que bloqueiem a saída.

## Lista por mapa

| Fase (numeração do menu; índice interno entre parênteses) | Conclusões exigidas | Estado | Objetos a revisar (obj. = plano de objetos) |
|---|---|---|---|
| Angkor 1 (0) | Saída comum (22,9) | Percurso aprovado · [398 ticks](../tests/fixtures/routes/angkor-01-normal.json) | — |
| Angkor 2 (1) | Saída comum (23,2) | Percurso aprovado · [722 ticks](../tests/fixtures/routes/angkor-02-normal.json) · [tentativa anterior em (13,5)](../tests/fixtures/route-attempts/angkor-02-approach.json) | — |
| Angkor 3 (2) | Saída comum (23,21) | Percurso aprovado · [1248 ticks](../tests/fixtures/routes/angkor-03-normal.json) | — |
| Angkor 4 (3) | Saída comum (37,5) | Percurso aprovado · [1894 ticks](../tests/fixtures/routes/angkor-04-hammer-normal.json) | — |
| Angkor 5 (4) | Saída comum (2,10) | Percurso aprovado · [1953 ticks](../tests/fixtures/routes/angkor-05-normal.json) | — |
| Angkor 6 (5) | Saída comum (26,5) | Percurso aprovado · [662 ticks](../tests/fixtures/routes/angkor-06-normal.json) | — |
| Angkor 7 (6) | Saída comum (19,4); Saída secreta (21,40) | Percurso aprovado · [1205 ticks](../tests/fixtures/routes/angkor-07-normal.json), [1755 ticks](../tests/fixtures/routes/angkor-07-secret-hook.json) · [tentativa anterior em (10,42)](../tests/fixtures/route-attempts/angkor-07-secret-hook-plate.json) | — |
| Angkor 8 (7) | Saída secreta (4,3); Saída comum (5,19) | Percurso aprovado · [2867 ticks](../tests/fixtures/routes/angkor-08-normal.json), [791 ticks](../tests/fixtures/routes/angkor-08-secret-ice.json) | — |
| Angkor 9 · chefe (8) | Cristal após vencer o chefe (27,6) | Percurso aprovado · [1121 ticks](../tests/fixtures/routes/angkor-boss-crystal.json) | — |
| Angkor 10 · secreta (9) | Saída secreta (42,11) | Tentativa pendente · [tentativa em (12,17)](../tests/fixtures/route-attempts/angkor-10-first-gate.json) | — |
| Angkor 11 · secreta (10) | Saída secreta (43,27) | Percurso aprovado · [1347 ticks](../tests/fixtures/routes/angkor-11-secret.json) · [tentativa anterior em (43,16)](../tests/fixtures/route-attempts/angkor-11-gold-and-silver.json) | — |
| Angkor 12 · secreta (11) | Saída secreta (35,25) | Tentativa pendente · [tentativa em (18,18)](../tests/fixtures/route-attempts/angkor-12-fourth-riddle.json), [tentativa em (32,6)](../tests/fixtures/route-attempts/angkor-12-three-gold-keys.json) | — |
| Angkor 13 · secreta (12) | Saída secreta (39,27) | Percurso aprovado · [529 ticks](../tests/fixtures/routes/angkor-13-secret.json) | — |
| Introdução (13) | Tutorial (61,3) | Percurso aprovado · [1428 ticks](../tests/fixtures/routes/angkor-introduction.json) | — |
| Bavaria 1 (0) | Saída comum (35,20) | Tentativa pendente · [tentativa em (23,14)](../tests/fixtures/route-attempts/bavaria-01-brick-shaft.json), [tentativa em (12,13)](../tests/fixtures/route-attempts/bavaria-01-grass-column.json), [tentativa em (16,11)](../tests/fixtures/route-attempts/bavaria-01-two-crushers.json) | — |
| Bavaria 2 (1) | Saída comum (34,6) | Tentativa pendente · [tentativa em (21,4)](../tests/fixtures/route-attempts/bavaria-02-first-crusher.json), [tentativa em (30,9)](../tests/fixtures/route-attempts/bavaria-02-two-crushers.json) | — |
| Bavaria 3 (2) | Saída comum (25,17) | Tentativa pendente · [tentativa em (13,27)](../tests/fixtures/route-attempts/bavaria-03-two-checkpoints.json) | — |
| Bavaria 4 (3) | Saída comum (36,6); Saída secreta (2,10) | Tentativa pendente · [tentativa em (15,6)](../tests/fixtures/route-attempts/bavaria-04-first-stone-wall.json) | — |
| Bavaria 5 (4) | Saída comum (40,29) | Tentativa pendente · [tentativa em (10,8)](../tests/fixtures/route-attempts/bavaria-05-first-checkpoint.json) | — |
| Bavaria 6 (5) | Saída comum (36,6) | Tentativa pendente · [tentativa em (31,14)](../tests/fixtures/route-attempts/bavaria-06-two-silver-gates.json) | 8, 37 |
| Bavaria 7 (6) | Saída comum (30,21); Saída secreta (34,38) | Tentativa pendente · [tentativa em (24,37)](../tests/fixtures/route-attempts/bavaria-07-hook-switch.json) | 8, 37 |
| Bavaria 8 (7) | Saída comum (49,22) | Tentativa pendente · [tentativa em (13,11)](../tests/fixtures/route-attempts/bavaria-08-first-riddle.json) | 8, 37, 38 |
| Bavaria 9 (8) | Saída comum (7,19) | Tentativa pendente · [tentativa em (10,18)](../tests/fixtures/route-attempts/bavaria-09-gold-lock.json) | 8, 37, 38 |
| Bavaria 10 · chefe (9) | Cristal após vencer o chefe (29,13) | Percurso aprovado · [1465 ticks](../tests/fixtures/routes/bavaria-boss-crystal.json) | — |
| Bavaria 11 · secreta (10) | Saída secreta (32,20) | Tentativa pendente · [tentativa em (15,18)](../tests/fixtures/route-attempts/bavaria-11-checkpoint-plate.json) | 8, 37, 38 |
| Bavaria 12 · secreta (11) | Saída secreta (56,5) | Tentativa pendente · [tentativa em (25,13)](../tests/fixtures/route-attempts/bavaria-12-first-plate.json) | 8, 37, 38 |
| Bavaria 13 · secreta (12) | Saída secreta (10,3) | Tentativa pendente · [tentativa em (7,47)](../tests/fixtures/route-attempts/bavaria-13-brick-shaft.json) | 8, 37, 38 |
| Tibet 1 (0) | Saída comum (51,9) | Tentativa pendente · [tentativa em (47,9)](../tests/fixtures/route-attempts/tibet-01-exit-gold-lock.json), [tentativa em (34,4)](../tests/fixtures/route-attempts/tibet-01-upper-checkpoint.json) | 38 |
| Tibet 2 (1) | Saída comum (4,6); Saída secreta (4,33) | Percurso aprovado · [1949 ticks](../tests/fixtures/routes/tibet-02-normal.json), [321 ticks](../tests/fixtures/routes/tibet-02-secret.json) | — |
| Tibet 3 (2) | Saída comum (3,25) | Percurso aprovado · [727 ticks](../tests/fixtures/routes/tibet-03-normal.json) · [tentativa anterior em (10,25)](../tests/fixtures/route-attempts/tibet-03-exit-corridor.json) | — |
| Tibet 4 (3) | Saída comum (33,3) | Tentativa pendente · [tentativa em (20,4)](../tests/fixtures/route-attempts/tibet-04-first-plate.json) | 47 |
| Tibet 5 (4) | Saída comum (41,3); Saída secreta (6,23) | Saídas parcialmente aprovadas · [209 ticks](../tests/fixtures/routes/tibet-05-secret.json) · [tentativa em (16,17)](../tests/fixtures/route-attempts/tibet-05-left-silver.json), [tentativa em (23,7)](../tests/fixtures/route-attempts/tibet-05-right-silver.json), [tentativa em (23,7)](../tests/fixtures/route-attempts/tibet-05-two-silver-keys.json) | 47 |
| Tibet 6 (5) | Saída comum (46,7) | Percurso aprovado · [752 ticks](../tests/fixtures/routes/tibet-06-normal-ice.json) | 48 |
| Tibet 7 (6) | Saída comum (9,22) | Ainda não verificada | 47, 48 |
| Tibet 8 (7) | Saída comum (5,14) | Tentativa pendente · [tentativa em (16,14)](../tests/fixtures/route-attempts/tibet-08-first-riddle-enemy.json) | 47, 48 |
| Tibet 9 (8) | Saída comum (45,24) | Tentativa pendente · [tentativa em (31,5)](../tests/fixtures/route-attempts/tibet-09-upper-plate.json) | 47, 48 |
| Tibet 10 (9) | Saída comum (99,15) | Tentativa pendente · [tentativa em (13,3)](../tests/fixtures/route-attempts/tibet-10-first-riddle.json) | 47, 48 |
| Tibet 11 · chefe (10) | Cristal após vencer o chefe (27,5) | Percurso aprovado · [3145 ticks](../tests/fixtures/routes/tibet-boss-crystal.json) · [tentativa anterior em (16,16)](../tests/fixtures/route-attempts/tibet-boss-approach.json) | — |
| Tibet 12 · secreta (11) | Saída comum (39,23) | Tentativa pendente · [tentativa em (35,16)](../tests/fixtures/route-attempts/tibet-12-first-key-and-plate.json), [tentativa em (36,9)](../tests/fixtures/route-attempts/tibet-12-two-checkpoints.json) | — |
| Tibet 13 · secreta (12) | Saída comum (32,8) | Tentativa pendente · [tentativa em (24,8)](../tests/fixtures/route-attempts/tibet-13-bridge-switch.json) | 38, 47 |
| Tibet 14 · secreta (13) | Saída comum (5,21) | Percurso aprovado · [1016 ticks](../tests/fixtures/routes/tibet-14-normal-hook.json) · [tentativa anterior em (18,16)](../tests/fixtures/route-attempts/tibet-14-traps.json) | 38, 47 |

## Percursos aprovados

- [Angkor 1](../tests/fixtures/routes/angkor-01-normal.json): 398 ticks de controles, 1 dano, 0 retornos; equipamento inicial 0; diálogos nenhum.
- [Angkor 2](../tests/fixtures/routes/angkor-02-normal.json): 722 ticks de controles, 1 dano, 0 retornos; equipamento inicial 0; diálogos nenhum.
- [Angkor 3](../tests/fixtures/routes/angkor-03-normal.json): 1248 ticks de controles, 3 danos, 0 retornos; equipamento inicial 0; diálogos 30.
- [Angkor 4](../tests/fixtures/routes/angkor-04-hammer-normal.json): 1894 ticks de controles, 9 danos, 1 retorno; equipamento inicial 0; diálogos 22.
- [Angkor 5](../tests/fixtures/routes/angkor-05-normal.json): 1953 ticks de controles, 5 danos, 1 retorno; equipamento inicial 1; diálogos nenhum.
- [Angkor 6](../tests/fixtures/routes/angkor-06-normal.json): 662 ticks de controles, 1 dano, 0 retornos; equipamento inicial 1; diálogos 3.
- [Angkor 7](../tests/fixtures/routes/angkor-07-normal.json): 1205 ticks de controles, 2 danos, 0 retornos; equipamento inicial 1; diálogos nenhum.
- [Angkor 7](../tests/fixtures/routes/angkor-07-secret-hook.json): 1755 ticks de controles, 5 danos, 0 retornos; equipamento inicial 2; diálogos nenhum.
- [Angkor 8](../tests/fixtures/routes/angkor-08-normal.json): 2867 ticks de controles, 6 danos, 1 retorno; equipamento inicial 1; diálogos nenhum.
- [Angkor 8](../tests/fixtures/routes/angkor-08-secret-ice.json): 791 ticks de controles, 2 danos, 0 retornos; equipamento inicial 8; diálogos nenhum.
- [Angkor 9](../tests/fixtures/routes/angkor-boss-crystal.json): 1121 ticks de controles, 0 danos, 0 retornos; equipamento inicial 1; diálogos 33, 32.
- [Angkor 11](../tests/fixtures/routes/angkor-11-secret.json): 1347 ticks de controles, 5 danos, 2 retornos; equipamento inicial 2; diálogos nenhum.
- [Angkor 13](../tests/fixtures/routes/angkor-13-secret.json): 529 ticks de controles, 0 danos, 0 retornos; equipamento inicial 1; diálogos nenhum.
- [Angkor introdução](../tests/fixtures/routes/angkor-introduction.json): 1428 ticks de controles, 0 danos, 2 retornos; equipamento inicial 0; diálogos 29, 10, 11, 13, 15, 16, 17, 28.
- [Bavaria 10](../tests/fixtures/routes/bavaria-boss-crystal.json): 1465 ticks de controles, 2 danos, 0 retornos; equipamento inicial 2; diálogos 34, 30.
- [Tibet 2](../tests/fixtures/routes/tibet-02-normal.json): 1949 ticks de controles, 5 danos, 0 retornos; equipamento inicial 2; diálogos nenhum.
- [Tibet 2](../tests/fixtures/routes/tibet-02-secret.json): 321 ticks de controles, 1 dano, 0 retornos; equipamento inicial 2; diálogos nenhum.
- [Tibet 3](../tests/fixtures/routes/tibet-03-normal.json): 727 ticks de controles, 4 danos, 0 retornos; equipamento inicial 2; diálogos nenhum.
- [Tibet 5](../tests/fixtures/routes/tibet-05-secret.json): 209 ticks de controles, 1 dano, 0 retornos; equipamento inicial 2; diálogos nenhum.
- [Tibet 6](../tests/fixtures/routes/tibet-06-normal-ice.json): 752 ticks de controles, 3 danos, 0 retornos; equipamento inicial 8; diálogos nenhum.
- [Tibet 11](../tests/fixtures/routes/tibet-boss-crystal.json): 3145 ticks de controles, 1 dano, 0 retornos; equipamento inicial 8; diálogos 35.
- [Tibet 14](../tests/fixtures/routes/tibet-14-normal-hook.json): 1016 ticks de controles, 0 danos, 0 retornos; equipamento inicial 2; diálogos nenhum.

Angkor 1–8 comprovam a saída comum, sem exigir coleta de todos os diamantes/baús. Angkor 3 abre as fechaduras prateada e dourada. Angkor 4 resolve sua sala de combate e usa pedras nas duas placas, obtém o martelo, executa seu aviso 22 e quebra tijolos para sair; começa com os recursos explicitados da campanha e inclui uma morte com retorno ao círculo. Angkor 5 resolve as duas placas, vence a cobra vermelha com golpes reais de martelo, pega a chave dourada e sai; seu percurso inclui uma morte e recuperação da sala inicial. Angkor 6 atravessa o poço das pedras, aciona o checkpoint, executa a cena 3, abre o baú vermelho e chega à saída. Angkor 7 vence outra sala de combate, empilha duas pedras para manter a placa pressionada, obtém a chave dourada e sai. Sua saída secreta também foi aprovada com gancho predefinido: desloca a segunda pedra para liberar o retorno e atravessa o portão ainda mantido pela primeira pedra. Angkor 8 abre duas fechaduras prateadas, derrota as cobras da sala, leva uma pedra à placa, usa a chave dourada e sai. Sua saída secreta foi aprovada com martelo de gelo predefinido. Angkor 13, fase secreta, foi concluída desde o spawn com martelo comum, três barreiras de tijolos rompidas e dois checkpoints ativados, sem receber dano. Em Angkor 10, uma tentativa com gancho predefinido põe uma pedra na primeira placa, atravessa o portão, ativa o checkpoint e alcança a segunda placa; a saída ainda não foi aprovada. Os chefes de Angkor e Bavaria comprovam todos os golpes, reposição das pedras, derrota, cristal e diálogo final. Tibet comprova cinco impactos após congelar/puxar inimigos reais, as cinco alternâncias da ponte, a derrota, o cristal e a apresentação de entrada 35. O cristal pede o roteiro 31 em method_322, mas esse ID está ausente do demo.f canônico; nenhum diálogo final de Tibet foi reproduzido ou inventado. A introdução cobre a caminhada automática e os oito roteiros, incluindo os dois retornos ao círculo. Bavaria 1 tem tentativas por controles até o segundo checkpoint e um poço de tijolos aberto pelo martelo, com dois trituradores destruídos por pedras e quatro joias adicionais; outra tentativa usa o martelo comum para destruir duas gramas sob uma coluna de pedras, sem atravessar a passagem. Bavaria 2 agora tem uma tentativa reproduzível que ativa dois checkpoints e destrói as duas metades de cada triturador com bolas rolantes; a saída ainda não foi certificada.

Bavaria 3 tem um percurso parcial que quebra a barreira inicial, ativa dois checkpoints e abre temporariamente a porta de uma placa; a saída e a aquisição do gancho ainda precisam ser verificadas. Bavaria 7, com o equipamento de gancho predefinido, aciona a mina, o checkpoint e o interruptor da ponte inferior com martelo comum; sua saída secreta continua pendente. Bavaria 8 alcança o primeiro checkpoint e ativa a sala de combate desde o spawn; as duas eliminações exigidas e a saída seguem pendentes. Tibet 2 agora tem as saídas comum e secreta aprovadas. A rota comum parte do spawn com gancho e armadura de oito corações explícitos, atravessa as armadilhas de teto, vence duas salas de desafio, coleta as duas chaves em baús, abre as fechaduras, aciona a ponte de gelo e sai pela passagem comum. Tibet 4 tem uma tentativa reproduzível até o primeiro checkpoint e a primeira placa, com queda de pesos de gelo; as portas e a saída permanecem pendentes. Tibet 6 tem saída comum aprovada desde o spawn com martelo de gelo predefinido: abre um baú de vida, alcança o checkpoint, congela o inimigo, empurra o bloco congelado para cair na placa da porta e sai. A obtenção desse martelo durante a campanha ainda não está certificada. Tibet 12 atravessa nove ativações de armadilhas de teto, abre tijolos, chega ao segundo checkpoint, coleta a primeira chave prateada, abre sua fechadura e aciona a placa seguinte. A armadilha perto do baú destrói o apoio da pedra necessária para manter a passagem aberta nessa tentativa; a saída segue pendente. Tibet 14 agora tem saída comum aprovada desde o spawn com gancho predefinido: remove as pedras que bloqueiam o corredor, aciona o checkpoint e a placa superior, atravessa nove armadilhas de teto e alcança a saída inferior.

Tibet 1 agora tem uma tentativa desde o spawn que abre o baú vermelho, ativa o primeiro checkpoint, atravessa dezessete armadilhas de teto e chega sem dano à fechadura dourada da saída; a chave e a abertura do portão seguem pendentes. Tibet 5 agora tem uma tentativa única que resolve a sala esquerda, coleta e usa a primeira chave prateada, volta ao ramo superior, desloca uma pedra com o gancho e abre o segundo baú de chave prateada. Ainda falta retornar desse baú, abrir a segunda fechadura e verificar as salas das chaves douradas e a saída comum. A saída secreta dessa fase já tem percurso aprovado. Tibet 13 agora tem uma tentativa reproduzível que quebra a primeira barreira de tijolos, alterna a ponte de gelo duas vezes e alcança a primeira fechadura prateada; suas chaves e saída ainda não foram verificadas.

Tibet 8 tem uma tentativa desde o spawn com martelo de gelo predefinido: aciona o primeiro checkpoint, rompe a barreira superior, congela e desloca dois atiradores e registra a morte de um deles por projétil do outro. Falta a segunda eliminação exigida pelo enigma e a saída. Tibet 9 tem uma tentativa que rompe três barreiras, cruza o primeiro portão, alcança o checkpoint e ativa a placa superior que abre outro portão; a saída continua pendente.

Bavaria 12, fase secreta, tem uma tentativa desde o spawn: quebra a entrada, cruza o corredor superior, ativa o primeiro checkpoint e aciona a placa inferior. O portão volta a fechar antes da travessia; as chaves e a saída ainda não foram verificadas. Bavaria 13, também secreta, tem um percurso parcial sem dano: usa o gancho para retirar a pedra da base, abre o poço de tijolos e ativa o primeiro checkpoint com o diálogo original 19. A chave prateada e a saída ainda não foram verificadas.

Angkor 11 secreta tem saída aprovada desde o spawn com gancho predefinido: ativa três checkpoints, abre a fechadura dourada e alcança a saída após dois retornos ao círculo. Angkor 12 tem uma tentativa reproduzível desde o spawn, também com gancho inicial explícito: as três primeiras salas de cobras e pedras são resolvidas e seus baús entregam três chaves douradas. O segundo checkpoint é ativado e a quarta sala de combate começa; sua chave e as fechaduras finais ainda não têm percurso aprovado. Bavaria 4 atravessa a primeira parede de pedras com cinco puxões do gancho e alcança a segunda coluna; as saídas comum e secreta seguem pendentes. Bavaria 5 alcança o primeiro checkpoint com gancho; Bavaria 6 limpa a primeira barreira com uma mina, pega duas chaves prateadas nos baús, abre suas fechaduras e ativa o primeiro checkpoint; Bavaria 9 chega à fechadura dourada junto ao portão da saída, mas ainda não obtém a chave; Bavaria 11 secreta aciona seu primeiro checkpoint e a placa que inicia a abertura do portão. Tibet 10 ativa seu primeiro enigma de quatro inimigos e alcança a fechadura de diamantes superior com martelo de gelo predefinido. Essas cinco saídas seguem pendentes. Tibet 3 tem saída comum aprovada: o tiro vertical do inimigo quebra a vegetação sob uma pedra, que o esmaga; o gancho então desloca a pedra e libera o corredor.

## Começo de campanha desde New Game

- [Percurso salvo](../tests/fixtures/campaign-routes/angkor-start.json): introdução e 9 fases encadeadas, com recursos derivados da campanha, recompensas, recarga JSON e importação/reexportação RMS após cada conclusão.
- Resultado: 82 diamantes, 1 vermelhos, 12 vidas, saúde 1/4 e equipamento 1. RMS SHA-256: `16b690e2380b99ef57e0236046d4668c15cf8d6b5d2636f35e2c9fa8d5fcb683`.

A fase 5 recebe 37 diamantes, sete vidas, saúde 1 e o martelo da fase 4; termina com 58 diamantes, seis vidas e saúde 3. A fase 6 usa esses recursos, termina com 68 diamantes, um vermelho, oito vidas após as recompensas e saúde 1, liberando Angkor 7. A fase 7 obtém cura, resolve a sala de combate, coloca uma pedra na placa, pega a chave e sai com 70 diamantes, um vermelho, nove vidas após a recompensa e saúde 2, liberando Angkor 8. A campanha encadeada comprova a introdução, Angkor 1–8 e o chefe de Angkor, incluindo a aquisição e persistência do martelo. A fase 8 termina com 82 diamantes, um vermelho, oito vidas e saúde 1; o chefe é derrotado com esses recursos e deixa doze vidas após as recompensas. A fase 2 começa com saúde 3 e seis vidas da fase 1; a fase 4 recebe saúde 3, oito vidas e equipamento 0 da fase 3. A morte da fase 4 retorna ao checkpoint sem impedir a aquisição posterior do martelo. Os baús de cura/chaves/equipamento continuam consumidos após recarga. O RMS armazena vida máxima, e a importação repõe a saúde; ele é conferido separadamente, sem substituir os recursos do percurso. Como no fluxo atual do jogo, os recursos das lições da introdução não são transferidos à campanha. Isso ainda não comprova gancho/gelo na campanha, os chefes posteriores na campanha, Bavaria, Tibet, finais ou segredos.

## Próximas verificações

1. Obter os diamantes vermelhos necessários para abrir Bavaria após o chefe de Angkor e certificar a primeira fase. Conferir a continuidade de física/animações com uma execução Java completa.
2. Obter gancho e gelo durante a campanha nova e encadear os percursos com os recursos, recompensas e save reais.
3. Aprovar cada saída comum/secreta e as dez fases secretas. Exigir todas as saídas de um mapa antes de marcá-lo como aprovado.
4. Repetir os demais percursos com mortes/checkpoints e recarga do save; depois comparar percursos e tempos com a execução Java.

## Objetos para revisão de cobertura

- 8: Minas: queda padrão/explosão implementadas; água e demais casos de method_351.
- 37: Escombros explosivos implementados; inundação de method_397 pendente.
- 38: Emissor de água 38: inicialização e propagação de method_293/method_369 pendentes.
- 47: Peso de gelo 47: queda, placa e empurrão implementados, deposição comparada com Java; água pendente.
- 48: Deslizador 48: par, queda, puxão e empurrão implementados, descida comparada com Java; ligação visual e água pendentes.

As placas de objeto 6 foram implementadas com abertura/fechamento, esmagamento, scan antes da queda e afundamento visual. Há 137 casos comparados com métodos originais extraídos e executados em Java (`tests/pressure.test.ts`, `tools/trace-pressure-s700.ts`). O harness isola os métodos e substitui som, invalidação visual, efeito de destruição e callback de dano; não certifica execução integral do jogo ou os comportamentos ainda ausentes dos tiles 47/48.

Salas de combate/tochas, câmera, pistas, liberação de prêmios, crawler e mecanismos de minas/barreiras têm 667 estados adicionais comparados com Java isolado. Os percursos de Angkor 3–5 e dos três chefes foram regravados com esses eventos ativos. Ver `RIDDLES.md` e `STAGE_MECHANISMS.md` para métodos, hashes e limites da comparação.

## Reproduzir

Após `npm run extract-assets`, execute `npm run verify:routes`. A verificação falha se os resultados gravados mudarem, se algum percurso aprovado não terminar ou se um chefe não tiver sido derrotado. `npm test` também executa os percursos e verifica a reconstrução dos replays.

Para regenerar esta tabela e `PLAYABILITY.json`: `npm run verify:routes -- --write-report`. Os arquivos de tentativa são conferidos separadamente e nunca entram na contagem de aprovação.
