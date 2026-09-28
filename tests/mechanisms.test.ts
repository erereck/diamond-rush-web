import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {Simulation} from '../src/core/Simulation.ts';import type {LevelDefinition} from '../src/level/LevelParser.ts';
import {restoreReplay,validateReplay} from '../src/platform/Session.ts';
const trace=JSON.parse(readFileSync(new URL('fixtures/mechanisms-s700.json',import.meta.url),'utf8'));
function level():LevelDefinition{const width=12,height=12,tiles:number[]=Array.from({length:144},(_,i)=>i%12===0||i%12===11||i<12||i>=132?80:255),objects=tiles.map(()=>255),parameters=tiles.map(()=>255);tiles[26]=79;return {world:1,index:0,width,height,offset:0,tiles,objects,parameters};}
test('torch, explosive rubble, mine blast and switch barriers match 189 extracted Java cases',()=>{
 assert.equal(trace.cases.length,189);assert.equal(trace.scope,'isolated-source-methods');
 const source=readFileSync(new URL('../../../work/reference-s700/src/cGame.java',import.meta.url),'utf8').replaceAll('\r\n','\n');assert.equal(createHash('sha256').update(source).digest('hex'),trace.sourceHash);
 const sprite=JSON.parse(readFileSync(new URL('../public/assets/gen0-3.json',import.meta.url),'utf8')),a=sprite.animations[0];assert.equal(sprite.animationFrames.slice(a.start,a.start+a.count).reduce((n:number,f:any)=>n+f.duration,0),12);
 for(const [n,{input:c,expected}] of trace.cases.entries()){
  const s=new Simulation(level(),{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:([0,1,2,8] as const)[c.weapon??0]});
  let damage=0,solved=0,effects=0,switched=false;s.hurt=(a)=>{damage+=a;};s.riddles.destroyed=()=>{solved++;};s.destroyEffect=()=>{effects++;};
  s.bridges.position=c.position??0;s.bridges.direction=c.direction??0;s.tick=c.tick??0;s.level.objects[s.index(2,2)]=c.object===-1||c.object===undefined?255:c.object;s.state[s.index(5,5)]=c.state??0;
  if(c.op==='torch'){s.tiles[s.index(5,5)]=36;s.tiles[s.index(5,4)]=c.above;if(c.hero){s.player.x=5;s.player.y=4;}s.updateTorch(5,5);}
  if(c.op==='rubble'){s.tiles[s.index(5,5)]=37;s.updateRubble(5,5);}
  if(c.op==='blast'){const kinds=[8,10,30,37,54,16,19,43,49];kinds.forEach((k,j)=>s.tiles[s.index(4+j%3,4+Math.floor(j/3))]=k);s.player.x=6;s.player.y=5;s.updateMineBlast(5,5);}
  if(c.op==='switch')switched=s.bridges.flip(s);
  if(c.op==='bridge'){s.level.objects[s.index(4,4)]=15;s.tiles[s.index(4,4)]=19;s.level.objects[s.index(5,4)]=16;s.tiles[s.index(5,4)]=0;s.tiles[s.index(6,4)]=34;s.tiles[s.index(4,5)]=35;s.bridges.step(s);}
  const actual=[s.bridges.position,s.bridges.direction,damage,solved,effects,switched?1:0];for(let y=4;y<=6;y++)for(let x=4;x<=6;x++){const i=s.index(x,y);actual.push(s.tiles[i],s.state[i],s.level.objects[i]);}
  assert.deepEqual(actual,expected,`Java case ${n} ${JSON.stringify(c)}`);
 }
});
test('a crawler lights counted torches once, solves its room and burns a hero over the flame',()=>{
 const l=level(),at=(x:number,y:number)=>x+y*12;l.tiles[at(5,5)]=36;l.tiles[at(5,4)]=11;l.objects[at(5,6)]=17;l.parameters[at(5,6)]=0;l.objects[at(8,5)]=7;l.objects[at(8,6)]=17;l.parameters[at(8,6)]=0;
 const s=new Simulation(l);s.riddles.active=0;s.gatePhases[at(8,5)]=0;s.updateTorch(5,5);assert.equal(s.state[at(5,5)],1);assert.equal(s.riddles.remaining[0],0);assert.equal(s.gatePhases[at(8,5)],1);
 s.updateTorch(5,5);assert.equal(s.riddles.remaining[0],0);s.player.x=5;s.player.y=4;s.updateTorch(5,5);assert.equal(s.health,3);s.restoreCheckpoint();assert.equal(s.state[at(5,5)],0);assert.equal(s.riddles.remaining[0],1);
});
test('falling mines detonate after two rows, trigger adjacent mines and break explosive rubble',()=>{
 const l=level(),at=(x:number,y:number)=>x+y*12;l.tiles[at(5,2)]=8;l.tiles[at(5,5)]=80;l.tiles[at(6,4)]=37;l.tiles[at(4,4)]=8;l.tiles[at(4,5)]=80;
 const s=new Simulation(l);for(let n=0;n<45;n++)s.step({direction:0,action:false});assert.equal(s.tile(5,4),-1);assert.equal(s.tile(4,4),-1);assert.equal(s.tile(6,4),-1);assert.equal(s.events.includes('mine-blast'),false);
 assert.deepEqual(restoreReplay(validateReplay(s.replay(),[{version:0,world:0,levels:[]},{version:0,world:1,levels:[l]}]),[{version:0,world:0,levels:[]},{version:0,world:1,levels:[l]}]).snapshot(),s.snapshot());s.restoreCheckpoint();assert.equal(s.tile(5,2),8);assert.equal(s.tile(6,4),37);
});
test('ice switch barriers alternate outside the boss arena and restore at a checkpoint',()=>{
 const l=level(),at=(x:number,y:number)=>x+y*12;l.tiles[at(3,2)]=18;l.tiles[at(5,3)]=34;l.tiles[at(6,3)]=35;
 const s=new Simulation(l,{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:8});s.step({direction:0,action:true});for(let n=0;n<35;n++)s.step({direction:0,action:false});
 assert.equal(s.bridges.position,9);assert.equal(s.tile(5,3),34);assert.equal(s.tile(6,3),-1);s.step({direction:0,action:true});for(let n=0;n<35;n++)s.step({direction:0,action:false});assert.equal(s.bridges.position,0);assert.equal(s.tile(5,3),-1);assert.equal(s.tile(6,3),35);s.restoreCheckpoint();assert.deepEqual(s.bridges.snapshot(),{position:0,direction:0});
});
