# Núcleo S700 gerado

A lógica de jogo do port **não é uma reimplementação**: é a decompilação S700 1.2.0 fixada ([palaceswitcher/Diamond-Rush-Decomp no commit `5e05c42`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/commit/5e05c42aa1aae3377790600eb6d27497101b79e7)) traduzida mecanicamente para TypeScript por `npm run generate-core`, que o CI executa antes de cada build publicado. Este documento explica por que, como o núcleo é gerado, o que o port ainda faz por conta própria e como a equivalência com o Java é verificada.

## Por que um núcleo gerado

As versões anteriores do port reescreviam à mão cada mecânica (movimento, pedras, placas, enigmas, água, chefes) e comparavam trechos isolados com métodos Java. Quando os percursos aprovados naquele motor foram reproduzidos na decompilação recompilada, controlando o jogo inteiro tick a tick, **nenhum concluiu a fase**: pequenas diferenças de temporização (giro antes de andar, tecla consumida após eventos, recuo na direção do atacante, tempo de empurrar) se acumulavam até desviar o percurso. Corrigir mecânica por mecânica não convergia.

O caminho adotado foi executar a própria lógica original. Como o navegador não roda J2ME, a decompilação é traduzida para TypeScript com a semântica de Java preservada e executada sobre uma camada MIDP mínima. Nada derivado da decompilação é versionado: assim como os recursos extraídos, o núcleo é reconstruído a partir do clone fixado.

## Como é gerado

`npm run generate-core` ([`tools/generate-core.ts`](../tools/generate-core.ts)) precisa de um **JDK 21** (o J2TS usa classes internas do `javac`, como `JCConstantCaseLabel`, que o JDK 17 não tem), com `javac`/`java` no `PATH` ou em `DIAMOND_JDK_BIN`, e do clone em `../../work/reference-s700` (ou outro caminho como argumento, ou `DIAMOND_REFERENCE`):

1. Lê `src/*.java` do clone e aplica os patches de harness de [`ReferencePatches.ts`](../tools/routes/ReferencePatches.ts). Os fontes são lidos com fim de linha LF (o hash não depende do checkout). Os patches pontuais exigem que o trecho original exista exatamente uma vez; se a referência mudar, a geração falha. A troca do relógio vale para todas as ocorrências e registra a contagem por arquivo.
2. Compila os stubs J2ME de [`tools/oracle/stubs`](../tools/oracle/stubs) e o tradutor [`tools/j2ts/J2TS.java`](../tools/j2ts/J2TS.java).
3. O J2TS usa as árvores atribuídas do `javac` (tipos já resolvidos) para emitir TypeScript com a semântica de Java: aritmética `int` com estouro de 32 bits (`|0`, `Math.imul`), divisão e resto inteiros que lançam em divisão por zero, estreitamento para `byte`/`short`/`char`, `long` como `BigInt`, `switch` com *fallthrough*, `break`/`continue` rotulados, sobrecargas renomeadas pelo tipo dos parâmetros e campos estáticos de interface. Chamadas estáticas da biblioteca (`String.valueOf`) não recebem a classe como argumento, e `wait`/`notify`/`notifyAll` viram operações vazias: no navegador não há segunda thread (a thread de som do `cSoundEngine` não roda, e nenhuma lógica de jogo lê o estado dela). Um teste impede que essas duas formas voltem ao código gerado. Cada `catch` só captura o tipo declarado: `catch (Exception)` e `catch (Throwable)` capturam os erros do núcleo, mas um `catch (IOException)` deixa passar um `NullPointerException`, como em Java; `printStackTrace` vira registro interno.
4. Concatena as 11 classes em ordem de inicialização estática em `src/generated/s700.ts` (fora do Git), com o SHA-256 dos fontes já corrigidos em `S700_SOURCE_SHA256`. Os percursos gravam os 16 primeiros dígitos desse hash e são recusados se o núcleo vier de outros fontes.

### Patches aplicados

| Patch | Motivo | Efeito na jogabilidade |
|---|---|---|
| Não iniciar a thread do MIDlet (`field_357.start()`) | O host executa os quadros; a thread criaria um segundo laço temporizado | Nenhum: o host repete o corpo de `cGame.run()` uma vez por quadro de 50 ms |
| Remover o desenho de `gameState` no canto da tela | Acréscimo de depuração da própria decompilação (commit `3a89cc1`, `// FIXME: DEBUG ADDITION`), ausente do jogo original | Nenhum: só desenho |
| `new Random(System.currentTimeMillis())` → `new Random(0L)` em `Utils` | Replays reproduzíveis | Os sorteios dos chefes seguem sempre a mesma sequência; no aparelho a semente vem do relógio |
| `System.currentTimeMillis()` → `DeviceClock.now()` | Relógio virtual do aparelho | Leituras de tempo (por exemplo, a animação curta de baú em menos de 5 s) avançam como num aparelho que completa cada quadro em 50 ms |
| `Thread.sleep(n)` → `DeviceClock.sleep(n)` | A pausa de 100 ms ao ativar um checkpoint (`method_236`) passa no relógio do aparelho, não no do host | Nenhum além do original: o quadro seguinte é de atraso (ver abaixo) |
| Somente na JVM: recursos por `OracleIO` | Na JVM, `getResourceAsStream` com caminhos `/x` e leituras parciais não reproduzem o JAR | Nenhum; no TypeScript os recursos vêm de `setResourceProvider` com leituras completas, como no J2ME |

## Execução no navegador

| Camada | Arquivo | Papel |
|---|---|---|
| Biblioteca Java | [`src/core/s700/runtime.ts`](../src/core/s700/runtime.ts) | `String`/`StringBuffer`, `Hashtable`, `java.util.Random` (LCG de 48 bits), fluxos de recursos, aritmética, tradução opcional dos textos decodificados |
| MIDP | [`src/core/s700/j2me.ts`](../src/core/s700/j2me.ts) | `Graphics`/`Image` sobre Canvas 2D (clip, translate, `drawRegion` com as 8 transformações de `Sprite`, `drawRGB`), `GameCanvas`, `RecordStore` em memória; som e vibração inertes (o port os escuta) |
| Host | [`src/core/s700/Engine.ts`](../src/core/s700/Engine.ts) | Inicia o jogo pelo caminho original (menu → New Game), ajusta mundo, fase e record no ponto em que o jogo carrega a fase, entrega teclas como o aparelho (pressionar/soltar na mudança) e avança um quadro por `step()`. Restaura os campos estáticos a cada nova sessão e oferece `snapshot()`/`restore()` |
| Adaptador | [`src/core/Simulation.ts`](../src/core/Simulation.ts) | Estado da sessão (jogando, concluindo, game over, concluída), resultado (saída, saída secreta, cristal, game over), record RMS, sons pedidos ao `cSoundEngine`, idioma e desenho do quadro |

`EngineAssets.prepareEngine()` baixa `assets/res/*` (os recursos originais copiados pela extração), decodifica as imagens PNG embutidas com `createImageBitmap` e liga o desenho. Dentro da fase, **a tela de jogo é desenhada pelo código original**: cenário, HUD, diálogos, telas de resultado, chefes e água. Só o menu de pausa do port é desenhado por cima.

### O quadro do host

Cada `step()` repete uma volta de `cGame.run()` num aparelho que calcula instantaneamente: entrega as teclas, executa a lógica (`method_67`), conta o quadro, executa o **desenho** (`method_132`), zera `field_229`, conta o quadro desenhado (`field_227`), mede o tempo do quadro (`field_370`) e dorme o que falta para 50 ms. O desenho faz parte da simulação: ele também move sprites que a lógica lê depois, como a posição do chefe de Angkor (`_posY`, escrita por `method_186`), a animação que abre o diálogo de item dos baús e o cristal que voa até o selo.

Só o `Thread.sleep(100)` da ativação de um checkpoint faz um quadro passar de 65 ms. Como no aparelho, o quadro seguinte toma o **ramo de atraso** de `run()`: não desenha, marca `field_229` e não espera (`100 - field_370 - field_369` é negativo). Sem renderização (testes, ferramentas, oráculo), o desenho roda sobre gráficos inertes com o mesmo recorte e as mesmas métricas no TypeScript e na JVM.

O host também entra em cada fase como o jogo entra: pelo mapa do mundo. Exceto no tutorial (que New Game carrega direto), ele recarrega o mapa daquele mundo (`method_409`, `method_426`, `field_515`) e deixa o cursor no nó da fase (`method_427`), como a escolha no mapa (`method_424`) deixa. Sem isso, as saídas secretas (`method_131`) e as liberações (`method_252`) liam o mapa do Tibet deixado por New Game e não abriam as fases secretas. Dois estados de sessão que New Game zeraria também seguem a partida: a bússola do HUD (`field_179`, que o baú do tutorial, Continue e o selo ligam) e o contador de carregamentos de fase (`field_167`), que o port passa de uma fase à seguinte até um novo New Game ou Continue.

As primeiras versões do host executavam só a lógica; núcleo e JVM continuavam idênticos entre si, mas ambos diferiam do jogo. Ao incluir o desenho, 5 de 33 percursos mudaram de resultado: os que abrem baús de equipamento (o diálogo do item passou a aparecer) e o chefe de Tibet (o chefe passou a se mover); foram refeitos sobre o host corrigido. O quadro de atraso após os checkpoints e a entrada pelo mapa (revisão `s700-core-3`) não mudaram o resultado de nenhum dos 47 percursos.

## O que continua sendo do port

O jogo original só é executado da entrada da fase até o mapa do mundo. O restante é interface própria, alimentada pelo record que o jogo escreve:

- menu inicial, selo, mapas dos mundos, loja e opções ([FRONT_END_S700.md](FRONT_END_S700.md));
- campanha salva no `localStorage`, importação e exportação do record RMS ([SAVE_FORMAT.md](SAVE_FORMAT.md));
- traduções PT-BR e ES: o adaptador troca a tabela de `lang.f` e traduz as falas decodificadas de `demo.f`, desenhadas pela fonte original; as falas traduzidas paginam de outro jeito, então percursos gravados valem para o inglês;
- controles por toque e gamepad e o retorno ao checkpoint, que viram teclas do aparelho (direções, 5 e *), e o menu de pausa, que suspende os quadros do jogo;
- síntese das 21 faixas MIDI (os timbres do aparelho não são reproduzidos);
- o Laboratório de preservação (inspeção de mapas, sprites, paletas e áudio; replays; record RMS).

Quando a fase termina, o jogo original calcula os resultados, mostra a própria tela e grava o record; o port lê esse record (`Simulation.record()`), mostra seu mapa e aplica os avisos de mundo e de armadura que o original exibiria no mapa (`takeMapNotice()`). No fim do tutorial, quando a cena do selo começa a carregar Angkor 1 (estado 11), o port adota o record gravado e inicia uma nova sessão de Angkor 1 a partir dele.

## Como a equivalência é verificada

O oráculo em [`tools/oracle`](../tools/oracle) compila a **mesma** decompilação, com os mesmos patches (a compilação fica em cache em `work/oracle-s700`; use `--build` depois de mudar os patches), contra stubs J2ME sem tela e a controla quadro a quadro com eventos de tecla, relógio virtual e semente fixa. [`npm run verify:core`](../tools/verify-core.ts) executa cada percurso de [`tests/fixtures/core-routes`](../tests/fixtures/core-routes) e N sequências aleatórias (`--fuzz=N`, 20 por padrão; semente `--seed=S`) nos dois motores e exige igualdade em:

- cada tick com controle: estado do jogo, posição e deslocamento do herói, direção, animação, vida, vidas, diamantes, chaves e o hash dos planos de tiles e objetos;
- as transições de estado, inclusive as dos 200 quadros sem teclas depois do último controle, e a observação final ao fim desses quadros;
- os seis planos completos do mapa no início, no meio e no fim de cada sequência.

Na revisão atual, **67 de 67** sequências foram idênticas: os 47 percursos certificados e 20 sequências aleatórias (algumas com o item de mergulho). O GitHub Actions instala o JDK 21, gera o núcleo e repete `verify:core -- --fuzz=8` e `verify:routes -- --jvm` antes de publicar.

### Limites

- A equivalência é com a **decompilação recompilada**, não com o bytecode do JAR. Um erro de decompilação seria reproduzido fielmente. O JAR pesquisado coincide com a referência em 40/40 recursos ([ORIGINAL_JAR.md](ORIGINAL_JAR.md)), o que não prova identidade do código.
- A semente fixa e o relógio exato tornam o jogo determinístico; no aparelho, a semente vem do relógio e a tela de título já sorteia antes do New Game. Dos 47 percursos, só o do chefe de Tibet sorteia números (os tempos de ataque, `Utils.getRandomInt(340,441)`); `verify:routes` o repete com outras sementes e o relatório indica com quantas ele ainda conclui.
- O host reproduz um aparelho que calcula instantaneamente: quadros lentos de verdade (por exemplo, um aparelho que não desenha a tempo) não são simulados; só o atraso que o próprio código provoca (o checkpoint).
- O desenho original é exercitado no navegador, mas não é comparado pixel a pixel com um emulador.
