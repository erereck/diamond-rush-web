# Progresso e próximos marcos

Estado em 22/09/2026. Fonte canônica S700 1.2.0. Referências Nokia e ferramentas são comparativas; não misturar regras de execução.

| Área | Estado | Limitação restante |
|---|---|---|
| Auditoria e hashes | Implementada | Obter e identificar o executável canônico |
| Packs, strings e sprites | Todos os recursos decodificados | Comparação visual externa com Java/aparelho |
| 41 mapas / três planos | Decodificados integralmente | Semântica de todos os parâmetros e objetos |
| Renderização Canvas | Implementada, com desenhos provisórios de alguns objetos | Ordem exata, animações e efeitos por entidade |
| Relógio e câmera | Inteiros, 20 Hz, teste independente de refresh | Comparação de traces Java |
| Controles | Teclado e toque verificados; gamepad implementado | Testar controle físico e ações |
| Movimento / pedras / coleta / cobras | Subconjunto experimental | Água, colisões especiais, cobras vermelhas e demais regras |
| Checkpoint e morte | Marcador e tela final provisórios | Snapshot/restore, vidas, temporizações, respawn |
| Campanha / cenas / menus | Pendente | Fluxo começa na introdução Angkor índice 13 |
| Save RMS | Codec e modelo inicial, 994 bytes | Integração de campanha e save real de referência |
| Replay de desenvolvimento | Versionado, validado e restaurável | Golden traces comparados ao original |
| MIDI | Parsing das 21 faixas e prévia | Eventos de jogo, sintetizador/timbres equivalentes |

## Próximo marco de gameplay

1. Construir um trace de referência do S700 identificado: entradas, posições, arrays e mudanças de estado por tick. O clone contém fontes e recursos; não foi executado um JAR canônico validado.
2. Completar `method_288`, `method_304` e `method_351`, inclusive ativação e ordem de atualização. Cobrir limiares, movimento de entidades no mesmo tick, gravidade e colisão com testes de comportamento.
3. Implementar checkpoints pelos campos copiados em `method_346/347`, mortes/vidas e restauração, mantendo o tempo original.
4. Completar objetos e mecanismos necessários à primeira fase, depois exigir um percurso verificável de entrada até saída. Conclusão experimental atual não equivale à progressão original.
5. Integrar campanha, save RMS e a VM de cenas `DemoInterpreter`; reproduzir introdução índice 13 e liberar fases por regras originais.

Depois: três mundos, segredos, chefes, inventário/armas, UI, música e testes de paridade de cada sistema. A lista não é uma alegação de cobertura atual.
