import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseWorld } from '../src/level/LevelParser.ts';
const base=resolve('../../work'), doc=resolve('docs'); mkdirSync(doc,{recursive:true});
const sources=[['reference-s700','res'],['reference-nokia','src/main/resources'],['reference-tools','diamondrush.jar-extracted']];
const sha=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
function files(dir:string):string[] {return readdirSync(dir).flatMap(f=>statSync(join(dir,f)).isDirectory()?files(join(dir,f)):[join(dir,f)]);}
const inventories=sources.map(([repo,folder])=>({repo,commit:execFileSync('git',['rev-parse','HEAD'],{cwd:join(base,repo),encoding:'utf8'}).trim(),resources:files(join(base,repo,folder)).map(f=>({name:relative(join(base,repo,folder),f).replaceAll('\\','/'),size:statSync(f).size,sha256:sha(readFileSync(f))}))}));
writeFileSync(join(doc,'RESOURCE_INVENTORY.json'),JSON.stringify(inventories,null,2));
const src=join(base,'reference-s700','src');
writeFileSync(join(doc,'SOURCE_INVENTORY.json'),JSON.stringify(files(src).map(f=>({name:relative(src,f),bytes:statSync(f).size,lines:readFileSync(f,'utf8').split('\n').length,sha256:sha(readFileSync(f))})),null,2));
const comparisons=inventories[0].resources.map(a=>({name:a.name,...Object.fromEntries(inventories.slice(1).map(i=>{const b=i.resources.find(b=>b.name===a.name);return [i.repo,!b?'absent':a.sha256===b.sha256?'identical':'different'];}))}));
writeFileSync(join(doc,'RESOURCE_COMPARISON.json'),JSON.stringify(comparisons,null,2));
const levels=[0,1,2].flatMap(w=>parseWorld(readFileSync(join(base,'reference-s700','res',`w${w}.bin`)),w).levels.map(l=>({
  world:w,level:l.index,width:l.width,height:l.height,offset:l.offset,
  spawn:l.tiles.flatMap((t,i)=>t===79?[{x:i%l.width,y:Math.floor(i/l.width)}]:[]),
  tiles:[...new Set(l.tiles)].sort((a,b)=>a-b),objects:[...new Set(l.objects)].sort((a,b)=>a-b),
  diamonds:l.tiles.filter(t=>t===1).length,redDiamonds:l.tiles.filter(t=>t===2).length
})));
writeFileSync(join(doc,'LEVEL_INVENTORY.json'),JSON.stringify(levels,null,2));
console.log(JSON.stringify({commits:inventories.map(i=>({repo:i.repo,commit:i.commit,resources:i.resources.length})),levels:levels.length,firstLevel:levels[0]},null,2));
