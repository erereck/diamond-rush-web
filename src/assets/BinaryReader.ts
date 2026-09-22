/** Bounds-checked little-endian reader. Errors retain resource and byte offset. */
export class BinaryReader {
  readonly data: Uint8Array;
  readonly name: string;
  readonly view: DataView;
  position = 0;
  constructor(data: Uint8Array, name = 'buffer') {
    this.data = data; this.name = name;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }
  get remaining() { return this.data.length - this.position; }
  fail(message: string): never { throw new Error(`${this.name}@0x${this.position.toString(16)}: ${message}`); }
  require(n: number) {
    if (!Number.isSafeInteger(n) || n < 0 || n > this.remaining) this.fail(`need ${n} bytes, have ${this.remaining}`);
  }
  u8() { this.require(1); return this.data[this.position++]; }
  i8() { const v = this.u8(); return v > 127 ? v - 256 : v; }
  u16() { this.require(2); const v = this.view.getUint16(this.position, true); this.position += 2; return v; }
  i16() { const v = this.u16(); return v > 32767 ? v - 65536 : v; }
  u32() { this.require(4); const v = this.view.getUint32(this.position, true); this.position += 4; return v; }
  i32() { return this.u32() | 0; }
  bytes(n: number) { this.require(n); const a = this.data.slice(this.position, this.position + n); this.position += n; return a; }
  skip(n: number) { this.require(n); this.position += n; }
  seek(n: number) {
    if (!Number.isSafeInteger(n) || n < 0 || n > this.data.length) this.fail(`invalid seek ${n}`);
    this.position = n;
  }
  end() { if (this.remaining) this.fail(`${this.remaining} unconsumed bytes`); }
}
