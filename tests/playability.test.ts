import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { RouteRunner, completedRoute, playRoute } from '../tools/routes/RouteRunner.ts';
import type { RouteFixture } from '../tools/routes/RouteRunner.ts';
import { buildPlayabilityReport, renderPlayabilityReport } from '../tools/routes/PlayabilityReport.ts';
import { loadRouteResources } from '../tools/routes/loadResources.ts';
import { restoreReplay, validateReplay } from '../src/platform/Session.ts';
import { playCampaignRoute, verifyCampaignRoute } from '../tools/routes/CampaignRoute.ts';
import type { CampaignRouteFixture } from '../tools/routes/CampaignRoute.ts';
import { newCampaign, unlockedNode, validateCampaign } from '../src/core/Campaign.ts';
import { campaignFromRecord, campaignRecord, campaignStageStart, completeCampaignLevel } from '../src/platform/CanonicalCampaign.ts';
import { CanonicalSave } from '../src/platform/CanonicalSave.ts';

const resources=loadRouteResources();
const root=new URL('fixtures/routes/',import.meta.url);
const fixtures=readdirSync(root).filter(name=>name.endsWith('.json')).sort().map(name=>({
  name,fixture:JSON.parse(readFileSync(new URL(name,root),'utf8')) as RouteFixture
}));
for(const {name,fixture} of fixtures)test(`control-only completion from spawn: ${name}`,()=>{
  const runner=playRoute(fixture,resources);
  assert.equal(completedRoute(runner),true);
  assert.deepEqual(runner.outcome(),fixture.expected);
  if(fixture.kind==='stage'){
    // Rebuild the resulting simulation with the regular input replay too.
    // The tutorial's automatic entrance is part of IntroSequence, so its
    // control fixture must be replayed through that constructor instead.
    const replay=validateReplay(runner.sim.replay(),resources.worlds);
    assert.deepEqual(restoreReplay(replay,resources.worlds).snapshot(),runner.sim.snapshot());
  }else{
    assert.deepEqual(runner.demos,[29,10,11,13,15,16,17,28]);
    assert.deepEqual(playRoute(fixture,resources).sim.snapshot(),runner.sim.snapshot());
  }
});

test('route files cannot inject map edits, positions, scripted movement or consumed chests',()=>{
  const original=fixtures.find(f=>f.fixture.kind==='stage')!.fixture;
  for(const extra of [{scripted:true},{demoEdits:[{cell:0,object:255}]},{scriptedView:{x:0,y:0,follow:true}},{player:{x:22,y:9}}]){
    const fixture=structuredClone(original);Object.assign(fixture.controls[0],extra);
    assert.throws(()=>playRoute(fixture,resources),/Invalid route run length/);
  }
  for(const extra of [{openedChests:[1]},{x:22},{goldKeys:99}]){
    const fixture=structuredClone(original);Object.assign(fixture.initial,extra);
    assert.throws(()=>playRoute(fixture,resources),/Invalid route initial resources/);
  }
  const stale=structuredClone(original);stale.levelFingerprint='00000000';
  assert.throws(()=>playRoute(stale,resources),/fingerprint/);
  const tooLong=structuredClone(original);tooLong.controls[0].ticks=144001;
  assert.throws(()=>playRoute(tooLong,resources),/run length/);
});

test('boss certification rejects a crystal route without a completed boss defeat',()=>{
  const runner=new RouteRunner(resources,0,8,{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:1});
  // Exercise the certification guard independently from the three/four-hit
  // fixtures; merely reaching a complete status is insufficient evidence.
  runner.sim.status='complete';
  assert.equal(completedRoute(runner),false);
  runner.sim.boss!.health=0;
  assert.equal(completedRoute(runner),false);
  runner.bossCleared=true;
  assert.equal(completedRoute(runner),true);
});

test('all three boss routes contain their real hits and Tibet uses both bridge states, freezing and hook pulls',()=>{
  for(const {fixture} of fixtures.filter(f=>f.fixture.expected.bossHealth!==null)){
    const runner=playRoute(fixture,resources);
    assert.equal(runner.eventCounts['boss-hurt'],[3,4,5][fixture.world]);
    assert.equal(runner.eventCounts['boss-defeated'],1);
    assert.equal(runner.eventCounts['boss-clear'],1);
    if(fixture.world===2){
      assert.equal(runner.eventCounts['tibet-bridge'],5);
      assert.ok(runner.eventCounts.freeze>=5);
      assert.ok(runner.eventCounts['hook-pull']>=5);
      assert.deepEqual(runner.demos,[35]);
      // method_322 requests 31, but that ID is absent from the canonical
      // demo.f pack. Do not invent dialogue or mistake the entrance for it.
      assert.equal(runner.eventCounts['demo:31'],1);
      assert.equal(resources.scripts.has(31),false);
    }
  }
});

test('New Game completes Angkor and its boss with campaign resources and save reloads',()=>{
  const fixture=JSON.parse(readFileSync(new URL('fixtures/campaign-routes/angkor-start.json',import.meta.url),'utf8')) as CampaignRouteFixture;
  const result=verifyCampaignRoute(fixture);
  assert.deepEqual(result.completed,[[0,1,2,3,4,5,6,7,8],[],[]]);
  assert.deepEqual(result.unlocked,[[0,1,2,3,4,5,6,7,8],[],[]]);
  assert.deepEqual(result.resources,{diamonds:82,redDiamonds:1,lives:12,health:1,weaponTier:1});
  assert.deepEqual(result.stages[2].initial,{diamonds:0,redDiamonds:0,lives:6,health:3,weaponTier:0});
  assert.deepEqual(result.stages[4].initial,{diamonds:21,redDiamonds:0,lives:8,health:3,weaponTier:0});
  assert.equal(result.stages[4].outcome.weaponTier,1);
  assert.equal(result.stages[4].outcome.retries,1);
  assert.deepEqual(result.opened,[{world:0,level:0,cells:[]},{world:0,level:1,cells:[426]},
    {world:0,level:2,cells:[409,470,596]},{world:0,level:3,cells:[379,746]},{world:0,level:4,cells:[372,1016,1098]},
    {world:0,level:5,cells:[172]},{world:0,level:6,cells:[306,552]},
    {world:0,level:7,cells:[334,679,900,1181]},{world:0,level:8,cells:[237]}]);
  assert.deepEqual(result.awards,[[32,32,32,0,0,40,32,0,60],[],[]]);
  assert.deepEqual(result.stages.at(-1)?.initial,{diamonds:82,redDiamonds:1,lives:8,health:1,weaponTier:1});
  assert.equal(result.stages.at(-1)?.outcome.bossCleared,true);
});

test('Angkor boss dialogue, result, world notice flags and Bavaria spawn stay in sequence at ten red gems',()=>{
  const fixture=fixtures.find(f=>f.name==='angkor-boss-crystal.json')!.fixture;
  const runner=new RouteRunner(resources,0,8,{...fixture.initial,redDiamonds:10});
  for(const run of fixture.controls)for(let tick=0;tick<run.ticks;tick++)runner.step({direction:run.direction,action:run.action,...(run.reset?{reset:true}:{})});
  assert.equal(runner.sim.status,'complete');
  assert.deepEqual(runner.demos,[33,32]);
  assert.equal(runner.eventCounts['boss-defeated'],1);
  const campaign=newCampaign();campaign.completed[0]=[0,1,2,3,4,5,6,7];campaign.selected=8;
  campaign.resources={...runner.sim.initial};
  const saved=completeCampaignLevel(campaign,runner.sim,resources.worlds,resources.maps);
  assert.deepEqual(saved.worldAccess,[true,true,false]);
  assert.equal(saved.resources.redDiamonds,10);
  const record=new CanonicalSave(Uint8Array.from(saved.canonicalRecord!));
  assert.equal(record.worldFlags&9,9,'Angkor crystal and Bavaria notice bits are saved');
  const restored=campaignFromRecord(record,resources.worlds,resources.maps);
  assert.equal(restored.world,1);
  const start=campaignStageStart(restored,resources.worlds,resources.maps,1,0);
  const bavaria=new RouteRunner(resources,1,0,start);
  assert.deepEqual([bavaria.sim.player.x,bavaria.sim.player.y],[2,19]);
  assert.equal(bavaria.sim.redDiamonds,10);
});

test('Angkor 3 opens both key doors and Angkor 4 uses weighted plates before obtaining and using its hammer',()=>{
  const third=playRoute(fixtures.find(f=>f.name==='angkor-03-normal.json')!.fixture,resources);
  assert.equal(third.eventCounts['silver-gate'],1);assert.equal(third.eventCounts['gold-gate'],1);
  const fourth=playRoute(fixtures.find(f=>f.name==='angkor-04-hammer-normal.json')!.fixture,resources);
  assert.equal(fourth.sim.initial.weaponTier,0);
  assert.equal(fourth.eventCounts.weapon,1);assert.equal(fourth.eventCounts['demo:22'],1);
  assert.equal(fourth.sim.weaponTier,1);assert.ok(fourth.eventCounts['gate-open']>=2);
  assert.ok(fourth.eventCounts.hammer>0);assert.ok(fourth.eventCounts.break>0);
});

test('campaign routes cannot skip locks, introduction, or inject saved resources',()=>{
  assert.throws(()=>playCampaignRoute(['angkor-introduction.json','angkor-boss-crystal.json']),/locked/);
  assert.throws(()=>playCampaignRoute(['angkor-01-normal.json','angkor-02-normal.json']),/introduction/);
  const fixture=JSON.parse(readFileSync(new URL('fixtures/campaign-routes/angkor-start.json',import.meta.url),'utf8')) as CampaignRouteFixture;
  Object.assign(fixture,{resources:{weaponTier:8,lives:99}});
  assert.throws(()=>verifyCampaignRoute(fixture),/inject progress/);
});

test('the playability inventory covers all maps and every alternative exit without promoting attempts',()=>{
  const report=buildPlayabilityReport();
  const pairs=report.levels.map(level=>`${level.world}/${level.level}`);
  assert.equal(new Set(pairs).size,41);
  assert.equal(report.counts.playableStages,40);
  assert.equal(report.counts.secretStages,10);
  assert.equal(report.counts.goals,47);
  for(const level of report.levels.filter(level=>level.goals.some(goal=>goal.kind==='secret')&&level.kind!=='secret')){
    assert.equal(level.goals.length,2);
    if(level.status==='verified')assert.deepEqual(new Set(level.evidence.map(route=>route.goal)),new Set(['normal','secret']));
  }
  assert.equal(report.levels.find(level=>level.world===2&&level.level===10)!.status,'verified');
  assert.equal(report.counts.verifiedBosses,3);
  assert.equal(report.counts.completedRoutes,14);
  assert.equal(report.counts.verifiedMaps,12);
  assert.equal(report.levels.find(level=>level.world===0&&level.level===7)!.status,'verified');
  const seventh=report.levels.find(level=>level.world===0&&level.level===6)!;
  assert.equal(seventh.status,'verified');
  assert.equal(seventh.pendingAttempts[0]?.file,'tests/fixtures/route-attempts/angkor-07-secret-hook-plate.json');
  assert.equal(report.counts.campaignPrefixes,1);
  assert.equal(report.counts.campaignPrefixStages,9);
  assert.deepEqual(JSON.parse(readFileSync(new URL('../docs/PLAYABILITY.json',import.meta.url),'utf8')),report);
  assert.equal(readFileSync(new URL('../docs/PLAYABILITY.md',import.meta.url),'utf8'),renderPlayabilityReport(report));
});

test('Angkor 5 uses both weighted doors and defeats its red snake before collecting the exit key',()=>{
 const runner=playRoute(fixtures.find(f=>f.name==='angkor-05-normal.json')!.fixture,resources);
 assert.equal(runner.sim.initial.weaponTier,1);assert.equal(runner.eventCounts['riddle-solved'],1);assert.equal(runner.sim.riddles.remaining[0],0);assert.ok(runner.eventCounts.hammer>=3);assert.equal(runner.eventCounts['gold-gate'],1);assert.equal(runner.sim.exitObject,5);assert.equal(runner.sim.retries,1);
});

test('Angkor 6 crosses the falling-stone shaft, checkpoint and chest before exiting',()=>{
 const runner=playRoute(fixtures.find(f=>f.name==='angkor-06-normal.json')!.fixture,resources);
 assert.equal(runner.eventCounts.checkpoint,1);
 assert.equal(runner.eventCounts['chest-reward'],1);
 assert.ok(runner.eventCounts.boulder>=5);
 assert.deepEqual(runner.demos,[3]);
 assert.equal(runner.outcome().redDiamonds,1);
 assert.equal(runner.sim.exitObject,5);
});

test('Angkor 7 weights its plate with a boulder, wins the snake room, obtains the key and exits',()=>{
 const runner=playRoute(fixtures.find(f=>f.name==='angkor-07-normal.json')!.fixture,resources);
 assert.equal(runner.eventCounts['riddle-solved'],1);
 assert.equal(runner.eventCounts['enemy-death'],1);
 assert.ok(runner.eventCounts.boulder>=8);
 assert.equal(runner.eventCounts['gold-gate'],1);
 assert.equal(runner.sim.tile(17,11),0);
 assert.equal(runner.sim.gatePhases[runner.sim.index(19,11)],3);
 assert.equal(runner.sim.exitObject,5);
 assert.equal(runner.sim.retries,0);
});

test('Angkor 7 revisit clears both corridor boulders and opens the secret branch',()=>{
 const runner=playRoute(fixtures.find(f=>f.name==='angkor-07-secret-hook.json')!.fixture,resources);
 assert.equal(completedRoute(runner),true);
 assert.equal(runner.sim.initial.weaponTier,2);
 assert.equal(runner.sim.tile(9,43),0);
 assert.equal(runner.sim.tile(1,42),0);
 assert.equal(runner.sim.gatePhases[runner.sim.index(13,42)],3);
 assert.ok(runner.eventCounts['hook-pull']>=4);
 assert.equal(runner.sim.exitObject,28);
 const revisiting=newCampaign();
 revisiting.completed[0]=[0,1,2,3,4,5,6];
 revisiting.selected=6;
 revisiting.resources={...runner.sim.initial};
 const saved=completeCampaignLevel(revisiting,runner.sim,resources.worlds,resources.maps);
 assert.equal(saved.selected,9);
 assert.deepEqual(saved.secretUnlocked[0],[9]);
 const restored=validateCampaign(campaignFromRecord(campaignRecord(saved,resources.worlds,resources.maps),resources.worlds,resources.maps),resources.maps);
 assert.deepEqual(restored.secretUnlocked[0],[9]);
});

test('Angkor 8 opens both silver locks, defeats the snake room and weights the right gate',()=>{
 const runner=playRoute(fixtures.find(f=>f.name==='angkor-08-normal.json')!.fixture,resources);
 assert.equal(runner.eventCounts['silver-gate'],2);
 assert.equal(runner.eventCounts['riddle-solved'],1);
 assert.ok(runner.eventCounts['enemy-death']>=2);
 assert.equal(runner.sim.riddles.remaining[0],0);
 assert.equal(runner.sim.tile(32,17),0);
 assert.equal(runner.sim.gatePhases[runner.sim.index(34,16)],3);
 assert.equal(runner.eventCounts['gold-gate'],1);
 assert.equal(runner.sim.exitObject,5);
 assert.equal(runner.sim.retries,1);
});

test('Angkor 8 revisit freezes its upper snake onto the plate and exits to the secret branch',()=>{
 const runner=playRoute(fixtures.find(f=>f.name==='angkor-08-secret-ice.json')!.fixture,resources);
 assert.equal(runner.sim.initial.weaponTier,8);
 assert.equal(runner.eventCounts.freeze,1);
 assert.equal(runner.sim.tile(7,4),9);
 assert.equal(runner.sim.gatePhases[runner.sim.index(6,3)],3);
 assert.equal(runner.sim.exitObject,28);
 assert.equal(runner.sim.retries,0);
 const revisiting=newCampaign();
 revisiting.completed[0]=[0,1,2,3,4,5,6];
 revisiting.selected=7;
 revisiting.resources={...runner.sim.initial};
 const saved=completeCampaignLevel(revisiting,runner.sim,resources.worlds,resources.maps);
 assert.equal(saved.selected,12);
 assert.deepEqual(saved.secretUnlocked[0],[12]);
 const secret=resources.maps[0].find(node=>node.level===12)!;
 assert.equal(unlockedNode(saved,0,secret,resources.maps),true);
 const json=validateCampaign(JSON.parse(JSON.stringify(saved)),resources.maps);
 const record=campaignRecord(json,resources.worlds,resources.maps);
 const restored=validateCampaign(campaignFromRecord(new CanonicalSave(record.export()),resources.worlds,resources.maps),resources.maps);
 assert.equal(unlockedNode(restored,0,secret,resources.maps),true);
 assert.deepEqual(restored.secretUnlocked[0],[12]);
});

test('Angkor 7 hook attempt weights the secret door without claiming the exit',()=>{
 const fixture=JSON.parse(readFileSync(new URL('fixtures/route-attempts/angkor-07-secret-hook-plate.json',import.meta.url),'utf8')) as RouteFixture;
 const runner=playRoute(fixture,resources);
 assert.equal(completedRoute(runner),false);
 assert.equal(runner.sim.tile(9,43),0);
 assert.equal(runner.sim.gatePhases[runner.sim.index(13,42)],3);
 assert.ok(runner.eventCounts['hook-pull']>=4);
 assert.equal(runner.sim.exitObject,0);
});
