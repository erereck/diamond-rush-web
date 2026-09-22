# Level and map formats

Derived from cGame.loadLevelData and method_426 at the pinned canonical commit.

## wN.bin

All integers little-endian. Byte 0 is skipped by the Java loader (retained as `version`, meaning unconfirmed). Byte 1 is the number of levels. Each level is `u16 width`, `u16 height`, followed by three planes of `width * height` bytes each. Each plane is row-major, index `x + y * width`.

1. Tile IDs → field_334 (Java signed byte).
2. Per-tile parameter data → field_333 (signed byte promoted to int).
3. Object/trigger IDs → field_332 (signed byte promoted to int).

Do not name plane 2 a visual layer: its values become state variables in method_296. Preserve raw unsigned bytes in parsed immutable definitions; perform signed conversion at simulation initialization. `255` corresponds to Java `-1`.

Tile 79 is an entrance marker. Runtime initialization starts the player at x=0 and walks toward the marker's x coordinate. Tile 12 is removed and its position/parameter retained for level objective logic. Tiles >=80 refer to world-specific frame index `(byte)(tile - 80)`.

Object 4 is a checkpoint; 5 is normal exit; 28 secret exit; 14/33 chest; 20–23 are background decoration selectors. These planes must be interpreted together.

## map_*.out

Header: `u16 payload size`, `u8 node count`. Each node: `u8 x`, `u8 y`, `u8 type`, `u8 level index`, `u8 link count`, followed by link-count `(u8 x, u8 y)` coordinate pairs. All bytes are consumed by the parser. Progression semantics are separate from these coordinates.
