import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { RouteRunner, completedRoute, playRoute } from '../tools/routes/RouteRunner.ts';
import type { RouteFixture } from '../tools/routes/RouteRunner.ts';
import { buildPlayabilityReport, renderPlayabilityReport } from '../tools/routes/PlayabilityReport.ts';
import { loadRouteResources } from '../tools/routes/loadResources.ts';
import { restoreReplay, validateReplay } from '../src/platform/Session.ts';

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
  assert.equal(report.levels.find(level=>level.world===2&&level.level===10)!.status,'attempted');
  assert.equal(report.counts.verifiedBosses,2);
  assert.equal(report.counts.completedRoutes,4);
  assert.deepEqual(JSON.parse(readFileSync(new URL('../docs/PLAYABILITY.json',import.meta.url),'utf8')),report);
  assert.equal(readFileSync(new URL('../docs/PLAYABILITY.md',import.meta.url),'utf8'),renderPlayabilityReport(report));
});
