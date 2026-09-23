# Source traceability

| Web system | Canonical Java evidence |
|---|---|
| BinaryReader, Pack | getShortFromBytes, getI32FromBytes, loadPackedFile |
| SpriteDecoder | ASprite.Load, decodeImage |
| SpriteRenderer | ASprite.drawModule, drawFrameModule, drawAnimFrame |
| LevelParser | cGame.loadLevelData |
| World map parser | cGame.method_426 |
| Localization | cGame.loadStringsFromFile |
| Clock | cGame.run |
| Camera | cGame.method_285 |
| Movement investigation | cGame.method_236, method_288 |
| Object update investigation | cGame.method_304, method_351 |
| Bavaria rolling obstacles, paired crushers and timed spikes | cGame.method_264, method_336, method_337, method_338; gen1.f/1 spike frames |
| Tibet falling ceiling stones | cGame.method_314, method_160; gen3.f/4 animations |
| CanonicalSave | cGame.method_109–128; method_426 for first secret level |
| Checkpoint snapshot and restore | cGame.method_346, method_347, killPlayer |
| Full-health field pickup conversion | cGame.method_322, method_321 |
| Per-category level rewards | cGame.method_249(11), method_116, method_117 |
| Intro scripted movement and object edits | DemoInterpreter.method_28 opcodes 10/25/26 |
| Hammer impact and hook launch animations | cGame.method_227, method_230, method_260; o.f/0 animations 13–16, 20/22, 41–44 |

See SAVE_FORMAT.md for the distinction between original RMS payloads and versioned development replays.

Line references are meaningful only at pinned commit 5e05c42aa1aae3377790600eb6d27497101b79e7.
