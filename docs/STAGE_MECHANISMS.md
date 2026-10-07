# Inimigos de parede, tochas, minas e barreiras — S700

Referência: [Diamond-Rush-Decomp, de palaceswitcher](https://github.com/palaceswitcher/Diamond-Rush-Decomp/tree/5e05c42aa1aae3377790600eb6d27497101b79e7), commit `5e05c42aa1aae3377790600eb6d27497101b79e7`. Sprites, mapas e comportamento vêm da pesquisa do jogo original da Gameloft. A implementação web e os capturadores de comparação estão neste repositório.

## Comportamento implementado

| Sistema | Fonte e comportamento | Limite da cobertura |
|---|---|---|
| Inimigo de parede 11 | Ramo sem água de `method_331`, `method_310/298/345`: segue paredes conforme direção e lado codificados, vira nos cantos, atualiza o deslocamento, causa dano e preserva a ordem de leitura da célula de destino | Água desativada no harness; a comparação executa uma chamada de método por caso |
| Tocha 36 | `method_318`: acende uma vez com o inimigo 11 acima, reduz o contador da sala e causa dano ao herói sobre a chama; usa a animação original acesa/apagada | Áudio e invalidação visual substituídos no harness |
| Escombros 37 | `method_330`: ficam imóveis no estado zero, avançam a destruição após impacto e desaparecem no estado 8; desenho usa os módulos originais | Inundação de `method_397` ainda pendente |
| Mina 8 e explosão 54 | Queda padrão, explosão após cair duas linhas ou receber uma pedra, reação em cadeia, impacto em escombros/tijolos, dano e destruição dos inimigos previstos por `method_317`; duração de 12 ticks conferida em `gen0.f/3` | O trace cobre a explosão, não `method_351` inteiro; água e estados especiais de queda permanecem pendentes |
| Interruptor 18 e barreiras 34/35 | `method_232/235` e bloco de animação de `method_236`: exige martelo de gelo, não alterna durante uma transição nem sobre os objetos 15/16; alternância de 0 a 9 com troca dos planos na posição 5 e sprites/paletas originais | A ligação visual do objeto móvel 48 e a inundação permanecem pendentes; a arena do chefe de Tibet conserva sua lógica própria |
| Triturador 16 e bola rolante 14 | `method_337/343`: uma pedra que desce sobre o triturador destrói as duas metades; uma bola 14 também o destrói quando chega pelo lado configurado. O mesmo impacto lateral destrói cobras | O ramo mais amplo de pedra em repouso sobre inimigo de `method_343` muda a rota certificada de Angkor 4 e exige regravação/trace antes de ser ativado |
| Cadeado mágico 12 | `field_156/157/158`, `method_352` e prêmio 41: a fase guarda seu próprio alvo de diamantes, diminui o contador durante a coleta e restaura-o no checkpoint | Os 12 alvos de Bavaria foram conferidos em `w1.bin`. O `i.class` do JAR `(a2)` escolhido também remove o tile 12 ao carregar (offset 2204, `bastore` em 2213). A gravação de outra variante mostra bloqueio físico e não foi usada como regra da S700 |
| Peso de gelo 47 | `method_351/311`: participa da mesma queda das pedras e deposita a placa de gelo 35 no plano de objetos quando repousa sobre suporte; queda, checkpoint e replay exercitados | A deposição foi comparada com Java; a queda completa de `method_351` em água e percursos de saída nas fases posteriores ainda faltam |
| Deslizador pareado 48 | `method_306/263`: a metade superior nasce junto à inferior, ambas descem em conjunto e o gancho desloca as duas na horizontal; queda e puxão exercitados com replay | A descida foi comparada com Java; a atualização de `field_192` em `method_305`, sua ligação visual e a interação com água ainda faltam |

As alterações das barreiras e entidades entram no checkpoint e no replay. A destruição chama o contador da sala de desafio e usa a fumaça original. O martelo comum quebra tijolos e também destrói grama nas fases secas: `method_230` verifica o estado ambiental `field_487 == 3`, não o nível do martelo. A explosão de mina usa a mesma condição ambiental em `method_317`. A colisão com a grama usa o mesmo estado e o checkpoint o restaura; a inundação que altera esse estado ainda não é simulada pelo port.

## Comparação executada em Java

`tools/trace-crawler-s700.ts` extrai os métodos originais e registra **174 casos** de movimento, obstáculos, fases de portão, deslocamento e contato com o herói. `tests/crawler.test.ts` compara tiles, estado, deslocamento e dano.

`tools/trace-mechanisms-s700.ts` extrai `method_318/330/317/232/235/298` e o bloco original de animação das barreiras em `method_236`. Registra **189 casos**: 12 de tocha, 11 de escombros, 26 de explosão, 108 de acionamento e 32 de avanço das barreiras. `tests/mechanisms.test.ts` compara planos, estados, posição/sentido da ponte e callbacks de dano, destruição e solução da sala.

`tools/trace-tibet-movers-s700.ts` extrai `method_308/311/305/306` e registra **234 casos** isolados de deposição do peso 47 e descida do par 48, incluindo bloqueio, deslocamento e contato com o herói. `tests/mechanisms.test.ts` compara os planos, estados, deslocamentos e dano. A comparação exclui `field_192` e não comprova a física completa com água ou o movimento horizontal do par contra Java.

Exemplo, a partir da raiz deste repositório:

```powershell
node tools/trace-crawler-s700.ts ../../work/reference-s700 ../../work/reference-runtime/jdk/jdk-21.0.12.1+1/bin ../../work/reference-runtime/crawler-reproduced
node tools/trace-mechanisms-s700.ts ../../work/reference-s700 ../../work/reference-runtime/jdk/jdk-21.0.12.1+1/bin ../../work/reference-runtime/mechanisms-reproduced
node tools/trace-tibet-movers-s700.ts ../../work/reference-s700 ../../work/reference-runtime/jdk/jdk-21.0.12.1+1/bin ../../work/reference-runtime/tibet-movers-reproduced
node --test tests/crawler.test.ts tests/mechanisms.test.ts
```

Os arquivos gerados podem ser comparados com os JSON de mesmo nome em `tests/fixtures`. Cada captura guarda hashes do Java normalizado para UTF-8/LF e dos trechos extraídos. O harness do inimigo de parede substitui o callback de dano e desativa água. O dos mecanismos substitui áudio, invalidação visual, inundação, callbacks de solução/destruição/dano e a consulta da duração da explosão, conferida separadamente contra o sprite decodificado.

Os casos executam Java recompilado em um harness isolado, sem emulador, scan completo ou renderizador. Testes adicionais exercitam queda e reação em cadeia de minas, tocha contada por uma sala, dano, retorno ao checkpoint, alternância de barreiras fora da arena e reconstrução por replay. A conferência visual local usou os recursos reais, incluindo a paleta das duas barreiras e a pista da sala em tela estreita. Isso não comprova animações idênticas quadro a quadro ao aparelho original.
