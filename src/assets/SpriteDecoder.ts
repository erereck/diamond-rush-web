import { BinaryReader } from './BinaryReader.ts';
export interface SpriteModule { width: number; height: number; indices: number[] }
export interface FrameModule { module: number; x: number; y: number; flags: number }
export interface SpriteFrame { start: number; count: number; rect: number[] }
export interface AnimationFrame { frame: number; duration: number; x: number; y: number; flags: number }
export interface SpriteAnimation { start: number; count: number }
export interface DecodedSprite {
  name: string; header: number[]; modules: SpriteModule[]; frameModules: FrameModule[];
  frames: SpriteFrame[]; animationFrames: AnimationFrame[]; animations: SpriteAnimation[];
  palettes: number[][]; pixelFormat: number; encoding: number; warnings: string[];
}
function paletteColor(r: BinaryReader, format: number): number {
  if (format === 0x8888) return r.u32();
  const c = r.u16();
  // Preserve original channel expansion; 565/1555 intentionally do not replicate low bits.
  if (format === 0x4444) return (((c & 0xf000) << 16) | ((c & 0xf000) << 12) | ((c & 0xf00) << 12) | ((c & 0xf00) << 8) | ((c & 0xf0) << 8) | ((c & 0xf0) << 4) | ((c & 0xf) << 4) | (c & 0xf)) >>> 0;
  if (format === 0x5515) return (((c & 0x8000) ? 0xff000000 : 0) | ((c & 0x7c00) << 9) | ((c & 0x3e0) << 6) | ((c & 0x1f) << 3)) >>> 0;
  if (format === 0x6505) return ((c === 0xf81f ? 0 : 0xff000000) | ((c & 0xf800) << 8) | ((c & 0x7e0) << 5) | ((c & 0x1f) << 3)) >>> 0;
  return r.fail(`unknown palette format 0x${format.toString(16)}`);
}
export function decodeIndices(data: Uint8Array, size: number, format: number, colors: number, name: string): number[] {
  const r = new BinaryReader(data, name), pixels: number[] = [];
  const put = (c: number, n = 1) => {
    if (c >= colors) r.fail(`palette index ${c} >= ${colors}`);
    if (pixels.length + n > size) r.fail('RLE exceeds module dimensions');
    for (let i = 0; i < n; i++) pixels.push(c);
  };
  while (pixels.length < size) {
    const c = r.u8();
    if (format === 0x27f1) { if (c > 127) put(r.u8(), c - 128); else put(c); }
    else if (format === 0x56f2) {
      if (c > 127) for (let i = 0; i < c - 128; i++) put(r.u8());
      else put(r.u8(), c);
    } else if (format === 0x5602) put(c);
    else {
      const bits = format === 0x1600 ? 4 : format === 0x0400 ? 2 : format === 0x0200 ? 1 : 0;
      if (!bits) r.fail(`unsupported encoding 0x${format.toString(16)}`);
      for (let shift = 8 - bits; shift >= 0 && pixels.length < size; shift -= bits) put((c >> shift) & ((1 << bits) - 1));
    }
  }
  r.end(); return pixels;
}
/** Direct specification derived from ASprite.Load and decodeImage. */
export function decodeSprite(data: Uint8Array, name: string): DecodedSprite {
  const r = new BinaryReader(data, name), header = [...r.bytes(6)];
  const nModules = r.u16();
  const modules: SpriteModule[] = Array.from({length:nModules}, () => ({width:r.u8(),height:r.u8(),indices:[]}));
  const nFM = r.u16();
  const frameModules = Array.from({length:nFM}, () => ({module:r.u8(),x:r.i8(),y:r.i8(),flags:r.u8()}));
  const nFrames = r.u16();
  const frames: SpriteFrame[] = Array.from({length:nFrames}, () => { const count=r.u8(); r.skip(1); return {count,start:r.u16(),rect:[]}; });
  for (const f of frames) f.rect = [r.i8(),r.i8(),r.u8(),r.u8()];
  const nAF = r.u16();
  const animationFrames = Array.from({length:nAF}, () => ({frame:r.u8(),duration:r.u8(),x:r.i8(),y:r.i8(),flags:r.u8()}));
  const nAnims = r.u16();
  const animations = Array.from({length:nAnims}, () => {const count=r.u8();r.skip(1);return {count,start:r.u16()};});
  let pixelFormat=0, encoding=0; const palettes: number[][] = [];
  if (nModules) {
    pixelFormat=r.u16(); const nPalettes=r.u8(), colors=r.u8();
    for (let p=0;p<nPalettes;p++) palettes.push(Array.from({length:colors}, () => paletteColor(r,pixelFormat)));
    encoding=r.u16();
    for (let i=0;i<modules.length;i++) {
      const m=modules[i], bytes=r.bytes(r.u16());
      m.indices=decodeIndices(bytes,m.width*m.height,encoding,colors,`${name}/module${i}`);
    }
  }
  r.end();
  for (const fm of frameModules) if (fm.module>=modules.length) r.fail('frame module references missing image');
  for (const f of frames) if (f.start+f.count>frameModules.length) r.fail('frame range out of bounds');
  // Some canonical resources used only as module images have dangling animation references.
  // Preserve and report the bytes. Rendering an invalid frame remains an explicit error.
  const warnings=animationFrames.flatMap((f,i)=>f.frame>=frames.length?[`animationFrames[${i}] references ${f.frame}, frame count ${frames.length}`]:[]);
  for (const a of animations) if (a.start+a.count>animationFrames.length) r.fail('animation range out of bounds');
  return {name,header,modules,frameModules,frames,animationFrames,animations,palettes,pixelFormat,encoding,warnings};
}
