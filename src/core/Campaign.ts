import type { Direction, StageStart } from './Simulation.ts';
import type { MapNode } from '../level/LevelParser.ts';
import { CanonicalSave } from '../platform/CanonicalSave.ts';

export const CAMPAIGN_KEY='diamond-rush:campaign:v1';
export const REWARD_FLAGS=[4,8,16,32] as const;
export interface Campaign {
  version:1;
  completed:number[][];
  secretUnlocked:number[][];
  explicitUnlocked?:number[][];
  awards:number[][];
  worldAccess?:boolean[];
  canonicalRecord?:number[];
  world:number;
  selected:number;
  resources:StageStart;
}
export function newCampaign():Campaign {
  return {version:1,completed:[[],[],[]],secretUnlocked:[[],[],[]],explicitUnlocked:[[],[],[]],awards:[[],[],[]],worldAccess:[true,false,false],world:0,selected:0,resources:{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:0}};
}
/** cGame.method_249(11): each first-time award adds one life, up to 99. */
export function pendingRewards(c:Campaign,world:number,level:number,eligible:number,lives:number){
  let mask=0;
  for(const flag of REWARD_FLAGS)if(lives<99&&(eligible&flag)&&!((c.awards[world]?.[level]??0)&flag)){mask|=flag;lives++;}
  return {mask,lives};
}
export function unlockedWorld(c:Campaign,world:number,maps:MapNode[][]):boolean {
  if(world===0)return true;
  if(c.worldAccess?.[world])return true;
  const previous=maps[world-1]?.filter(n=>n.type===0).sort((a,b)=>b.level-a.level)[0];
  return !!previous&&c.completed[world-1].includes(previous.level);
}
export function unlockedNode(c:Campaign,world:number,node:MapNode,maps:MapNode[][]):boolean {
  if(!unlockedWorld(c,world,maps))return false;
  if(node.type===0&&node.level===0)return true;
  if(c.completed[world].includes(node.level))return true;
  if(c.explicitUnlocked?.[world]?.includes(node.level))return true;
  if(node.type===1)return c.secretUnlocked[world].includes(node.level);
  return maps[world].some(other=>c.completed[world].includes(other.level)&&other.links.some(link=>link.x===node.x&&link.y===node.y));
}
export function adjacentNode(c:Campaign,direction:Direction,maps:MapNode[][]):MapNode|null {
  const nodes=maps[c.world]??[],from=nodes.find(n=>n.level===c.selected);
  if(!from)return null;
  const candidates=from.links.map(link=>nodes.find(n=>n.x===link.x&&n.y===link.y)).filter((n):n is MapNode=>!!n&&unlockedNode(c,c.world,n,maps));
  const directed=candidates.filter(n=>direction===1?n.y<from.y:direction===2?n.x>from.x:direction===3?n.y>from.y:direction===4?n.x<from.x:false);
  directed.sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y));
  return directed[0]??null;
}
export function finishLevel(c:Campaign,world:number,level:number,resources:StageStart,awarded=0,secretExit=false,maps?:MapNode[][]):Campaign {
  const completed=c.completed.map(levels=>[...levels]);
  if(!completed[world].includes(level))completed[world].push(level);
  const secretUnlocked=c.secretUnlocked.map(levels=>[...levels]);
  let selected=level;
  if(maps){
    const nodes=maps[world],from=nodes.find(node=>node.level===level);
    if(secretExit||from?.type===1){
      const target=from?.links.map(link=>nodes.find(node=>node.x===link.x&&node.y===link.y))
        .find((node):node is MapNode=>!!node&&node.type===1&&node.level>level);
      if(target){if(!secretUnlocked[world].includes(target.level))secretUnlocked[world].push(target.level);selected=target.level;}
    }
  }
  const awards=c.awards.map(levels=>[...levels]);while(awards[world].length<=level)awards[world].push(0);
  awards[world][level]|=awarded;
  return {...c,completed,secretUnlocked,awards,world,selected,resources:{...resources}};
}
export function validateCampaign(value:unknown,maps:MapNode[][]):Campaign {
  if(!value||typeof value!=='object')throw new Error('Campanha inválida');
  const c=value as Campaign;
  if(c.version!==1||!Array.isArray(c.completed)||c.completed.length!==3)throw new Error('Versão da campanha inválida');
  for(let w=0;w<3;w++)if(!Array.isArray(c.completed[w])||c.completed[w].some(n=>!Number.isInteger(n)||!maps[w].some(node=>node.level===n)))throw new Error('Fases salvas inválidas');
  // Older local saves had no exit-kind record. Keep secret stages already
  // completed or selected, without exposing every branch beside a normal exit.
  const secretUnlocked=c.secretUnlocked??maps.map((nodes,w)=>nodes.filter(node=>node.type===1&&(
    c.completed[w].includes(node.level)||(c.world===w&&c.selected===node.level)||
    nodes.some(previous=>previous.type===1&&c.completed[w].includes(previous.level)&&previous.level<node.level&&
      previous.links.some(link=>link.x===node.x&&link.y===node.y))
  )).map(node=>node.level));
  if(!Array.isArray(secretUnlocked)||secretUnlocked.length!==3||secretUnlocked.some((row,w)=>!Array.isArray(row)||row.some(level=>!Number.isInteger(level)||!maps[w].some(node=>node.type===1&&node.level===level))))throw new Error('Fases secretas salvas inválidas');
  const explicitUnlocked=c.explicitUnlocked??[[],[],[]];
  if(!Array.isArray(explicitUnlocked)||explicitUnlocked.length!==3||explicitUnlocked.some((row,w)=>!Array.isArray(row)||row.some(level=>!Number.isInteger(level)||!maps[w].some(node=>node.level===level))))throw new Error('Fases liberadas salvas inválidas');
  // Older v1 saves tracked only completion. Treat their awards as claimed to
  // preserve the life balance earned before per-category flags were stored.
  const awards=c.awards??c.completed.map((levels,w)=>Array.from({length:Math.max(...maps[w].map(node=>node.level))+1},(_,level)=>levels.includes(level)?60:0));
  if(!Array.isArray(awards)||awards.length!==3||awards.some((row,w)=>!Array.isArray(row)||row.some((flags,i)=>!maps[w].some(node=>node.level===i)||!Number.isInteger(flags)||flags<0||(flags&~60)!==0)))throw new Error('Recompensas salvas inválidas');
  const worldAccess=c.worldAccess??[true,false,false];
  if(!Array.isArray(worldAccess)||worldAccess.length!==3||worldAccess.some(v=>typeof v!=='boolean')||!worldAccess[0])throw new Error('Mundos salvos inválidos');
  if(c.canonicalRecord!==undefined&&(!Array.isArray(c.canonicalRecord)||c.canonicalRecord.length<20||c.canonicalRecord.length>1000||c.canonicalRecord.some(b=>!Number.isInteger(b)||b<0||b>255)))throw new Error('Record RMS salvo inválido');
  if(c.canonicalRecord){
    const record=new CanonicalSave(Uint8Array.from(c.canonicalRecord));
    if(record.worlds.some((w,i)=>w.levels.length!==Math.max(...maps[i].map(node=>node.level))+1))throw new Error('Record RMS de outra versão');
  }
  const normalized={...c,secretUnlocked,explicitUnlocked,worldAccess};
  if(!Number.isInteger(c.world)||c.world<0||c.world>2||!unlockedWorld(normalized,c.world,maps)||!maps[c.world].some(n=>n.level===c.selected&&unlockedNode(normalized,c.world,n,maps)))throw new Error('Mapa salvo inválido');
  const r=c.resources;
  if(!r||![r.diamonds,r.redDiamonds,r.lives,r.health].every(Number.isInteger)||r.diamonds<0||r.diamonds>65535||r.redDiamonds<0||r.redDiamonds>65535||r.lives<0||r.lives>99||r.health<1||r.health>4||![0,1,2,8].includes(r.weaponTier??0))throw new Error('Recursos salvos inválidos');
  return {version:1,completed:c.completed.map(a=>[...new Set(a)]),secretUnlocked:secretUnlocked.map(a=>[...new Set(a)]),explicitUnlocked:explicitUnlocked.map(a=>[...new Set(a)]),awards:awards.map(row=>[...row]),worldAccess:[...worldAccess],canonicalRecord:c.canonicalRecord?[...c.canonicalRecord]:undefined,world:c.world,selected:c.selected,resources:{...r,weaponTier:r.weaponTier??0}};
}
