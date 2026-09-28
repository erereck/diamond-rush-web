# Salas de desafio e cobra vermelha — S700

Referência: [Diamond-Rush-Decomp, de palaceswitcher](https://github.com/palaceswitcher/Diamond-Rush-Decomp/tree/5e05c42aa1aae3377790600eb6d27497101b79e7), commit `5e05c42aa1aae3377790600eb6d27497101b79e7`. Os métodos e recursos pertencem à pesquisa do jogo original da Gameloft; o port implementa o comportamento em TypeScript.

## Comportamento implementado

- `method_296`: os marcadores 17 identificam inimigos, tochas, portões e baús de cada sala. Os inimigos e as tochas formam o contador; os baús marcados ficam bloqueados. O port guarda esse bloqueio separadamente para preservar os parâmetros originais dos prêmios.
- `method_319/302`: o gatilho 26 fecha a porta atrás do herói e escolhe o alvo da câmera na ordem original de leitura. A câmera apresenta uma porta, um baú ou um interruptor marcado.
- `method_301`: a apresentação viaja a 8 pixels por tick, espera 40 ticks, fecha a porta no tick 30, volta a 5 pixels por tick e exibe a pista original por 80 ticks. O mundo continua sendo atualizado; a ação pode interromper o bloqueio de controle. A câmera permanece no enquadramento até o jogador voltar a andar.
- `method_327/303`: a destruição reduz o contador da sala selecionada. Ao chegar a zero, abre as portas e libera os baús, preservando os contadores das placas de pressão. O Java usa um contador global da sala ativa, não uma checagem de pertencimento do inimigo destruído. Durante a luta, o chefe vivo impede essa redução; sua derrota libera o objetivo da arena.
- `method_233`: a cobra vermelha começa com dois segmentos extras de resistência. Três golpes novos a derrotam; bater enquanto ela ainda está atordoada apenas renova o atordoamento. A destruição usa a fumaça original de `method_335`.

Contadores, bloqueios, portas e estados das entidades são restaurados pelo checkpoint. O replay reconstrói a apresentação e a pista usando controles regulares. As pistas são desenhadas com o texto e a fonte S700 dentro do canvas.

## Comparação executada em Java

`tools/trace-riddles-s700.ts` extrai literalmente `method_233/335/327/319/298/300/301/302/303/257/258` do Java fixado, compila com JDK 21 (`--release 8`) e registra **125 casos / 304 snapshots**. `tests/riddles.test.ts` compara resistência, atordoamento, destruição, portas, contador, alvo, câmera, pista e a sequência de 180 ticks da apresentação.

Exemplo, a partir da raiz deste repositório:

```powershell
node tools/trace-riddles-s700.ts ../../work/reference-s700 ../../work/reference-runtime/jdk/jdk-21.0.12.1+1/bin ../../work/reference-runtime/riddles-reproduced
node --test tests/riddles.test.ts
```

O arquivo gerado `riddles-s700.json` pode ser comparado com `tests/fixtures/riddles-s700.json`. Ele registra o commit, o SHA-256 do Java normalizado para UTF-8/LF e dos métodos extraídos. Áudio, invalidação visual, destroços de porta, dano solicitado e medição de texto são callbacks substituídos. A inicialização é montada a partir de `method_296`, sem executar esse método completo. Esta comparação não executa o scan completo, o renderizador ou o emulador.

Além desses casos isolados, os percursos normais de Angkor 3, 4 e 5 e dos três chefes atravessam salas com controles desde o spawn. Angkor 4 inclui uma morte e retorno ao círculo; Angkor 5 vence a cobra vermelha para liberar a chave. O começo de campanha conserva os recursos reais até Angkor 5. Veja [PLAYABILITY.md](PLAYABILITY.md) para resultados e limites: essas rotas demonstram conclusão no port, não paridade integral com uma partida Java.
