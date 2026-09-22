import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { MapNode } from '../src/level/LevelParser.ts';
import { adjacentNode, finishLevel, newCampaign, unlockedNode, unlockedWorld, validateCampaign } from '../src/core/Campaign.ts';

const maps=[0,1,2].map(w=>JSON.parse(readFileSync(new URL(`../public/assets/map-${w}.json`,import.meta.url),'utf8')) as MapNode[]);
test('map navigation follows original links and completed stages unlock neighbors',()=>{
  let c=newCampaign();
  assert.equal(unlockedNode(c,0,maps[0][0],maps),true);
  assert.equal(unlockedNode(c,0,maps[0][1],maps),false);
  assert.equal(adjacentNode(c,2,maps),null);
  c=finishLevel(c,0,0,{diamonds:3,redDiamonds:0,lives:5,health:4});
  assert.equal(adjacentNode(c,2,maps)?.level,1);
  c.selected=1;
  assert.equal(adjacentNode(c,4,maps)?.level,0);
  assert.equal(adjacentNode(c,2,maps),null);
});
test('world access and saved campaign validation cannot skip locked maps',()=>{
  let c=newCampaign();
  assert.equal(unlockedWorld(c,1,maps),false);
  assert.throws(()=>validateCampaign({...c,world:1},maps));
  c=finishLevel(c,0,8,{diamonds:28,redDiamonds:2,lives:4,health:3});
  assert.equal(unlockedWorld(c,1,maps),true);
  const restored=validateCampaign(JSON.parse(JSON.stringify(c)),maps);
  assert.deepEqual(restored.resources,{diamonds:28,redDiamonds:2,lives:4,health:3});
  assert.throws(()=>validateCampaign({...c,selected:10},maps));
});
