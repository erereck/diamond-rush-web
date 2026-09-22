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
| CanonicalSave | cGame.method_109–128; method_426 for first secret level |
| Pending checkpoint implementation | cGame.method_346, method_347, killPlayer |

See SAVE_FORMAT.md for the distinction between original RMS payloads and versioned development replays.

Line references are meaningful only at pinned commit 5e05c42aa1aae3377790600eb6d27497101b79e7.
