import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePack } from '../src/assets/Pack.ts';
import { parseDemoScripts } from '../src/core/DemoScript.ts';
import { IntroSequence, demoFontWidth, wrapDemoTextPixels } from '../src/core/IntroSequence.ts';
import { nextStageDemo } from '../src/core/StageDemoTrigger.ts';
import { Simulation } from '../src/core/Simulation.ts';
import { parseWorld } from '../src/level/LevelParser.ts';
import { restoreReplay, validateReplay } from '../src/platform/Session.ts';
import type { DecodedSprite } from '../src/assets/SpriteDecoder.ts';

const resource=(name:string)=>readFileSync(new URL(`../../../work/reference-s700/res/${name}`,import.meta.url));
const scripts=parseDemoScripts(parsePack(resource('demo.f'),'demo.f')[0].data);
const worlds=[0,1,2].map(w=>parseWorld(resource(`w${w}.bin`),w));
const font=JSON.parse(readFileSync(new URL('../public/assets/ui-1.json',import.meta.url),'utf8')) as DecodedSprite;
const fontMap=readFileSync(new URL('../public/assets/font-map.bin',import.meta.url));

test('dialogues wrap at the original 222/196 pixel limits using the S700 font',()=>{
  const speech=wrapDemoTextPixels(scripts.get(33)!.commands[3].text!,222,font,fontMap);
  assert.deepEqual(speech,['The final chamber in','Angkor Wat! The Fire','Crystal is supposed to be','hidden here...']);
  const hint=wrapDemoTextPixels(scripts.get(20)!.commands[0].text!,196,font,fontMap);
  assert.deepEqual(hint,['Look at the Magic','Padlock in front of','you!']);
  for(const line of [...speech,...hint])assert(demoFontWidth(font,fontMap,line)<=222);
});

test('all eight non-intro map markers point to source demos and are consumed only when reached',()=>{
  const expected=new Set(['0/2/30','0/5/3','0/8/33','1/3/4','1/8/6','1/9/34','1/12/19','2/10/35']);
  const actual=new Set<string>();
  for(const world of worlds)for(const level of world.levels){
    const markers=level.objects.map((object,i)=>({object,i})).filter(({object})=>object===0||object===30);
    const ids=[...new Set(markers.map(({i})=>level.parameters[i]))];
    for(const id of ids){
      assert(scripts.has(id),`${level.world}/${level.index}: missing demo ${id}`);
      if(level.index!==13)actual.add(`${level.world}/${level.index}/${id}`);
    }
  }
  assert.deepEqual(actual,expected);
  for(const label of expected){
    const [w,l,id]=label.split('/').map(Number),level=worlds[w].levels[l],sim=new Simulation(level);
    const marker=level.objects.findIndex((object,i)=>(object===0||object===30)&&level.parameters[i]===id);
    sim.player.x=marker%level.width;sim.player.y=Math.floor(marker/level.width);sim.player.offset=6;
    assert.equal(nextStageDemo(sim,scripts),null);
    sim.player.offset=0;sim.step({direction:0,action:false});
    assert.equal(nextStageDemo(sim,scripts),id);
    assert.equal(sim.level.objects[marker],255);
    assert.equal(nextStageDemo(sim,scripts),null);
    assert.deepEqual(sim.replay().inputs.at(-1)?.demoEdits,[{cell:marker,object:255}]);
  }
});

test('later world dialogue scenes and equipment scenes play every original line in order',()=>{
  const cases:[[number,number,number],...Array<[number,number,number]>]=[
    [0,2,30],[0,8,33],[1,9,34],[2,10,35],
    [0,3,22],[1,2,23],[1,7,24],[2,5,25],
    [0,5,3],[1,3,4],[1,8,6],[1,12,19]
  ];
  for(const [world,levelIndex,id] of cases){
    const level=worlds[world].levels[levelIndex],sim=new Simulation(level),demo=new IntroSequence(level,scripts,sim,id);
    const seen:string[]=[];
    for(let tick=0;tick<800&&!demo.finished;tick++){
      const line=demo.dialogue?.lines.join(' ');
      if(line&&!seen.includes(line))seen.push(line);
      if(line)demo.press();
      demo.step();
    }
    assert.equal(demo.finished,true,`${world}/${levelIndex}: script ${id} stalled`);
    const original=scripts.get(id)!.commands.flatMap(command=>command.text?[command.text.trim()]:[]);
    for(const line of original)assert(seen.some(fragment=>line.includes(fragment)||fragment.includes(line.slice(0,18))),`${id}: missing ${line}`);
  }
});

test('equipment chest rewards queue the corresponding original dialogue',()=>{
  for(const [w,l,reward,id] of [[0,3,24,22],[1,2,27,23],[1,7,40,24],[2,5,26,25]]){
    const level=worlds[w].levels[l],sim=new Simulation(level),chest=level.tiles.indexOf(reward);
    assert(chest>=0&&level.objects[chest]===14);
    sim.chestCell=chest;
    let found=false;
    for(let tick=0;tick<100&&!found;tick++){
      sim.step({direction:0,action:false});
      found=nextStageDemo(sim,scripts)===id;
    }
    assert(found,`${w}/${l}: reward ${reward} did not trigger script ${id}`);
  }
});

test('replay preserves consumed demo markers and command edits',()=>{
  const level=worlds[0].levels[2],sim=new Simulation(level),marker=level.objects.findIndex((object,i)=>object===0&&level.parameters[i]===30);
  sim.player.x=marker%level.width;sim.player.y=Math.floor(marker/level.width);
  // Reconstruct the route with movement rather than recording a teleported hero.
  const replaySim=new Simulation(level);
  replaySim.step({direction:0,action:false});
  const cell=replaySim.index(6,18);
  replaySim.applyDemoEdit({cell,object:255},true);
  replaySim.applyDemoEdit({cell:replaySim.index(8,7),object:26,parameter:0},true);
  const replay=validateReplay(replaySim.replay(),worlds),restored=restoreReplay(replay,worlds);
  assert.equal(restored.level.objects[cell],255);
  assert.equal(restored.level.objects[restored.index(8,7)],26);
  assert.equal(restored.initialLevelFingerprint,replay.levelFingerprint);
});

test('a triggered final-chamber scene replays the same level state',()=>{
  const level=worlds[0].levels[8],sim=new Simulation(level);
  let id:number|null=null;
  for(let tick=0;tick<25&&id===null;tick++){
    sim.step({direction:2,action:false});id=nextStageDemo(sim,scripts);
  }
  assert.equal(id,33);
  const demo=new IntroSequence(level,scripts,sim,id);
  for(let tick=0;tick<200&&!demo.finished;tick++){
    if(demo.dialogue)demo.press();
    demo.step();
  }
  assert(demo.finished);
  const restored=restoreReplay(validateReplay(sim.replay(),worlds),worlds);
  assert.deepEqual(restored.snapshot(),sim.snapshot());
});
