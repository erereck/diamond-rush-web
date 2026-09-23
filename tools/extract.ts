import { readFileSync, readdirSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { parsePack, parseStrings } from '../src/assets/Pack.ts';
import { decodeSprite } from '../src/assets/SpriteDecoder.ts';
import { parseWorld, parseWorldMap } from '../src/level/LevelParser.ts';
const source = resolve(process.argv[2] ?? '../../work/reference-s700/res');
const dest = resolve('public/assets');
mkdirSync(dest, {recursive:true});
const json = (name:string, obj:unknown) => writeFileSync(join(dest,name), JSON.stringify(obj));
const manifest = { version:'1.2.0-s700', resources:[] as {name:string;bytes:number;sha256:string}[], sprites:[] as string[], worlds:[] as {world:number;levels:number}[], audio:[] as string[] };
for (const name of readdirSync(source).sort()) {
  const data=readFileSync(join(source,name));
  manifest.resources.push({name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
  if (!name.endsWith('.f')) continue;
  for (const e of parsePack(data,name)) {
    const id=`${name.slice(0,-2)}-${e.index}`;
    if (e.data[0]===0xdf && e.data[1]===3) {
      const sprite=decodeSprite(e.data,id); json(`${id}.json`,sprite); manifest.sprites.push(id);
    } else if (name==='snd.f') {
      writeFileSync(join(dest,`${id}.mid`),e.data); manifest.audio.push(id);
    } else if (name==='spl.f') writeFileSync(join(dest,`${id}.png`),e.data);
    else if (name==='lang.f' || name==='lang_IGA.f') json(`${id}.json`,parseStrings(e.data));
    else if (name==='cr.f') json(`${id}.json`,Buffer.from(e.data).toString('latin1'));
    else writeFileSync(join(dest,`${id}.bin`),e.data);
  }
}
for (let world=0;world<3;world++) {
  const w=parseWorld(readFileSync(join(source,`w${world}.bin`)),world);
  const mapName=['map_angkor.out','map_scotland.out','map_tibet.out'][world];
  json(`world-${world}.json`,w);
  json(`map-${world}.json`,parseWorldMap(readFileSync(join(source,mapName)),mapName));
  manifest.worlds.push({world,levels:w.levels.length});
}
copyFileSync(join(source,'mc'),join(dest,'font-map.bin'));
// demoSpr.bin is a separate indexed sprite pack used by the opening dialogue.
const demoSprites=readFileSync(join(source,'demoSpr.bin'));
let demoOffset=2;
for(let i=0;i<demoSprites.readUInt16LE(0);i++){
  const id=demoSprites.readUInt16LE(demoOffset),length=demoSprites.readUInt32LE(demoOffset+2);
  demoOffset+=6;
  const name=`demo-sprite-${id}`;
  json(`${name}.json`,decodeSprite(demoSprites.subarray(demoOffset,demoOffset+length),name));
  manifest.sprites.push(name);demoOffset+=length;
}
json('manifest.json',manifest);
console.log(`Extracted ${manifest.sprites.length} sprites; ${manifest.worlds.map(w=>w.levels).join('/')} levels; ${manifest.audio.length} MIDI tracks.`);
