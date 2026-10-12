import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { useExtractedResources } from '../tools/routes/engineResources.ts';
import { loadRouteResources } from '../tools/routes/loadResources.ts';
import type { CoreRouteFixture } from '../tools/routes/CoreRoute.ts';
import { Simulation } from '../src/core/Simulation.ts';
import { unlockedNode, validateCampaign } from '../src/core/Campaign.ts';
import type { Campaign } from '../src/core/Campaign.ts';
import { CanonicalSave } from '../src/platform/CanonicalSave.ts';
import { campaignFromRecord, campaignRecord } from '../src/platform/CanonicalCampaign.ts';

useExtractedResources();
const {worlds,maps}=loadRouteResources();
const routeRoot=new URL('fixtures/core-routes/',import.meta.url);
/** The certified Angkor routes in campaign order, after the tutorial. */
const CHAIN=['0-angkor-01-normal','0-angkor-02-normal','0-angkor-03-normal','0-angkor-04-hammer-normal',
  '0-angkor-05-normal','0-angkor-06-normal','0-angkor-07-normal','0-angkor-08-normal'];
const fixture=(name:string)=>JSON.parse(readFileSync(new URL(`${name}.json`,routeRoot),'utf8')) as CoreRouteFixture;
const available=['0-angkor-intro',...CHAIN,'0-angkor-09-boss-crystal'].every(n=>existsSync(new URL(`${n}.json`,routeRoot)));

function play(sim:Simulation,f:CoreRouteFixture){for(const run of f.controls)for(let i=0;i<run.ticks;i++)sim.step(run);}
/** What main.ts finishStage does once the original reaches its world map. */
function adopt(sim:Simulation){
  sim.takeMapNotice();
  return validateCampaign(campaignFromRecord(new CanonicalSave(sim.record()),worlds,maps),maps);
}

test('New Game reaches the Angkor crystal through the tutorial, Angkor 1-8 and the boss, carrying the record between stages',{skip:!available},()=>{
  const intro=new Simulation(worlds[0].levels[13],{world:0,level:13});
  play(intro,fixture('0-angkor-intro'));
  assert.equal(intro.status,'complete');
  let campaign:Campaign=adopt(intro);
  // As main.ts: the session's stage-load count carries from stage to stage (record byte 12 counts up to 3).
  let loads=intro.stageLoads,expected=1;
  assert.equal(intro.record()[12],1);
  assert.equal(campaign.resources.weaponTier,0);
  for(const [index,name] of CHAIN.entries()){
    const route=fixture(name);assert.equal(route.level,index);
    const record=campaignRecord(campaign,worlds,maps).export();
    const sim=new Simulation(worlds[0].levels[index],{world:0,level:index,record,stageLoads:loads});loads=sim.stageLoads;
    // The tutorial's compass stays in the HUD for the rest of the session (cGame.field_179).
    assert.equal(sim.game.field_179,true,name);
    // method_78: the count restarts at 1 on multiples of 8 (it also picks the loading tip), then counts this load.
    expected=(expected%8===0?1:expected)+1;
    assert.equal(sim.stageLoads,expected,name);assert.equal(sim.record()[12],Math.min(expected,3),`${name}: stage loads in record byte 12`);
    play(sim,route);
    assert.equal(sim.status,'finishing',name);assert.equal(sim.result,'exit',name);
    // The original results screen waits for the action key, then opens its world map.
    for(let i=0;i<600&&(sim.status as string)!=='complete';i++)sim.step({direction:0,action:i%20===10});
    assert.equal(sim.status as string,'complete',name);
    const before=campaign.resources.diamonds;
    campaign=adopt(sim);
    assert.ok(campaign.completed[0].includes(index),name);
    assert.equal(campaign.resources.diamonds,before+route.expected.diamonds,`${name} adds its stage diamonds`);
    // Angkor 4's chest holds the hammer; every later stage starts with it from the record.
    assert.equal(campaign.resources.weaponTier,index>=3?1:0,name);
  }
  const boss=maps[0].find(n=>n.level===8)!;
  assert.ok(unlockedNode(campaign,0,boss,maps),'the Angkor boss stage is open');
  // Angkor 9: the crystal, then the original seal (state 27), where action keeps Angkor selected.
  const sim=new Simulation(worlds[0].levels[8],{world:0,level:8,record:campaignRecord(campaign,worlds,maps).export(),stageLoads:loads});
  play(sim,fixture('0-angkor-09-boss-crystal'));
  assert.equal(sim.status,'finishing');assert.equal(sim.result,'crystal');
  for(let i=0;i<2000&&(sim.status as string)!=='complete';i++)sim.step({direction:0,action:i%20===10});
  assert.equal(sim.status as string,'complete');assert.equal(sim.mapWorld,0);
  const save=new CanonicalSave(sim.record());
  assert.equal(save.worldFlags&1,1,'the Angkor crystal is in the record');
  campaign=adopt(sim);
  assert.ok(campaign.completed[0].includes(8));
});

const SECRETS=[['0-angkor-07-secret-hook',9],['0-angkor-08-secret-ice',12],['1-bavaria-04-secret',10],['1-bavaria-07-secret',11],['2-tibet-02-secret',11],['2-tibet-05-secret',12]] as const;
test('in a campaign, each secret exit unlocks its secret stage on the map (method_131 reads the world map)',{skip:!SECRETS.every(([n])=>existsSync(new URL(`${n}.json`,routeRoot)))},()=>{
  for(const [name,target] of SECRETS){
    const route=fixture(name),w=route.world,l=route.level;
    const save=CanonicalSave.create(worlds,maps);save.setResources(route.start.lives,route.start.diamonds,route.start.redDiamonds,route.start.weaponTier as 0|1|2|8);
    save.unlockThrough(w,l);if(w>0)save.unlockWorld(w as 1|2);
    const sim=new Simulation(worlds[w].levels[l],{world:w,level:l,record:save.export()});
    play(sim,route);
    assert.equal(sim.result,'secret-exit',name);
    for(let i=0;i<1500&&(sim.status as string)!=='complete';i++)sim.step({direction:0,action:i%20===10});
    const campaign=adopt(sim),node=maps[w].find(n=>n.level===target)!;
    assert.ok(campaign.secretUnlocked[w].includes(target),`${name} reveals stage ${target}`);
    assert.ok(unlockedNode(campaign,w,node,maps),`${name} opens stage ${target}`);
  }
});

test('after a crystal, the shop on the original seal can be left with the right soft key',{skip:!existsSync(new URL('0-angkor-09-boss-crystal.json',routeRoot))},()=>{
  const route=fixture('0-angkor-09-boss-crystal');
  const save=CanonicalSave.create(worlds,maps);save.setResources(12,99,2,1);save.unlockThrough(0,8);
  const sim=new Simulation(worlds[0].levels[8],{world:0,level:8,record:save.export()});
  play(sim,route);
  const idle=(n:number)=>{for(let i=0;i<n;i++)sim.step({direction:0,action:false});};
  const tap=(frame:Partial<{direction:0|1|2|3|4;action:boolean;back:boolean}>)=>{sim.step({direction:0,action:false,...frame});idle(15);};
  for(let i=0;i<400&&sim.gameState!==27;i++)idle(1);
  // The crystal flies into the seal first (method_138, 2 px per painted frame); input waits for it.
  assert.equal(sim.gameState,27,'the original seal');idle(150);
  // Angkor -> Tibet item (down) -> shop item (right), then select: method_75 opens the shop (18, then 25).
  tap({direction:3});tap({direction:2});tap({action:true});idle(40);
  assert.equal(sim.gameState,25,'the original shop');
  tap({back:true});idle(40);
  assert.equal(sim.gameState,27,'back on the seal');
  // Shop -> Tibet (left) -> Angkor (up), then select: the original opens the Angkor map.
  tap({direction:4});tap({direction:1});
  for(let i=0;i<600&&(sim.status as string)!=='complete';i++)sim.step({direction:0,action:i%20===10});
  assert.equal(sim.status as string,'complete');assert.equal(sim.mapWorld,0);
});

test('a game over goes through the original screen and costs 500 diamonds, with five lives again',()=>{
  const save=CanonicalSave.create(worlds,maps);save.setResources(0,600,3,1);save.unlockThrough(0,2);
  const sim=new Simulation(worlds[0].levels[2],{world:0,level:2,record:save.export()});
  for(let i=0;i<80;i++)sim.step({direction:0,action:false});
  for(let i=0;i<30;i++)sim.step({direction:2,action:false}); // off the entrance checkpoint
  for(let i=0;i<3;i++)sim.step({direction:0,action:false,reset:true}); // * away from a checkpoint costs a life
  for(let i=0;i<300&&sim.status==='playing';i++)sim.step({direction:0,action:false});
  assert.equal(sim.status,'dead');assert.equal(sim.result,'game-over');assert.equal(sim.gameState,12);
  for(let i=0;i<800&&(sim.status as string)!=='complete';i++)sim.step({direction:0,action:i%20===10});
  assert.equal(sim.status as string,'complete');assert.equal(sim.mapWorld,0);
  const campaign=adopt(sim);
  assert.equal(campaign.resources.lives,5);assert.equal(campaign.resources.diamonds,100);
});

test('the tenth red diamond announces Bavaria on the map and records the world (method_249(5), method_74)',{skip:!existsSync(new URL('0-angkor-06-normal.json',routeRoot))},()=>{
  const route=fixture('0-angkor-06-normal');
  const save=CanonicalSave.create(worlds,maps);save.setResources(route.start.lives,route.start.diamonds,9,1);save.unlockThrough(0,5);
  const sim=new Simulation(worlds[0].levels[5],{world:0,level:5,record:save.export()});
  play(sim,route);
  for(let i=0;i<600&&(sim.status as string)!=='complete';i++)sim.step({direction:0,action:i%20===10});
  assert.equal(sim.status as string,'complete');
  const notice=sim.takeMapNotice();
  assert.equal(notice.world,1);
  const campaign=validateCampaign(campaignFromRecord(new CanonicalSave(sim.record()),worlds,maps),maps);
  assert.equal(campaign.resources.redDiamonds,10);assert.equal(campaign.worldAccess?.[1],true);
});
