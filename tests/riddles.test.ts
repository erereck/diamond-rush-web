import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Simulation} from '../src/core/Simulation.ts';
import type {LevelDefinition} from '../src/level/LevelParser.ts';
import {restoreReplay,validateReplay} from '../src/platform/Session.ts';
const trace=JSON.parse(readFileSync(new URL('fixtures/riddles-s700.json',import.meta.url),'utf8'));
function level(extra=0):LevelDefinition{
 const width=20,height=18,tiles:number[]=Array.from({length:width*height},(_,i)=>i%width===0||i%width===width-1||i<width||i>=width*(height-1)?80:255);
 const objects=tiles.map(()=>255),parameters=tiles.map(()=>255),at=(x:number,y:number)=>x+y*width;
 tiles[at(12,8)]=79;objects[at(12,8)]=26;parameters[at(12,8)]=0;
 for(const x of [4,13]){objects[at(x,8)]=7;objects[at(x,9)]=17;parameters[at(x,9)]=0;}
 if(extra>=1){objects[at(14,8)]=33;objects[at(14,9)]=17;parameters[at(14,9)]=0;tiles[at(14,8)]=2;}
 if(extra>=2){tiles[at(17,10)]=18;objects[at(17,10)]=17;parameters[at(17,10)]=0;}
 return {world:0,index:0,width,height,offset:0,tiles,objects,parameters};
}
function summary(s:Simulation){
 const r=s.riddles,target=r.target<0?0:r.target;
 return [r.active,r.remaining[0],s.gatePhases[s.index(4,8)],s.gatePhases[s.index(13,8)],s.level.objects[s.index(12,8)],r.phase,r.ticks,target%s.level.width,Math.floor(target/s.level.width),s.camera.x,s.camera.y,r.hint,r.hintTicks,r.held?1:0,
   s.level.objects[s.index(14,8)]===33?(r.lockedChests.has(s.index(14,8))?255:0):-1];
}
test('red-snake hits and riddle methods match 304 snapshots from extracted Java methods',()=>{
 assert.equal(trace.scope,'isolated-source-methods');assert.equal(trace.cases.length,125);
 const source=readFileSync(new URL('../../../work/reference-s700/src/cGame.java',import.meta.url),'utf8').replaceAll('\r\n','\n');
 assert.equal(createHash('sha256').update(source).digest('hex'),trace.sourceHash);
 for(const [n,{input:c,expected}] of trace.cases.entries()){
  const s=new Simulation(level(c.extra));s.riddles.remaining[0]=c.count??2;s.riddles.hints[0]=57;
  s.gatePhases[s.index(4,8)]=c.phase??0;s.gatePhases[s.index(13,8)]=c.phase??0;
  s.camera.x=0;s.camera.y=0;s.player.direction=c.direction??4;s.player.offset=c.offset??0;
  if(c.op==='hit'){
   const i=s.index(6,6);s.tiles[i]=c.kind;s.state[i]=c.state;s.stunSnake(6,6);
   assert.deepEqual([s.tiles[i],s.state[i],s.enemySmoke.length],expected[0],`hit ${n}`);continue;
  }
  if(c.op==='trigger'||c.op==='timeline')s.riddles.trigger(s,12,8);
  if(c.op==='target')s.riddles.selectTarget(s,0);
  if(c.op==='destroy'){
   s.riddles.active=0;
   if(c.mode)s.boss={health:c.health} as typeof s.boss;
   s.riddles.destroyed(s);
  }
  if(c.op==='timeline')for(const [tick,row] of expected.entries()){s.riddles.step(s);assert.deepEqual(summary(s),row,`timeline ${tick}`);}
  else assert.deepEqual(summary(s),expected[0],`room ${n}`);
 }
});
test('combat room initializes counted enemies and locked prizes; reset and replay preserve progress',()=>{
 const l=level(1),enemy=8+7*l.width,marker=enemy+l.width;l.tiles[enemy]=43;l.parameters[enemy]=2;l.objects[marker]=17;l.parameters[marker]=0;
 const s=new Simulation(l,{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:1});
 assert.deepEqual(s.riddles.remaining,[1]);assert.deepEqual(s.riddles.hints,[57]);assert.equal(s.level.objects[marker],255);
 assert.equal(s.state[enemy]&98304,65536);assert.ok(s.riddles.lockedChests.has(s.index(14,8)));
 for(let i=0;i<180;i++)s.step({direction:0,action:false});
 assert.equal(s.level.objects[s.index(12,8)],255);assert.equal(s.riddles.active,0);assert.equal(s.riddles.phase,0);
 assert.equal(s.gatePhases[s.index(13,8)],0);assert.equal(s.gatePhases[s.index(4,8)],3);
 // The chest is the last camera target in this room, so the other gate remains open.
 assert.deepEqual(restoreReplay(validateReplay(s.replay(),[{version:0,world:0,levels:[l]}]),[{version:0,world:0,levels:[l]}]).snapshot(),s.snapshot());
 s.riddles.destroyed(s);assert.equal(s.riddles.remaining[0],0);assert.equal(s.gatePhases[s.index(13,8)],1);assert.ok(!s.riddles.lockedChests.has(s.index(14,8)));
 s.restoreCheckpoint();assert.equal(s.riddles.active,-1);assert.deepEqual(s.riddles.remaining,[1]);assert.ok(s.riddles.lockedChests.has(s.index(14,8)));assert.equal(s.level.objects[s.index(12,8)],26);
});
test('repeated hits during stun preserve resistance; three fresh hits defeat a red snake',()=>{
 const s=new Simulation(level()),i=s.index(6,6);s.tiles[i]=43;s.state[i]=65536|2;
 s.stunSnake(6,6);assert.equal(s.state[i]&98304,32768);
 s.stunSnake(6,6);assert.equal(s.state[i]&98304,32768);
 s.state[i]&=~248;s.stunSnake(6,6);assert.equal(s.state[i]&98304,0);assert.equal(s.tiles[i],43);
 s.state[i]&=~248;s.stunSnake(6,6);assert.equal(s.tiles[i],-1);assert.equal(s.enemySmoke.length,1);
});
