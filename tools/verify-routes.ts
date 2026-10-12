/**
 * Replays every certified route in tests/fixtures/core-routes on the generated core and checks
 * its recorded outcome. Usage: node tools/verify-routes.ts [--jvm] [--write-report]
 *   --jvm           also replay each route on the recompiled Java (needs the reference clone and a JDK)
 *   --write-report  regenerate docs/PLAYABILITY.md and docs/PLAYABILITY.json
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { CORE_REVISION } from '../src/core/s700/Engine.ts';
import { playCoreRoute, seedRobustness, CORE_SOURCE } from './routes/CoreRoute.ts';
import type { CoreRouteFixture } from './routes/CoreRoute.ts';
import { useExtractedResources } from './routes/engineResources.ts';
import { loadRouteResources } from './routes/loadResources.ts';
import { oracleDigest, runJavaOracle } from './routes/JavaOracle.ts';
import { buildPlayabilityReport, renderPlayabilityReport, stageName } from './routes/PlayabilityReport.ts';
import type { CertifiedRoute } from './routes/PlayabilityReport.ts';

const args=process.argv.slice(2);
useExtractedResources();
const {worlds,maps}=loadRouteResources();
const root=fileURLToPath(new URL('../tests/fixtures/core-routes/',import.meta.url));
const previous=(()=>{try{return (JSON.parse(readFileSync(new URL('../docs/PLAYABILITY.json',import.meta.url),'utf8')).routes??[]) as CertifiedRoute[];}catch{return [];}})();
const routes:CertifiedRoute[]=[];let failures=0;
// A cached JVM result also depends on the oracle (driver, stubs, JVM patches).
const oracle=(()=>{try{return oracleDigest();}catch{return 'unavailable';}})();
// Route labels come from the stage inventory (tutorial, secret and boss stages are named as in the report).
const entries=buildPlayabilityReport(worlds,maps,[]).maps;
for(const file of readdirSync(root).filter(n=>n.endsWith('.json')).sort()){
  const fixture=JSON.parse(readFileSync(root+file,'utf8')) as CoreRouteFixture;
  // A JVM result is reused only for the same route on the same core; otherwise it must be rerun (--jvm).
  const digest=createHash('sha256').update(JSON.stringify({engine:CORE_REVISION,source:CORE_SOURCE,oracle,start:fixture.start,controls:fixture.controls,expected:fixture.expected})).digest('hex').slice(0,16);
  let jvm:CertifiedRoute['jvm']=previous.find(r=>r.file===file&&r.digest===digest)?.jvm??'unchecked';
  try{
    const route=playCoreRoute(fixture),outcome=route.outcome();
    if(JSON.stringify(outcome)!==JSON.stringify(fixture.expected))throw new Error(`outcome ${JSON.stringify(outcome)} differs`);
    if(route.result==='playing'||route.result==='game-over')throw new Error('route does not complete the stage');
    if(args.includes('--jvm')){
      const java=runJavaOracle({world:fixture.world,level:fixture.level,initial:{...fixture.start,health:fixture.start.maxHealth} as any,diving:!!fixture.start.diving,controls:fixture.controls});
      // The JVM must leave state 1 for the same state on the same tick and observe the same values there.
      // Errors after the stage ends (the original map loading on stubbed APIs) do not affect the outcome.
      const e=fixture.expected,row=java.rows[e.ticks];
      const same=!!row&&java.states.includes(`${e.ticks},1,${e.gameState}`)&&
        (['gameState','x','y','health','lives','diamonds','redDiamonds','goldKeys','silverKeys'] as const).every(k=>row[k]===e[k]);
      jvm=same?'agrees':'disagrees';
      if(!same)throw new Error(`the recompiled Java disagrees: states ${java.states.join(' ')}; row ${JSON.stringify(row)}${java.error?`; error ${java.error}`:''}`);
    }
    // Routes that draw random numbers are replayed with other seeds: on a handset the seed is the clock.
    const seeds=seedRobustness(fixture);
    const random=seeds.draws?{randomDraws:seeds.draws,seedsTried:seeds.seeds,seedsCompleted:seeds.completed}:{};
    routes.push({file,world:fixture.world,level:fixture.level,result:outcome.result,ticks:outcome.ticks,start:fixture.start,jvm,digest,...random,provenance:fixture.provenance});
    console.log(`${stageName(entries.find(m=>m.world===fixture.world&&m.level===fixture.level)??fixture)}: ${outcome.result} in ${outcome.ticks} ticks${jvm==='unchecked'?'':` · JVM ${jvm}`}${seeds.draws?` · ${seeds.draws} random draws, completes with ${seeds.completed}/${seeds.seeds} other seeds`:''} (${file})`);
  }catch(e){failures++;console.log(`FAILED ${file}: ${(e as Error).message}`);}
}
const report=buildPlayabilityReport(worlds,maps,routes);
console.log(JSON.stringify(report.totals));
if(args.includes('--write-report')){
  writeFileSync(new URL('../docs/PLAYABILITY.md',import.meta.url),renderPlayabilityReport(report,CORE_SOURCE));
  writeFileSync(new URL('../docs/PLAYABILITY.json',import.meta.url),JSON.stringify({source:CORE_SOURCE,totals:report.totals,routes,maps:report.maps.map(m=>({...m,goals:m.goals.map(g=>({...g,routes:g.routes.map(r=>r.file)}))}))},null,1)+'\n');
}
if(failures)process.exitCode=1;
