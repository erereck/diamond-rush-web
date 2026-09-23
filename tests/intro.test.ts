import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePack } from '../src/assets/Pack.ts';
import { parseDemoScripts } from '../src/core/DemoScript.ts';
import { IntroSequence } from '../src/core/IntroSequence.ts';
import { WALKABLE_TILES } from '../src/core/Simulation.ts';
import type { Direction } from '../src/core/Simulation.ts';
import { parseWorld } from '../src/level/LevelParser.ts';
import { LevelRenderer } from '../src/render/LevelRenderer.ts';
import { SpriteRenderer } from '../src/render/SpriteRenderer.ts';
import type { AssetManager } from '../src/assets/AssetManager.ts';

const resource=(name:string)=>readFileSync(new URL(`../../../work/reference-s700/res/${name}`,import.meta.url));
const scripts=parseDemoScripts(parsePack(resource('demo.f'),'demo.f')[0].data);
const level=parseWorld(resource('w0.bin'),0).levels[13];

test('all original S700 demo scripts decode, including the six Angkor opening scenes',()=>{
  assert.equal(scripts.size,26);
  const opening=scripts.get(29)!;
  assert.deepEqual(opening.resources,[0,2,1]);
  assert.deepEqual(opening.commands.filter(c=>c.opcode===2).map(c=>c.text),[
    'The Great Temple Of Angkor Wat... ',"I'm finally in!","Let's go!"
  ]);
  assert.match(scripts.get(28)!.commands.find(c=>c.text?.includes('seal is reacting'))!.text!,/seal is reacting/);
});

function walkTo(intro:IntroSequence,goalX:number,goalY:number){
  const sim=intro.sim,w=sim.level.width,start=sim.index(sim.player.x,sim.player.y),goal=sim.index(goalX,goalY);
  const queue=[start],seen=new Set([start]),prev=new Map<number,number>();
  for(let at=0;at<queue.length&&!seen.has(goal);at++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const x=queue[at]%w+dx,y=Math.floor(queue[at]/w)+dy,i=sim.index(x,y),tile=sim.tile(x,y);
    if(i<0||seen.has(i)||(intro.section<2&&sim.level.objects[i]===14)||!(tile===-1||tile===10||WALKABLE_TILES.has(tile)))continue;
    seen.add(i);prev.set(i,queue[at]);queue.push(i);
  }
  assert.ok(seen.has(goal),`no walkable route to ${goalX},${goalY}`);
  const route:number[]=[];for(let i=goal;i!==start;i=prev.get(i)!)route.push(i);route.reverse();
  for(const i of route){
    const x=i%w,y=Math.floor(i/w),dx=x-sim.player.x,dy=y-sim.player.y;
    const direction=(dx>0?2:dx<0?4:dy>0?3:1) as Direction;
    for(let tick=0;tick<100&&(sim.player.x!==x||sim.player.y!==y||sim.player.offset!==0);tick++)intro.step({direction,action:false});
    assert.deepEqual([sim.player.x,sim.player.y,sim.player.offset],[x,y,0],`movement blocked at ${x},${y}`);
  }
}
function finishScript(intro:IntroSequence,dialogue:Set<string>){
  for(let i=0;i<1000&&intro.phase==='script';i++){
    if(intro.dialogue){dialogue.add(intro.dialogue.lines.join(' '));intro.press();}
    intro.step();
  }
  assert.notEqual(intro.phase,'script','script failed to end');
}

test('the introduction is freely controlled between all six original scenes',()=>{
  const intro=new IntroSequence(level,scripts),seen:number[]=[],dialogue=new Set<string>();
  for(const [id,x,y] of [[29,6,4],[10,31,7],[11,28,6],[13,37,7],[16,46,7],[28,57,8]]){
    if(id===16||id===28){
      // The rock lesson intentionally blocks this corridor. Use the same
      // checkpoint return the following dialogue teaches the player about.
      intro.sim.manualReset();
      for(let i=0;i<200&&(intro.sim.deathTicks>0||intro.sim.respawnTravel||intro.sim.player.x!==36);i++)intro.step();
      assert.equal(intro.sim.player.x,36);
    }
    walkTo(intro,x,y);
    for(let i=0;i<100&&intro.phase==='free';i++)intro.step();
    assert.equal(intro.scriptId,id,`scene ${id} did not start`);
    if(id===13)assert.equal(intro.sim.tiles[intro.sim.index(38,5)],10);
    seen.push(id);finishScript(intro,dialogue);
    if(id===13)assert.equal(intro.sim.tiles[intro.sim.index(38,5)],-1,'scripted walk must cut grass');
  }
  for(let i=0;i<20&&!intro.finished;i++)intro.step();
  assert.equal(intro.finished,true);
  assert.deepEqual(seen,[29,10,11,13,16,28]);
  assert.equal(intro.sim.opened.has(intro.sim.index(28,6)),true);
  assert.ok([...dialogue].some(line=>line.includes('compass')));
  assert.ok([...dialogue].some(line=>line.includes('seal')));
});

test('tutorial chamber paints the original 5×5 seal composite from mmv.f',()=>{
  const draws:{frame:number;x:number;y:number}[]=[],sprite={frames:Array.from({length:200},()=>({})),animations:Array.from({length:8},()=>({start:0,count:1})),animationFrames:[{frame:0,flags:0}]};
  const assets={sprite:(id:string)=>({...sprite,name:id})} as unknown as AssetManager;
  const renderer=new LevelRenderer(assets,{
    module(){},animation(){},frame(_ctx:unknown,source:{name:string},frame:number,x:number,y:number){
      if(source.name==='mmv-0')draws.push({frame,x,y});
    }
  } as unknown as SpriteRenderer);
  renderer.draw({} as CanvasRenderingContext2D,level,0);
  assert.deepEqual(draws,Array.from({length:25},(_,i)=>({frame:i+4,x:(60+i%5)*24,y:(2+Math.floor(i/5))*24})));
});

test('scripted steps use the normal collision and movement state',()=>{
  const intro=new IntroSequence(level,scripts);
  walkTo(intro,6,4);
  for(let i=0;i<100&&intro.phase==='script';i++){intro.press();intro.step();}
  walkTo(intro,31,7);
  assert.equal(intro.scriptId,10);
  for(let i=0;i<100&&intro.phase==='script';i++){intro.press();intro.step();}
  assert.equal(intro.sim.player.x,30);
  assert.equal(intro.sim.player.offset,0);
  assert.equal(intro.sim.tiles[intro.sim.index(30,7)],-1);
});
