import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Clock } from '../src/core/Clock.ts';
import { Camera } from '../src/core/Camera.ts';
import { Simulation } from '../src/core/Simulation.ts';
import type { Direction } from '../src/core/Simulation.ts';
import { parseWorld, parseWorldMap } from '../src/level/LevelParser.ts';
import { nextMainLevel } from '../src/level/Progression.ts';
import type { LevelDefinition } from '../src/level/LevelParser.ts';
import { validateReplay, restoreReplay } from '../src/platform/Session.ts';
import { animationFrameAt, CHEST_OPEN_DURATIONS, fallingDrawOffset, fireReach } from '../src/core/PhaseOneRules.ts';
import { spikeExtension, spikeReach } from '../src/core/LaterStageRules.ts';
import { decodeSprite } from '../src/assets/SpriteDecoder.ts';
import { parsePack } from '../src/assets/Pack.ts';
import { SpriteRenderer } from '../src/render/SpriteRenderer.ts';
import { LevelRenderer } from '../src/render/LevelRenderer.ts';
import type { AssetManager } from '../src/assets/AssetManager.ts';
import { introLines, stageCollectibleTotals, stageTitle } from '../src/core/OriginalText.ts';
function fixture(rows:string[]):LevelDefinition{
  const tiles=rows.flatMap(row=>[...row].map(c=>({'#':80,' ':255,'@':79,'O':0,'*':1,g:10,S:19,V:43,B:30} as Record<string,number>)[c]));
  return {world:0,index:0,width:rows[0].length,height:rows.length,offset:0,tiles,parameters:tiles.map(t=>t===19||t===43?2:255),objects:tiles.map(()=>255)};
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
const maps=['angkor','scotland','tibet'].map(name=>parseWorldMap(readFileSync(new URL(`../../../work/reference-s700/res/map_${name}.out`,import.meta.url)),name));
test('the normal route follows links in the original world maps',()=>{
  assert.equal(nextMainLevel(worlds[0].levels[0],worlds,maps),worlds[0].levels[1]);
  assert.equal(nextMainLevel(worlds[0].levels[7],worlds,maps),worlds[0].levels[8]);
  assert.equal(nextMainLevel(worlds[0].levels[8],worlds,maps),worlds[1].levels[0]);
  assert.equal(nextMainLevel(worlds[2].levels[10],worlds,maps),null);
  assert.equal(nextMainLevel(worlds[0].levels[12],worlds,maps),null);
});
test('leaving an exit marks the stage complete for progression',()=>{
  const level=fixture(['######','#@   #','######']);level.objects[8]=5;
  const sim=new Simulation(level);step(sim,2,52);
  assert.equal(sim.status,'complete');assert.ok(sim.events.includes('complete'));
});
test('later phase floor types follow the original walking collision cases',()=>{
  for(const tile of [4,5,6,7,11,14,24,26,27,33,40,41,42,45,50,51,52,53]){
    const level=fixture(['#####','#@  #','#####']);level.tiles[7]=tile;
    const sim=new Simulation(level);step(sim,2);assert.equal(sim.player.x,2,`tile ${tile}`);
  }
  for(const tile of [3,28,30,31,49]){
    const level=fixture(['#####','#@  #','#####']);level.tiles[7]=tile;
    const sim=new Simulation(level);step(sim,2);assert.equal(sim.player.x,1,`tile ${tile}`);
  }
});
test('Scotland spike clocks reach two and three cells at the source ticks',()=>{
  assert.equal(spikeExtension(15,false),0);
  assert.equal(spikeReach(16,false),2);
  assert.equal(spikeReach(31,false),3);
  assert.equal(spikeReach(60,false),3);
  assert.equal(spikeExtension(7,true),0);
  assert.equal(spikeReach(8,true),2);
  assert.equal(spikeReach(15,true),3);
  assert.equal(spikeExtension(44,true),0);
});
test('Scotland spike tip damages the hero and a raised spike blocks crossing',()=>{
  const level=fixture(['#####','#   #','#   #','# @ #','#####']);
  level.world=1;level.tiles[7]=28;level.parameters[7]=3;
  const sim=new Simulation(level);step(sim,0,30);assert.equal(sim.health,4);
  step(sim);assert.equal(sim.health,2);assert.ok(sim.events.includes('hurt'));
  const crossing=fixture(['#####','#   #','#@  #','#####']);
  crossing.world=1;crossing.tiles[7]=28;crossing.parameters[7]=3;
  const blocked=new Simulation(crossing);blocked.tick=29;step(blocked,2);
  assert.equal(blocked.player.x,1);
});
test('Scotland rolling hazard prioritizes falling, then moves in its mapped direction',()=>{
  const falling=fixture(['######','#    #','#    #','#  @ #','######']);
  falling.world=1;falling.tiles[8]=14;falling.parameters[8]=2;
  const down=new Simulation(falling);step(down);assert.equal(down.tile(2,2),14);
  const rolling=fixture(['######','# @  #','######']);
  rolling.world=1;rolling.tiles[7]=14;rolling.parameters[7]=2;
  const right=new Simulation(rolling);step(right);assert.equal(right.tile(2,1),14);
  assert.equal(right.health,3);
  const leftLevel=fixture(['######','#@   #','######']);
  leftLevel.world=1;leftLevel.tiles[8]=14;leftLevel.parameters[8]=4;
  const left=new Simulation(leftLevel);step(left);assert.equal(left.tile(1,1),14);
  assert.equal(left.state[left.index(1,1)]&8,8);
});
test('Scotland rolling hazard waits at walls but retries next to a moving obstacle',()=>{
  const wall=fixture(['#####','# O##','#####']);
  wall.world=1;wall.tiles[7]=14;
  const blocked=new Simulation(wall);step(blocked);
  assert.equal(blocked.state[7]>>8,20);
  const moving=fixture(['######','# O   ','######']);
  moving.world=1;moving.tiles[8]=14;moving.tiles[9]=16;
  const retry=new Simulation(moving);step(retry);
  assert.equal(retry.state[8]>>8,0);
  assert.equal(retry.tile(2,1),14);
});
test('Tibet ceiling stone warns, falls, injures and shatters',()=>{
  const level=fixture(['#####','#   #','#   #','# @ #','#####']);
  level.world=2;level.tiles[7]=44;
  const sim=new Simulation(level);step(sim);assert.equal(sim.state[7]&56,8);
  step(sim,0,10);assert.equal(sim.state[7]&56,24);
  step(sim);assert.equal(sim.tile(2,2),44);
  step(sim,0,4);assert.equal(sim.health,4);
  step(sim);assert.equal(sim.health,3);assert.equal(sim.state[sim.index(2,2)]&56,32);
  step(sim,0,6);assert.equal(sim.tile(2,2),-1);
});
test('Tibet ceiling stone stops at solid ground and checkpoint restore resets it',()=>{
  const level=fixture(['#####','#   #','#   #','# @ #','#####']);
  level.world=2;level.tiles[7]=44;level.tiles[12]=80;
  const sim=new Simulation(level);step(sim,0,4);assert.equal(sim.state[7],0);
  sim.tiles[12]=-1;step(sim);assert.equal(sim.state[7]&56,8);
  sim.restoreCheckpoint();assert.equal(sim.tile(2,2),80);assert.equal(sim.tile(2,1),44);assert.equal(sim.state[7],0);
});
test('canonical later maps initialize timed spikes and ceiling traps from parameters',()=>{
  const scotland=new Simulation(worlds[1].levels[0]);
  const spike=scotland.index(21,4);assert.equal(scotland.tile(21,4),28);
  assert.equal(scotland.state[spike],11);assert.equal(scotland.active[spike],24);
  const second=new Simulation(worlds[1].levels[1]);
  const hazard=second.index(14,11);assert.equal(second.tile(14,11),14);
  assert.equal(second.state[hazard],8);assert.equal(second.active[hazard],24);
  const tibet=new Simulation(worlds[2].levels[0]);
  const trap=tibet.index(27,2);assert.equal(tibet.tile(27,2),44);
  assert.equal(tibet.state[trap],0);assert.equal(tibet.active[trap],24);
});
test('the later Angkor health pickup restores life without repeating',()=>{
  const level=fixture(['#####','#@  #','#####']);level.tiles[7]=7;
  const sim=new Simulation(level);sim.health=2;step(sim,2,4);
  assert.equal(sim.health,4);assert.equal(sim.tile(2,1),-1);
  sim.health=3;step(sim,0,5);assert.equal(sim.health,3);
});
test('full-health field pickups become ten diamonds, including a life at the 99 cap',()=>{
  for(const pickup of [6,7]){
    const level=fixture(['#####','#@  #','#####']);level.tiles[7]=pickup;
    const sim=new Simulation(level,{diamonds:3,redDiamonds:0,lives:99,health:4});
    step(sim,2,4);
    assert.equal(sim.lives,99);assert.equal(sim.health,4);assert.equal(sim.diamonds,13);
    assert.equal(sim.bonusDiamondTotal,10);assert.equal(sim.tile(2,1),-1);
  }
});
test('a capped extra life heals before converting to diamonds',()=>{
  const level=fixture(['#####','#@  #','#####']);level.tiles[7]=6;
  const sim=new Simulation(level,{diamonds:0,redDiamonds:0,lives:99,health:2});
  step(sim,2,4);
  assert.equal(sim.health,4);assert.equal(sim.diamonds,0);assert.equal(sim.bonusDiamondTotal,0);
});
test('checkpoint return restores scripted object and parameter edits',()=>{
  const level=fixture(['#####','#@  #','#####']);
  const sim=new Simulation(level),i=sim.index(2,1),before=[sim.level.objects[i],sim.level.parameters[i]];
  sim.level.objects[i]=14;sim.level.parameters[i]=37;
  sim.restoreCheckpoint();
  assert.deepEqual([sim.level.objects[i],sim.level.parameters[i]],before);
});
test('an extra life stays collected after checkpoint restore',()=>{
  const level=fixture(['#####','#@  #','#####']);level.tiles[7]=6;level.objects[6]=4;level.parameters[6]=0;
  const sim=new Simulation(level);step(sim,2,4);
  assert.equal(sim.lives,6);assert.equal(sim.tile(2,1),-1);
  step(sim,4,4);sim.step({direction:0,action:true});
  assert.equal(sim.lives,6);assert.equal(sim.tile(2,1),-1);
  step(sim,2,4);assert.equal(sim.lives,6);
});
test('closed map gate blocks entry until its opening phase reaches two',()=>{
  const level=fixture(['#####','#@  #','#####']);level.objects[7]=7;level.parameters[7]=0;
  const closed=new Simulation(level);step(closed,2);assert.equal(closed.player.x,1);
  const open=new Simulation(level);open.gatePhases[7]=2;step(open,2);assert.equal(open.player.x,2);
});
test('both key colors unlock their numbered locks and open the matching gate',()=>{
  for(const [keyTile,lockKind,counter] of [[4,9,'goldKeys'],[5,8,'silverKeys']] as const){
  const level=fixture(['#######','#     #','#@    #','#     #','#######']);
  const key=2+2*level.width,lock=3+level.width,gate=3+2*level.width;
  level.tiles[key]=keyTile;level.tiles[lock]=31;level.objects[lock]=lockKind;level.parameters[lock]=0;
  level.objects[gate]=7;level.parameters[gate]=0;
  const sim=new Simulation(level);assert.equal(sim.gateCounts[gate],1);
  step(sim,2,4);assert.equal(sim[counter],1);assert.equal(sim.tile(2,2),-1);
  step(sim,2);assert.equal(sim.player.x,2);
  step(sim,1,4);step(sim,0,8);
  assert.equal(sim[counter],0);assert.ok(sim.unlockedGates.has(lock));assert.equal(sim.gatePhases[gate],3);
  step(sim,3,4);step(sim,2);assert.equal(sim.player.x,3);
  }
});
test('next phase replay preserves starting resources without replaying the previous map',()=>{
  const initial={diamonds:21,redDiamonds:2,lives:3,health:2};
  const sim=new Simulation(worlds[0].levels[1],initial);step(sim,2,8);
  const restored=restoreReplay(validateReplay(sim.replay(),worlds),worlds);
  assert.deepEqual(restored.snapshot(),sim.snapshot());assert.deepEqual(restored.initial,initial);
});
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
test('left-facing hero frames use the original mirrored origin',()=>{
  const sprite=decodeSprite(parsePack(readFileSync(new URL('../../../work/reference-s700/res/o.f',import.meta.url)),'o.f')[0].data, 'o-0');
  const renderer=new SpriteRenderer();
  const right=renderer.animationFrame(sprite,5,0),left=renderer.animationFrame(sprite,7,0);
  assert.equal(right.x,0);assert.equal(right.flags&1,0);
  assert.equal(left.x,24);assert.equal(left.flags&1,1);
  const rightIdle=renderer.animationFrame(sprite,1,0),leftIdle=renderer.animationFrame(sprite,3,0);
  assert.equal(rightIdle.x,-2);assert.equal(leftIdle.x,26);
  // The frame modules themselves mirror around the offset anchor.
  const bounds=(frame:number,origin:number,flip:boolean)=>{
    const f=sprite.frames[frame],modules=sprite.frameModules.slice(f.start,f.start+f.count);
    return [Math.min(...modules.map(fm=>origin+(flip?-fm.x-sprite.modules[fm.module].width:fm.x))),
      Math.max(...modules.map(fm=>origin+(flip?-fm.x:fm.x+sprite.modules[fm.module].width)))];
  };
  assert.deepEqual(bounds(right.frame,right.x,false),bounds(left.frame,left.x,true));
});
test('leftward movement reaches the adjacent cell and faces left at a wall',()=>{
  const s=new Simulation(fixture(['#######','#  @  #','#######']));
  step(s,4);assert.equal(s.player.x,2);assert.equal(s.player.offset,18);assert.equal(s.playerAnimation,7);
  step(s,4,4);assert.equal(s.player.x,1);assert.equal(s.playerAnimation,7);
  step(s,4,4);assert.equal(s.player.x,1);assert.equal(s.playerAnimation,3);
});
test('rolling boulders draw toward the same side they fall',()=>{
  assert.ok(fallingDrawOffset(512|2,6,0).x>0);
  assert.ok(fallingDrawOffset(512|4,6,0).x<0);
  assert.equal(fallingDrawOffset(3,18,0).y,-18);
});
test('the Angkor flame reaches its third neighboring cell only at the long frame',()=>{
  assert.equal(fireReach(0),0);assert.equal(fireReach(20),1);
  assert.equal(fireReach(40),2);assert.equal(fireReach(60),3);
  const level=fixture(['#######','#@    #','#######']);level.tiles[11]=23;
  const s=new Simulation(level);step(s,0,59);assert.equal(s.health,4);
  step(s);assert.equal(s.health,3);assert.ok(s.events.includes('hurt'));
});
test('red chest reveals its diamond once, after the opening animation',()=>{
  const level=fixture(['#####','#@  #','#####']);level.tiles[7]=2;level.objects[7]=33;
  const s=new Simulation(level);step(s,2,4);assert.equal(s.chestCell,7);assert.equal(s.redDiamonds,0);
  let rewardTick=0;for(let tick=1;tick<=80;tick++){step(s);if(s.redDiamonds){rewardTick=tick;break;}}
  assert.equal(animationFrameAt(CHEST_OPEN_DURATIONS,rewardTick,false),13);
  assert.equal(s.redDiamonds,1);assert.ok(s.opened.has(7));
  step(s,0,80);assert.equal(s.redDiamonds,1);
});
test('later stage chest awards the diamond quantity encoded in the map',()=>{
  const level=fixture(['#####','#@  #','#####']);level.tiles[7]=41;level.parameters[7]=5;level.objects[7]=33;
  const sim=new Simulation(level);step(sim,2,4);
  assert.equal(sim.diamonds,0);assert.equal(sim.chestCell,7);
  while(!sim.opened.has(7))step(sim);
  assert.equal(sim.diamonds,5);assert.equal(sim.tile(2,1),-1);
  step(sim,0,80);assert.equal(sim.diamonds,5);
});
test('a key chest delays the key and never awards a red diamond',()=>{
  const level=fixture(['#####','#@  #','#####']);level.tiles[7]=4;level.objects[7]=33;
  const sim=new Simulation(level);step(sim,2,4);
  assert.equal(sim.chestCell,7);assert.equal(sim.goldKeys,0);assert.equal(sim.redDiamonds,0);
  while(!sim.opened.has(7))step(sim);
  assert.equal(sim.goldKeys,1);assert.equal(sim.redDiamonds,0);assert.equal(sim.tile(2,1),-1);
  step(sim,0,80);assert.equal(sim.goldKeys,1);assert.equal(sim.redDiamonds,0);
});
test('a falling stone kills a snake and leaves the original smoke effect briefly',()=>{
  const sim=new Simulation(fixture(['#######','#  O  #','#  S  #','#  @  #','#######']));
  const stone=sim.index(3,1),snake=sim.index(3,2);sim.state[stone]=3;sim.motion[stone]=6;
  sim.updateSnake(3,2);
  assert.equal(sim.tiles[snake],-1);assert.deepEqual(sim.enemySmoke,[{cell:snake,age:0}]);
  step(sim,0,14);assert.deepEqual(sim.enemySmoke,[]);
});
test('red snakes patrol with the same cell movement and can be crushed',()=>{
  const sim=new Simulation(fixture(['########','# @V   #','#      #','########']));
  const from=sim.index(3,1),to=sim.index(4,1);
  sim.step({direction:0,action:false});
  assert.equal(sim.tiles[from],-1);
  assert.equal(sim.tiles[to],43);
  const stone=sim.index(4,0);sim.tiles[stone]=0;sim.state[stone]=3;sim.motion[stone]=6;
  sim.updateSnake(4,1);
  assert.equal(sim.tiles[to],-1);
  assert.deepEqual(sim.enemySmoke,[{cell:to,age:0}]);
});
test('a falling boulder starts the original breakable-brick chain',()=>{
  const sim=new Simulation(fixture(['########','#  O   #','#  BB  #','#  @   #','########']));
  const stone=sim.index(3,1),first=sim.index(3,2),second=sim.index(4,2);
  sim.state[stone]=3;sim.motion[stone]=6;sim.updateFalling(3,1);
  assert.equal(sim.state[first],1);assert.equal(sim.state[second],0);
  step(sim,0,25);
  assert.notEqual(sim.tiles[first],30);assert.equal(sim.tiles[second],-1);
});
test('intact breakable bricks stay on their first frame until struck',()=>{
  const frames:number[]=[],sprite=(id:string)=>({name:id,frames:Array(8).fill({}),animations:[{start:0,count:8}],animationFrames:Array(8).fill({frame:0,flags:0})});
  const assets={sprite} as unknown as AssetManager;
  const render=new LevelRenderer(assets,{module(){},animation(){},frame(_ctx:unknown,s:{name:string},n:number){if(s.name==='gen0-7')frames.push(n);}} as unknown as SpriteRenderer);
  const map=fixture(['#####','#@B #','#####']);
  render.draw({} as CanvasRenderingContext2D,map,0);
  render.draw({} as CanvasRenderingContext2D,map,80);
  assert.deepEqual(frames,[0,0]);
});
test('opening titles and collection totals come from the original S700 tables',()=>{
  assert.deepEqual(introLines,['The Great Temple Of Angkor Wat...',"I'm finally in!","Let's go!"]);
  const first=worlds[0].levels[0];assert.equal(stageTitle(Array.from({length:115},(_,i)=>`text${i}`),first),'text8');
  const totals=stageCollectibleTotals(first);assert.equal(totals.redDiamonds,first.tiles.filter(t=>t===2).length);
});
test('checkpoint action restores collected objects and counters',()=>{
  const level=fixture(['#######','#@    #','#######']);level.objects[9]=4;level.parameters[9]=1;level.tiles[10]=2;
  const s=new Simulation(level);step(s,2,4);assert.equal(s.checkpoint,9);
  step(s,2,4);assert.equal(s.redDiamonds,1);assert.equal(s.tile(3,1),-1);
  step(s,4,4);s.step({direction:0,action:true});
  assert.equal(s.redDiamonds,0);assert.equal(s.tile(3,1),2);assert.equal(s.player.x,2);
  step(s,2,4);assert.equal(s.redDiamonds,1);
});
test('fatal damage plays hurt and death before returning to the checkpoint',()=>{
  const s=new Simulation(fixture(['#####','# @ #','#####']));s.hurt(4);assert.equal(s.health,0);
  step(s,0,8);assert.equal(s.deathTicks,80);assert.equal(s.lives,5);
  step(s,0,80);assert.equal(s.lives,4);assert.equal(s.health,4);assert.equal(s.status,'playing');
});
test('death restores checkpoint and camera travels 8 pixels per tick before hero reappears',()=>{
  const row='#@'+' '.repeat(20)+'#',level=fixture(['#'.repeat(row.length),row,'#'.repeat(row.length)]);
  level.objects[2+row.length]=4;level.parameters[2+row.length]=1;
  const s=new Simulation(level);step(s,2,4);assert.equal(s.checkpoint,2+row.length);
  step(s,2,4*14);assert.ok(s.camera.x>0);
  s.hurt(4);step(s,0,8+80);
  assert.equal(s.lives,4);assert.equal(s.health,4);assert.equal(s.respawnTravel,true);
  const deathCamera=s.camera.x;assert.equal(s.player.x,2);
  step(s);assert.equal(s.camera.x,deathCamera-8);
  let guard=100;while(s.respawnTravel&&guard-->0)step(s);
  assert.ok(guard>0);assert.equal(s.camera.x,s.respawnTarget.x);assert.equal(s.respawnFlash,12);assert.equal(s.invulnerable,40);
});
test('manual reset costs a life away from checkpoint and survives replay restoration',()=>{
  const level=fixture(['#######','#@    #','#######']);
  const s=new Simulation(level);step(s,2,4);s.step({direction:0,action:false,reset:true});
  assert.equal(s.deathTicks,80);assert.equal(s.health,0);
  step(s,0,80);assert.equal(s.lives,4);
  assert.deepEqual(restoreReplay(validateReplay(s.replay(),[{version:0,world:0,levels:[level]}]),[{version:0,world:0,levels:[level]}]).snapshot(),s.snapshot());
});
test('a boulder held overhead plays the bracing animation then crushes the hero',()=>{
  const s=new Simulation(fixture(['#####','# O #','# @ #','#####']));
  step(s);assert.equal(s.playerAnimation,11);assert.equal(s.stonePressure,1);
  step(s,0,30);assert.equal(s.health,4);assert.equal(s.playerAnimation,11);
  step(s);assert.equal(s.health,0);assert.equal(s.playerAnimation,10);
  step(s,0,8);assert.equal(s.deathTicks,80);
});
test('walking out from under a boulder releases its pressure',()=>{
  const s=new Simulation(fixture(['######','# O  #','# @  #','######']));
  step(s,0,12);assert.equal(s.playerAnimation,11);
  step(s,2);step(s);assert.equal(s.stonePressure,0);
  step(s,0,40);assert.equal(s.health,4);
});
test('the red prize rises above the hero after the chest reward frame',()=>{
  const level=fixture(['#####','#@  #','#####']);level.tiles[7]=2;level.objects[7]=33;
  const sim=new Simulation(level);step(sim,2,4);
  const fromPack=(name:string,index:number)=>decodeSprite(parsePack(readFileSync(new URL(`../../../work/reference-s700/res/${name}.f`,import.meta.url)),`${name}.f`)[index].data,`${name}-${index}`);
  const hero=fromPack('o',0),chest=fromPack('gen3',3),smallChest=fromPack('gen2',2),draws:{id:string;frame:number;x:number;y:number;palette:number}[]=[];
  const base=new SpriteRenderer();
  const spy={module(){},animation(){},animationFrame:base.animationFrame.bind(base),
    frame(_ctx:unknown,s:{name:string},frame:number,x:number,y:number,_flags=0,palette=0){draws.push({id:s.name,frame,x,y,palette});}} as unknown as SpriteRenderer;
  const assets={sprite:(id:string)=>id==='o-0'?hero:id==='gen3-3'?chest:id==='gen2-2'?smallChest:
    {name:id,frames:Array.from({length:8},()=>({})),animations:[]}} as unknown as AssetManager;
  const renderer=new LevelRenderer(assets,spy),draw=(shownLevel=level,shownSim=sim)=>{
    draws.length=0;renderer.draw({} as CanvasRenderingContext2D,shownLevel,shownSim.tick,shownSim);
    return draws.filter(d=>d.id==='cm-2');
  };
  while(animationFrameAt(CHEST_OPEN_DURATIONS,sim.chestTicks,false)<13)step(sim);
  assert.equal(draw().length,0);
  while(animationFrameAt(CHEST_OPEN_DURATIONS,sim.chestTicks,false)<=13)step(sim);
  assert.equal(draw().length,1);assert.equal(draw()[0].y,sim.player.y*24-24);
  assert.equal(draw()[0].palette,1);
  const normalLevel=fixture(['#####','#@  #','#####']);normalLevel.tiles[7]=41;normalLevel.parameters[7]=5;normalLevel.objects[7]=33;
  const normal=new Simulation(normalLevel);step(normal,2,4);
  while(animationFrameAt(CHEST_OPEN_DURATIONS,normal.chestTicks,false)<=13)step(normal);
  assert.equal(draw(normalLevel,normal)[0].palette,0);
  const compassLevel=fixture(['#####','#@  #','#####']);compassLevel.tiles[7]=42;compassLevel.objects[7]=14;
  const compass=new Simulation(compassLevel);step(compass,2,4);
  while(animationFrameAt(CHEST_OPEN_DURATIONS,compass.chestTicks,false)<=13)step(compass);
  draws.length=0;renderer.draw({} as CanvasRenderingContext2D,compassLevel,compass.tick,compass);
  assert.ok(draws.some(d=>d.id==='gen3-1'&&d.y===compass.player.y*24-24));
});

test('canonical equipment chests award hammer, hook and ice hammer in order',()=>{
  for(const [world,index,tile,tier] of [[0,3,24,1],[1,2,27,2],[2,5,26,8]]){
    const level=parseWorld(readFileSync(new URL(`../../../work/reference-s700/res/w${world}.bin`,import.meta.url)),world).levels[index];
    assert.ok(level.tiles.some((kind,i)=>kind===tile&&level.objects[i]===14),`equipment chest missing in ${world}/${index}`);
    const fixtureLevel=fixture(['#####','#@  #','#####']);fixtureLevel.tiles[7]=tile;fixtureLevel.objects[7]=14;
    const sim=new Simulation(fixtureLevel);step(sim,2,4);
    while(!sim.opened.has(7))step(sim);
    assert.equal(sim.weaponTier,tier);assert.ok(sim.events.includes('weapon'));
    sim.restoreCheckpoint();assert.equal(sim.weaponTier,tier);assert.equal(sim.tile(2,1),-1);assert.ok(sim.opened.has(7));
  }
});

test('an equipment chest stays open when its upgrade was saved before reentering',()=>{
  const level=fixture(['#####','#@  #','#####']);level.tiles[7]=24;level.objects[7]=14;
  const sim=new Simulation(level,{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:2});
  assert.equal(sim.tile(2,1),-1);assert.ok(sim.opened.has(7));
  step(sim,2,4);assert.equal(sim.chestCell,-1);assert.equal(sim.weaponTier,2);
});

test('the hammer starts brick destruction and stuns a neighboring snake',()=>{
  const bricks=new Simulation(fixture(['#######','#@BB  #','#######']),{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:1});
  bricks.step({direction:0,action:true});assert.equal(bricks.playerAnimation,14);assert.equal(bricks.state[bricks.index(2,1)],0);
  step(bricks,0,2);assert.equal(bricks.state[bricks.index(2,1)],0);
  step(bricks);assert.equal(bricks.state[bricks.index(2,1)],1);
  step(bricks,0,25);assert.equal(bricks.tile(2,1),-1);assert.equal(bricks.tile(3,1),-1);
  const snake=new Simulation(fixture(['######','#@S###','######']),{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:1});
  snake.step({direction:0,action:true});step(snake,0,3);assert.equal(snake.state[snake.index(2,1)]&248,120);
  step(snake,0,10);assert.equal(snake.tile(2,1),19);
});
test('the hammer bounces off a boulder only when its striking frame lands',()=>{
  const sim=new Simulation(fixture(['#####','#@O##','#####']),{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:1});
  sim.step({direction:0,action:true});assert.equal(sim.playerAnimation,14);
  step(sim,0,2);assert.equal(sim.playerAnimation,14);
  step(sim);assert.equal(sim.playerAnimation,42);assert.ok(sim.events.includes('hammer-block'));
  step(sim,0,16);assert.equal(sim.playerAnimation,1);assert.equal(sim.tile(2,1),0);
});

test('the hook pulls a distant boulder to the cell beside the hero',()=>{
  const sim=new Simulation(fixture(['########','#@  O  #','########']),{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:2});
  sim.step({direction:0,action:true});assert.equal(sim.hook?.x,4);assert.ok(sim.events.includes('hook'));
  step(sim,0,16);assert.equal(sim.tile(2,1),0);assert.equal(sim.tile(4,1),-1);assert.equal(sim.hook,null);
});

test('the hook can bring a red diamond and a frozen block closer',()=>{
  const level=fixture(['########','#@     #','########']);level.tiles[level.width+4]=2;
  const red=new Simulation(level,{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:2});
  red.step({direction:0,action:true});step(red,0,16);assert.equal(red.tile(2,1),2);
  const frozen=new Simulation(fixture(['########','#@     #','########']),
    {diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:8});
  frozen.tiles[frozen.index(4,1)]=9;frozen.frozenKinds[frozen.index(4,1)]=1;
  frozen.step({direction:0,action:true});step(frozen,0,16);
  assert.equal(frozen.tile(2,1),9);assert.equal(frozen.frozenKinds[frozen.index(2,1)],1);
});

test('the ice hammer freezes a snake and another blow thaws it',()=>{
  const sim=new Simulation(fixture(['######','#@S###','######']),{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:8});
  sim.step({direction:0,action:true});step(sim,0,3);assert.equal(sim.tile(2,1),9);assert.equal(sim.frozenKinds[sim.index(2,1)],19);
  step(sim,0,9);sim.step({direction:0,action:true});step(sim,0,3);assert.equal(sim.tile(2,1),19);
  assert.equal(sim.frozenKinds[sim.index(2,1)],-1);assert.equal(sim.state[sim.index(2,1)]&248,120);
});

test('action aims the hammer at a neighboring brick and the hook to either side',()=>{
  const hammer=new Simulation(fixture(['#####','# B #','# @ #','#####']),{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:1});
  hammer.step({direction:0,action:true});assert.equal(hammer.player.direction,1);assert.equal(hammer.playerAnimation,13);
  step(hammer,0,3);assert.equal(hammer.state[hammer.index(2,1)],1);
  const hook=new Simulation(fixture(['########','# O @  #','########']),{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:2});
  hook.step({direction:0,action:true});assert.equal(hook.player.direction,4);assert.equal(hook.hook?.x,2);
  step(hook,0,12);assert.equal(hook.tile(3,1),0);
});

test('the ice hammer freezes diamonds, and red snakes pursue after their stun',()=>{
  const ice=new Simulation(fixture(['######','#@*###','######']),{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:8});
  ice.step({direction:0,action:true});step(ice,0,3);assert.equal(ice.tile(2,1),9);
  step(ice,0,9);ice.step({direction:0,action:true});step(ice,0,3);assert.equal(ice.tile(2,1),1);
  const red=new Simulation(fixture(['########','#@  V  #','########']));
  const at=red.index(4,1);red.state[at]=3072;red.motion[at]=0;
  step(red);assert.equal(red.tile(3,1),43);assert.equal(red.state[red.index(3,1)]&3840,2816);
});

test('a frozen diamond falls with its original kind attached',()=>{
  const sim=new Simulation(fixture(['#######','#@*   #','# B   #','#######']),
    {diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:8});
  sim.step({direction:0,action:true});step(sim,0,3);assert.equal(sim.tile(2,1),9);
  sim.tiles[sim.index(2,2)]=-1;
  step(sim);assert.equal(sim.tile(2,2),9);assert.equal(sim.frozenKinds[sim.index(2,2)],1);
  assert.equal(sim.frozenKinds[sim.index(2,1)],-1);
});

test('a replay reconstructs hook motion and equipment state',()=>{
  const level=fixture(['########','#@  O  #','########']);
  const initial={diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:2 as const};
  const sim=new Simulation(level,initial);sim.step({direction:0,action:true});step(sim,0,12);
  const replay=validateReplay(sim.replay(),[{version:0,world:0,levels:[level]}]);
  assert.deepEqual(restoreReplay(replay,[{version:0,world:0,levels:[level]}]).snapshot(),sim.snapshot());
});
