import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { BinaryReader } from '../src/assets/BinaryReader.ts';
import { parsePack, parseStrings } from '../src/assets/Pack.ts';
import { decodeSprite, decodeIndices } from '../src/assets/SpriteDecoder.ts';
import { parseWorld, parseWorldMap } from '../src/level/LevelParser.ts';
import { parseMidi } from '../src/platform/Midi.ts';
const res=new URL('../../../work/reference-s700/res/',import.meta.url);
const read=(name:string)=>readFileSync(new URL(name,res));
test('reader preserves signed values, offset slices, LE and bounds',()=>{
  const r=new BinaryReader(new Uint8Array([99,255,0,128,120,86,52,18,99]).subarray(1,8),'fixture');
  assert.equal(r.i8(),-1);assert.equal(r.i16(),-32768);assert.equal(r.u32(),0x12345678);r.end();
  assert.throws(()=>r.u8(),/fixture@0x7/);assert.throws(()=>r.seek(-1),/invalid seek/);assert.throws(()=>r.bytes(-1),/need -1/);
});
test('pack offsets are relative to end of table, including gaps',()=>{
  const b=new Uint8Array([2,2,0,0,0,2,0,0,0,0,0,0,0,1,0,0,0,10,0,20,21]);
  const p=parsePack(b,'fixture');assert.deepEqual([...p[0].data],[20,21]);assert.deepEqual([...p[1].data],[10]);
  assert.throws(()=>parsePack(b.subarray(0,19),'short'),/exceeds pack bounds/);
});
test('Latin-1 decoding differs intentionally from Windows-1252',()=>{
  assert.deepEqual(parseStrings(new Uint8Array([0x80,0,0xe9,0])),['\u0080','é']);assert.throws(()=>parseStrings(new Uint8Array([65])),/Unterminated/);
});
test('all index encodings, RLE polarity and bit padding',()=>{
  assert.deepEqual(decodeIndices(new Uint8Array([0x12,0x30]),3,0x1600,4,'I16'),[1,2,3]);
  assert.deepEqual(decodeIndices(new Uint8Array([0b00011011]),4,0x0400,4,'I4'),[0,1,2,3]);
  assert.deepEqual(decodeIndices(new Uint8Array([0b10100000]),3,0x0200,2,'I2'),[1,0,1]);
  assert.deepEqual(decodeIndices(new Uint8Array([3,2,1]),3,0x5602,4,'I256'),[3,2,1]);
  assert.deepEqual(decodeIndices(new Uint8Array([130,2,1]),3,0x27f1,3,'I127RLE'),[2,2,1]);
  assert.deepEqual(decodeIndices(new Uint8Array([2,2,130,1,0]),4,0x56f2,3,'I256RLE'),[2,2,1,0]);
  assert.throws(()=>decodeIndices(new Uint8Array([131,0]),2,0x27f1,2,'overflow'),/RLE exceeds/);
  assert.throws(()=>decodeIndices(new Uint8Array([2]),1,0x5602,2,'palette'),/palette index/);
});
let sprites=0;const warnings:string[]=[];
for(const name of readdirSync(res).filter(f=>f.endsWith('.f'))){
  for(const e of parsePack(read(name),name)){
    if(e.data[0]!==0xdf||e.data[1]!==3)continue;
    sprites++;
    test(`canonical sprite ${name}/${e.index}: decode every module and palette`,()=>{
      const s=decodeSprite(e.data,`${name}/${e.index}`);
      for(const m of s.modules){assert.equal(m.indices.length,m.width*m.height);for(const p of s.palettes)assert(m.indices.every(c=>c<p.length));}
      const again=decodeSprite(e.data,`${name}/${e.index}`);assert.deepEqual(s,again);
      warnings.push(...s.warnings.map(w=>`${name}/${e.index}: ${w}`));
      assert.throws(()=>decodeSprite(e.data.subarray(0,e.data.length-1),'truncated'),/need|unconsumed|bounds/);
    });
  }
}
test('canonical sprite count is 95, not a subset',()=>assert.equal(sprites,95));
for(let w=0;w<3;w++)test(`world ${w}: consumes all canonical levels`,()=>{
  const world=parseWorld(read(`w${w}.bin`),w);assert.equal(world.levels.length,[14,13,14][w]);
  for(const l of world.levels){assert.equal(l.tiles.length,l.width*l.height);assert.equal(l.parameters.length,l.tiles.length);assert.equal(l.objects.length,l.tiles.length);}
  assert.throws(()=>parseWorld(read(`w${w}.bin`).subarray(0,100),w),/need/);
});
test('first Angkor level has verified counts and spawn',()=>{
  const l=parseWorld(read('w0.bin'),0).levels[0];assert.equal(l.width,26);assert.equal(l.height,21);assert.equal(l.tiles[4+17*26],79);assert.equal(l.tiles.filter(t=>t===1).length,21);assert.equal(l.tiles.filter(t=>t===2).length,1);
});
for(const name of ['map_angkor.out','map_scotland.out','map_tibet.out'])test(`${name}: links reference real map nodes`,()=>{
  const nodes=parseWorldMap(read(name),name);for(const node of nodes)for(const link of node.links)assert(nodes.some(n=>n.x===link.x&&n.y===link.y));
});
test('all 21 MIDI tracks parse and have finite timed notes',()=>{
  const pack=parsePack(read('snd.f'),'snd.f');assert.equal(pack.length,21);
  for(const e of pack){const song=parseMidi(e.data);assert(song.notes.length>0);assert(song.duration>0);assert(song.notes.every(n=>Number.isFinite(n.time)&&n.time>=0&&n.duration>=0&&n.note<128));}
});
test('extracted assets retain the audited canonical resource hashes',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../public/assets/manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.resources.length,40);
  for(const resource of manifest.resources)assert.equal(createHash('sha256').update(read(resource.name)).digest('hex'),resource.sha256);
});
