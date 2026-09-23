# Chefes da versão S700

A primeira luta implementada é a da fase 8 de Angkor Wat (fase 9 no menu). Referência: `cGame.java` da decompilação S700 fixada no fluxo de build, sobretudo `method_186`, `method_274–280`, `method_322` e `method_347`. O chefe usa os sprites `b0.f`/0–1; a chama usa `gen1.f`/0 e a explosão `gen0.f`/3. As plataformas e pedras vêm do mapa original.

O Java inicia o chefe com 3 pontos de vida e três posições em X: 10, 12 e 15. Ele desperta quando o herói alcança X 10, sobe, fixa uma barreira de dois quadrados, sofre dano somente se uma pedra alcançar X da sua coluna nas linhas 7 ou 8, recua e então lança o ataque. A coluna seguinte depende da posição do herói. Ao perder o terceiro ponto, a sequência de derrota dura mais 80 ticks. O retorno ao checkpoint recria os 3 pontos de vida e o estado inicial.

O baú em (27, 6) contém o Cristal de Fogo (tile 53), e `method_322` agenda o roteiro 32. O port mostra o sprite `mmv.f`/3 acima do herói, reproduz esse roteiro e conclui a fase ao fim da abertura do baú.

O chefe de Bavaria foi traçado de `cGame.method_129/269/280/347`. Ele começa adormecido em X 408 pixels, com 4 pontos de vida. Quando o herói passa por ele, a apresentação termina e começa a patrulha horizontal. Os estados 0–11 controlam deslocamento, investida, perseguição, salto, dano e escolha de direção; 12 e 15 são derrota e fim. O port usa as animações originais `b1.f`/0, inclusive seus deslocamentos, e a explosão `gen0.f`/3. Pedras descendo nas linhas 21–22 da área ocupada pelo chefe causam dano e viram tijolos quebrados. Durante o salto, a arena pode receber novas pedras nos pontos superiores X 16 e 19. O retorno ao checkpoint restaura os quatro pontos de vida.

Os baús finais de Bavaria e Tibet contêm os cristais 51 e 52, respectivamente, e disparam os roteiros 30 e 31. A luta de Tibet ainda não foi portada.

Os testes exercitam os dois mapas extraídos: empurrar pedras reais da arena até atingirem cada chefe, impactos, derrota, retorno ao checkpoint, replays e conclusão pelos cristais. Ainda falta comparar quadro a quadro com o emulador os deslocamentos, efeitos sonoros e alguns tempos das animações.
