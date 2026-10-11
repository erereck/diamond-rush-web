# Como verificamos as fases

Este guia explica o que a palavra **“verificada”** significa neste projeto, como reproduzir a evidência e onde o trabalho ainda precisa avançar. A tabela atual é gerada em [PLAYABILITY.md](PLAYABILITY.md); seus dados estruturados ficam em [PLAYABILITY.json](PLAYABILITY.json). Leia os números ali, pois eles mudam à medida que os percursos avançam.

## Três perguntas diferentes

1. **O mapa carrega e a simulação responde?** A [varredura exploratória](STAGE_SMOKE.md) inicia cada uma das 40 fases no spawn original, executa entradas de controle e reconstrói o estado pelo replay. Ela encontra erros de inicialização e algumas fronteiras de navegação. Não resolve a fase.
2. **É possível concluir uma saída específica no port atual?** Um percurso fixo começa no spawn original e contém apenas direção, ação e retorno ao checkpoint. Ao reproduzi-lo, o verificador exige o resultado gravado e a conclusão real. Esse é o critério para aprovar uma saída, tutorial ou cristal de chefe.
3. **O comportamento é idêntico ao Java S700?** Traces da decompilação recompilada e harnesses de métodos Java conferem estados, temporização e regras selecionados. Mesmo um percurso concluído no port não responde sozinho a esta pergunta. A paridade integral entre todas as cenas, fases e o JAR original ainda não foi demonstrada.

## O que aparece na tabela

O inventário contém **41 mapas**: a introdução e 40 fases jogáveis, das quais dez são secretas. Há **47 objetivos** porque algumas fases oferecem saída comum e secreta. O estado é atribuído por mapa:

| Estado | Critério |
|---|---|
| **Percurso aprovado** | Existe replay completo para **cada** objetivo daquele mapa. Para o chefe, a derrota e o cristal são exigidos. |
| **Saídas parcialmente aprovadas** | Pelo menos uma saída foi concluída, mas outra saída do mesmo mapa ainda falta. |
| **Tentativa pendente** | Há replay reproduzível que chega a um ponto do mapa, mas nenhuma saída foi aprovada. |
| **Ainda não verificada** | Não há percurso completo nem tentativa registrada para o mapa. |

Uma tentativa pendente **não prova que a fase seja impossível**. Também não basta passar pelo portal visualmente: a simulação precisa entrar no estado de conclusão e registrar a saída correta. Fases secretas têm entrada própria no inventário; quando uma fase normal tem duas saídas, as duas são contadas separadamente.

O número de **percursos completos** pode ser maior que o de **mapas aprovados**: um mapa com duas saídas precisa de dois replays, e um percurso da saída secreta pode deixar o mapa parcialmente aprovado enquanto a saída comum falta. Os números de cobertura vêm de `buildPlayabilityReport()` em [`tools/routes/PlayabilityReport.ts`](../tools/routes/PlayabilityReport.ts), não de uma lista editada à mão.

## Como é um replay de fase

Os percursos completos estão em [`tests/fixtures/routes/`](../tests/fixtures/routes/); as tentativas incompletas, em [`tests/fixtures/route-attempts/`](../tests/fixtures/route-attempts/). Cada JSON registra:

- versão do motor e *fingerprint* do mapa, para rejeitar evidência feita em um estado incompatível;
- mundo, índice da fase, recursos iniciais e uma frase de proveniência;
- sequência comprimida de controles, com número de ticks, direção, ação e eventual retorno ao checkpoint;
- resultado esperado: estado final, posição, tempo, recursos, danos, mortes/retornos, baús e diálogos vistos, entre outros campos.

O executor em [`RouteRunner.ts`](../tools/routes/RouteRunner.ts) aceita **apenas controles** e recursos iniciais permitidos. Ele rejeita injeção de posição, chaves, baús já abertos, edições de mapa e movimento roteirizado pelo arquivo de teste. Cenas e edições legítimas acontecem pelos gatilhos do próprio jogo. Os recursos iniciais podem incluir equipamento predefinido; isso é declarado na proveniência e **não comprova que o item foi obtido naquela campanha**.

Por exemplo, [Tibet 14](../tests/fixtures/routes/tibet-14-normal-hook.json) parte do spawn com gancho explicitamente equipado, retira pedras do corredor, aciona checkpoint e placa, atravessa armadilhas e alcança a saída comum. Já a [tentativa de Bavaria 12](../tests/fixtures/route-attempts/bavaria-12-first-plate.json) chega ao primeiro checkpoint e aciona uma placa, mas não atravessa o portão nem conclui a saída. Os dois replays são reproduzíveis; somente o primeiro conta como conclusão.

## Como a aprovação é conferida

`npm run verify:routes` reexecuta todos os JSONs de percursos e tentativas com os recursos S700 extraídos. O comando falha se o resultado divergir do gravado, se um arquivo em `routes/` não terminar de fato, ou se um arquivo em `route-attempts/` passar a terminar e precisar ser promovido. Para chefes, a função `completedRoute()` exige também o evento de vitória e saúde zero do guardião. O teste [`playability.test.ts`](../tests/playability.test.ts) confere marcos relevantes, proíbe manipulação do estado inicial e reconstrói o snapshot final das rotas de fase com o replay normal do jogo.

O relatório não confunde **isolado** com **campanha**. Uma rota isolada pode começar com martelo, gancho, gelo, vidas ou energia explicitamente escolhidos para examinar uma mecânica. O [percurso encadeado](../tests/fixtures/campaign-routes/angkor-start.json) começa em **New Game** e passa da introdução por Angkor 1–8 até o chefe. Ele transfere recursos da fase anterior, aplica recompensas e confere recarga JSON e importação/reexportação RMS. Ele ainda não certifica uma campanha inteira pelos três mundos, nem a aquisição de gancho/gelo nessa campanha.

## Comparação com o original

A referência principal é [Diamond-Rush-Decomp no commit fixado](https://github.com/palaceswitcher/Diamond-Rush-Decomp/commit/5e05c42aa1aae3377790600eb6d27497101b79e7), da variante S700 1.2.0. Os recursos do JAR pesquisado coincidem em 40/40 arquivos com essa referência; [ORIGINAL_JAR.md](ORIGINAL_JAR.md) explica a escolha e por que isso **não** demonstra identidade de todo o bytecode.

Para cenas da introdução, [`tools/trace-s700.ts`](../tools/trace-s700.ts) recompila a decompilação fixada, executa-a no FreeJ2ME e registra estados de ticks selecionados. As amostras em [`tests/fixtures/`](../tests/fixtures/) comparam posição, câmera, comandos, textos, sprites e alterações do mapa onde esses campos foram capturados. Outros capturadores executam métodos Java isolados para placas, salas, inimigos e mecanismos; veja [PRESSURE_PLATES.md](PRESSURE_PLATES.md), [RIDDLES.md](RIDDLES.md) e [STAGE_MECHANISMS.md](STAGE_MECHANISMS.md). Os harnesses substituem alguns efeitos e callbacks. Portanto, a conclusão de uma fase no port e a concordância de um método isolado são evidências **diferentes e complementares**.

Para refazer um trace da introdução, além do clone fixado, são necessários **JDK 21** e [FreeJ2ME-Plus](https://github.com/TASEmulators/freej2me-plus). O comando recebe o diretório da decompilação, o diretório `bin` do JDK, o JAR do emulador e um diretório de saída; por exemplo:

```powershell
node tools/trace-s700.ts ../../work/reference-s700 C:/caminho/jdk-21/bin C:/caminho/freej2me.jar C:/caminho/trace --rock-lesson --ticks=665
```

Sem opção de cena, ele mede a abertura; opções como `--auto-dialogue`, `--open-chest`, `--rock-lesson`, `--checkpoint-lesson` e `--seal-scene` isolam trechos específicos. O capturador injeta logs numa cópia temporária da decompilação recompilada. Os CSVs de referência usados nos testes documentam quais ticks e campos foram comparados; nenhum desses modos equivale a uma execução contínua de toda a campanha no JAR original.

## Reproduzir e continuar

Siga o [layout de instalação do README](../README.md#rodar-localmente) para ter o clone da referência fixada e os recursos extraídos. Dentro do repositório do port:

```powershell
npm run verify:routes
npm run verify:stages
npm test
npm run build
```

Para atualizar os relatórios após mudar um percurso:

```powershell
npm run verify:routes -- --write-report
npm run verify:stages -- --write-report
```

Ao investigar uma fase pendente, comece por sua linha em [PLAYABILITY.md](PLAYABILITY.md). Reproduza a tentativa vinculada e inspecione o obstáculo final. Se encontrar uma rota melhor, grave **controles reais desde o spawn**, declare o equipamento e os recursos iniciais, mantenha o `expected` gerado pela simulação e acrescente uma asserção que prove o marco novo. Só coloque o arquivo em `routes/` quando a conclusão for observada pelo verificador; em caso de saída alternativa, confira também o objeto de saída. Se o obstáculo persistir, registre a tentativa em `route-attempts/` com uma descrição precisa, sem classificar a fase como impossível.

O comando `npm run verify:routes -- --write-report` gera novamente [PLAYABILITY.md](PLAYABILITY.md) e [PLAYABILITY.json](PLAYABILITY.json). Evite editar esses dois arquivos manualmente: a origem dos dados são os mapas, os replays e o gerador. A publicação no GitHub Pages também executa `npm test` e `npm run build`, mas uma build verde não substitui a aprovação de todas as saídas.
