import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { readFileSync } from 'node:fs';
import { ENGINE_REVISION } from '../../src/core/Compatibility.ts';
import { newCampaign, unlockedNode, validateCampaign } from '../../src/core/Campaign.ts';
import { campaignFromRecord, campaignRecord, campaignStageStart, completeCampaignLevel } from '../../src/platform/CanonicalCampaign.ts';
import { CanonicalSave } from '../../src/platform/CanonicalSave.ts';
import { completedRoute, playRoute } from './RouteRunner.ts';
import type { RouteFixture } from './RouteRunner.ts';
import { loadRouteResources } from './loadResources.ts';

export interface CampaignRouteFixture {
  version:1;engine:string;scope:'new-save-prefix';routes:string[];expected:ReturnType<typeof playCampaignRoute>;
}
/** Starts with New Game's resources, then follows only unlocked first visits.
 * No fixture may override campaign resources, map flags or RMS chest records. */
export function playCampaignRoute(routes:string[]){
  if(!Array.isArray(routes)||routes.length<2||routes.length>41||routes.some(file=>!/^[-a-z0-9]+\.json$/.test(file)))
    throw new Error('Invalid campaign route list');
  const resources=loadRouteResources();let campaign=newCampaign();
  const stages=[];
  for(const [index,file] of routes.entries()){
    const fixture=JSON.parse(readFileSync(new URL(`../../tests/fixtures/routes/${file}`,import.meta.url),'utf8')) as RouteFixture;
    if(index===0){
      if(fixture.kind!=='tutorial'||fixture.world!==0||fixture.level!==13)throw new Error('New Game must finish the introduction first');
      const intro=playRoute(fixture,resources);
      if(!completedRoute(intro))throw new Error('Introduction not completed');
      // main.ts opens the fresh campaign map when the introduction ends.
      // Its lesson diamonds and lives belong to the tutorial simulation.
      stages.push({file,world:fixture.world,level:fixture.level,initial:fixture.initial,outcome:intro.outcome(),awards:0});
      continue;
    }
    const {world,level}=fixture,node=resources.maps[world]?.find(node=>node.level===level);
    if(fixture.kind!=='stage'||!node||!unlockedNode(campaign,world,node,resources.maps))throw new Error(`${file}: stage is locked`);
    if(campaign.completed[world].includes(level))throw new Error('Campaign prefix only accepts first visits');
    const {openedChests,...initial}=campaignStageStart(campaign,resources.worlds,resources.maps,world,level);
    if(openedChests?.length)throw new Error('New campaign stage contains consumed chests');
    const runner=playRoute({...fixture,initial},resources);
    if(!completedRoute(runner))throw new Error(`${file}: campaign resources do not complete the stage`);
    campaign=completeCampaignLevel(campaign,runner.sim,resources.worlds,resources.maps);
    stages.push({file,world,level,initial,outcome:runner.outcome(),awards:campaign.awards[world][level]});
    // The game saves JSON on the map; verify each actual stage after a reload.
    const restored=validateCampaign(JSON.parse(JSON.stringify(campaign)),resources.maps);
    if(!isDeepStrictEqual(restored,campaign))throw new Error(`${file}: campaign reload changed progress`);
    const record=campaignRecord(restored,resources.worlds,resources.maps);
    const fromRecord=validateCampaign(campaignFromRecord(new CanonicalSave(record.export()),resources.worlds,resources.maps),resources.maps);
    if(!isDeepStrictEqual(campaignRecord(fromRecord,resources.worlds,resources.maps).export(),record.export()))
      throw new Error(`${file}: RMS round-trip changed progress`);
    // RMS stores maximum health rather than the visit's remaining health.
    // Continue the route with the actual JSON reload; check the RMS import's
    // transferable resources, completed stages and navigable map separately.
    for(const key of ['diamonds','redDiamonds','lives','weaponTier'] as const)
      if(fromRecord.resources[key]!==restored.resources[key])throw new Error(`${file}: RMS import changed ${key}`);
    if(!isDeepStrictEqual(fromRecord.completed,restored.completed))throw new Error(`${file}: RMS import changed completed stages`);
    for(let world=0;world<3;world++)for(const node of resources.maps[world])
      if(unlockedNode(fromRecord,world,node,resources.maps)!==unlockedNode(restored,world,node,resources.maps))
        throw new Error(`${file}: RMS import changed a map unlock`);
    campaign=restored;
  }
  const record=campaignRecord(campaign,resources.worlds,resources.maps);
  return {stages,completed:campaign.completed,awards:campaign.awards,resources:campaign.resources,
    unlocked:resources.maps.map((nodes,world)=>nodes.filter(node=>unlockedNode(campaign,world,node,resources.maps)).map(node=>node.level)),
    opened:stages.slice(1).map(stage=>({world:stage.world,level:stage.level,
      cells:campaignStageStart(campaign,resources.worlds,resources.maps,stage.world,stage.level).openedChests??[]})),
    recordHash:createHash('sha256').update(record.export()).digest('hex')};
}
export function verifyCampaignRoute(fixture:CampaignRouteFixture){
  if(!fixture||fixture.version!==1||fixture.engine!==ENGINE_REVISION||fixture.scope!=='new-save-prefix')throw new Error('Unsupported campaign route');
  if(Object.keys(fixture).some(key=>!['version','engine','scope','routes','expected'].includes(key)))throw new Error('Campaign routes cannot inject progress');
  const result=playCampaignRoute(fixture.routes);
  if(!isDeepStrictEqual(result,fixture.expected))throw new Error('Campaign route outcome changed');
  return result;
}
