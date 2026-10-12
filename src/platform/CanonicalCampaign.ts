import type { WorldDefinition, MapNode } from '../level/LevelParser.ts';
import type { Campaign } from '../core/Campaign.ts';
import { newCampaign, unlockedNode } from '../core/Campaign.ts';
import { CanonicalSave } from './CanonicalSave.ts';

/** Keeps the original RMS record alongside the web campaign, including unknown bytes. */
export function campaignRecord(c:Campaign,worlds:WorldDefinition[],maps:MapNode[][]){
  const save=c.canonicalRecord?new CanonicalSave(Uint8Array.from(c.canonicalRecord)):CanonicalSave.create(worlds,maps);
  if(save.worlds.some((w,i)=>w.levels.length!==worlds[i]?.levels.length))throw new Error('RMS: mapas incompatíveis com a versão S700.');
  const {lives,diamonds,redDiamonds,weaponTier=0}=c.resources;
  save.setResources(lives,diamonds,redDiamonds,weaponTier);
  save.setMaxHealth(c.resources.maxHealth??4);
  // method_74 writes one world bit when its queued notice is shown. The
  // threshold used for seal selection (method_73) can be reached earlier.
  for(const w of [1,2] as const)if(c.worldAccess?.[w])save.unlockWorld(w);
  // The final-chamber chest writes bit 0/1/2 of recordData[2]. Completed
  // boss stages also repair older web saves that predate this RMS field.
  for(const w of [0,1,2] as const)if(c.completed[w].includes([8,9,10][w]))save.collectCrystal(w);
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
  return save;
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
  // The boss stages never receive flag 2: the crystal chest writes bit 0/1/2 of record byte 2 instead
  // and the game leaves through its seal (state 28 -> 27), so the crystal is what completes them.
  [8,9,10].forEach((boss,w)=>{if(save.worldFlags&(1<<w)&&!c.completed[w].includes(boss))c.completed[w].push(boss);});
  c.secretUnlocked=save.worlds.map((w,i)=>w.levels.flatMap((l,j)=>l.flags&64&&maps[i].some(n=>n.level===j&&n.type===1)?[j]:[]));
  c.explicitUnlocked=save.worlds.map(w=>w.levels.flatMap((l,i)=>l.flags&64?[i]:[]));
  c.awards=save.worlds.map(w=>w.levels.map(l=>l.flags&60));
  c.worldAccess=[true,!!(save.worldFlags&8),!!(save.worldFlags&16)];
  c.world=c.worldAccess[2]?2:c.worldAccess[1]?1:0;
  c.selected=0;
  c.resources={diamonds:save.diamonds,redDiamonds:save.redDiamonds,lives:Math.max(0,save.lives),health:Math.max(1,save.maxHealth),...(save.maxHealth>4?{maxHealth:save.maxHealth}:{}),weaponTier:save.weaponTier as 0|1|2|8};
  c.canonicalRecord=[...save.export()];
  return c;
}
