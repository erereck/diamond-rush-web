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
import { animationFrameAt, CHEST_OPEN_DURATIONS } from '../src/core/PhaseOneRules.ts';
import { decodeSprite } from '../src/assets/SpriteDecoder.ts';

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

test('the route to the chest hint matches measured Java movement and pickups',()=>{
  const rows=readFileSync(new URL('fixtures/intro-chest-route-s700.csv',import.meta.url),'utf8').trim().split(/\r?\n/).slice(1)
    .map(line=>{const [tick,x,y,offset,diamonds,redDiamonds,lives,phase,scriptId]=line.split(',');
      return {tick:Number(tick),x:Number(x),y:Number(y),offset:Number(offset),diamonds:Number(diamonds),redDiamonds:Number(redDiamonds),lives:Number(lives),phase,scriptId:scriptId?Number(scriptId):null};});
  const waypoints=[[9,4],[9,6],[16,6],[16,5],[20,5],[20,6],[27,6],[27,5],[30,5],[30,7],[31,7]];
  const intro=new IntroSequence(level,scripts);
  let waypoint=0;
  for(let tick=0;tick<=297;tick++){
    if(tick>0){
      if(tick%20===0&&intro.dialogue)intro.press();
      let direction=0 as Direction;
      if(tick>=22&&tick<=25)direction=2;
      else if(tick>130&&intro.phase==='free'){
        const p=intro.sim.player;
        while(waypoint<waypoints.length&&p.x===waypoints[waypoint][0]&&p.y===waypoints[waypoint][1]&&p.offset===0)waypoint++;
        if(waypoint<waypoints.length){const [x,y]=waypoints[waypoint];direction=(p.x<x?2:p.x>x?4:p.y<y?3:1) as Direction;}
      }
      intro.step({direction,action:false});
    }
    const row=rows.find(sample=>sample.tick===tick);
    if(!row)continue;
    const p=intro.sim.player;
    assert.deepEqual([p.x,p.y,p.offset,intro.sim.diamonds,intro.sim.redDiamonds,intro.sim.lives,intro.phase,intro.scriptId],
      [row.x,row.y,row.offset,row.diamonds,row.redDiamonds,row.lives,row.phase,row.scriptId],`Java route tick ${tick}`);
  }
  const hintCell=intro.sim.index(31,7);
  assert.equal(intro.sim.level.objects[hintCell],0);
  assert.equal(intro.sim.level.parameters[hintCell],10);
  assert.equal(intro.section,2);
});

test('compass opening and presentation match 81 measured Java animation states',()=>{
  const intro=new IntroSequence(level,scripts),sim=intro.sim,cell=sim.index(28,6);
  // Isolate the chest from preceding travel. Java tick 313 has just settled
  // on this cell; the measured opening begins in the next map update.
  intro.section=2;intro.phase='free';sim.tick=313;
  sim.player={x:28,y:6,dx:-1,dy:0,offset:0,direction:4};
  sim.chestCell=cell;sim.chestFrames[cell]=1;sim.setAnimation(40);sim.wake(28,6);
  const rows=readFileSync(new URL('fixtures/intro-compass-chest-s700.csv',import.meta.url),'utf8').trim().split(/\r?\n/).slice(1).map(line=>line.split(',').map(Number));
  for(const [elapsed,animation,frame,time,tile,chestFrame,awarded] of rows){
    if((313+elapsed)%20===0&&intro.dialogue)intro.press();
    intro.step();
    const shownFrame=animation===40?animationFrameAt(CHEST_OPEN_DURATIONS,sim.animationTick,false):0;
    assert.deepEqual([sim.playerAnimation,sim.tiles[cell],sim.chestFrames[cell],Number(sim.opened.has(cell))],
      [animation,tile,chestFrame,awarded],`Java chest elapsed ${elapsed}`);
    if(animation===40||animation===47){
      assert.equal(shownFrame,frame,`Java hero frame elapsed ${elapsed}`);
      const start=animation===40?CHEST_OPEN_DURATIONS.slice(0,frame).reduce((a,b)=>a+b,0):0;
      assert.equal(sim.animationTick-start,time,`Java frame time elapsed ${elapsed}`);
    }
    if(elapsed>=41){assert.equal(intro.scriptId,11);assert.equal(intro.active?.command.opcode,27);}
    assert.equal(sim.redDiamonds,0);
  }
  assert.equal(sim.chestCell,-1);
  assert.equal(intro.active?.page,0,'presses during presentation must be ignored');
  while(sim.tick<400)intro.step();
  intro.press();intro.step();
  assert.equal(intro.active?.page,2);
  intro.press();intro.step();intro.step();intro.step();intro.step();
  assert.equal(intro.phase,'free');
  assert.equal(sim.level.objects[sim.index(31,7)],255);
});

test('the rock lesson matches measured Java movement, command timing and stone fall',()=>{
  const font=decodeSprite(parsePack(resource('ui.f'),'ui.f')[1].data,'ui-1');
  const hero=decodeSprite(parsePack(resource('o.f'),'o.f')[0].data,'o-0');
  const intro=new IntroSequence(level,scripts,undefined,13,font,resource('mc')),sim=intro.sim;
  // Isolate demo 13 at its measured trigger, after the player reached the circle.
  sim.tick=475;sim.player={x:37,y:7,dx:1,dy:0,offset:0,direction:2};
  sim.animationTick=1;
  sim.camera.x=intro.cameraX=756;sim.camera.y=intro.cameraY=24;
  const rows=readFileSync(new URL('fixtures/intro-rock-lesson-s700.csv',import.meta.url),'utf8').trim().split(/\r?\n/).slice(1).map(line=>line.split(',').map(Number));
  for(const [tick,x,y,offset,index,opcode,cameraX,cameraY,grassTile,grassObject,grassFrame,...tail] of rows){
    const stones=tail.slice(0,6),[page,circleObject,circleParameter,blockObject,blockParameter,heroAnimation,heroFrame,heroTime]=tail.slice(6);
    if(tick%20===0&&intro.dialogue)intro.press();
    intro.step();
    assert.deepEqual([sim.player.x,sim.player.y,sim.player.offset],[x,y,offset],`Java hero tick ${tick}`);
    // The Java leaves a completed command installed until the next tick.
    const active=intro.active?.command??scripts.get(13)!.commands[intro.commandIndex-1];
    assert.equal(active.opcode,opcode,`Java opcode tick ${tick}`);
    assert.equal(intro.active?intro.commandIndex+1:intro.commandIndex,index,`Java command tick ${tick}`);
    assert.deepEqual([intro.cameraX,intro.cameraY],[cameraX,cameraY],`Java camera tick ${tick}`);
    assert.equal(sim.tile(38,5),grassTile,`Java grass tick ${tick}`);
    const stoneState=[5,6,7].flatMap(y=>{const i=sim.index(40,y);return [sim.tiles[i],sim.motion[i]];});
    assert.deepEqual(stoneState,stones,`Java stone tick ${tick}`);
    const grassCell=sim.index(38,5);
    assert.deepEqual([sim.level.objects[grassCell],sim.level.parameters[grassCell]],[grassObject,grassFrame<0?255:grassFrame],`Java grass effect tick ${tick}`);
    if(intro.active?.command.opcode===27)assert.equal(intro.active.page,page,`Java hint page tick ${tick}`);
    const circle=sim.index(36,6),block=sim.index(42,8);
    assert.deepEqual([sim.level.objects[circle],sim.level.parameters[circle],sim.level.objects[block],sim.level.parameters[block]],
      [circleObject,circleParameter<0?255:circleParameter,blockObject,blockParameter<0?255:blockParameter],`Java hint markers tick ${tick}`);
    const animation=hero.animations[sim.playerAnimation],durations=hero.animationFrames.slice(animation.start,animation.start+animation.count).map(af=>af.duration);
    const frame=animationFrameAt(durations,sim.animationTick),time=sim.animationTick%durations.reduce((a,b)=>a+b,0)-durations.slice(0,frame).reduce((a,b)=>a+b,0);
    assert.deepEqual([sim.playerAnimation,frame,time],[heroAnimation,heroFrame,heroTime],`Java hero animation tick ${tick}`);
  }
});

for(const name of ['intro-checkpoint-lesson-s700','intro-seal-scene-s700'])test(`${name} follows every measured Java scene state`,()=>{
  const initial=JSON.parse(readFileSync(new URL(`fixtures/${name}.json`,import.meta.url),'utf8')) as {
    scriptId:number;start:number;hero:{animation:number;frame:number;time:number};player:{x:number;y:number;offset:number};
    scene:{cameraX:number;cameraY:number;portraitX:number;portraitY:number;portraitFrame:number};
    cells:{x:number;y:number;tile:number;state:number;motion:number;object:number;parameter:number;active:number}[];
    comparedCells:[number,number][];
  };
  const font=decodeSprite(parsePack(resource('ui.f'),'ui.f')[1].data,'ui-1');
  const hero=decodeSprite(parsePack(resource('o.f'),'o.f')[0].data,'o-0');
  const intro=new IntroSequence(level,scripts,undefined,initial.scriptId,font,resource('mc')),sim=intro.sim;
  sim.tick=initial.start;sim.player={...initial.player,dx:1,dy:0,direction:2};
  sim.playerAnimation=initial.hero.animation;
  const initialAnimation=hero.animations[initial.hero.animation];
  sim.animationTick=hero.animationFrames.slice(initialAnimation.start,initialAnimation.start+initial.hero.frame).reduce((sum,af)=>sum+af.duration,0)+initial.hero.time;
  sim.camera.x=intro.cameraX=initial.scene.cameraX;sim.camera.y=intro.cameraY=initial.scene.cameraY;
  intro.portraitX=initial.scene.portraitX;intro.portraitY=initial.scene.portraitY;intro.portraitFrame=initial.scene.portraitFrame;
  for(const c of initial.cells){const i=sim.index(c.x,c.y);sim.tiles[i]=c.tile;sim.state[i]=c.state;sim.motion[i]=c.motion;sim.active[i]=c.active;sim.level.objects[i]=c.object;sim.level.parameters[i]=c.parameter<0?255:c.parameter;}
  const rows=readFileSync(new URL(`fixtures/${name}.csv`,import.meta.url),'utf8').trim().split(/\r?\n/).slice(1).map(line=>line.split(',').map(Number));
  for(const [tick,x,y,offset,index,opcode,cameraX,cameraY,animation,frame,time,portraitX,portraitY,blink,visible,portrait,flash,page,...map] of rows){
    if(tick%20===0&&intro.dialogue)intro.press();
    intro.step();
    assert.deepEqual([sim.player.x,sim.player.y,sim.player.offset],[x,y,offset],`Java ${initial.scriptId} hero tick ${tick}`);
    const active=intro.active?.command??scripts.get(initial.scriptId)!.commands[intro.commandIndex-1];
    assert.equal(active.opcode,opcode,`Java ${initial.scriptId} opcode tick ${tick}`);
    assert.equal(intro.active?intro.commandIndex+1:intro.commandIndex,index,`Java ${initial.scriptId} command tick ${tick}`);
    assert.deepEqual([intro.cameraX,intro.cameraY],[cameraX,cameraY],`Java ${initial.scriptId} camera tick ${tick}`);
    const a=hero.animations[sim.playerAnimation],durations=hero.animationFrames.slice(a.start,a.start+a.count).map(af=>af.duration),shown=animationFrameAt(durations,sim.animationTick);
    const shownTime=sim.animationTick%durations.reduce((a,b)=>a+b,0)-durations.slice(0,shown).reduce((a,b)=>a+b,0);
    assert.deepEqual([sim.playerAnimation,shown,shownTime],[animation,frame,time],`Java ${initial.scriptId} animation tick ${tick}`);
    assert.deepEqual([intro.portraitX,intro.portraitY,intro.blinkFrame,Number(intro.portraitVisible),intro.portraitFrame,Number(intro.flash)],
      [portraitX,portraitY,blink,visible,portrait,flash],`Java ${initial.scriptId} portrait tick ${tick}`);
    if(intro.active?.command.opcode===2||intro.active?.command.opcode===27)assert.equal(intro.active.page,page,`Java ${initial.scriptId} page tick ${tick}`);
    assert.deepEqual(initial.comparedCells.flatMap(([cx,cy])=>{const i=sim.index(cx,cy);return [sim.tiles[i],sim.motion[i],sim.level.objects[i],sim.level.parameters[i]];}),map,`Java ${initial.scriptId} map tick ${tick}`);
  }
  intro.step();assert.equal(intro.finished,true);
});

test('manual death and the life-cost hint follow the measured Java checkpoint return',()=>{
  const intro=new IntroSequence(level,scripts),sim=intro.sim;
  intro.phase='free';intro.section=4;
  sim.player.x=36;sim.player.y=7;intro.step();
  sim.player.x=46;sim.player.y=7;intro.step();finishScript(intro,new Set());
  // Isolate the return at the end of demo 16, with a genuine saved circle and
  // pending recovery flag. The fixture measures the Java * key at tick 894.
  sim.tick=893;sim.player={x:49,y:5,dx:1,dy:0,offset:0,direction:2};sim.lives=4;sim.health=4;
  sim.camera.x=intro.cameraX=756;sim.camera.y=intro.cameraY=24;
  const hero=decodeSprite(parsePack(resource('o.f'),'o.f')[0].data,'o-0');
  const rows=readFileSync(new URL('fixtures/intro-checkpoint-return-s700.csv',import.meta.url),'utf8').trim().split(/\r?\n/).slice(1).map(line=>line.split(',').map(Number));
  for(const [tick,x,y,offset,lives,health,cameraX,cameraY,returning,animation,frame,time,hint] of rows){
    if(tick%20===0&&intro.dialogue)intro.press();
    intro.step({direction:0,action:false,reset:tick===894});
    assert.deepEqual([sim.player.x,sim.player.y,sim.player.offset,sim.lives,sim.health,sim.camera.x,sim.camera.y,Number(sim.respawnTravel)],
      [x,y,offset,lives,health,cameraX,cameraY,returning],`Java checkpoint return tick ${tick}`);
    const a=hero.animations[sim.playerAnimation],durations=hero.animationFrames.slice(a.start,a.start+a.count).map(af=>af.duration),shown=animationFrameAt(durations,sim.animationTick);
    const shownTime=sim.animationTick%durations.reduce((a,b)=>a+b,0)-durations.slice(0,shown).reduce((a,b)=>a+b,0);
    assert.deepEqual([sim.playerAnimation,shown,shownTime],[animation,frame,time],`Java return animation tick ${tick}`);
    assert.equal(Number(intro.dialogue!==null),hint,`Java recovery hint tick ${tick}`);
    assert.deepEqual([intro.cameraX,intro.cameraY],[cameraX,cameraY],`Java recovery viewport tick ${tick}`);
  }
  assert.equal(intro.section,5);assert.equal(sim.object(46,7),255);assert.equal(sim.object(50,7),255);
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

test('source waits include their final ticks and portrait motion starts at the portrait',()=>{
  const altered=new Map(scripts);
  altered.set(29,{id:29,resources:[],commands:[
    {opcode:6,args:[5]},{opcode:13,args:[80,90,5]},{opcode:2,args:[2,230],text:'At the seal.'}
  ]});
  const intro=new IntroSequence(level,altered,undefined,29);
  for(let tick=0;tick<6;tick++){intro.step();assert.equal(intro.commandIndex,0);}
  intro.step();assert.equal(intro.commandIndex,1);
  intro.step();assert.deepEqual([intro.portraitX,intro.portraitY],[29,58]);
  for(let tick=0;tick<5;tick++){intro.step();assert.equal(intro.commandIndex,1);}
  intro.step();assert.equal(intro.commandIndex,2);
  intro.step();assert.equal(intro.dialogue?.y,230);
});

test('the introduction is freely controlled between all six original scenes',()=>{
  const intro=new IntroSequence(level,scripts),seen:number[]=[],dialogue=new Set<string>();
  for(const [id,x,y] of [[29,6,4],[10,31,7],[11,28,6],[13,37,7],[16,46,7],[28,57,8]]){
    if(id===16||id===28){
      // The rock lesson intentionally blocks this corridor. Use the same
      // checkpoint return the following dialogue teaches the player about.
      intro.sim.manualReset();
      for(let i=0;i<200&&Number(intro.scriptId)!==(id===16?15:17);i++)intro.step();
      assert.equal(intro.scriptId,id===16?15:17);
      finishScript(intro,dialogue);
      for(let i=0;i<200&&intro.sim.respawnTravel;i++)intro.step();
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
  intro.step();assert.equal(intro.flash,false);
  intro.step();assert.equal(intro.flash,true);
  intro.step();assert.equal(intro.flash,true);
  intro.step();assert.equal(intro.flash,false);
});

test('portrait growth uses source screen coordinates and stays capped on its sixth tick',()=>{
  const intro=new IntroSequence(level,scripts,undefined,29);
  intro.sim.player.x=6;intro.sim.player.y=4;intro.cameraX=12;intro.cameraY=0;
  intro.portraitRevealTicks=1;
  assert.deepEqual(intro.portraitRevealRect,{x:109,y:86,width:20,height:7});
  for(const tick of [5,6]){intro.portraitRevealTicks=tick;assert.deepEqual(intro.portraitRevealRect,{x:17,y:50,width:102,height:38});}
  intro.portraitRevealTicks=0;assert.equal(intro.portraitRevealRect,null);
});

test('the two original recovery demos run after resetting from the blocked-path lessons',()=>{
  for(const [marker,section,recovery] of [[13,3,15],[16,4,17]]){
    const intro=new IntroSequence(level,scripts);
    intro.section=section;intro.phase='free';
    const stop=intro.stops[section],i=intro.sim.index(stop.x,stop.y);
    assert(i>=0);
    intro.sim.player.x=i%level.width;intro.sim.player.y=Math.floor(i/level.width);
    intro.step();assert.equal(intro.scriptId,marker);
    finishScript(intro,new Set());
    assert.notEqual(intro.sim.index(intro.sim.player.x,intro.sim.player.y),i,'the lesson must leave its trigger before reset');
    const lives=intro.sim.lives;
    intro.step({direction:0,action:false,reset:true});
    for(let tick=0;tick<300&&intro.scriptId!==recovery;tick++)intro.step();
    assert.equal(intro.scriptId,recovery);
    if(recovery===17)assert.match(intro.scripts.get(17)!.commands[0].text!,/cost you a life/);
    finishScript(intro,new Set());
    assert.equal(intro.section,section+1);
    assert.equal(intro.phase,'free');
    assert.equal(intro.sim.lives,lives-1);
    const cleared=recovery===15?[[37,7],[39,5]]:[[46,7],[50,7]];
    for(const [x,y] of cleared)assert.equal(intro.sim.object(x,y),255);
    // The edits belong to the checkpoint snapshot, so a second return cannot
    // resurrect the trigger or queue this lesson again.
    intro.sim.restoreCheckpoint(false,true);intro.step();
    for(let tick=0;tick<300&&intro.sim.respawnTravel;tick++)intro.step();
    assert.equal(intro.phase,'free');
    for(const [x,y] of cleared)assert.equal(intro.sim.object(x,y),255);
  }
});

test('circle action recovers the rock lesson without charging a life',()=>{
  const intro=new IntroSequence(level,scripts);
  for(let tick=0;tick<20;tick++)intro.step();
  intro.section=3;walkTo(intro,36,7);walkTo(intro,37,7);
  assert.equal(intro.scriptId,13);finishScript(intro,new Set());
  walkTo(intro,36,7);
  const lives=intro.sim.lives;
  intro.step({direction:0,action:true});
  for(let tick=0;tick<100&&intro.phase!=='script';tick++)intro.step();
  assert.equal(intro.scriptId,15);assert.equal(intro.sim.lives,lives);
  finishScript(intro,new Set());assert.equal(intro.section,4);
});

test('fatal damage after a lesson remembers its recovery away from the marker',()=>{
  const intro=new IntroSequence(level,scripts);
  intro.section=3;intro.phase='free';intro.sim.player.x=37;intro.sim.player.y=7;
  intro.step();finishScript(intro,new Set());
  intro.sim.hurt(4);
  for(let tick=0;tick<300&&intro.scriptId!==15;tick++)intro.step();
  assert.equal(intro.scriptId,15);assert.equal(intro.sim.health,4);assert.equal(intro.sim.lives,4);
});

test('death during the rock demonstration consumes its trigger and continues at the next lesson',()=>{
  const intro=new IntroSequence(level,scripts);
  intro.section=3;intro.phase='free';intro.sim.player.x=37;intro.sim.player.y=7;
  intro.step();intro.step();intro.sim.hurt(4);
  for(let tick=0;tick<300&&intro.scriptId!==15;tick++)intro.step();
  assert.equal(intro.scriptId,15);finishScript(intro,new Set());
  assert.equal(intro.section,4);assert.equal(intro.sim.object(37,7),255);
});

test('a single checkpoint return consumes only one pending lesson flag',()=>{
  const intro=new IntroSequence(level,scripts);
  intro.section=3;intro.phase='free';intro.sim.player.x=37;intro.sim.player.y=7;
  intro.step();finishScript(intro,new Set());
  intro.sim.player.x=46;intro.sim.player.y=7;
  intro.step();assert.equal(intro.scriptId,16);finishScript(intro,new Set());
  intro.step({direction:0,action:false,reset:true});
  for(let tick=0;tick<300&&Number(intro.scriptId)!==15;tick++)intro.step();
  assert.equal(intro.scriptId,15);finishScript(intro,new Set());intro.step();
  assert.equal(intro.phase,'free');assert.equal(intro.sim.object(46,7),0);
  intro.sim.restoreCheckpoint(false,true);intro.step();
  for(let tick=0;tick<300&&Number(intro.scriptId)!==17;tick++)intro.step();
  assert.equal(intro.scriptId,17);assert.equal(intro.sim.object(46,7),255);
});
