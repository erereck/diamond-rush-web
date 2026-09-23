import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { DecodedSprite } from '../src/assets/SpriteDecoder.ts';
import { crusherFrameIndex, rollingStoneVisual, snakeVisual, sourceFrameForElapsed } from '../src/render/OriginalAnimationRules.ts';

const sprite=(id:string)=>JSON.parse(readFileSync(new URL(`../public/assets/${id}.json`,import.meta.url),'utf8')) as DecodedSprite;

test('Scotland roller selects canonical body and dust modules with source cadence',()=>{
  const image=sprite('gen1-2');assert.equal(image.modules.length,13);
  assert.deepEqual(rollingStoneVisual(2,12,4,false),{body:2,x:-12,y:0,dust:{module:5,x:-20,y:24}});
  assert.deepEqual(rollingStoneVisual(2|8,12,4,true),{body:0,x:-13,y:1,dust:{module:10,x:6,y:24}});
  assert.equal(rollingStoneVisual(3,18,4,false).dust,null);
  for(const tick of [0,1,2,10,20]){
    const view=rollingStoneVisual(2,0,tick,false);
    assert(view.body<3&&view.dust!.module>=3&&view.dust!.module<=7);
  }
});

test('crusher AF duration boundaries match cGame.method_202',()=>{
  const s=sprite('gen1-3'),a=s.animations[0];
  const durations=s.animationFrames.slice(a.start,a.start+a.count).map(f=>f.duration);
  assert.deepEqual(durations,[1,3,4,3,10,3,1,1,10]);
  assert.equal(crusherFrameIndex(durations,0),0);
  assert.equal(crusherFrameIndex(durations,36),0);
  assert.equal(crusherFrameIndex(durations,35),0);
  assert.equal(crusherFrameIndex(durations,34),1);
  assert.equal(crusherFrameIndex(durations,32),1);
  assert.equal(crusherFrameIndex(durations,31),2);
  assert.equal(crusherFrameIndex(durations,1),8);
  assert.equal(s.animationFrames[s.animations[1].start].x,24);
});

test('snake animation selects source stun frame and world-specific clock',()=>{
  assert.deepEqual(snakeVisual(1,2,5,4),{animation:0,frame:1});
  assert.deepEqual(snakeVisual(1,2|8,5,8),{animation:2,frame:5});
  assert.deepEqual(snakeVisual(0,3,5,11),{animation:2,frame:2});
  assert.deepEqual(snakeVisual(0,3|8,5,5),{animation:4,frame:2});
  assert.deepEqual(snakeVisual(2,0|(4<<12),5,11),{animation:3,frame:2});
  assert.equal(sprite('gen1-5').animations.length,5);
  assert.equal(sprite('gen1-7').animations.length,3);
});

test('Tibetan ceiling trap has distinct phase first frames',()=>{
  const s=sprite('gen3-4');
  assert.deepEqual(s.animations.map(a=>s.animationFrames[a.start].frame),[0,1,3,2,4]);
});

test('Tibetan plant and gear phases use source duration boundaries and AF offsets',()=>{
  const plant=sprite('gen3-5'),gear=sprite('gen3-7');
  assert.equal(plant.animations.length,11);
  assert.equal(gear.animations.length,18);
  const a=plant.animations[10],durations=plant.animationFrames.slice(a.start,a.start+a.count).map(f=>f.duration);
  assert.equal(sourceFrameForElapsed(durations,0,true),0);
  assert.equal(sourceFrameForElapsed(durations,durations[0],true),0);
  assert.equal(sourceFrameForElapsed(durations,durations[0]+1,true),1);
  const full=durations.reduce((n,d)=>n+d,0);
  assert.equal(sourceFrameForElapsed(durations,full+1,true),0);
  assert.equal(sourceFrameForElapsed(durations,full,true),durations.length-1);
});
