import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { MapNode } from '../src/level/LevelParser.ts';
import { adjacentNode, finishLevel, newCampaign, pendingRewards, unlockedNode, unlockedWorld, validateCampaign } from '../src/core/Campaign.ts';

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
  assert.deepEqual(restored.resources,{diamonds:28,redDiamonds:2,lives:4,health:3,weaponTier:0});
  assert.equal(validateCampaign({...c,resources:{diamonds:28,redDiamonds:2,lives:4,health:3,weaponTier:8}},maps).resources.weaponTier,8);
  assert.throws(()=>validateCampaign({...c,resources:{...c.resources,weaponTier:3}},maps));
  assert.throws(()=>validateCampaign({...c,selected:10},maps));
});
test('each result reward can be earned later only once and stops at 99 lives',()=>{
  let c=newCampaign();
  const first=pendingRewards(c,0,0,16|32,5);
  assert.deepEqual(first,{mask:48,lives:7});
  c=finishLevel(c,0,0,{...c.resources,lives:first.lives},first.mask);
  assert.deepEqual(pendingRewards(c,0,0,16|32,7),{mask:0,lives:7});
  const revisit=pendingRewards(c,0,0,4|8|16|32,7);
  assert.deepEqual(revisit,{mask:12,lives:9});
  c=finishLevel(c,0,0,{...c.resources,lives:revisit.lives},revisit.mask);
  assert.equal(validateCampaign(JSON.parse(JSON.stringify(c)),maps).awards[0][0],60);
  assert.deepEqual(pendingRewards(c,0,0,60,9),{mask:0,lives:9});
  const capped=pendingRewards(newCampaign(),0,0,60,98);
  assert.deepEqual(capped,{mask:4,lives:99});
});
test('old campaign saves migrate reward flags without duplicating earned lives',()=>{
  const old=finishLevel(newCampaign(),0,8,{diamonds:12,redDiamonds:1,lives:8,health:4});
  old.completed[1].push(10);
  delete (old as Partial<typeof old>).awards;
  const migrated=validateCampaign(old,maps);
  assert.equal(migrated.awards[0][8],60);
  assert.equal(migrated.awards[1][10],60);
  assert.deepEqual(pendingRewards(migrated,0,8,60,8),{mask:0,lives:8});
  assert.equal(migrated.awards[0][0],0);
});

test('canonical secret branches require the secret exit, then chain only to their linked rooms',()=>{
  const entrances:[[number,number,number],...Array<[number,number,number]>]=[
    [0,6,9],[0,7,12],[1,3,10],[1,6,11],[2,1,11],[2,4,12]
  ];
  for(const [world,from,target] of entrances){
    let c=newCampaign();
    if(world>0)c.completed[world-1].push([8,9][world-1]);
    const secret=maps[world].find(n=>n.level===target)!;
    c=finishLevel(c,world,from,c.resources,0,false,maps);
    assert.equal(unlockedNode(c,world,secret,maps),false,`${world}/${from} normal exit exposed ${target}`);
    c=finishLevel(c,world,from,c.resources,0,true,maps);
    assert.equal(unlockedNode(c,world,secret,maps),true,`${world}/${from} secret exit did not expose ${target}`);
    assert.equal(c.selected,target);
    assert.deepEqual(c.secretUnlocked[world],[target]);
  }
  let c=newCampaign();c=finishLevel(c,0,6,c.resources,0,true,maps);
  assert.equal(unlockedNode(c,0,maps[0].find(n=>n.level===10)!,maps),false);
  c=finishLevel(c,0,9,c.resources,0,true,maps);
  assert.equal(unlockedNode(c,0,maps[0].find(n=>n.level===10)!,maps),true);
  c=finishLevel(c,0,10,c.resources,0,true,maps);
  assert.equal(unlockedNode(c,0,maps[0].find(n=>n.level===11)!,maps),true);
  const tibet=newCampaign();tibet.completed[0].push(8);tibet.completed[1].push(9);
  tibet.secretUnlocked[2].push(12);
  const afterTibetSecret=finishLevel(tibet,2,12,tibet.resources,0,false,maps);
  assert.equal(unlockedNode(afterTibetSecret,2,maps[2].find(n=>n.level===13)!,maps),true);
});

test('old campaign saves preserve discovered secret stages without revealing every branch',()=>{
  const old=finishLevel(newCampaign(),0,6,newCampaign().resources);
  delete (old as Partial<typeof old>).secretUnlocked;
  assert.equal(unlockedNode(validateCampaign(old,maps),0,maps[0].find(n=>n.level===9)!,maps),false);
  old.selected=9;
  const migrated=validateCampaign(old,maps);
  assert.deepEqual(migrated.secretUnlocked[0],[9]);
  assert.equal(unlockedNode(migrated,0,maps[0].find(n=>n.level===9)!,maps),true);
  assert.equal(unlockedNode(migrated,0,maps[0].find(n=>n.level===12)!,maps),false);
});
