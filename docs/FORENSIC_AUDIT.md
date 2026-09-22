# Diamond Rush S700 forensic audit

Canonical source: `palaceswitcher/Diamond-Rush-Decomp` at `5e05c42aa1aae3377790600eb6d27497101b79e7`.
The Application Descriptor identifies v1.2.0, MIDP 2.0, CLDC 1.0. README identifies Sony Ericsson S700, non-padlock. Original canonical executable has not yet been obtained or used for comparison.

## Evidence established from code and binary data

- 11 Java source files; 40 resources. Complete byte sizes and SHA-256 hashes are in SOURCE_INVENTORY.json and RESOURCE_INVENTORY.json.
- `cGame.run` (1295–1341) targets 50 ms per update (20 Hz). The lag branch is unusual and must not be confused with a 60 Hz simulation.
- 240 × 320 logical display; 24 × 24 tile grid; gameplay camera sees 240 × 240 plus surrounding UI (`method_285`, `method_166`).
- `w0.bin`, `w1.bin`, `w2.bin` decode completely into 14, 13, 14 levels, respectively: **41 total**, including special/intro levels. Complete dimensions, object IDs and spawn markers are in LEVEL_INVENTORY.json.
- New game initially uses Angkor index 13, not index 0 (`method_67`, state 5). Do not mistake file ordering for progression order.
- Canonical English strings call the second world **BAVARIA** despite its map being named `map_scotland.out`. Nokia naming must not overwrite these strings.
- 95 sprite resources were decoded, including every module and palette. Resources are packed, not one sprite per `.f` file.
- `snd.f` contains 21 Standard MIDI Files. Browser decoding via `decodeAudioData` is not sufficient for MIDI; a MIDI parser/synthesizer or reproducible offline conversion is required. Instrument output depends on synthesizer and is not yet equivalent to the S700 device.
- `lang.f` contains 115 null-terminated Latin-1 strings. Only the canonical English pack is present; additional Nokia language files are a different release and cannot be silently imported.
- `DemoInterpreter` is a scripted scene VM with camera, text, object mutation, waits and movement commands, not simply a prerecorded input sequence. It could support compatibility tests, but that is not yet established.
- `method_304` processes a bounded neighborhood (player ±8 tiles, excluding borders), from bottom to top and left to right. Activation countdowns determine whether objects update. Global scans or reversed ordering would change puzzles.
- `method_288` has explicit comments documenting Procyon-based control-flow fixes. Semantic confidence must be tracked per subsystem.
- Camera uses specific dead zones and integer half-distance updates; it is not a generic smooth-follow camera.

## Asset anomaly

`mmv.f` entries 1–3 have a second animation-frame record referring to frame 255 with only one actual frame. The Java paths at `cGame.java:2195/2206/2216` use their module images directly. Decoder reports these as warnings, preserves all bytes, and does not invent replacement animation frames. Renderer must reject invalid frame access.

## Current scope and open work

Completed: repository pinning, source/resource inventories, cross-release hashes, pack/sprite/world/map/string extraction and parser infrastructure.
Still requires implementation and verification: full gameplay dispatch, all special objects/bosses, scripted scenes, exact save/progression, all original UI states, audio fidelity, and end-to-end original-JAR comparison. Parsing or rendering a level is not evidence it is completable.

Use primary Java as implementation evidence; do not describe unverified behavior as original parity. No deployment or public distribution has been performed.
