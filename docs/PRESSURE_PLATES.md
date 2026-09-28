# Placas e portões S700

Referência: [Diamond-Rush-Decomp, revisão fixada](https://github.com/palaceswitcher/Diamond-Rush-Decomp/tree/5e05c42aa1aae3377790600eb6d27497101b79e7). Os métodos Java pertencem à decompilação de palaceswitcher; jogo, regras e recursos originais são da Gameloft.

O objeto 6 é uma placa, independente dos itens do plano de tiles. `method_316` considera o herói ou os pesos 0/1/8/9/47/48, com deslocamento menor que 12. `method_256` reduz o contador enquanto o portão está fechado, preserva seu último valor ao abrir e permite reabertura após fechamento. `method_258/259` fecha ao sair da placa, respeita a proteção do tile 32 e esmaga o herói ou os tiles 0/1/19/43/45. O portão avança nos ticks divisíveis por três, dentro do scan ativo, conforme `method_340`.

O scan da placa precede a atualização do peso na mesma célula. Nos últimos 12 pixels da descida, `method_351` avança um pixel nos ticks ímpares e conserva a célula ativa. `method_195` posiciona o módulo original de 24 × 13 pixels no fundo da célula, recortado no seu limite, e calcula a depressão também durante a saída horizontal do herói.

`tests/fixtures/pressure-s700.json` contém 137 resultados medidos em Java: tipos de peso, limiares de movimento, passagem do herói, contadores, fases, esmagamento, depressão e cadência da queda. O capturador extrai os métodos originais, registra hashes do código normalizado em UTF-8/LF e gera um harness compilável com JDK 8 ou posterior:

```powershell
node tools/trace-pressure-s700.ts <reference-s700> <jdk-bin> <output-dir>
```

Os caminhos devem indicar a raiz com `src/cGame.java`, a pasta contendo `java`/`javac` e uma pasta de saída. Compare o JSON gerado com a fixture antes de substituir qualquer expectativa. `npm test` verifica os 137 resultados, ordem do scan, retorno ao checkpoint, esmagamento com invulnerabilidade e uma pedra realmente empurrada sobre a primeira placa de Angkor 4.

O harness executa os métodos extraídos, com som, invalidação visual, efeito de destruição e callback de dano substituídos. Registra o dano solicitado, sem executar o tratamento de morte Java. Não executa o scan completo, não desenha pixels, não roda o JAR original e não prova paridade de uma fase inteira. Os comportamentos especiais dos tiles 47/48 continuam pendentes.

Separadamente, os percursos de controles comprovam Angkor 3 com ambas as chaves e Angkor 4 com as duas placas, morte/retorno, aquisição do martelo, aviso original e destruição dos tijolos da saída. O percurso desde New Game deriva os recursos entre as quatro fases e confere JSON/RMS após cada conclusão. Veja [PLAYABILITY.md](PLAYABILITY.md).
