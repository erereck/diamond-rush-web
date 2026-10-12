# Rastreabilidade das fontes

Toda a lógica de jogo dentro das fases é o próprio código da decompilação, traduzido pelo tradutor [`tools/j2ts/J2TS.java`](../tools/j2ts/J2TS.java), executado por [`tools/generate-core.ts`](../tools/generate-core.ts), para `src/generated/s700.ts` ([NUCLEO_S700.md](NUCLEO_S700.md)). Os módulos abaixo são do port; a coluna da direita indica o código Java que cada um lê ou imita.

| Módulo do port | Evidência no Java |
|---|---|
| Núcleo gerado (`src/generated/s700.ts`) | todas as classes de `src/*.java`, com os patches de [`ReferencePatches.ts`](../tools/routes/ReferencePatches.ts) |
| `core/s700/runtime.ts`, `core/s700/j2me.ts` | APIs CLDC/MIDP usadas pelas classes (`java.lang`, `java.util`, `javax.microedition.*`) |
| `core/s700/Engine.ts` | `GloftDIRU`/`cGame.run` (laço de 50 ms), `keyPressed`/`keyReleased`; caminho de New Game: `method_67` inicializa até o título (estado 30), o host passa a 4 como a tecla 5 em `method_217` e chama `method_218` (New Game), e `method_67` segue 16 → 11 (`method_86`) → 5 (`method_113` cria o record) → 1 (`method_78`) |
| `core/Simulation.ts` | estados de `cGame.gameState`: 1 fase; ao sair dela, 35/17 resultados (saídas comuns e qualquer saída de fase secreta) ou 20 (saída secreta de fase comum), com saída comum ou secreta decidida por `field_551`; 28 cristal; 12 game over; 11, o carregamento aberto por `method_86`, marca o fim do tutorial na transição 1 → 11 do mapa 13 de Angkor (`method_267`); 21/15/4/22 encerram a sessão; `method_74` (avisos do mapa) |
| `BinaryReader`, `Pack` | `getShortFromBytes`, `getI32FromBytes`, `loadPackedFile` |
| `SpriteDecoder`, `SpriteRenderer` (menus, mapa, laboratório) | `ASprite.Load`, `decodeImage`, `drawModule`, `drawFrameModule`, `drawAnimFrame` |
| `LevelParser` (inventário, laboratório, objetivos) | `cGame.loadLevelData`; mapas dos mundos em `method_426` |
| `Localization`, `OriginalText` | `cGame.loadStringsFromFile` (`lang.f`), textos de `demo.f` decodificados por `DemoInterpreter` |
| `CanonicalSave`, `CanonicalCampaign` | `cGame.method_109–128` (record 1), `method_426` (primeira fase secreta), `method_117`/`method_249` (flags) |
| `FrontEndRenderer`, `Store`, `Campaign` | `method_71`–`method_75` (selo e avisos do mapa), `method_137` (desenho do selo), `method_175` (desenho dos menus), `method_212`–`method_215` (loja), `method_249(11)` (vidas de recompensa), `Define.worldPrices`, `Define.itemPrices`, `Define.sealMoveDirection` ([FRONT_END_S700.md](FRONT_END_S700.md)) |
| `GameSound`, `Midi` | `cSoundEngine.playSound` (índices de `snd.f`), 21 arquivos MIDI de `snd.f` |
| `Clock` | `cGame.run`: 20 quadros por segundo |

Referências de linha só fazem sentido no commit fixado `5e05c42aa1aae3377790600eb6d27497101b79e7`. Ver [SAVE_FORMAT.md](SAVE_FORMAT.md) para a diferença entre o record RMS original e os replays de sessão.
