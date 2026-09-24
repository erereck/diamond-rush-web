# Progresso e próximos marcos

Estado em 24/09/2026. Fonte canônica S700 1.2.0. Referências Nokia e ferramentas são comparativas; não misturar regras de execução.

| Área | Estado | Limitação restante |
|---|---|---|
| Auditoria e hashes | Implementada; JAR fornecido coincide em 40/40 recursos com a referência S700 | Validar a identidade da lógica executável por trace |
| Packs, strings e sprites | Todos os recursos decodificados | Comparação visual externa com Java/aparelho |
| 41 mapas / três planos | Decodificados integralmente | Semântica de todos os parâmetros e objetos |
| Renderização Canvas | Implementada, com desenhos provisórios de alguns objetos | Ordem exata, animações e efeitos por entidade |
| Relógio e câmera | Inteiros, 20 Hz, teste independente de refresh | Comparação de traces Java |
| Controles | Teclado, toque, pausa, ação e retorno ao círculo também na introdução; gamepad implementado | Testar controle físico e calibrar escolha automática de alvos |
| Movimento / pedras / coleta / cobras | Subconjunto experimental; chão transitável alinhado aos casos de `method_288`, giro visual da pedra, esquerda do herói, esmagamento sob pedra, patrulha e perseguição curta da cobra vermelha | Água, colisões especiais e demais regras |
| Itens, chaves e portões | Chaves prateadas/douradas, vida extra, cura, conversão da cura em dez diamantes com vida cheia, fechaduras numeradas e abertura animada da passagem | Tempo fino das animações, interruptores e puzzles restantes |
| Martelo, gancho e martelo de gelo | Baús canônicos concedem níveis 1/2/8; ação escolhe alvo próximo; golpe no frame 2 das animações 13–16 e ricochete 41–44 em pedra/parede; martelo quebra tijolos/grama e atordoa cobras; gancho puxa objetos em linha horizontal com frame inicial 20/22; gelo congela diamantes/cobras; progresso persiste entre fases e checkpoints | Demais alvos e casos especiais de `method_230/231/240/263/333`, tempos do gancho e comparação por trace J2ME |
| Fogo e baús de Angkor | Alcance, dano, abertura e prêmio visível; baús comuns concedem a quantidade codificada no mapa | Validar tempos por trace Java e efeitos de partículas/áudio |
| Perigos de Bavaria e Tibet | Roladores de Bavaria (14), armadilhas duplas (16), espinhos (28) e pedras de teto de Tibet (44); inimigo de gelo (45) anda pelos ciclos da sprite; atirador (46) cai e lança projéteis (21); inimigo 49 usa a patrulha de `method_325`. Martelo de gelo congela e descongela 45/46/49. Estados entram no checkpoint e replay | Interações especiais, IA completa dos inimigos 45/46, água, puzzles, projéteis de outras armas e tempos finos |
| Tijolos destrutíveis | Frame imóvel até impacto, quebra de 16 ticks e propagação aos vizinhos | Integrar com os projéteis e armas originais |
| Checkpoint e morte | Snapshot/restore dos planos mutáveis, vidas, dano e retorno após animação | Integrar com RMS, vida máxima e demais equipamentos |
| Campanha / cenas / menus | Menu S700, mapas dos três mundos, seis cenas da abertura, dois roteiros de recuperação, oito gatilhos de mapa e quatro cenas de baú de `demo.f`, com física ativa durante as cenas; conclusão retorna ao mapa; quatro recompensas por fase registradas individualmente; progresso também sincronizado no record 1 RMS | Paridade fina dos eventos/animações J2ME e seis roteiros sem gatilho ativo nesta versão |
| Save RMS | Codec e modelo inicial de 994 bytes; importação/exportação de campanha com recursos, conclusão, recompensas, segredos, baús consumidos e bytes desconhecidos preservados | Compras, vida máxima acima de quatro pontos, comparação com um save real de execução S700 |
| Replay de desenvolvimento | Versionado, validado e restaurável, inclusive equipamento inicial e puxão do gancho | Golden traces comparados ao original |
| MIDI | Parsing das 21 faixas e prévia | Eventos de jogo, sintetizador/timbres equivalentes |

## Próximo marco de gameplay

1. Construir um trace de referência do JAR identificado por recursos: entradas, posições, arrays e mudanças de estado por tick. O binário ainda não foi executado em emulador para comparação diferencial.
2. Completar `method_288`, `method_304` e `method_351`, inclusive ativação e ordem de atualização. Cobrir limiares, movimento de entidades no mesmo tick, gravidade e colisão com testes de comportamento.
3. Comparar o checkpoint, morte/vidas e baú já implementados com traces da execução canônica, inclusive a ordem dos eventos em cada tick.
4. Completar objetos e mecanismos necessários à primeira fase, depois exigir um percurso verificável de entrada até saída. Conclusão experimental atual não equivale à progressão original.
5. Comparar a campanha/RMS sincronizados, as cenas e os gatilhos jogáveis do tutorial índice 13 com uma execução do JAR original.

Depois: três mundos, segredos, chefes, interações restantes das armas, UI, música e testes de paridade de cada sistema. A lista não é uma alegação de cobertura atual.
