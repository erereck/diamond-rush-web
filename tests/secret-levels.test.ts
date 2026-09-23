import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { DecodedSprite } from '../src/assets/SpriteDecoder.ts';
import type { AssetManager } from '../src/assets/AssetManager.ts';
import { Simulation } from '../src/core/Simulation.ts';
import type { MapNode, WorldDefinition } from '../src/level/LevelParser.ts';
import { LevelRenderer } from '../src/render/LevelRenderer.ts';
import { SpriteRenderer } from '../src/render/SpriteRenderer.ts';

const json=<T>(name:string)=>JSON.parse(readFileSync(new URL(`../public/assets/${name}.json`,import.meta.url),'utf8')) as T;
const manifest=json<{sprites:string[]}>('manifest');
const sprites=new Map(manifest.sprites.map(id=>[id,json<DecodedSprite>(id)]));
const assets={sprite:(id:string)=>{const sprite=sprites.get(id);assert(sprite,`missing ${id}`);return sprite;}} as AssetManager;
const realRenderer=new SpriteRenderer(),trace={frames:0,modules:0};
const renderer=new LevelRenderer(assets,{
  frame(_ctx:unknown,s:DecodedSprite,n:number,_x:number,_y:number,_flags=0,palette=0){assert(s.frames[n],`${s.name}: frame ${n}`);assert(s.palettes[palette],`${s.name}: palette ${palette}`);trace.frames++;},
  module(_ctx:unknown,s:DecodedSprite,n:number,_x:number,_y:number,_flags=0,palette=0){assert(s.modules[n],`${s.name}: module ${n}`);assert(s.palettes[palette],`${s.name}: palette ${palette}`);trace.modules++;},
  animation(_ctx:unknown,s:DecodedSprite,n:number,time:number){assert(s.animations[n],`${s.name}: animation ${n}`);realRenderer.animationFrame(s,n,time);},
  animationFrame:(s:DecodedSprite,n:number,time:number)=>realRenderer.animationFrame(s,n,time)
} as unknown as SpriteRenderer);
const ctx={fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},setLineDash(){},save(){},restore(){}} as unknown as CanvasRenderingContext2D;

test('all ten canonical secret stages have a spawn and usable exit and render without missing sprite frames',()=>{
  let count=0;
  for(let world=0;world<3;world++){
    const map=json<MapNode[]>(`map-${world}`),levels=json<WorldDefinition>(`world-${world}`).levels;
    for(const node of map.filter(n=>n.type===1)){
      const level=levels[node.level];
      assert.equal(level.tiles.filter(t=>t===79).length,1,`${world}/${node.level} spawn`);
      assert.equal(level.objects.filter(o=>o===5||o===28).length,1,`${world}/${node.level} exit`);
      const sim=new Simulation(level);
      for(const tick of [0,17,48])renderer.draw(ctx,level,tick,sim);
      count++;
    }
  }
  assert.equal(count,10);assert(trace.frames>0);assert(trace.modules>0);
});
