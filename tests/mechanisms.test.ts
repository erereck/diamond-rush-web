import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {Simulation} from '../src/core/Simulation.ts';import type {LevelDefinition} from '../src/level/LevelParser.ts';
import {restoreReplay,validateReplay} from '../src/platform/Session.ts';
const trace=JSON.parse(readFileSync(new URL('fixtures/mechanisms-s700.json',import.meta.url),'utf8'));
const movers=JSON.parse(readFileSync(new URL('fixtures/tibet-movers-s700.json',import.meta.url),'utf8'));
function level():LevelDefinition{const width=12,height=12,tiles:number[]=Array.from({length:144},(_,i)=>i%12===0||i%12===11||i<12||i>=132?80:255),objects=tiles.map(()=>255),parameters=tiles.map(()=>255);tiles[26]=79;return {world:1,index:0,width,height,offset:0,tiles,objects,parameters};}
test('Tibet weight patches and paired slider drops match 234 isolated Java cases',()=>{
 assert.equal(movers.cases.length,234);assert.equal(movers.scope,'isolated-source-methods');
 const source=readFileSync(new URL('../../../work/reference-s700/src/cGame.java',import.meta.url),'utf8').replaceAll('\r\n','\n');
 assert.equal(createHash('sha256').update(source).digest('hex'),movers.sourceHash);
 for(const [n,{input:c,expected}] of movers.cases.entries()){
  const l=level(),at=(x:number,y:number)=>x+y*12;l.world=2;
  l.tiles[at(5,4)]=c.aboveTile;l.tiles[at(5,5)]=c.op==='patch'?47:48;l.tiles[at(5,6)]=c.below;
  l.objects[at(5,4)]=c.above<0?255:c.above;
  const s=new Simulation(l);s.state[at(5,5)]=c.state;s.motion[at(5,5)]=c.motion;
  if(c.op==='slider'){s.tiles[at(5,4)]=48;s.state[at(5,4)]=8;}
  if(c.hero===1){s.player.x=4;s.player.y=5;}
  if(c.hero===2){s.player.x=6;s.player.y=5;}
  if(c.hero===3){s.player.x=5;s.player.y=6;}
  let damage=0;s.hurt=(amount)=>{damage+=amount;};
  if(c.op==='patch')s.updateTibetWeightPatch(5,5);else s.updateTibetSlider(5,5);
  const actual=[damage];for(let y=4;y<=6;y++){
    const i=at(5,y),tile=s.tiles[i];actual.push(tile,tile<0?0:s.state[i],tile<0?0:s.motion[i],s.level.objects[i]);
  }
  assert.deepEqual(actual,expected,`Java mover case ${n} ${JSON.stringify(c)}`);
 }
});
test('torch, explosive rubble, mine blast and switch barriers match 189 extracted Java cases',()=>{
 assert.equal(trace.cases.length,189);assert.equal(trace.scope,'isolated-source-methods');
 const source=readFileSync(new URL('../../../work/reference-s700/src/cGame.java',import.meta.url),'utf8').replaceAll('\r\n','\n');assert.equal(createHash('sha256').update(source).digest('hex'),trace.sourceHash);
 const sprite=JSON.parse(readFileSync(new URL('../public/assets/gen0-3.json',import.meta.url),'utf8')),a=sprite.animations[0];assert.equal(sprite.animationFrames.slice(a.start,a.start+a.count).reduce((n:number,f:any)=>n+f.duration,0),12);
 for(const [n,{input:c,expected}] of trace.cases.entries()){
  const s=new Simulation(level(),{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:([0,1,2,8] as const)[c.weapon??0]});
  // The trace generator's legacy `weapon` input is assigned to Java field_487 (environment), not recordData[9].
  s.environmentMode=c.weapon??0;
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
test('a ball striking the lower crusher half clears both halves as method_337 does',()=>{
 const l=level(),at=(x:number,y:number)=>x+y*12;
 l.tiles[at(5,5)]=16;l.parameters[at(5,5)]=4;l.tiles[at(4,5)]=14;
 const s=new Simulation(l);s.state[at(4,5)]=0;s.motion[at(4,5)]=0;
 assert.deepEqual([s.tile(5,4),s.tile(5,5)],[16,16]);
 s.updateCrusher(5,5);
 assert.deepEqual([s.tile(5,4),s.tile(5,5)],[-1,-1]);
 assert.equal(s.events.includes('crusher-break'),true);
});
test('falling mines detonate after two rows, trigger adjacent mines and break explosive rubble',()=>{
 const l=level(),at=(x:number,y:number)=>x+y*12;l.tiles[at(5,2)]=8;l.tiles[at(5,5)]=80;l.tiles[at(6,4)]=37;l.tiles[at(4,4)]=8;l.tiles[at(4,5)]=80;
 const s=new Simulation(l);for(let n=0;n<45;n++)s.step({direction:0,action:false});assert.equal(s.tile(5,4),-1);assert.equal(s.tile(4,4),-1);assert.equal(s.tile(6,4),-1);assert.equal(s.events.includes('mine-blast'),false);
 assert.deepEqual(restoreReplay(validateReplay(s.replay(),[{version:0,world:0,levels:[]},{version:0,world:1,levels:[l]}]),[{version:0,world:0,levels:[]},{version:0,world:1,levels:[l]}]).snapshot(),s.snapshot());s.restoreCheckpoint();assert.equal(s.tile(5,2),8);assert.equal(s.tile(6,4),37);
});
test('Tibet tile 47 falls and deposits its original ice patch only after resting',()=>{
 const l=level(),at=(x:number,y:number)=>x+y*12;
 l.world=2;
 l.tiles[at(5,4)]=47;l.tiles[at(5,8)]=80;
 const s=new Simulation(l,{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:2});
 assert.equal(s.active[at(5,4)],48);
 for(let n=0;n<30;n++)s.step({direction:0,action:false});
 assert.equal(s.tile(5,7),47);
 assert.equal(s.object(5,6),35);
 assert.equal(s.object(5,3),255);
 const worlds=[{version:0,world:0,levels:[]},{version:0,world:1,levels:[]},{version:0,world:2,levels:[l]}];
 assert.deepEqual(restoreReplay(validateReplay(s.replay(),worlds),worlds).snapshot(),s.snapshot());
 s.restoreCheckpoint();assert.equal(s.tile(5,4),47);assert.equal(s.object(5,6),255);
});
test('Tibet tile 48 loads and drops as a paired slider, then hooks both halves together',()=>{
 const l=level(),at=(x:number,y:number)=>x+y*12;l.world=2;
 l.tiles[at(6,4)]=48;l.parameters[at(6,4)]=4;
 l.tiles[at(2,2)]=255;l.tiles[at(3,7)]=79;
 for(let x=3;x<=8;x++)l.tiles[at(x,8)]=80;
 const s=new Simulation(l,{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:2});
 assert.deepEqual([s.tile(6,3),s.tile(6,4),s.state[at(6,3)],s.state[at(6,4)]],[48,48,8,16]);
 for(let n=0;n<30;n++)s.step({direction:0,action:false});
 assert.deepEqual([s.tile(6,6),s.tile(6,7),s.state[at(6,7)]&7],[48,48,0]);
 s.step({direction:0,action:true});for(let n=0;n<24;n++)s.step({direction:0,action:false});
 assert.deepEqual([s.tile(4,6),s.tile(4,7),s.tile(6,6),s.tile(6,7)],[48,48,-1,-1]);
 const worlds=[{version:0,world:0,levels:[]},{version:0,world:1,levels:[]},{version:0,world:2,levels:[l]}];
 assert.deepEqual(restoreReplay(validateReplay(s.replay(),worlds),worlds).snapshot(),s.snapshot());
});
test('ice switch barriers alternate outside the boss arena and restore at a checkpoint',()=>{
 const l=level(),at=(x:number,y:number)=>x+y*12;l.tiles[at(3,2)]=18;l.tiles[at(5,3)]=34;l.tiles[at(6,3)]=35;
 const s=new Simulation(l,{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:8});s.step({direction:0,action:true});for(let n=0;n<35;n++)s.step({direction:0,action:false});
 assert.equal(s.bridges.position,9);assert.equal(s.tile(5,3),34);assert.equal(s.tile(6,3),-1);s.step({direction:0,action:true});for(let n=0;n<35;n++)s.step({direction:0,action:false});assert.equal(s.bridges.position,0);assert.equal(s.tile(5,3),-1);assert.equal(s.tile(6,3),35);s.restoreCheckpoint();assert.deepEqual(s.bridges.snapshot(),{position:0,direction:0});
});
