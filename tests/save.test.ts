import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CanonicalSave } from '../src/platform/CanonicalSave.ts';
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
