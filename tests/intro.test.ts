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

test('the complete spoken introduction follows demo.f order without invented dialogue',()=>{
  const flatten=(commands:import('../src/core/DemoScript.ts').DemoCommand[]):string[]=>commands.flatMap(c=>c.children?flatten(c.children):c.text?[c.text.trim()]:[]);
  assert.deepEqual([29,10,11,13,16,28].flatMap(id=>flatten(scripts.get(id)!.commands)),[
    'The Great Temple Of Angkor Wat...',"I'm finally in!","Let's go!",
    'I should check that chest first.','You found a compass! It will help you find your way out.',
    'Avoid blocking your own path','when pushing rocks.','You can return all elements to their original positions',
    'by going back to the last circle and pressing 5.','If you can\'t reach the circle',
    'and your way is blocked,','you can press * at any time to go back to the last circle,',
    'Is this a kind of seal?','Ah! The seal is reacting!',"Let's see what happens if I step on it..."
  ]);
});

test('the opening walk matches the first 21 measured Java S700 ticks',()=>{
  const rows=readFileSync(new URL('fixtures/intro-opening-s700.csv',import.meta.url),'utf8').trim().split(/\r?\n/).slice(1)
    .map(line=>line.split(',').map(Number));
  const intro=new IntroSequence(level,scripts);
  for(const [tick,world,stage,x,y,offset,direction,diamonds,redDiamonds,lives,gameState] of rows){
    if(tick>0)intro.step();
    const p=intro.sim.player;
    assert.deepEqual([intro.tick,intro.sim.level.world,intro.sim.level.index,p.x,p.y,p.offset,p.direction,intro.sim.diamonds,intro.sim.redDiamonds,intro.sim.lives],
      [tick,world,stage,x,y,offset,direction,diamonds,redDiamonds,lives],`Java opening tick ${tick}`);
    assert.equal(gameState,1);
  }
  assert.equal(intro.phase,'free');
  assert.equal(intro.scriptId,null);
  intro.step();
  assert.deepEqual([intro.sim.player.x,intro.sim.player.y,intro.sim.player.offset],[5,4,0]);
  assert.equal(intro.phase,'free','the Java waits for player input at the circle');
  const trigger=readFileSync(new URL('fixtures/intro-first-trigger-s700.csv',import.meta.url),'utf8').trim().split(/\r?\n/).slice(1)
    .map(line=>line.split(',').map(Number));
  for(const [tick,x,y,offset] of trigger){
    intro.step({direction:2,action:false});
    assert.deepEqual([intro.tick,intro.sim.player.x,intro.sim.player.y,intro.sim.player.offset],[tick,x,y,offset]);
  }
  assert.equal(intro.phase,'script');
  assert.equal(intro.scriptId,29);
});

test('the first dialogue sequence follows measured Java command transitions',()=>{
  const events=readFileSync(new URL('fixtures/intro-demo-timeline-s700.csv',import.meta.url),'utf8').trim().split(/\r?\n/).slice(1)
    .map(line=>{const [tick,index,opcode,cameraX,phase]=line.split(',');return {tick:Number(tick),index:Number(index),opcode:Number(opcode),cameraX,phase};});
  const intro=new IntroSequence(level,scripts);
  for(let tick=0;tick<=129;tick++){
    if(tick>0){
      if([60,80,100,120].includes(tick)&&intro.dialogue)intro.press();
      intro.step({direction:tick>=22&&tick<=25?2:0,action:false});
    }
    const event=events.find(row=>row.tick===tick);
    if(!event)continue;
    assert.equal(intro.active?.command.opcode??-1,event.opcode,`Java demo tick ${tick}`);
    if(event.opcode>=0)assert.equal(intro.commandIndex+1,event.index);
    if(event.cameraX)assert.equal(intro.cameraX,Number(event.cameraX));
    assert.equal(intro.phase,event.phase);
  }
  assert.equal(intro.section,1);
});

function walkTo(intro:IntroSequence,goalX:number,goalY:number){
  for(let tick=0;tick<30&&intro.phase==='opening';tick++)intro.step();
  assert.notEqual(intro.phase,'opening','source opening walk did not finish');
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
    if(id===28){
      assert.equal(intro.phase,'done','the seal script goes straight to the map');
      assert([60,61].includes(intro.sim.player.x));
      assert.equal(intro.sim.player.y,3);
    }
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

test('lethal damage during a scene interrupts it and returns to the checkpoint',()=>{
  const intro=new IntroSequence(level,scripts);
  walkTo(intro,6,4);
  for(let i=0;i<10;i++)intro.step();
  assert.equal(intro.phase,'script');
  intro.sim.hurt(4);
  for(let i=0;i<20&&intro.phase==='script';i++)intro.step();
  assert.equal(intro.phase,'free');
  for(let i=0;i<200&&(intro.sim.deathTicks>0||intro.sim.respawnTravel);i++)intro.step();
  assert.equal(intro.sim.player.x,5);
  assert.equal(intro.sim.player.y,4);
  assert.equal(intro.sim.health,4);
  assert.equal(intro.sim.lives,4);
});

test('portrait reveal and hint flash follow the source command phases',()=>{
  const altered=new Map(scripts),opening={...scripts.get(29)!,commands:[
    {opcode:11,args:[2,2]},{opcode:12,args:[17,50]},{opcode:18,args:[1,255,255,255]},{opcode:15,args:[]}
  ]};altered.set(29,opening);
  const intro=new IntroSequence(level,altered);
  walkTo(intro,6,4);assert.equal(intro.scriptId,29);
  intro.step();
  for(let tick=1;tick<=6;tick++){
    intro.step();assert.equal(intro.portraitRevealTicks,tick);
    assert.equal(intro.portraitVisible,false);
  }
  intro.step();assert.equal(intro.portraitRevealTicks,0);assert.equal(intro.portraitVisible,true);
  intro.step();assert.equal(intro.flash,true);
  intro.step();assert.equal(intro.flash,true);
  intro.step();assert.equal(intro.flash,false);
});

test('the two original recovery demos run after resetting from the blocked-path lessons',()=>{
  for(const [marker,section,recovery] of [[13,4,15],[16,5,17]]){
    const intro=new IntroSequence(level,scripts);
    intro.section=section;intro.phase='free';
    const i=level.parameters.findIndex((p,j)=>p===marker&&level.objects[j]===0);
    assert(i>=0);
    intro.sim.player.x=i%level.width;intro.sim.player.y=Math.floor(i/level.width);
    intro.step({direction:0,action:false,reset:true});
    for(let tick=0;tick<300&&intro.scriptId!==recovery;tick++)intro.step();
    assert.equal(intro.scriptId,recovery);
    if(recovery===17)assert.match(intro.scripts.get(17)!.commands[0].text!,/cost you a life/);
    finishScript(intro,new Set());
    assert.equal(intro.section,section);
    assert.equal(intro.phase,'free');
  }
});
