import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Simulation } from '../src/core/Simulation.ts';
import type { WorldDefinition } from '../src/level/LevelParser.ts';
import { CHEST_OPEN_DURATIONS } from '../src/core/PhaseOneRules.ts';
import { restoreReplay } from '../src/platform/Session.ts';

const world=JSON.parse(readFileSync(new URL('../public/assets/world-0.json',import.meta.url),'utf8')) as WorldDefinition;
const make=()=>new Simulation(world.levels[8]);
const idle=(s:Simulation,n=1)=>{for(let i=0;i<n;i++)s.step({direction:0,action:false});};

test('the Angkor guardian wakes at the original arena and exposes three health segments',()=>{
  const s=make(),boss=s.boss!;
  assert.equal(boss.health,3);assert.equal(boss.phase,0);assert.equal(boss.x,10);
  idle(s,5);assert.equal(boss.phase,0);
  s.player.x=10;idle(s);assert.equal(boss.phase,6);
  idle(s,11);assert.equal(boss.phase,1);assert.equal(boss.animation,2);
});

test('a falling stone hitting the active guardian column removes exactly one segment',()=>{
  const s=make(),boss=s.boss!;s.player.x=10;boss.phase=2;boss.age=0;
  const i=s.index(10,6);s.tiles[i]=0;s.state[i]=0;s.active[i]=48;
  idle(s);
  assert.equal(boss.phase,3);assert.equal(boss.health,2);
  assert.equal(s.tile(10,7),-1);assert.equal(s.events.filter(e=>e==='boss-hurt').length,1);
  idle(s,10);assert.equal(boss.health,2);
});

test('the arena stone can be pushed off its ledge to hit the guardian',()=>{
  const s=make(),boss=s.boss!;s.player.x=13;s.player.y=5;boss.phase=2;
  for(let i=0;i<30;i++)s.step({direction:i<10?4:0,action:false});
  assert.equal(boss.health,2);assert.equal(boss.phase,3);
  assert.equal(s.tile(12,5),-1);
});

test('the guardian flame hits a hero over its active two-column attack',()=>{
  const s=make(),boss=s.boss!;s.player.x=10;s.player.y=5;boss.phase=10;boss.animation=4;
  idle(s);assert.equal(s.health,3);assert.ok(s.events.includes('hurt'));
});

test('three hits finish the guardian and checkpoint return restarts the fight',()=>{
  const s=make(),boss=s.boss!;s.player.x=10;
  for(let n=0;n<3;n++){
    boss.phase=2;boss.age=0;s.tiles[s.index(10,7)]=0;s.active[s.index(10,7)]=0;
    boss.step(s);assert.equal(boss.health,2-n);assert.equal(boss.phase,3);
  }
  boss.age=40;boss.step(s);assert.equal(boss.phase,7);
  boss.age=80;boss.step(s);assert.equal(boss.phase,8);assert.ok(s.events.includes('boss-clear'));
  s.restoreCheckpoint();assert.equal(boss.health,3);assert.equal(boss.phase,0);
});

test('the Fire Crystal chest plays its reward scene and finishes Angkor',()=>{
  const s=make();s.player.x=27;s.player.y=6;
  let scene=false;
  for(let tick=0;tick<CHEST_OPEN_DURATIONS.reduce((a,b)=>a+b,0)+2;tick++){
    idle(s);if(s.events.includes('demo:32'))scene=true;
  }
  assert.ok(scene);assert.equal(s.status,'complete');assert.equal(s.tile(27,6),-1);
});

test('a saved input stream reconstructs the same guardian cycle',()=>{
  const s=make();for(let i=0;i<140;i++)s.step({direction:i<45?2:0,action:false});
  const restored=restoreReplay(s.replay(),[world]);
  assert.deepEqual(restored.boss?.snapshot(),s.boss?.snapshot());
  assert.deepEqual(restored.snapshot(),s.snapshot());
});

test('the other two final-chamber crystal chests use their own scripts',()=>{
  for(const [worldIndex,levelIndex,x,y,script] of [[1,9,29,13,30],[2,10,27,5,31]]){
    const data=JSON.parse(readFileSync(new URL(`../public/assets/world-${worldIndex}.json`,import.meta.url),'utf8')) as WorldDefinition;
    const s=new Simulation(data.levels[levelIndex]);s.player.x=x;s.player.y=y;
    let scene=false;
    for(let i=0;i<CHEST_OPEN_DURATIONS.reduce((a,b)=>a+b,0)+2;i++){
      idle(s);if(s.events.includes(`demo:${script}`))scene=true;
    }
    assert.ok(scene);assert.equal(s.status,'complete');
  }
});
