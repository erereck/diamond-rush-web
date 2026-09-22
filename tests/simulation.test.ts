import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Clock } from '../src/core/Clock.ts';
import { Camera } from '../src/core/Camera.ts';
import { Simulation } from '../src/core/Simulation.ts';
import type { Direction } from '../src/core/Simulation.ts';
import { parseWorld } from '../src/level/LevelParser.ts';
import type { LevelDefinition } from '../src/level/LevelParser.ts';
import { validateReplay, restoreReplay } from '../src/platform/Session.ts';
function fixture(rows:string[]):LevelDefinition{
  const tiles=rows.flatMap(row=>[...row].map(c=>({'#':80,' ':255,'@':79,'O':0,'*':1,g:10,S:19} as Record<string,number>)[c]));
  return {world:0,index:0,width:rows[0].length,height:rows.length,offset:0,tiles,parameters:tiles.map(t=>t===19?2:255),objects:tiles.map(()=>255)};
}
const step=(s:Simulation,d:Direction=0,n=1)=>{for(let i=0;i<n;i++)s.step({direction:d,action:false});};
test('display refresh rates do not alter 20 Hz simulation cadence',()=>{
  const run=(hz:number)=>{const clock=new Clock();let ticks=0;for(let i=0;i<=hz*10;i++)clock.advance(i*1000/hz,()=>ticks++);return ticks;};
  assert.equal(run(30),200);assert.equal(run(60),200);assert.equal(run(144),200);
  const clock=new Clock();let n=0;clock.advance(0,()=>n++);clock.advance(5000,()=>n++);assert.equal(n,5);
});
test('movement advances a 24-pixel tile in four simulation ticks',()=>{
  const s=new Simulation(fixture(['#######','#@    #','#######']));step(s,2);assert.equal(s.player.x,2);assert.equal(s.player.offset,18);
  step(s,2,3);assert.equal(s.player.x,2);assert.equal(s.player.offset,0);step(s,2);assert.equal(s.player.x,3);
});
test('wall collision and cleared grass preserve data definitions',()=>{
  const level=fixture(['#####','#@g##','#####']),s=new Simulation(level);step(s,2,8);assert.equal(s.player.x,2);assert.equal(s.tile(2,1),-1);assert.equal(level.tiles[7],10);
});
test('falling rocks update bottom to top and cannot move two rows per tick',()=>{
  const s=new Simulation(fixture(['#######','# OO  #','#     #','#   @ #','#######']));step(s);
  assert.equal(s.tile(2,2),0);assert.equal(s.tile(2,3),-1);assert.equal(s.motion[s.index(2,2)],18);
});
test('boulders resting directly above player do not start falling into player',()=>{
  const s=new Simulation(fixture(['#####','# O #','# @ #','#####']));step(s,0,10);assert.equal(s.health,4);assert.equal(s.tile(2,1),0);
});
test('pushing requires seven attempted ticks and an empty destination',()=>{
  const s=new Simulation(fixture(['#######','#@O   #','#######']));step(s,2,6);assert.equal(s.player.x,1);step(s,2);assert.equal(s.player.x,2);assert.equal(s.tile(3,1),0);
});
test('original collision threshold is strict 24 pixels',()=>{
  const s=new Simulation(fixture(['######','#@   #','######']));assert.equal(s.overlap(2,1,0,0),false);assert.equal(s.overlap(2,1,2,6),true);
});
test('camera preserves original integer dead zones',()=>{
  const c=new Camera();c.update(144,120,26,21);assert.equal(c.x,12);assert.equal(c.y,0);c.update(144,144,26,21);assert.equal(c.x,18);assert.equal(c.y,12);
  c.update(-100,-100,26,21);assert.equal(c.x,0);assert.equal(c.y,0);
});
const worlds=[0,1,2].map(w=>parseWorld(readFileSync(new URL(`../../../work/reference-s700/res/w${w}.bin`,import.meta.url)),w));
test('canonical level input replay reconstructs full deterministic state',()=>{
  const s=new Simulation(worlds[0].levels[0]);for(let i=0;i<400;i++)step(s,([0,2,1,4,3] as Direction[])[Math.floor(i/20)%5]);
  const replay=validateReplay(JSON.parse(JSON.stringify(s.replay())),worlds),restored=restoreReplay(replay,worlds);assert.deepEqual(s.snapshot(),restored.snapshot());
});
test('sessions reject incompatible versions, invalid levels and hostile input shapes',()=>{
  const r=new Simulation(worlds[0].levels[0]).replay();assert.throws(()=>validateReplay({...r,version:9},worlds),/incompatível/);assert.throws(()=>validateReplay({...r,level:999},worlds),/Fase/);assert.throws(()=>validateReplay({...r,inputs:[{direction:99,action:false}]},worlds),/Entrada/);
});
test('replays reject engine changes and different level bytes',()=>{
  const replay=new Simulation(worlds[0].levels[0]).replay();
  assert.throws(()=>validateReplay({...replay,engine:'future-engine'},worlds),/incompatível/);
  const changed=structuredClone(worlds);changed[0].levels[0].parameters[0]^=1;
  assert.throws(()=>validateReplay(replay,changed),/Dados da fase/);
});
test('red diamond is collected once and does not open a chest',()=>{
  const level=fixture(['#####','#@  #','#####']);level.tiles[7]=2;
  const sim=new Simulation(level);step(sim,2,4);assert.equal(sim.redDiamonds,1);assert.equal(sim.opened.size,0);
  step(sim,0,8);assert.equal(sim.redDiamonds,1);
});
