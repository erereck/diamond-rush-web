# Como verificamos as fases

Este guia explica o que **“verificada”** significa no port, como reproduzir a evidência e o que ainda falta. A tabela atual é gerada em [PLAYABILITY.md](PLAYABILITY.md), com os dados estruturados em [PLAYABILITY.json](PLAYABILITY.json); os números mudam conforme novos percursos entram.

## Duas perguntas separadas

1. **O motor do port se comporta como o jogo original?** Sim, por construção e por teste: a lógica de jogo é a decompilação S700 traduzida mecanicamente ([NUCLEO_S700.md](NUCLEO_S700.md)), e `npm run verify:core` compara o núcleo gerado com a mesma decompilação recompilada na JVM tick a tick (estado, posição, animação, vida, diamantes, chaves e hashes dos planos de tiles e objetos) e compara os seis planos completos do mapa no início, no meio e no fim de cada sequência.
2. **Cada fase pode ser concluída?** Um **percurso aprovado** prova isso para um objetivo específico: ele parte do carregamento original da fase e contém somente controles. Como o motor é a lógica original, um percurso que conclui no port também conclui na JVM, e o verificador confirma isso reproduzindo-o lá.

Antes do núcleo gerado, o port tinha seu próprio motor e os dois testes davam respostas diferentes: percursos aprovados no motor antigo não concluíam as fases na JVM. Por isso todos os percursos anteriores foram descartados como evidência e refeitos no núcleo exato; as intenções antigas (sequência de passos, sem a temporização) serviram de ponto de partida.

## O inventário

São **41 mapas**: o tutorial (Angkor, índice 13) e 40 fases, das quais 10 são secretas e 3 são chefes. Dos **47 objetivos**, 46 saem dos próprios dados das fases, não de uma lista editada à mão; o fim do tutorial é uma regra fixa do código do jogo ([`PlayabilityReport.ts`](../tools/routes/PlayabilityReport.ts)):

| Objetivo | Origem nos dados | Resultado exigido |
|---|---|---|
| Saída comum | objeto 5 | o jogo sai do estado 1 com saída normal (`field_551`) |
| Saída secreta | objeto 28 | o jogo sai do estado 1 sem saída normal |
| Cristal do chefe | baú (objeto 14/33) com tile 51–53 | depois da derrota do chefe, o herói abre o baú e, cerca de 141 quadros depois (fim da animação do cristal), o jogo entra no estado 28 |
| Fim do tutorial | o selo do mapa 13 de Angkor, em 60,3/61,3 (o mapa não tem objeto 5) | o herói chega ao selo (`method_267`), o jogo passa ao estado 11 (`method_86`) e carrega Angkor 1 |

Um mapa fica **aprovado** quando todos os seus objetivos têm percurso, e **parcial** quando só parte deles tem.

## Como é um percurso

Cada arquivo em [`tests/fixtures/core-routes/`](../tests/fixtures/core-routes/) contém:

- `engine` (`CORE_REVISION`: revisão do host, dos patches e do tradutor) e `source` (hash dos fontes da decompilação depois dos patches): um percurso gravado em outro núcleo é recusado;
- mundo, fase e **valores iniciais** do record: vidas, diamantes, diamantes vermelhos, vida máxima, equipamento (`weaponTier` 0, 1 martelo, 2 gancho, 8 martelo de gelo) e item de mergulho;
- `provenance`, uma descrição em texto do percurso (marcos, danos, chaves) e da justificativa dos valores iniciais;
- `controls`: sequências de `{ticks, direction, action, reset?}`, sem posições, edições de mapa ou estado injetado;
- `expected`: resultado, tick da conclusão, estado do jogo, posição, vida, vidas, diamantes e diamantes vermelhos coletados na fase (não o total da campanha), chaves de ouro e de prata e `weaponTier` ao concluir.

A fase começa exatamente como no jogo: o herói entra pela coluna 0 e caminha até a marca de entrada. Os valores iniciais ficam explícitos porque uma fase isolada não sabe o que a campanha deu antes. Eles devem ser plausíveis para aquele ponto da campanha: o martelo está num baú de Angkor 4, o gancho em Bavaria 3, o item de mergulho em Bavaria 8 e o martelo de gelo em Tibet 6; escolher Bavaria no selo garante pelo menos o martelo, e Tibet, pelo menos o gancho (`cGame.method_75`). A vida máxima só passa de 4 com armaduras compradas na loja (5 a 8); o menu de selo em texto que daria vida 8 (`sealMenuSelectionHandler`) não é alcançável no jogo. Saídas revisitadas com equipamento obtido mais tarde (por exemplo, Angkor 7 secreta com o gancho e Angkor 8 secreta com o martelo de gelo) declaram isso na proveniência.

## Como a aprovação é conferida

| Comando | O que faz |
|---|---|
| `npm test` | reproduz cada percurso e exige o `expected` gravado; também roda a campanha encadeada e o tutorial traduzido (abaixo) |
| `npm run verify:routes` | reproduz os percursos, recusa os que não concluem e mostra a cobertura |
| `npm run verify:routes -- --jvm` | também reproduz cada percurso na decompilação recompilada e exige que ela saia do estado 1 para o mesmo estado, no mesmo tick, com a mesma posição, vida, vidas, diamantes e chaves; qualquer divergência faz o comando falhar |
| `npm run verify:routes -- --jvm --write-report` | regenera [PLAYABILITY.md](PLAYABILITY.md) e [PLAYABILITY.json](PLAYABILITY.json) |
| `npm run verify:core -- --fuzz=8` | compara núcleo e JVM em todos os percursos e em 8 sequências aleatórias, tick a tick |

Os comandos com JVM precisam de um JDK e do clone fixado da decompilação (por padrão `../../work/reference-s700`); defina `DIAMOND_JDK_BIN` com a pasta `bin` do JDK se `java`/`javac` não estiverem no `PATH`. A decompilação compilada fica em cache em `work/oracle-s700` (`DIAMOND_ORACLE_WORK` muda o local); depois de mudar os patches, rode `npm run verify:core -- --build`.

### Campanha encadeada

[`campaign-chain.test.ts`](../tests/campaign-chain.test.ts) faz o que o app faz entre fases: começa em New Game, joga o tutorial, adota o record que o jogo escreveu, inicia Angkor 1 a partir dele, passa pela tela de resultados original e assim por diante até Angkor 8 e o chefe de Angkor: o cristal é gravado no bit 0 do byte 2 do record, o jogo abre o seu selo (estado 27) e a ação escolhe o mundo cujo mapa o port abre. O martelo não é declarado: vem do baú de Angkor 4 pelo record. Esse encadeamento prova a continuidade do save no primeiro mundo; Bavaria e Tibet ainda são verificados com percursos isolados. No mesmo arquivo, testes com o record de uma campanha mostram que as seis saídas secretas abrem suas fases secretas no mapa, que o game over passa pela tela original (vidas de volta a 5, menos 500 diamantes), que o décimo diamante vermelho anuncia Bavaria e que a loja do selo original, após um cristal, sai com a tecla direita do aparelho.

### Traduções

As falas em PT-BR e ES ocupam outro número de páginas, então um percurso em inglês dessincroniza em outro idioma. O teste do tutorial traduzido reaproveita os controles do percurso inglês fora dos diálogos, avança os diálogos com ação e exige que o tutorial termine nos dois idiomas.

## Ferramentas para criar percursos

Os percursos são construídos fora do repositório, com um kit de pesquisa (`work/claude2` no layout de trabalho) sobre o mesmo núcleo: mapa em ASCII, planos de passos (`andar até`, `empurrar`, `golpear`, `esperar`), busca local por macros, *snapshots* para testar alternativas e reprodução das intenções do port antigo. Um percurso só entra em `tests/fixtures/core-routes/` depois de concluir no núcleo e na JVM. `node tools/import-route.ts <arquivo>` importa percursos gravados com outra versão do núcleo: reproduz cada um no núcleo atual (não na JVM), exige exatamente o resultado gravado e grava o fixture com os identificadores atuais; antes de versionar, rode `npm run verify:routes -- --jvm`. Ao estudar uma fase:

1. leia a linha dela em [PLAYABILITY.md](PLAYABILITY.md) e os objetos da fase (checkpoints, baús, placas, portões, fechaduras, salas de enigma);
2. confira o comportamento do original no código (`cGame.java`), que é a fonte de verdade: por exemplo, a tecla mantida é consumida após a entrada e após eventos, o herói gira antes de andar depois de ~10 quadros parado, empurrar exige ~7 quadros, e o dano pode empurrar o herói uma casa para longe da fonte (para trás ou no sentido do movimento do atacante, `method_61`), enquanto várias fontes de dano não empurram;
3. grave somente controles, declare e justifique os valores iniciais, rode `npm run verify:routes -- --jvm --write-report` e `npm test`.

## O que ainda falta

Os 47 objetivos têm percurso aprovado ([PLAYABILITY.md](PLAYABILITY.md)). Falta, em ordem de importância:

1. uma campanha encadeada pelos três mundos: hoje o encadeamento cobre New Game até o cristal de Angkor; Bavaria e Tibet são verificadas com percursos isolados, cujos valores iniciais (vidas, equipamento, mergulho) são declarados e justificados, mas não vêm de uma única partida. Encadear exige percursos que juntem os 10 e 25 diamantes vermelhos que abrem Bavaria e Tibet;
2. comparação visual com um emulador J2ME (o desenho original roda no navegador, mas não foi comparado pixel a pixel) e reprodução dos timbres MIDI do aparelho;
3. o percurso do chefe de Tibet é o único que sorteia números (os tempos de ataque do chefe). Ele foi construído para não depender deles: conclui com as 50 sementes da verificação e com 978 de 1000 numa amostra maior; as falhas restantes vêm de sequências raras de tempos (um golpe que termina no mesmo quadro em que começa, ou golpes muito cedo ou muito tarde). Os outros 46 percursos não sorteiam números e valem para qualquer semente.
