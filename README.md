# Diamond Rush Web

Port de **Diamond Rush** para navegador a partir da versão J2ME **Sony Ericsson S700 1.2.0 (non-padlock)**. Dentro das fases roda a **lógica original do jogo**: a decompilação S700 fixada é traduzida mecanicamente para TypeScript (`npm run generate-core`, etapa anterior ao build) e executada a 20 quadros por segundo sobre uma camada MIDP mínima em Canvas 2D. O mesmo código original desenha a fase, o HUD, os diálogos, as telas de resultado e os chefes. Menus, mapas, loja, traduções, controles e save são do port.

**[Jogar no GitHub Pages](https://erereck.github.io/diamond-rush-web/)** · [Cobertura fase a fase](docs/PLAYABILITY.md) · [Como verificamos as fases](docs/VERIFICACAO_DAS_FASES.md) · [O núcleo gerado](docs/NUCLEO_S700.md)

> **Todas as fases verificadas.** O motor é a lógica original, comparada tick a tick com a decompilação recompilada em Java, e cada um dos 47 objetivos de conclusão dos 41 mapas (o tutorial e 40 fases) tem um percurso aprovado por controles, também concluído na JVM. O que ainda falta está no [guia de verificação](docs/VERIFICACAO_DAS_FASES.md#o-que-ainda-falta).

## O que já dá para jogar

- New Game pelo menu do port, que reproduz o original e entra no caminho de New Game do jogo: o tutorial de Angkor com suas cenas; ao fim dele, Angkor 1 começa com o record que o tutorial gravou; depois de cada fase vêm a tela de resultados original e o mapa do mundo.
- Selo, mapas dos três mundos, loja de armaduras (vida máxima de 5 a 8) e fases secretas, na interface do port. O progresso fica no formato do record 1 do RMS: o jogo escreve o resultado de cada fase, e o port grava no mesmo record as escolhas do selo e as compras da loja.
- A página mostra só o jogo, na tela inteira. O botão ⚙ (tecla **O**) abre as opções do port: escala (pixels inteiros, ajustar, esticar), filtro (nítido, suave, CRT) e o que aparece ao redor da tela original (preto, fundo infinito, o cenário da fase ou o cenário com objetos); velocidade, avanço rápido, retroceder, estados salvos e trapaças; som com instrumentos GM, volumes e vibração. Veja [OPCOES_DO_PORT.md](docs/OPCOES_DO_PORT.md).
- Teclado, gamepad ou toque. Os controles de toque ficam sobre a imagem e podem ser reposicionados, redimensionados e trocados entre direcional e analógico.
- Inglês original ou traduções do port para português brasileiro e espanhol, desenhadas com a fonte original. O pacote S700 contém apenas o inglês.
- O **Laboratório de preservação**, no mesmo painel: inspecionar os 41 mapas, jogar uma fase isolada com o equipamento escolhido, ver sprites e paletas, ouvir as 21 faixas MIDI, exportar e importar replays e o record RMS.

No teclado: **setas/WASD** movem, **Enter/Espaço** agem ou confirmam, **Escape** pausa ou volta (nas telas do próprio jogo, como resultados, selo e loja após um cristal, faz o papel da tecla direita do aparelho) e **R** (a tecla * do aparelho) volta ao último checkpoint; fora do círculo do checkpoint, isso custa uma vida. **Tab** acelera, **Backspace** retrocede, **F5/F7** salvam e carregam um estado, **F** alterna a tela cheia.

## Estado da verificação

- **Motor:** `npm run verify:core` executa cada percurso e sequências aleatórias no núcleo gerado e na decompilação recompilada na JVM e exige igualdade em cada tick (estado, posição, animação, vida, recursos e hashes dos planos de tiles e objetos), nas transições de estado e nos seis planos completos do mapa no início, no meio e no fim de cada sequência. Na revisão atual, 67 de 67 sequências foram idênticas (47 percursos e 20 sequências aleatórias, algumas com o item de mergulho).
- **Fases:** o [inventário gerado](docs/PLAYABILITY.md) cobre **41 mapas** (o tutorial e 40 fases) e **47 objetivos** (saídas comuns, secretas, cristais dos chefes e o fim do tutorial). Na revisão atual, **os 47 objetivos** têm percurso aprovado, todos também concluídos na JVM, incluindo os três chefes e as dez fases secretas.
- **Campanha:** um teste encadeia New Game, o tutorial, Angkor 1–8 e o chefe de Angkor passando o record de uma fase à seguinte: o martelo vem do baú de Angkor 4, o cristal fica gravado no record e o jogo abre o seu selo, onde o encadeamento escolhe Angkor de novo (Bavaria exige 10 diamantes vermelhos; o encadeamento junta 2). Outros testes cobrem as seis saídas secretas abrindo suas fases, o game over, o aviso de mundo liberado e a loja do selo original.

Um percurso aprovado começa no carregamento original da fase e contém só controles por tick (direção, ação, retorno ao checkpoint); os valores iniciais do record (vidas, equipamento, vida máxima) ficam declarados e justificados. O [guia de verificação](docs/VERIFICACAO_DAS_FASES.md) explica o método, os comandos e o que ainda falta.

## Rodar localmente

São necessários Node.js **22.18+**, npm, Git e um **JDK 21**, usado por `npm run generate-core` para traduzir a decompilação e pelas comparações com a JVM. Layout esperado:

```text
workspace/
├─ outputs/diamond-rush-web/    ← este repositório
└─ work/reference-s700/         ← referência fixada
```

No terminal, dentro de `outputs/diamond-rush-web`:

```powershell
New-Item -ItemType Directory -Force ../../work | Out-Null
git clone https://github.com/palaceswitcher/Diamond-Rush-Decomp ../../work/reference-s700
git -C ../../work/reference-s700 checkout 5e05c42aa1aae3377790600eb6d27497101b79e7
npm ci
npm run extract-assets
npm run generate-core
npm run dev -- --port 5173
```

Abra `http://127.0.0.1:5173/`. Se `java`/`javac` não estiverem no `PATH`, aponte `DIAMOND_JDK_BIN` para a pasta `bin` do JDK. `extract-assets` aceita outro caminho para `res/` como argumento; `generate-core` aceita outro caminho para o clone.

```powershell
npm test                          # formatos, save, controles, percursos, campanha encadeada
npm run verify:routes -- --jvm    # percursos no núcleo e na JVM
npm run verify:core -- --fuzz=8   # núcleo gerado × JVM, tick a tick
npm run build                     # TypeScript e build estática
```

`npm run verify:routes -- --jvm --write-report` regenera [PLAYABILITY.md](docs/PLAYABILITY.md) e [PLAYABILITY.json](docs/PLAYABILITY.json). O GitHub Pages instala o JDK 21, extrai os recursos, gera o núcleo, roda os testes e as duas comparações com a JVM e só então publica. Os recursos extraídos em `public/assets`, o núcleo gerado em `src/generated` e o JAR original usado na pesquisa não são guardados neste repositório.

## Documentação

| Assunto | Onde ler |
|---|---|
| Núcleo gerado, patches e comparação com a JVM | [NUCLEO_S700.md](docs/NUCLEO_S700.md) |
| Método de verificação das fases e o que falta | [VERIFICACAO_DAS_FASES.md](docs/VERIFICACAO_DAS_FASES.md) |
| Percursos e objetivos de cada mapa | [PLAYABILITY.md](docs/PLAYABILITY.md) |
| Opções do port (vídeo, áudio, extras, controles) | [OPCOES_DO_PORT.md](docs/OPCOES_DO_PORT.md) |
| Som: motor original e sintetizador | [AUDIO.md](docs/AUDIO.md) |
| Menus, selo e loja | [FRONT_END_S700.md](docs/FRONT_END_S700.md) |
| Record RMS e replays | [SAVE_FORMAT.md](docs/SAVE_FORMAT.md) |
| Formatos extraídos e relação com o Java | [SOURCE_MAP.md](docs/SOURCE_MAP.md), [LEVEL_FORMAT.md](docs/LEVEL_FORMAT.md), [SPRITE_FORMAT.md](docs/SPRITE_FORMAT.md) |
| Versão S700, JAR pesquisado e auditoria dos recursos | [VERSION_MATRIX.md](docs/VERSION_MATRIX.md), [ORIGINAL_JAR.md](docs/ORIGINAL_JAR.md), [FORENSIC_AUDIT.md](docs/FORENSIC_AUDIT.md) |

A equivalência demonstrada é com a **decompilação S700 recompilada**, não com o bytecode do JAR. Dos JARs fornecidos para a pesquisa, o escolhido como referência teve 40/40 recursos iguais aos da decompilação ([ORIGINAL_JAR.md](docs/ORIGINAL_JAR.md)); isso não prova, por si só, identidade do código.

## Créditos e origem dos dados

- **Jogo, mapas, sprites, textos, músicas e lógica original:** Gameloft. A referência de dados e lógica é [Diamond-Rush-Decomp, de palaceswitcher](https://github.com/palaceswitcher/Diamond-Rush-Decomp), fixada no [commit `5e05c42`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/commit/5e05c42aa1aae3377790600eb6d27497101b79e7); o port traduz seus [`src/*.java`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/tree/5e05c42aa1aae3377790600eb6d27497101b79e7/src) e usa seus [`res/`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/tree/5e05c42aa1aae3377790600eb6d27497101b79e7/res) no build, sem versioná-los aqui.
- **Fontes comparativas:** [DiamondRushSource](https://github.com/kubikaugustyn/DiamondRushSource) e [diamondRush](https://github.com/kubikaugustyn/diamondRush), de kubikaugustyn. A [matriz de versões](docs/VERSION_MATRIX.md) registra seus papéis; recursos de outras versões não são misturados ao jogo publicado.
- **Port web e traduções PT-BR/ES:** trabalho independente deste repositório. As traduções partem dos textos ingleses de `lang.f` e `demo.f`; não são traduções oficiais.

Este é um projeto de preservação feito por fãs, sem afiliação com a Gameloft ou com os autores das decompilações. O port não concede licença nova aos recursos originais nem aos códigos de referência.
