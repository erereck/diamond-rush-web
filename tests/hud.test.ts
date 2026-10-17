import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { useExtractedResources } from '../tools/routes/engineResources.ts';
import { loadRouteResources } from '../tools/routes/loadResources.ts';
import type { CoreRouteFixture } from '../tools/routes/CoreRoute.ts';
import { S700Engine } from '../src/core/s700/Engine.ts';
import { enableRendering, Graphics, Image } from '../src/core/s700/j2me.ts';
import { installWideHud, wideHud } from '../src/core/s700/Hud.ts';
import type { HudLayer } from '../src/core/s700/Hud.ts';
import { Simulation } from '../src/core/Simulation.ts';

useExtractedResources();
const {worlds}=loadRouteResources();
const C=S700Engine.core;
const routeRoot=new URL('./fixtures/core-routes/',import.meta.url);
const hasRoute=(name:string)=>existsSync(new URL(name,routeRoot));
const route=(name:string)=>JSON.parse(readFileSync(new URL(name,routeRoot),'utf8')) as CoreRouteFixture;

/** A 2D context that accepts everything the original draws (the tests only follow the HUD layer's). */
function stubContext(record?:(x:number,y:number,w:number,h:number)=>void){
  let e=0,f=0,a=1;
  const target:any={
    imageSmoothingEnabled:false,
    setTransform(a1:number,_b:number,_c:number,_d:number,e1:number,f1:number){a=a1;e=e1;f=f1;},
    restore(){a=1;e=0;f=0;},
    createImageData(w:number,h:number){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};},
    getImageData(_x:number,_y:number,w:number,h:number){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};},
    drawImage(img:{width:number;height:number},...args:number[]){
      // drawImage(img,x,y) places the image; drawRegion draws (img,sx,sy,w,h,0,0,w,h) under a transform.
      if(args.length===2)record?.(args[0],args[1],img.width,img.height);
      else if(args.length===8)record?.(a<0?e-args[2]:e,f,args[2],args[3]);
    },
  };
  return new Proxy(target,{get:(t,k)=>k in t?t[k]:()=>{}}) as CanvasRenderingContext2D;
}
enableRendering((width,height)=>({canvas:{width,height} as any,ctx:stubContext()}));
installWideHud();

/** What the HUD layer drew on the last paint, in layer pixels. */
function recordingLayer(width:number){
  const draws:{x:number;y:number;w:number;h:number}[]=[];
  const ctx=stubContext((x,y,w,h)=>draws.push({x,y,w,h}));
  (ctx as any).clearRect=()=>{draws.length=0;};
  const layer:HudLayer={ctx,width,height:320,originX:(width-240)>>1,originY:0,top:{left:0,right:29},bottom:{left:0,right:0}};
  return {layer,draws};
}
/** Every number, flag and string reachable from the game and the core's statics (not the drawing surfaces). */
function digest(game:unknown){
  let hash=0x811c9dc5|0;const seen=new Set<unknown>();
  const mix=(s:string)=>{for(let i=0;i<s.length;i++)hash=Math.imul(hash^s.charCodeAt(i),0x01000193);};
  const walk=(v:any,depth:number)=>{
    if(v===null||v===undefined){mix('_');return;}
    if(typeof v!=='object'){if(typeof v!=='function')mix(String(v));return;}
    if(seen.has(v)||depth>12||v instanceof Graphics||v instanceof Image||(v.ctx&&v.canvas))return;
    seen.add(v);
    if(ArrayBuffer.isView(v)){mix((v as any).join(','));return;}
    for(const k of Object.keys(v)){mix(k);walk(v[k],depth+1);}
  };
  walk(game,0);
  for(const k of Object.getOwnPropertyNames(C))if(!['length','name','prototype'].includes(k)&&typeof C[k]!=='function'){mix(k);walk(C[k],0);}
  return hash>>>0;
}

test('the wide HUD keeps lives and the compass at the left edge, keys and cauldrons at the right one',()=>{
  const sim=new Simulation(worlds[0].levels[0],{world:0,level:0}),{layer,draws}=recordingLayer(568);
  try{
    wideHud.setLayer(layer);
    for(let i=0;i<30;i++)sim.step({direction:0,action:false});
    assert.equal(sim.gameState,1);assert.ok(sim.game.field_179,'a campaign stage has the compass');
    // The compass and the cauldrons stand up to 9 px above the bottom bar.
    const top=draws.filter(d=>d.y<40),bottom=draws.filter(d=>d.y>=270);
    const reach=(list:typeof draws)=>[Math.min(...list.map(d=>d.x)),Math.max(...list.map(d=>d.x+d.w))];
    assert.deepEqual(reach(top),[0,568-29],'the top bar runs to the edges, short of the settings button');
    assert.deepEqual(reach(bottom),[0,568],'the bottom bar runs to the edges');
    // Lives (36×25 icon), compass (49×33), cauldrons (37×25) and keys (23×16) keep their places at the sides.
    const find=(list:typeof draws,w:number,h:number)=>list.filter(d=>d.w===w&&d.h===h).map(d=>d.x);
    assert.deepEqual(find(top,36,25),[45]);
    assert.deepEqual(find(bottom,49,33),[4],'method_166 draws the compass 2 px in');
    assert.deepEqual(find(bottom,37,25).sort((a,b)=>a-b),[158+328,195+328]);
    assert.deepEqual(find(top,23,16).sort((a,b)=>a-b),[134+299,175+299]);
    // The spaces the groups leave in each bar are filled with the bars' 9×40 slice.
    for(const [list,from,to] of [[top,118,118+299],[bottom,74,74+164],[bottom,145+164,144+328]] as const){
      const covered=new Uint8Array(568);
      for(const d of list.filter(d=>d.w===9&&d.h===40))for(let x=Math.max(0,d.x);x<Math.min(568,d.x+d.w);x++)covered[x]=1;
      assert.equal(covered.subarray(from,to).indexOf(0),-1,`no hole in ${from}–${to}`);
    }
  }finally{wideHud.setLayer(null);}
});

test('the wide HUD paints without changing the game',{skip:!hasRoute('0-angkor-intro.json')},()=>{
  // The tutorial has dialogues, a cutscene, the compass chest and HUD changes.
  const fixture=route('0-angkor-intro.json'),level=worlds[0].levels[13];
  const play=(wide:boolean)=>{
    const {layer}=recordingLayer(568);wideHud.setLayer(wide?layer:null);
    try{
      const sim=new Simulation(level,{world:0,level:13}),trace:number[]=[];
      for(const run of fixture.controls)for(let i=0;i<run.ticks;i++){sim.step(run);if(sim.tick%50===0)trace.push(digest(sim.game));}
      return {status:sim.status,trace,record:Array.from(sim.record())};
    }finally{wideHud.setLayer(null);}
  };
  const original=play(false),wide=play(true);
  assert.equal(original.status,'complete');
  assert.deepEqual(wide,original);
});

test('painting a session again leaves it where it was',{skip:!hasRoute('0-angkor-09-boss-crystal.json')},()=>{
  // The boss stage: the original's paint moves the boss sprites, which its logic reads.
  const fixture=route('0-angkor-09-boss-crystal.json'),s=fixture.start;
  const play=(repaint:boolean)=>{
    const sim=new Simulation(worlds[s.world].levels[s.level],{world:s.world,level:s.level,
      resources:{diamonds:s.diamonds,redDiamonds:s.redDiamonds,lives:s.lives,health:s.maxHealth,maxHealth:s.maxHealth,weaponTier:s.weaponTier as 0|1|2|8,diving:s.diving}});
    let steps=0;
    for(const run of fixture.controls)for(let i=0;i<run.ticks&&steps<900;i++,steps++){
      sim.step(run);
      if(repaint&&steps%30===29){const before=digest(sim.game);sim.repaint();assert.equal(digest(sim.game),before,`tick ${sim.tick}`);}
    }
    return [sim.tick,digest(sim.game)];
  };
  // A repainted session continues exactly like one that was never repainted.
  assert.deepEqual(play(true),play(false));
});
