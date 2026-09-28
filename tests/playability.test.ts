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

test('New Game completes intro and Angkor 1–2 with carried resources, rewards and save reloads',()=>{
  const fixture=JSON.parse(readFileSync(new URL('fixtures/campaign-routes/angkor-start.json',import.meta.url),'utf8')) as CampaignRouteFixture;
  const result=verifyCampaignRoute(fixture);
  assert.deepEqual(result.completed,[[0,1],[],[]]);
  assert.deepEqual(result.unlocked,[[0,1,2],[],[]]);
  assert.deepEqual(result.resources,{diamonds:10,redDiamonds:0,lives:7,health:4,weaponTier:0});
  assert.deepEqual(result.stages[2].initial,{diamonds:0,redDiamonds:0,lives:6,health:3,weaponTier:0});
  assert.deepEqual(result.opened,[{world:0,level:0,cells:[]},{world:0,level:1,cells:[426]}]);
  assert.deepEqual(result.awards,[[32,32],[],[]]);
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
    assert.notEqual(level.status,'verified','no ordinary-exit replay may certify its secret exit');
  }
  assert.equal(report.levels.find(level=>level.world===2&&level.level===10)!.status,'verified');
  assert.equal(report.counts.verifiedBosses,3);
  assert.equal(report.counts.completedRoutes,6);
  assert.equal(report.counts.campaignPrefixes,1);
  assert.equal(report.counts.campaignPrefixStages,2);
  assert.deepEqual(JSON.parse(readFileSync(new URL('../docs/PLAYABILITY.json',import.meta.url),'utf8')),report);
  assert.equal(readFileSync(new URL('../docs/PLAYABILITY.md',import.meta.url),'utf8'),renderPlayabilityReport(report));
});
