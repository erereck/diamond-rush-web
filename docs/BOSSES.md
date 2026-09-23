# Chefes da versão S700

A primeira luta implementada é a da fase 8 de Angkor Wat (fase 9 no menu). Referência: `cGame.java` da decompilação S700 fixada no fluxo de build, sobretudo `method_186`, `method_274–280`, `method_322` e `method_347`. O chefe usa os sprites `b0.f`/0–1; a chama usa `gen1.f`/0 e a explosão `gen0.f`/3. As plataformas e pedras vêm do mapa original.

O Java inicia o chefe com 3 pontos de vida e três posições em X: 10, 12 e 15. Ele desperta quando o herói alcança X 10, sobe, fixa uma barreira de dois quadrados, sofre dano somente se uma pedra alcançar X da sua coluna nas linhas 7 ou 8, recua e então lança o ataque. A coluna seguinte depende da posição do herói. Ao perder o terceiro ponto, a sequência de derrota dura mais 80 ticks. O retorno ao checkpoint recria os 3 pontos de vida e o estado inicial.

O baú em (27, 6) contém o Cristal de Fogo (tile 53), e `method_322` agenda o roteiro 32. O port mostra o sprite `mmv.f`/3 acima do herói, reproduz esse roteiro e conclui a fase ao fim da abertura do baú. A mesma conclusão foi ligada aos cristais 51 e 52 de Bavaria e Tibet, mas as lutas desses mundos ainda não foram implementadas.

Os testes exercitam o mapa extraído, inclusive empurrar a pedra real da arena até ela atingir o chefe, três impactos, derrota, retorno ao checkpoint e conclusão pelo Cristal de Fogo. Ainda falta uma comparação quadro a quadro no emulador para os deslocamentos verticais, efeitos sonoros e o comportamento dos dois chefes seguintes.
