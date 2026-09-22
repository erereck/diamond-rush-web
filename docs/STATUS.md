# Progresso e próximos marcos

Estado em 22/09/2026. Fonte canônica S700 1.2.0. Referências Nokia e ferramentas são comparativas; não misturar regras de execução.

| Área | Estado | Limitação restante |
|---|---|---|
| Auditoria e hashes | Implementada | Obter e identificar o executável canônico |
| Packs, strings e sprites | Todos os recursos decodificados | Comparação visual externa com Java/aparelho |
| 41 mapas / três planos | Decodificados integralmente | Semântica de todos os parâmetros e objetos |
| Renderização Canvas | Implementada, com desenhos provisórios de alguns objetos | Ordem exata, animações e efeitos por entidade |
| Relógio e câmera | Inteiros, 20 Hz, teste independente de refresh | Comparação de traces Java |
| Controles | Teclado, toque e ação de checkpoint; gamepad implementado | Testar controle físico e armas |
| Movimento / pedras / coleta / cobras | Subconjunto experimental; chão transitável alinhado aos casos de `method_288`, giro visual da pedra, esquerda do herói e esmagamento sob pedra corrigidos | Água, colisões especiais, cobras vermelhas e demais regras |
| Itens, chaves e portões | Chaves prateadas/douradas, vida extra, cura, fechaduras numeradas e abertura animada da passagem | Tempo fino das animações, interruptores, equipamentos e puzzles restantes |
| Fogo e baús de Angkor | Alcance, dano, abertura e prêmio visível; baús comuns concedem a quantidade codificada no mapa | Validar tempos por trace Java e efeitos de partículas/áudio |
| Checkpoint e morte | Snapshot/restore, vidas, dano e retorno após animação | Integrar com RMS, vida máxima e demais equipamentos |
| Campanha / cenas / menus | Menu S700 e mapas dos três mundos com sprites originais, navegação pelas ligações, seleção de fases, desbloqueio simplificado e progresso local; conclusão retorna ao mapa com vidas e diamantes | Regras canônicas de desbloqueio, save RMS, loja/selo completos, introdução Angkor índice 13 e demais cenas |
| Save RMS | Codec e modelo inicial, 994 bytes | Integração de campanha e save real de referência |
| Replay de desenvolvimento | Versionado, validado e restaurável, inclusive recursos iniciais de uma fase seguinte | Golden traces comparados ao original |
| MIDI | Parsing das 21 faixas e prévia | Eventos de jogo, sintetizador/timbres equivalentes |

## Próximo marco de gameplay

1. Construir um trace de referência do S700 identificado: entradas, posições, arrays e mudanças de estado por tick. O clone contém fontes e recursos; não foi executado um JAR canônico validado.
2. Completar `method_288`, `method_304` e `method_351`, inclusive ativação e ordem de atualização. Cobrir limiares, movimento de entidades no mesmo tick, gravidade e colisão com testes de comportamento.
3. Comparar o checkpoint, morte/vidas e baú já implementados com traces da execução canônica, inclusive a ordem dos eventos em cada tick.
4. Completar objetos e mecanismos necessários à primeira fase, depois exigir um percurso verificável de entrada até saída. Conclusão experimental atual não equivale à progressão original.
5. Integrar campanha, save RMS e a VM de cenas `DemoInterpreter`; reproduzir introdução índice 13 e liberar fases por regras originais.

Depois: três mundos, segredos, chefes, inventário/armas, UI, música e testes de paridade de cada sistema. A lista não é uma alegação de cobertura atual.
