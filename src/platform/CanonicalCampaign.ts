import type { WorldDefinition, MapNode } from '../level/LevelParser.ts';
import type { Campaign } from '../core/Campaign.ts';
import { newCampaign, unlockedNode, unlockedWorld } from '../core/Campaign.ts';
import type { Simulation } from '../core/Simulation.ts';
import type { StageStart } from '../core/Simulation.ts';
import { CanonicalSave } from './CanonicalSave.ts';

/** Keeps the original RMS record alongside the web campaign, including unknown bytes. */
export function campaignRecord(c:Campaign,worlds:WorldDefinition[],maps:MapNode[][],stage?:Simulation){
  const save=c.canonicalRecord?new CanonicalSave(Uint8Array.from(c.canonicalRecord)):CanonicalSave.create(worlds,maps);
  if(save.worlds.some((w,i)=>w.levels.length!==worlds[i]?.levels.length))throw new Error('RMS: mapas incompatíveis com a versão S700.');
  const {lives,diamonds,redDiamonds,weaponTier=0}=c.resources;
  save.setResources(lives,diamonds,redDiamonds,weaponTier);
  for(const w of [1,2] as const)if(unlockedWorld(c,w,maps))save.unlockWorld(w);
  for(let w=0;w<3;w++){
    const maxNormal=Math.max(0,...maps[w].filter(n=>n.type===0&&(
      c.completed[w].includes(n.level)||maps[w].some(previous=>c.completed[w].includes(previous.level)&&previous.links.some(link=>link.x===n.x&&link.y===n.y))
    )).map(n=>n.level));
    save.unlockThrough(w,maxNormal);
    for(const level of c.completed[w])save.addLevelFlags(w,level,2);
    // method_252 also sets flag 64 on newly accessible normal stages.
    for(const node of maps[w])if(node.level>0&&unlockedNode(c,w,node,maps))save.addLevelFlags(w,node.level,64);
    for(let level=0;level<c.awards[w].length;level++)if(c.awards[w][level])save.addLevelFlags(w,level,c.awards[w][level]);
  }
  if(stage){
    const {world,index}=stage.level;
    // cGame.method_108 adds this visit's red diamonds to recordData's
    // existing per-level count; revisiting must not erase earlier progress.
    const earned=Math.max(0,stage.redDiamonds-stage.initial.redDiamonds);
    save.setLevelStatus(world,index,Math.min(255,save.worlds[world].levels[index].status+earned));
    for(const cell of stage.opened)if([14,33].includes(worlds[world].levels[index].objects[cell]))
      save.openChest(world,index,cell%stage.level.width,Math.floor(cell/stage.level.width));
  }
  return save;
}

export function campaignStageStart(c:Campaign,worlds:WorldDefinition[],maps:MapNode[][],world:number,level:number):StageStart {
  const save=campaignRecord(c,worlds,maps),record=save.worlds[world]?.levels[level],definition=worlds[world]?.levels[level];
  if(!record||!definition)throw new Error('RMS: fase inválida.');
  const cells=definition.objects.flatMap((kind,i)=>[14,33].includes(kind)?[i]:[]);
  if(record.chests.length!==cells.length)throw new Error('RMS: lista de baús incompatível.');
  const openedChests:number[]=[];
  record.chests.forEach((chest,i)=>{
    if(chest.x===0&&chest.y===0)openedChests.push(cells[i]);
    else if(chest.x!==cells[i]%definition.width||chest.y!==Math.floor(cells[i]/definition.width))throw new Error('RMS: posição de baú incompatível.');
  });
  return {...c.resources,openedChests};
}

/** Imports record 1, whose level flags carry completion, prizes and secrets. */
export function campaignFromRecord(save:CanonicalSave,worlds:WorldDefinition[],maps:MapNode[][]):Campaign {
  if(save.worlds.some((w,i)=>w.levels.length!==worlds[i]?.levels.length))throw new Error('RMS: mapas incompatíveis com a versão S700.');
  if(![0,1,2,8].includes(save.weaponTier))throw new Error('RMS: equipamento incompatível com a versão S700.');
  for(let world=0;world<3;world++)for(let level=0;level<worlds[world].levels.length;level++){
    const definition=worlds[world].levels[level],record=save.worlds[world].levels[level];
    const cells=definition.objects.flatMap((kind,i)=>[14,33].includes(kind)?[i]:[]);
    if(record.chests.length!==cells.length||record.chests.some((chest,i)=>(chest.x!==0||chest.y!==0)&&
      (chest.x!==cells[i]%definition.width||chest.y!==Math.floor(cells[i]/definition.width))))
      throw new Error('RMS: baús incompatíveis com os mapas S700.');
  }
  const c=newCampaign();
  c.completed=save.worlds.map(w=>w.levels.flatMap((l,i)=>l.flags&2?[i]:[]));
  c.secretUnlocked=save.worlds.map((w,i)=>w.levels.flatMap((l,j)=>l.flags&64&&maps[i].some(n=>n.level===j&&n.type===1)?[j]:[]));
  c.explicitUnlocked=save.worlds.map(w=>w.levels.flatMap((l,i)=>l.flags&64?[i]:[]));
  c.awards=save.worlds.map(w=>w.levels.map(l=>l.flags&60));
  c.worldAccess=[true,!!(save.worldFlags&8),!!(save.worldFlags&16)];
  c.world=c.worldAccess[2]?2:c.worldAccess[1]?1:0;
  c.selected=0;
  c.resources={diamonds:save.diamonds,redDiamonds:save.redDiamonds,lives:Math.max(0,save.lives),health:Math.max(1,Math.min(4,save.maxHealth)),weaponTier:save.weaponTier as 0|1|2|8};
  c.canonicalRecord=[...save.export()];
  return c;
}
