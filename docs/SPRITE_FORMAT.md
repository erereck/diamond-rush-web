# Sprite pack format

Derived from ASprite.Load, decodeImage, drawFrameModule and drawAnimFrame.

Pack: `u8 entry count`, then count pairs of `u32 relative offset, u32 byte length`. Relative offsets begin after the complete table.

Sprite: six preserved header bytes; `u16 module count` and `(u8 width,u8 height)` per module; `u16 frame-module count` and `(u8 module,i8 x,i8 y,u8 flags)` per entry; `u16 frame count` and `(u8 count,u8 reserved,u16 start)` per frame; four rectangle bytes per frame; `u16 animation-frame count` and `(u8 frame,u8 duration,i8 x,i8 y,u8 flags)` per entry; `u16 animation count` and `(u8 count,u8 reserved,u16 start)` per animation.

If modules exist: `u16 palette pixel format`, `u8 palette count`, `u8 color count`, palettes, `u16 image encoding`, then `u16 data length + compressed bytes` per module.

Supported palette formats: 8888, 4444, 1555 (tag 5515), 565 (tag 6505). Channel expansion exactly follows Java, including low zero bits in 1555/565. Supported index encodings: I256 (5602), I16 (1600), I4 (0400), I2 (0200), I127RLE (27F1), I256RLE (56F2). Packed low bits beyond module area are padding.

Flip X/Y flags are composed by XOR. Signed offsets matter. Animation offsets are applied only with flag 0x20. Original renderer ignores higher transform bits; do not add arbitrary rotation support.

Canonical dangling animation references are documented in FORENSIC_AUDIT.md. They are not silently repaired.
