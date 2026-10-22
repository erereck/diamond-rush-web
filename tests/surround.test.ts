import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { useExtractedResources } from '../tools/routes/engineResources.ts';
import { loadRouteResources } from '../tools/routes/loadResources.ts';
import type { CoreRouteFixture } from '../tools/routes/CoreRoute.ts';
import { S700Engine } from '../src/core/s700/Engine.ts';
import { enableRendering, Graphics, Image } from '../src/core/s700/j2me.ts';
import { surroundObjects } from '../src/core/s700/Surround.ts';
import type { SurroundLayer } from '../src/core/s700/Surround.ts';
import { Simulation } from '../src/core/Simulation.ts';

useExtractedResources();
const {worlds}=loadRouteResources();
const C=S700Engine.core;
const routeRoot=new URL('./fixtures/core-routes/',import.meta.url);
const hasRoute=(name:string)=>existsSync(new URL(name,routeRoot));
const route=(name:string)=>JSON.parse(readFileSync(new URL(name,routeRoot),'utf8')) as CoreRouteFixture;
type Draw={x:number;y:number;w:number;h:number};

/** A 2D context that accepts everything the original draws and can list where images land. */
function stubContext(record?:(d:Draw)=>void){
  let e=0,f=0,a=1;
  const target:any={
    imageSmoothingEnabled:false,
    setTransform(a1:number,_b:number,_c:number,_d:number,e1:number,f1:number){a=a1;e=e1;f=f1;},
    restore(){a=1;e=0;f=0;},
    createImageData(w:number,h:number){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};},
    getImageData(_x:number,_y:number,w:number,h:number){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};},
    drawImage(img:{width:number;height:number},...args:number[]){
      if(args.length===2)record?.({x:args[0],y:args[1],w:img.width,h:img.height});
      else if(args.length===8)record?.({x:a<0?e-args[2]:e,y:f,w:args[2],h:args[3]});
    },
  };
  return new Proxy(target,{get:(t,k)=>k in t?t[k]:()=>{}}) as CanvasRenderingContext2D;
}
enableRendering((width,height)=>({canvas:{width,height} as any,ctx:stubContext()}));
/** A window of 568×432 logical pixels: the original screen at (164,56). */
function layer(record?:(d:Draw)=>void):SurroundLayer{return {ctx:stubContext(record),width:568,height:432,originX:164,originY:56};}
const startOf=(f:CoreRouteFixture)=>{const s=f.start;return {world:s.world,level:s.level,
  resources:{diamonds:s.diamonds,redDiamonds:s.redDiamonds,lives:s.lives,health:s.maxHealth,maxHealth:s.maxHealth,weaponTier:s.weaponTier as 0|1|2|8,diving:s.diving}};};
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

test('beyond the screen, the original paints the stage\'s objects where its own paint puts them',{skip:!hasRoute('0-angkor-01-normal.json')},()=>{
  // Angkor 1 has snakes, stones and diamonds in and out of view.
  const fixture=route('0-angkor-01-normal.json');
  const around:Draw[]=[],screen:Draw[]=[];let recording=false;
  const proto=C.prototype,paintObjects=proto.method_151;
  try{
    surroundObjects.setLayer(layer(d=>around.push(d)));
    const sim=new Simulation(worlds[0].levels[0],startOf(fixture));
    const screenGraphics=sim.game.field_314 as Graphics;
    (screenGraphics as any).ctx=stubContext(d=>{if(recording)screen.push(d);});
    proto.method_151=function(this:any,g:Graphics){recording=g===screenGraphics;try{return paintObjects.call(this,g);}finally{recording=false;}};
    let checked=0,ticks=0;
    for(const run of fixture.controls)for(let i=0;i<run.ticks&&ticks<600;i++,ticks++){
      around.length=0;screen.length=0;
      sim.step(run);
      if(!screen.length)continue;
      // Each piece the frame's paint draws in the original screen is in the layer, moved by the screen's origin.
      const key=(d:Draw)=>`${d.x},${d.y},${d.w},${d.h}`,painted=new Map<string,number>();
      for(const d of around)painted.set(key(d),(painted.get(key(d))??0)+1);
      for(const d of screen){
        const k=key({...d,x:d.x+164,y:d.y+56}),n=painted.get(k)??0;
        assert.ok(n>0,`tick ${sim.tick}: ${key(d)} on the screen is missing around it`);painted.set(k,n-1);
      }
      assert.ok(around.length>screen.length,'the layer also paints the cells beyond the screen');
      checked++;
    }
    assert.ok(checked>400,`${checked} frames checked`);
  }finally{proto.method_151=paintObjects;surroundObjects.setLayer(null);}
});

for(const name of ['0-angkor-01-normal.json','0-angkor-09-boss-crystal.json'])
  test(`painting the stage beyond the screen leaves the game as it was (${name})`,{skip:!hasRoute(name)},()=>{
    const fixture=route(name);
    const play=(around:boolean)=>{
      surroundObjects.setLayer(around?layer():null);
      try{
        const sim=new Simulation(worlds[fixture.start.world].levels[fixture.start.level],startOf(fixture)),trace:number[]=[];
        for(const run of fixture.controls)for(let i=0;i<run.ticks;i++){sim.step(run);if(sim.tick%50===0)trace.push(digest(sim.game));}
        return {status:sim.status,result:sim.result,trace,record:Array.from(sim.record())};
      }finally{surroundObjects.setLayer(null);}
    };
    const original=play(false);
    assert.ok(original.result,'the route ends the stage');
    assert.deepEqual(play(true),original);
  });
