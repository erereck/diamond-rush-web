import type { Direction, StageStart } from './Simulation.ts';
import type { MapNode } from '../level/LevelParser.ts';

export const CAMPAIGN_KEY='diamond-rush:campaign:v1';
export interface Campaign {
  version:1;
  completed:number[][];
  world:number;
  selected:number;
  resources:StageStart;
}
export function newCampaign():Campaign {
  return {version:1,completed:[[],[],[]],world:0,selected:0,resources:{diamonds:0,redDiamonds:0,lives:5,health:4}};
}
export function unlockedWorld(c:Campaign,world:number,maps:MapNode[][]):boolean {
  if(world===0)return true;
  const previous=maps[world-1]?.filter(n=>n.type===0).sort((a,b)=>b.level-a.level)[0];
  return !!previous&&c.completed[world-1].includes(previous.level);
}
export function unlockedNode(c:Campaign,world:number,node:MapNode,maps:MapNode[][]):boolean {
  if(!unlockedWorld(c,world,maps))return false;
  if(node.type===0&&node.level===0)return true;
  if(c.completed[world].includes(node.level))return true;
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
export function finishLevel(c:Campaign,world:number,level:number,resources:StageStart):Campaign {
  const completed=c.completed.map(levels=>[...levels]);
  if(!completed[world].includes(level))completed[world].push(level);
  return {...c,completed,world,selected:level,resources:{...resources}};
}
export function validateCampaign(value:unknown,maps:MapNode[][]):Campaign {
  if(!value||typeof value!=='object')throw new Error('Campanha inválida');
  const c=value as Campaign;
  if(c.version!==1||!Array.isArray(c.completed)||c.completed.length!==3)throw new Error('Versão da campanha inválida');
  for(let w=0;w<3;w++)if(!Array.isArray(c.completed[w])||c.completed[w].some(n=>!Number.isInteger(n)||!maps[w].some(node=>node.level===n)))throw new Error('Fases salvas inválidas');
  if(!Number.isInteger(c.world)||c.world<0||c.world>2||!unlockedWorld(c,c.world,maps)||!maps[c.world].some(n=>n.level===c.selected&&unlockedNode(c,c.world,n,maps)))throw new Error('Mapa salvo inválido');
  const r=c.resources;
  if(!r||![r.diamonds,r.redDiamonds,r.lives,r.health].every(Number.isInteger)||r.diamonds<0||r.diamonds>65535||r.redDiamonds<0||r.redDiamonds>65535||r.lives<0||r.lives>99||r.health<1||r.health>4)throw new Error('Recursos salvos inválidos');
  return {version:1,completed:c.completed.map(a=>[...new Set(a)]),world:c.world,selected:c.selected,resources:{...r}};
}
