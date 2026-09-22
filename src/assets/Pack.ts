import { BinaryReader } from './BinaryReader.ts';
export interface PackEntry { index: number; offset: number; size: number; data: Uint8Array }
/** cGame.loadPackedFile: offsets are relative to the END of the entire table. */
export function parsePack(data: Uint8Array, name: string): PackEntry[] {
  const r = new BinaryReader(data, name), count = r.u8(), base = 1 + count * 8;
  r.require(count * 8);
  const entries: PackEntry[] = [];
  for (let index = 0; index < count; index++) {
    const offset = r.u32(), size = r.u32();
    if (base + offset + size > data.length) r.fail(`entry ${index} exceeds pack bounds`);
    entries.push({ index, offset: base + offset, size, data: data.slice(base + offset, base + offset + size) });
  }
  return entries;
}
export function parseStrings(data: Uint8Array): string[] {
  // Match Java ISO-8859-1 exactly (TextDecoder maps this label to Windows-1252).
  let current = ''; const strings: string[] = [];
  for (const byte of data) {
    if (byte === 0) { strings.push(current); current = ''; }
    else current += String.fromCharCode(byte);
  }
  if (current) throw new Error('Unterminated localization string');
  return strings;
}
