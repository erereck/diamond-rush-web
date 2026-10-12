/**
 * Proves that the generated TypeScript core (src/generated/s700.ts) behaves exactly like the
 * recompiled S700 decompilation on the JVM: every per-tick observation, the state transitions,
 * and all six map planes at sampled ticks must be identical.
 * Requires the pinned reference clone and a JDK. Usage:
 *   node tools/verify-core.ts [--fuzz=N] [--seed=S] [--build]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildJavaOracle, runJavaOracle } from './routes/JavaOracle.ts';
import type { OracleRun } from './routes/JavaOracle.ts';
import { runEngine } from './routes/EngineProbe.ts';
import { useExtractedResources } from './routes/engineResources.ts';
import type { ControlRun } from './routes/CoreRoute.ts';
import type { EngineStart } from '../src/core/s700/Engine.ts';

const args=process.argv.slice(2);
const option=(name:string)=>args.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3);
if(args.includes('--build'))buildJavaOracle();
useExtractedResources();
interface Case {name:string;start:EngineStart;controls:ControlRun[]}
const cases:Case[]=[];
const fixtures=fileURLToPath(new URL('../tests/fixtures/',import.meta.url));
for(const name of readdirSync(join(fixtures,'core-routes')).filter(n=>n.endsWith('.json')).sort()){
  const f=JSON.parse(readFileSync(join(fixtures,'core-routes',name),'utf8'));
  cases.push({name,start:f.start,controls:f.controls});
}
let seed=Number(option('seed')??1);
const random=()=>{seed=(Math.imul(seed,1103515245)+12345)|0;return ((seed>>>8)&0xffff)/65536;};
const levelCounts=[14,13,14];
for(let k=0;k<Number(option('fuzz')??20);k++){
  const world=Math.floor(random()*3),level=Math.floor(random()*levelCounts[world]),weaponTier=[0,1,2,8][Math.floor(random()*4)],diving=random()<0.3||k%4===3; // every fourth case dives, so short runs (CI) cover water too
  const controls:ControlRun[]=[];let total=0;
  while(total<1500){
    const ticks=1+Math.floor(random()*(random()<0.3?40:8));
    controls.push({ticks,direction:Math.floor(random()*5) as 0|1|2|3|4,action:random()<0.15,...(random()<0.01?{reset:true}:{})});total+=ticks;
  }
  cases.push({name:`random #${k} world ${world} level ${level} weapon ${weaponTier}${diving?' diving':''}`,start:{world,level,lives:5,diamonds:0,redDiamonds:0,maxHealth:4,weaponTier,...(diving?{diving}:{})},controls});
}
function firstDifference(a:OracleRun,b:OracleRun){
  if(a.error||b.error)return `error: java ${a.error} / ts ${b.error}`;
  const rows=Math.max(a.rows.length,b.rows.length);
  for(let i=0;i<rows;i++)if(JSON.stringify(a.rows[i])!==JSON.stringify(b.rows[i]))return `tick ${i}: java ${JSON.stringify(a.rows[i])} ts ${JSON.stringify(b.rows[i])}`;
  if(JSON.stringify(a.states)!==JSON.stringify(b.states))return `states java ${a.states} ts ${b.states}`;
  if(JSON.stringify(a.end)!==JSON.stringify(b.end))return 'final settle differs';
  if([...a.maps.keys()].join()!==[...b.maps.keys()].join())return `map samples java ${[...a.maps.keys()]} ts ${[...b.maps.keys()]}`;
  for(const [tick,map] of a.maps)if(JSON.stringify(map)!==JSON.stringify(b.maps.get(tick)))return `map planes differ at tick ${tick}`;
  return null;
}
let identical=0;
for(const c of cases){
  const total=c.controls.reduce((n,r)=>n+r.ticks,0),mapTicks=[0,Math.floor(total/2),total];
  const java=runJavaOracle({world:c.start.world,level:c.start.level,initial:{lives:c.start.lives,diamonds:c.start.diamonds,redDiamonds:c.start.redDiamonds,health:c.start.maxHealth,maxHealth:c.start.maxHealth,weaponTier:c.start.weaponTier as 0|1|2|8},diving:!!c.start.diving,controls:c.controls,mapTicks});
  const ts=runEngine(c.start,c.controls,mapTicks);
  const difference=firstDifference(java,ts);
  if(difference===null){identical++;console.log(`identical: ${c.name} (${total} ticks)`);}
  else console.log(`DIFFERENT: ${c.name}: ${difference}`);
}
console.log(`${identical}/${cases.length} control streams identical between the generated core and the JVM reference`);
if(identical!==cases.length)process.exitCode=1;
