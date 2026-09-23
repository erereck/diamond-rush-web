import type { LevelDefinition } from '../level/LevelParser.ts';
// cGame.field_562/563 and demo.f script 29 in the pinned S700 source.
const WORLD_TITLES=[28,29,30];
const STAGE_TITLES=[[8,9,10,11,12,14,15,16,17,20,21,22,23],[8,9,10,11,12,14,15,16,17,18,20,21,22],[8,9,10,11,12,14,15,16,17,18,19,20,21,22,47]];
export const introLines=['The Great Temple Of Angkor Wat...','I\'m finally in!','Let\'s go!'];
export const worldTitle=(strings:string[],world:number)=>strings[WORLD_TITLES[world]]??'';
export const stageTitle=(strings:string[],level:LevelDefinition)=>strings[STAGE_TITLES[level.world]?.[level.index]??8]??`STAGE ${level.index+1}`;
export function stageCollectibleTotals(level:LevelDefinition){
  let diamonds=0,redDiamonds=0;
  level.tiles.forEach((tile,i)=>{if(tile===1)diamonds++;else if(tile===2)redDiamonds++;else if(tile===41)diamonds+=level.parameters[i]===255?1:Math.max(1,level.parameters[i]);});
  return {diamonds,redDiamonds};
}
