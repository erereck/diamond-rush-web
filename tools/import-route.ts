/**
 * Imports control-only routes recorded elsewhere (for example with an older build of the core) into
 * tests/fixtures/core-routes. Each route is replayed on the current generated core and must reach
 * exactly its recorded outcome; the fixture is then rewritten with the current engine and source ids.
 * Usage: node tools/import-route.ts <route.json>... [--force]   (--force overwrites existing fixtures)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { CORE_SOURCE, playCoreRoute, validateStart } from './routes/CoreRoute.ts';
import { CORE_REVISION } from '../src/core/s700/Engine.ts';
import type { CoreRouteFixture } from './routes/CoreRoute.ts';
import { useExtractedResources } from './routes/engineResources.ts';

const args=process.argv.slice(2),force=args.includes('--force');
useExtractedResources();
let failures=0;
for(const file of args.filter(a=>!a.startsWith('--'))){
  try{
    const route=JSON.parse(readFileSync(file,'utf8')) as CoreRouteFixture;
    validateStart(route.start);
    if(route.world!==route.start.world||route.level!==route.start.level)throw new Error('stage and start disagree');
    if(!route.controls.every(r=>Object.keys(r).every(k=>['ticks','direction','action','reset'].includes(k))))throw new Error('controls contain more than ticks/direction/action/reset');
    if(typeof route.provenance!=='string'||route.provenance.length<40)throw new Error('provenance must describe the route and its start values');
    if(route.version!==2||route.kind!=='stage')throw new Error('not a version 2 stage route');
    // The replay below, not the recorded ids, decides whether the route holds on this core.
    const played=playCoreRoute({...route,engine:CORE_REVISION,source:CORE_SOURCE});
    const fixture=played.fixture(route.provenance);
    if(JSON.stringify(fixture.expected)!==JSON.stringify(route.expected))throw new Error(`current core reaches ${JSON.stringify(fixture.expected)}`);
    if(played.result==='playing'||played.result==='game-over')throw new Error('route does not complete the stage');
    const target=new URL(`../tests/fixtures/core-routes/${basename(file)}`,import.meta.url);
    if(existsSync(target)&&!force)throw new Error('fixture exists (use --force)');
    writeFileSync(target,JSON.stringify(fixture,null,1)+'\n');
    console.log(`imported ${basename(file)}: ${fixture.expected.result} in ${fixture.expected.ticks} ticks`);
  }catch(e){failures++;console.log(`REJECTED ${file}: ${(e as Error).message}`);}
}
if(failures)process.exitCode=1;
