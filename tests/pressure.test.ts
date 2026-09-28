import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Simulation} from '../src/core/Simulation.ts';
import {pressurePlateDepression} from '../src/render/OriginalAnimationRules.ts';
import type {LevelDefinition} from '../src/level/LevelParser.ts';
import {parseWorld} from '../src/level/LevelParser.ts';
import {restoreReplay,validateReplay} from '../src/platform/Session.ts';
const trace=JSON.parse(readFileSync(new URL('fixtures/pressure-s700.json',import.meta.url),'utf8'));
function fixture():LevelDefinition{
  const width=9,height=6,tiles:number[]=Array.from({length:width*height},(_,i)=>i%width===0||i%width===width-1||i<width||i>=width*(height-1)?80:255);
  const objects=tiles.map(()=>255),parameters=tiles.map(()=>255);tiles[1+width]=79;
  objects[3+width*3]=6;parameters[3+width*3]=0;
  objects[6+width*3]=7;parameters[6+width*3]=0;
  return {world:0,index:0,width,height,offset:0,tiles,objects,parameters};
}
test('plate and door methods match 137 measured source Java cases',()=>{
  assert.equal(trace.scope,'isolated-source-methods');assert.equal(trace.cases.length,137);
  const source=readFileSync(new URL('../../../work/reference-s700/src/cGame.java',import.meta.url),'utf8').replaceAll('\r\n','\n');
  assert.equal(createHash('sha256').update(source).digest('hex'),trace.sourceHash);
  for(const [index,{input:c,expected}] of trace.cases.entries()){
    const s=new Simulation(fixture()),plate=s.index(3,3),gate=s.index(6,3);
    s.tick=c.frame;
    if(c.op==='fall-motion'){
      s.tiles[plate]=0;s.state[plate]=c.direction;s.motion[plate]=c.motion;
      s.updateFalling(3,3);assert.equal(s.motion[plate],expected.motion,`motion case ${index}`);continue;
    }
    s.gatePhases[gate]=c.phase;s.gateCounts[gate]=c.count;
    if(c.op==='gate'){
      s.updateGate(6,3);assert.deepEqual({phase:s.gatePhases[gate],count:s.gateCounts[gate]},expected,`gate case ${index}`);continue;
    }
    s.tiles[plate]=c.tile;s.motion[plate]=c.motion;s.tiles[gate]=c.gateTile;
    s.player.x=c.heroX;s.player.y=c.heroY;s.player.offset=c.offset;s.player.direction=c.direction;
    s.updatePressurePlate(3,3);
    const depression=pressurePlateDepression(c.tile,c.motion,c.heroX,c.heroY,c.offset,c.direction,3,3);
    assert.deepEqual({phase:s.gatePhases[gate],count:s.gateCounts[gate],gateTile:s.tiles[gate],damage:4-s.health,depression},expected,`plate case ${index}`);
  }
});
test('leaving a plate closes its door, a weight keeps it open, and checkpoint restores it',()=>{
  const l=fixture();l.tiles[3+9*4]=80;
  const s=new Simulation(l),plate=s.index(3,3),gate=s.index(6,3);
  s.player.x=3;s.player.y=3;s.player.offset=0;
  s.step({direction:0,action:false});assert.equal(s.gatePhases[gate],1);
  for(let i=0;i<5;i++)s.step({direction:0,action:false});assert.equal(s.gatePhases[gate],3);
  s.step({direction:2,action:false});s.step({direction:0,action:false});assert.equal(s.gatePhases[gate],0);
  s.tiles[plate]=0;s.motion[plate]=0;s.wake(3,3);
  for(let i=0;i<6;i++)s.step({direction:0,action:false});assert.equal(s.gatePhases[gate],3);
  s.restoreCheckpoint();assert.equal(s.gatePhases[gate],0);assert.equal(s.tiles[plate],-1);
});
test('plate scan precedes falling motion and a real gate crush bypasses invulnerability',()=>{
  const l=fixture();l.tiles[3+9*4]=80;
  const s=new Simulation(l),plate=s.index(3,3),gate=s.index(6,3);
  s.tiles[plate]=0;s.state[plate]=3;s.motion[plate]=12;s.wake(3,3);
  s.step({direction:0,action:false});assert.equal(s.gatePhases[gate],0);assert.equal(s.motion[plate],11);
  s.step({direction:0,action:false});assert.equal(s.gatePhases[gate],1);assert.equal(s.motion[plate],11);
  s.player.x=6;s.player.y=3;s.invulnerable=40;s.tiles[plate]=-1;s.wake(3,3);
  s.step({direction:0,action:false});assert.equal(s.health,0);assert.equal(s.hits,1);assert.equal(s.gatePhases[gate],0);
});
test('Angkor 4 pressure gate can be opened by a real pushed stone and survives replay',()=>{
  const res=new URL('../../../work/reference-s700/res/',import.meta.url),worlds=[0,1,2].map(w=>parseWorld(readFileSync(new URL(`w${w}.bin`,res)),w));
  const s=new Simulation(worlds[0].levels[3]);
  const walk=(direction:1|2|3|4,cells:number)=>{for(let i=0;i<cells*4;i++)s.step({direction,action:false});};
  walk(2,2);walk(3,2);walk(4,2);walk(3,1);
  assert.deepEqual([s.player.x,s.player.y],[3,20]);
  for(let i=0;i<11;i++)s.step({direction:2,action:false});
  assert.equal(s.tile(5,21),0);
  s.step({direction:0,action:false});
  for(let i=0;i<40;i++)s.step({direction:0,action:false});
  assert.equal(s.tile(5,21),0);assert.equal(s.gatePhases[s.index(7,20)],3);
  assert.equal(s.motion[s.index(5,21)],0);
  assert.deepEqual(restoreReplay(validateReplay(s.replay(),worlds),worlds).snapshot(),s.snapshot());
});
