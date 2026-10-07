import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {smokeAllStages} from '../tools/routes/StageSmoke.ts';
import {loadRouteResources} from '../tools/routes/loadResources.ts';
import {restoreReplay,validateReplay} from '../src/platform/Session.ts';

test('all 40 playable map spawns accept exploratory controls and reproduce exactly from replay',()=>{
  const resources=loadRouteResources(),runs=smokeAllStages();
  assert.equal(runs.length,40);
  assert.equal(new Set(runs.map(({result})=>`${result.world}/${result.level}`)).size,40);
  const expected=JSON.parse(readFileSync(new URL('../docs/STAGE_SMOKE.json',import.meta.url),'utf8'));
  assert.deepEqual(runs.map(({result})=>result),expected.rows);
  for(const {result,runner} of runs){
    const sim=runner.sim;
    assert.ok(result.visited>=1&&result.ticks>0&&result.ticks<=900);
    assert.ok(sim.player.x>=0&&sim.player.x<sim.level.width&&sim.player.y>=0&&sim.player.y<sim.level.height);
    assert.deepEqual(restoreReplay(validateReplay(sim.replay(),resources.worlds),resources.worlds).snapshot(),sim.snapshot(),
      `${result.world}/${result.level} replay drifted`);
  }
});
