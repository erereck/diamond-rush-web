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
import { animationFrameAt, CHEST_OPEN_DURATIONS, fallingDrawOffset, fireReach } from '../src/core/PhaseOneRules.ts';
import { decodeSprite } from '../src/assets/SpriteDecoder.ts';
import { parsePack } from '../src/assets/Pack.ts';
import { SpriteRenderer } from '../src/render/SpriteRenderer.ts';
import { LevelRenderer } from '../src/render/LevelRenderer.ts';
import type { AssetManager } from '../src/assets/AssetManager.ts';
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
  const hero=fromPack('o',0),chest=fromPack('gen3',3),draws:{id:string;frame:number;x:number;y:number;palette:number}[]=[];
  const base=new SpriteRenderer();
  const spy={module(){},animation(){},animationFrame:base.animationFrame.bind(base),
    frame(_ctx:unknown,s:{name:string},frame:number,x:number,y:number,_flags=0,palette=0){draws.push({id:s.name,frame,x,y,palette});}} as unknown as SpriteRenderer;
  const assets={sprite:(id:string)=>id==='o-0'?hero:id==='gen3-3'?chest:
    {name:id,frames:Array.from({length:8},()=>({})),animations:[]}} as unknown as AssetManager;
  const renderer=new LevelRenderer(assets,spy),draw=()=>{
    draws.length=0;renderer.draw({} as CanvasRenderingContext2D,level,sim.tick,sim);
    return draws.filter(d=>d.id==='cm-2'&&d.palette===1);
  };
  while(animationFrameAt(CHEST_OPEN_DURATIONS,sim.chestTicks,false)<13)step(sim);
  assert.equal(draw().length,0);
  while(animationFrameAt(CHEST_OPEN_DURATIONS,sim.chestTicks,false)<=13)step(sim);
  assert.equal(draw().length,1);assert.equal(draw()[0].y,sim.player.y*24-24);
});
