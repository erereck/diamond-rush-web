# Progresso e próximos marcos

Estado em 22/09/2026. Fonte canônica S700 1.2.0. Referências Nokia e ferramentas são comparativas; não misturar regras de execução.

| Área | Estado | Limitação restante |
|---|---|---|
| Auditoria e hashes | Implementada; JAR fornecido coincide em 40/40 recursos com a referência S700 | Validar a identidade da lógica executável por trace |
| Packs, strings e sprites | Todos os recursos decodificados | Comparação visual externa com Java/aparelho |
| 41 mapas / três planos | Decodificados integralmente | Semântica de todos os parâmetros e objetos |
| Renderização Canvas | Implementada, com desenhos provisórios de alguns objetos | Ordem exata, animações e efeitos por entidade |
| Relógio e câmera | Inteiros, 20 Hz, teste independente de refresh | Comparação de traces Java |
| Controles | Teclado, toque, pausa e retorno ao círculo também na introdução; gamepad implementado | Testar controle físico e armas |
| Movimento / pedras / coleta / cobras | Subconjunto experimental; chão transitável alinhado aos casos de `method_288`, giro visual da pedra, esquerda do herói, esmagamento sob pedra e patrulha de cobras vermelhas corrigidos | Água, colisões especiais, perseguição das cobras vermelhas e demais regras |
| Itens, chaves e portões | Chaves prateadas/douradas, vida extra, cura, fechaduras numeradas e abertura animada da passagem | Tempo fino das animações, interruptores, equipamentos e puzzles restantes |
| Fogo e baús de Angkor | Alcance, dano, abertura e prêmio visível; baús comuns concedem a quantidade codificada no mapa | Validar tempos por trace Java e efeitos de partículas/áudio |
| Tijolos destrutíveis | Frame imóvel até impacto, quebra de 16 ticks e propagação aos vizinhos | Integrar com os projéteis e armas originais |
| Checkpoint e morte | Snapshot/restore, vidas, dano e retorno após animação | Integrar com RMS, vida máxima e demais equipamentos |
| Campanha / cenas / menus | Menu S700, mapas dos três mundos e abertura de Angkor índice 13 jogável entre seis gatilhos de `demo.f`, com física ativa durante as cenas; conclusão retorna ao mapa | Paridade fina dos eventos e animações J2ME, regras canônicas de desbloqueio, save RMS e demais cenas |
| Save RMS | Codec e modelo inicial, 994 bytes | Integração de campanha e save real de referência |
| Replay de desenvolvimento | Versionado, validado e restaurável, inclusive recursos iniciais de uma fase seguinte | Golden traces comparados ao original |
| MIDI | Parsing das 21 faixas e prévia | Eventos de jogo, sintetizador/timbres equivalentes |

## Próximo marco de gameplay

1. Construir um trace de referência do JAR identificado por recursos: entradas, posições, arrays e mudanças de estado por tick. O binário ainda não foi executado em emulador para comparação diferencial.
2. Completar `method_288`, `method_304` e `method_351`, inclusive ativação e ordem de atualização. Cobrir limiares, movimento de entidades no mesmo tick, gravidade e colisão com testes de comportamento.
3. Comparar o checkpoint, morte/vidas e baú já implementados com traces da execução canônica, inclusive a ordem dos eventos em cada tick.
4. Completar objetos e mecanismos necessários à primeira fase, depois exigir um percurso verificável de entrada até saída. Conclusão experimental atual não equivale à progressão original.
5. Integrar campanha e save RMS, ampliar a execução de `DemoInterpreter` para as demais cenas e comparar os gatilhos jogáveis do tutorial índice 13 com uma execução do JAR original.

Depois: três mundos, segredos, chefes, inventário/armas, UI, música e testes de paridade de cada sistema. A lista não é uma alegação de cobertura atual.
