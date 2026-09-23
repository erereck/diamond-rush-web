import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePack } from '../src/assets/Pack.ts';
import { parseDemoScripts } from '../src/core/DemoScript.ts';
import { IntroSequence } from '../src/core/IntroSequence.ts';
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

test('guided introduction traverses the compass, rock lesson and seal before the map',()=>{
  const intro=new IntroSequence(level,scripts),seen=new Set<number>(),dialogue=new Set<string>();
  for(let i=0;i<2000&&!intro.finished;i++){
    if(intro.scriptId!==null)seen.add(intro.scriptId);
    if(intro.dialogue){dialogue.add(intro.dialogue.lines.join(' '));intro.press();}
    intro.step();
  }
  assert.equal(intro.finished,true);
  assert.deepEqual([...seen],[29,10,11,13,16,28]);
  assert.equal(intro.sim.opened.has(intro.sim.index(28,6)),true);
  assert.equal(intro.heroX,61*24);
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

test('rapid action presses cannot leave scripted walking between map cells',()=>{
  const intro=new IntroSequence(level,scripts);
  for(let i=0;i<2000&&!intro.finished;i++){intro.press();intro.step();}
  assert.equal(intro.finished,true);
  assert.equal(intro.heroX%24,0);
  assert.equal(intro.heroY%24,0);
});
