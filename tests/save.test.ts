import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CanonicalSave } from '../src/platform/CanonicalSave.ts';
import { campaignFromRecord, campaignRecord, campaignStageStart } from '../src/platform/CanonicalCampaign.ts';
import { finishLevel, newCampaign, unlockedNode, unlockedWorld } from '../src/core/Campaign.ts';
import { Simulation } from '../src/core/Simulation.ts';
import { restoreReplay } from '../src/platform/Session.ts';
import { parseWorld,parseWorldMap } from '../src/level/LevelParser.ts';
import type { WorldDefinition } from '../src/level/LevelParser.ts';

// Independently specified miniature record: three worlds, one level in each.
const expected=new Uint8Array([
  2,0,0,5,0,0,0,0,4,0,0,0,0,0,20,0,34,0,44,0,
  1,0,0,25,0,0,2,0,0,2,1,1,2,1,
  1,0,100,39,0,0,0,0,0,0,
  1,0,100,49,0,0,0,0,0,0,
]);
const fixture:WorldDefinition[]=Array.from({length:3},(_,world)=>({world,version:0,levels:[{world,index:0,width:4,height:3,offset:0,
  tiles:Array.from({length:12},(_,i)=>world===0&&[5,6].includes(i)?2:255),parameters:Array(12).fill(255),
  objects:Array.from({length:12},(_,i)=>world===0&&i===5?14:world===0&&i===6?33:255)}]}));

test('RMS initial layout matches independent byte fixture and exports used length',()=>{
  assert.deepEqual(CanonicalSave.create(fixture,[[{x:0,y:0,type:1,level:0,links:[]}],[],[]]).export(),expected);
});
test('RMS preserves unknown header/trailing bytes without aliasing input or output',()=>{
  const bytes=new Uint8Array([...expected,77,88]);bytes[12]=123;bytes[3]=255;bytes[4]=0x34;bytes[5]=0x12;
  const save=new CanonicalSave(bytes);assert.equal(save.lives,-1);assert.equal(save.diamonds,0x1234);assert.deepEqual(save.export(),bytes);
  bytes[12]=0;const exported=save.export();exported[12]=0;assert.equal(save.export()[12],123);
});
test('RMS equipment byte follows the three original upgrade tiers',()=>{
  const save=new CanonicalSave(expected);assert.equal(save.weaponTier,0);
  for(const tier of [1,2,8] as const){save.setWeaponTier(tier);assert.equal(save.export()[9],tier);assert.equal(new CanonicalSave(save.export()).weaponTier,tier);}
});
test('RMS chest collection is idempotent, flags are ORed and other bytes survive',()=>{
  const save=new CanonicalSave(expected);assert.equal(save.openChest(0,0,1,1),true);assert.equal(save.openChest(0,0,1,1),false);assert.equal(save.openChest(0,0,0,0),false);
  save.addLevelFlags(0,0,2);save.addLevelFlags(0,0,64);save.setLevelStatus(0,0,3);
  const result=expected.slice();result[25]=3;result[27]=66;result[28]=1;result[30]=0;result[31]=0;
  assert.deepEqual(save.export(),result);
});
test('RMS rejects truncation, pointers into headers, aliased blocks and invalid chest counts',()=>{
  assert.throws(()=>new CanonicalSave(expected.slice(0,-1)),/limites/);
  for(const value of [0,20]){const bytes=expected.slice();bytes[16]=value;assert.throws(()=>new CanonicalSave(bytes),/sobrepostos/);}
  const bad=expected.slice();bad[28]=3;assert.throws(()=>new CanonicalSave(bad),/baús/);
  assert.throws(()=>new CanonicalSave(new Uint8Array(1001)),/tamanho/);
});
test('canonical 41-level save retains every chest in row-major order',()=>{
  const res=new URL('../../../work/reference-s700/res/',import.meta.url),read=(name:string)=>readFileSync(new URL(name,res));
  const worlds=[0,1,2].map(i=>parseWorld(read(`w${i}.bin`),i));
  const maps=['map_angkor.out','map_scotland.out','map_tibet.out'].map(n=>parseWorldMap(read(n),n));
  const save=CanonicalSave.create(worlds,maps);assert.equal(save.worlds.reduce((sum,w)=>sum+w.levels.length,0),41);
  for(const w of worlds)for(const level of w.levels){
    const chests=level.objects.flatMap((t,i)=>[14,33].includes(t)?[{x:i%level.width,y:Math.floor(i/level.width)}]:[]);
    assert.deepEqual(save.worlds[w.world].levels[level.index].chests,chests);
  }
  save.unlockThrough(0,3);save.unlockThrough(0,1);assert.equal(new CanonicalSave(save.export()).worlds[0].unlocked,3);
  assert.deepEqual(new CanonicalSave(save.export()).export(),save.export());
});

test('campaign progress round-trips through the original record without losing unknown bytes',()=>{
  const res=new URL('../../../work/reference-s700/res/',import.meta.url),read=(name:string)=>readFileSync(new URL(name,res));
  const worlds=[0,1,2].map(i=>parseWorld(read(`w${i}.bin`),i));
  const maps=['map_angkor.out','map_scotland.out','map_tibet.out'].map(n=>parseWorldMap(read(n),n));
  const template=CanonicalSave.create(worlds,maps).export();template[12]=173;
  let campaign=newCampaign();campaign.canonicalRecord=[...template];
  campaign=finishLevel(campaign,0,6,{diamonds:120,redDiamonds:3,lives:9,health:4,weaponTier:2},4|16,true,maps);
  const stage=new Simulation(worlds[0].levels[6],{diamonds:110,redDiamonds:2,lives:7,health:4,weaponTier:2});
  stage.redDiamonds=3;
  const chest=stage.level.objects.findIndex(o=>o===14||o===33);assert.ok(chest>=0);stage.opened.add(chest);
  const save=campaignRecord(campaign,worlds,maps,stage),bytes=save.export();
  assert.equal(bytes[12],173);assert.equal(save.lives,9);assert.equal(save.diamonds,120);assert.equal(save.weaponTier,2);
  assert.equal(save.worlds[0].levels[6].flags&22,22);
  assert.equal(save.worlds[0].levels[6].status,1);
  assert.equal(save.worlds[0].levels[6].openedChests,1);
  const restored=campaignFromRecord(new CanonicalSave(bytes),worlds,maps);
  assert.equal(restored.completed[0].includes(6),true);
  assert.equal(restored.secretUnlocked[0].includes(9),true);
  assert.equal(restored.awards[0][6],20);
  assert.deepEqual(campaignRecord(restored,worlds,maps).export(),bytes);
  const initial=campaignStageStart(restored,worlds,maps,0,6);
  assert.deepEqual(initial.openedChests,[chest]);
  const revisited=new Simulation(worlds[0].levels[6],initial);
  assert.equal(revisited.tiles[chest],-1);assert.equal(revisited.chestFrames[chest],3);
  assert.equal(revisited.opened.has(chest),true);
  assert.equal(restoreReplay(revisited.replay(),worlds).tiles[chest],-1);
  // method_108 accumulates red diamonds across visits instead of replacing
  // the count stored in the level's RMS record.
  revisited.redDiamonds++;
  assert.equal(campaignRecord(restored,worlds,maps,revisited).worlds[0].levels[6].status,2);
});

test('Angkor main route stays unlocked after each original RMS round-trip',()=>{
  const res=new URL('../../../work/reference-s700/res/',import.meta.url),read=(name:string)=>readFileSync(new URL(name,res));
  const worlds=[0,1,2].map(i=>parseWorld(read(`w${i}.bin`),i));
  const maps=['map_angkor.out','map_scotland.out','map_tibet.out'].map(n=>parseWorldMap(read(n),n));
  const sourceUnlocked=CanonicalSave.create(worlds,maps);
  sourceUnlocked.addLevelFlags(0,1,64);
  const imported=campaignFromRecord(sourceUnlocked,worlds,maps);
  assert.equal(imported.completed[0].includes(0),false);
  assert.equal(unlockedNode(imported,0,maps[0].find(n=>n.level===1)!,maps),true);
  let campaign=newCampaign();
  for(let level=0;level<=8;level++){
    const node=maps[0].find(n=>n.level===level)!;
    assert.equal(unlockedNode(campaign,0,node,maps),true,`Angkor ${level} should be accessible`);
    campaign=finishLevel(campaign,0,level,campaign.resources,0,false,maps);
    const save=campaignRecord(campaign,worlds,maps);
    assert.ok(save.worlds[0].levels[level].flags&2);
    if(level<8)assert.ok(save.worlds[0].levels[level+1].flags&64,`Angkor ${level+1} must carry the source unlock flag`);
    campaign=campaignFromRecord(save,worlds,maps);
  }
  assert.equal(unlockedWorld(campaign,1,maps),true);
  const secret=finishLevel(campaign,0,6,campaign.resources,0,true,maps);
  const restored=campaignFromRecord(campaignRecord(secret,worlds,maps),worlds,maps);
  assert.equal(unlockedNode(restored,0,maps[0].find(n=>n.level===9)!,maps),true);
});
