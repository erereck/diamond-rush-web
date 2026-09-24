import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Simulation } from '../src/core/Simulation.ts';
import { BavariaBoss } from '../src/core/BavariaBoss.ts';
import { TibetBoss } from '../src/core/TibetBoss.ts';
import type { WorldDefinition } from '../src/level/LevelParser.ts';
import { CHEST_OPEN_DURATIONS } from '../src/core/PhaseOneRules.ts';
import { restoreReplay } from '../src/platform/Session.ts';

const world=JSON.parse(readFileSync(new URL('../public/assets/world-0.json',import.meta.url),'utf8')) as WorldDefinition;
const bavaria=JSON.parse(readFileSync(new URL('../public/assets/world-1.json',import.meta.url),'utf8')) as WorldDefinition;
const tibet=JSON.parse(readFileSync(new URL('../public/assets/world-2.json',import.meta.url),'utf8')) as WorldDefinition;
const make=()=>new Simulation(world.levels[8]);
const makeBavaria=()=>new Simulation(bavaria.levels[9]);
const makeTibet=()=>new Simulation(tibet.levels[10],{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:8});
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

test('Bavaria guardian waits for the hero, then patrols with four health segments',()=>{
  const s=makeBavaria(),boss=s.boss!;
  assert.equal(boss.phase,13);assert.equal(boss.health,4);
  idle(s,20);assert.equal(boss.phase,13);
  s.player.x=18;idle(s,50);assert.notEqual(boss.phase,13);
  assert.ok(boss.x<408);
});

test('only a descending stone wounds the Bavaria guardian, leaving a broken brick',()=>{
  const s=makeBavaria(),boss=s.boss!;s.player.x=18;s.player.y=20;boss.phase=0;boss.animation=0;
  const i=s.index(17,21);s.tiles[i]=0;s.state[i]=3;s.active[i]=0;
  boss.step(s);assert.equal(boss.health,3);assert.equal(boss.phase,4);
  assert.equal(s.tiles[i],30);assert.ok(s.events.includes('boss-hurt'));
  s.tiles[i]=0;s.state[i]=0;s.active[i]=0;boss.phase=0;boss.step(s);
  assert.equal(boss.health,3);assert.equal(s.tiles[i],30);
});

test('the real Bavaria arena stone can be pushed off its support into the guardian',()=>{
  const s=makeBavaria(),boss=s.boss!;s.player.x=15;s.player.y=18;boss.phase=0;boss.animation=0;
  for(let i=0;i<30;i++)s.step({direction:i<10?2:0,action:false});
  assert.equal(boss.health,3);assert.equal(s.tile(16,18),-1);
});

test('Bavaria leap frame five replaces a stone after its upper support was cleared',()=>{
  const s=makeBavaria(),boss=s.boss!;s.player.x=18;s.player.y=20;
  boss.phase=8;boss.animation=8;boss.animationAge=7;s.tiles[s.index(16,18)]=-1;
  boss.step(s);assert.equal(s.tile(16,16),0);
});

test('Bavaria leap hurts the hero only in its active arc',()=>{
  const s=makeBavaria(),boss=s.boss!;s.player.x=17;s.player.y=21;
  boss.phase=8;boss.animation=8;boss.animationAge=5;boss.step(s);
  assert.equal(s.health,4);
  boss.animationAge=6;boss.step(s);
  assert.equal(s.health,3);assert.ok(s.events.includes('hurt'));
});

test('four Bavaria stone impacts defeat the boss and checkpoint restores the fight',()=>{
  const s=makeBavaria(),boss=s.boss!;s.player.x=18;s.player.y=20;
  assert.ok(boss instanceof BavariaBoss);
  for(let n=0;n<4;n++){
    boss.phase=0;boss.animation=0;boss.x=408;
    const i=s.index(17,21);s.tiles[i]=0;s.state[i]=3;s.active[i]=0;boss.step(s);
    assert.equal(boss.health,3-n);
  }
  assert.equal(boss.phase,12);boss.age=101;boss.step(s);assert.equal(boss.phase,15);
  s.restoreCheckpoint();assert.equal(boss.phase,13);assert.equal(boss.health,4);
});

test('Bavaria guardian state is deterministic in a saved input replay',()=>{
  const s=makeBavaria();
  for(let i=0;i<160;i++)s.step({direction:i<110?2:0,action:false});
  const restored=restoreReplay(s.replay(),[world,bavaria]);
  assert.deepEqual(restored.boss?.snapshot(),s.boss?.snapshot());
  assert.deepEqual(restored.snapshot(),s.snapshot());
});

test('the Tibet guardian wakes at the arena entrance with five health segments',()=>{
  const s=makeTibet(),boss=s.boss!;assert.ok(boss instanceof TibetBoss);
  assert.equal(boss.phase,-1);assert.equal(boss.health,5);
  assert.equal(s.tile(13,16),-1);assert.equal(s.tile(22,16),35);
  for(let i=0;i<160;i++)s.step({direction:2,action:false});
  assert.ok(s.player.x>13);assert.notEqual(boss.phase,-1);
  assert.equal(boss.maxHealth,5);
});

test('source tile 34 loads as an open bridge in later worlds',()=>{
  const level=bavaria.levels[4],s=new Simulation(level);
  const open=level.tiles.indexOf(34),closed=level.tiles.indexOf(35);
  assert.ok(open>=0&&closed>=0);
  assert.equal(s.tiles[open],-1);assert.equal(s.level.objects[open],15);
  assert.equal(s.tiles[closed],35);assert.equal(s.level.objects[closed],255);
});

test('Tibet floor switches open the bridge and spawn the original ice target',()=>{
  const s=makeTibet(),boss=s.boss!;assert.ok(boss instanceof TibetBoss);
  s.player.x=14;s.player.y=22;s.player.direction=4;
  s.step({direction:0,action:true});
  for(let n=0;n<45&&!s.events.includes('tibet-bridge');n++)idle(s);
  assert.equal(s.tile(10,19),45);
  idle(s,37);
  assert.equal(boss.bridgePosition,9);
  assert.equal(s.tile(13,16),34);assert.equal(s.tile(22,16),-1);
  assert.equal(s.object(13,16),255);assert.equal(s.object(22,16),16);
  boss.flipBridge(s);idle(s,45);
  assert.equal(boss.bridgePosition,0);
  assert.equal(s.tile(13,16),-1);assert.equal(s.tile(22,16),35);
  assert.equal(s.object(13,16),15);assert.equal(s.object(22,16),255);
});

test('the ice hammer freezes a real Tibet arena creature into a movable block',()=>{
  const s=makeTibet();s.player.x=24;s.player.y=16;s.player.direction=4;
  assert.equal(s.tile(23,16),45);
  s.step({direction:0,action:true});idle(s,10);
  assert.equal(s.tile(23,16),9);assert.equal(s.frozenKinds[s.index(23,16)],45);
});

test('a real frozen creature can be hooked from its ledge onto the Tibet guardian',()=>{
  const s=makeTibet(),boss=s.boss!;assert.ok(boss instanceof TibetBoss);
  s.player.x=14;s.player.y=22;s.player.direction=4;
  s.step({direction:0,action:true});idle(s,45);
  assert.equal(s.tile(22,16),-1);
  s.player.x=22;s.player.y=16;s.player.direction=2;
  s.step({direction:0,action:true});idle(s,15);
  assert.equal(s.tile(23,16),9);
  boss.x=480;boss.phase=13;boss.animation=13;boss.animationAge=0;
  s.player.x=20;s.player.y=16;s.player.direction=2;
  s.step({direction:0,action:true});idle(s,55);
  assert.equal(boss.health,4);
});

test('a falling ice block wounds Tibet guardian; five hits finish the fight',()=>{
  const s=makeTibet(),boss=s.boss!;assert.ok(boss instanceof TibetBoss);
  s.player.x=14;s.player.y=22;boss.phase=4;boss.animation=4;
  for(let n=0;n<5;n++){
    boss.phase=4;boss.animation=4;boss.x=360;
    const i=s.index(16,21);s.tiles[i]=9;s.state[i]=3;s.active[i]=0;s.frozenKinds[i]=45;
    boss.step(s);assert.equal(boss.health,4-n);assert.equal(s.tile(16,21),30);
  }
  assert.equal(boss.phase,12);boss.age=101;boss.step(s);assert.equal(boss.phase,15);
  s.restoreCheckpoint();assert.equal(boss.phase,-1);assert.equal(boss.health,5);
});

test('Tibet heavy attack schedules the staggered ceiling stones',()=>{
  const s=makeTibet(),boss=s.boss!;assert.ok(boss instanceof TibetBoss);
  boss.phase=13;boss.animation=13;boss.animationAge=31;
  boss.step(s);assert.equal(boss.phase,4);assert.equal(boss.ceilingPulseAt,s.tick+40);
  s.tick=boss.ceilingPulseAt+7;boss.step(s);
  assert.equal(s.state[s.index(14,15)]&56,8);
  assert.ok(s.events.includes('boss-ceiling'));
});

test('Tibet charge follows the original one-sided reach and heavy attacks survive a block hit',()=>{
  const s=makeTibet(),boss=s.boss!;assert.ok(boss instanceof TibetBoss);
  s.tick=1;boss.attackAt=10000;boss.x=408;boss.phase=10;boss.animation=10;boss.animationAge=9;
  s.player.x=22;s.player.y=22;
  boss.step(s);assert.equal(boss.phase,6);
  boss.phase=11;boss.animation=11;boss.animationAge=9;
  s.player.x=10;s.player.y=22;
  boss.step(s);assert.equal(boss.phase,7);
  boss.phase=13;boss.animation=13;boss.animationAge=0;boss.x=360;
  s.player.y=16;
  const i=s.index(16,21);s.tiles[i]=9;s.state[i]=3;
  boss.step(s);
  assert.equal(boss.health,4);assert.equal(boss.phase,13);
});

test('Tibet ceiling stones do not regenerate after their one-time fall',()=>{
  const s=makeTibet(),boss=s.boss!;assert.ok(boss instanceof TibetBoss);
  const i=s.index(14,15);s.tiles[i]=-1;
  boss.ceilingPulseAt=10;s.tick=90;
  boss.step(s);
  assert.equal(s.tile(14,15),-1);
  assert.equal(boss.ceilingPulseAt,0);
});

test('the Tibet fight and switch state reproduce from an input replay',()=>{
  const s=makeTibet();
  for(let i=0;i<160;i++)s.step({direction:2,action:false});
  assert.notEqual(s.boss?.phase,-1);
  const restored=restoreReplay(s.replay(),[world,bavaria,tibet]);
  assert.deepEqual(restored.boss?.snapshot(),s.boss?.snapshot());
  assert.deepEqual(restored.snapshot(),s.snapshot());
});
