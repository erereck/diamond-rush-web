import type { Campaign } from './Campaign.ts';

/** cGame.method_212–215 and Define.itemPrices in S700 1.2.0. */
export const ARMOR_PRICES=[150,400,1000,3000] as const;
export const WORLD_RED_PRICES=[0,10,25] as const;
/** Up, right, down, left; -1 means that direction has no destination. */
export const SEAL_MOVE=[[-1,-1,0,-1],[1,-1,3,-1],[2,2,-1,-1],[-1,0,-1,2]] as const;
export const nextSealItem=(selected:number,direction:1|2|3|4):number=>SEAL_MOVE[direction-1]?.[selected]??-1;
/** Define.sealArrowPosOffset: the arrow of each seal item, relative to the seal centre (120,136). */
export const SEAL_ARROWS=[[-33,-54],[14,-54],[-8,-8],[22,2]] as const;
export interface SealGlide {x:number;y:number;step:number;name:number}
/**
 * cGame.method_75: after a move the arrow glides for eight frames, closing (target-current)/(8-step)
 * of the distance each frame; keys are ignored meanwhile and the item text changes at the end.
 */
export function stepSealGlide(glide:SealGlide,target:number):SealGlide|null{
  const [tx,ty]=SEAL_ARROWS[target];
  const step=glide.step+1;
  if(step===8)return null;
  return {x:glide.x+Math.trunc((tx-glide.x)/(8-glide.step)),y:glide.y+Math.trunc((ty-glide.y)/(8-glide.step)),step,name:glide.name};
}
export const armorHealth=(item:number):number=>5+item;
export type StoreResult='bought'|'owned'|'short'|'invalid';
export function storeStatus(c:Campaign,item:number):StoreResult {
  if(!Number.isInteger(item)||item<0||item>=ARMOR_PRICES.length)return 'invalid';
  if((c.resources.maxHealth??4)>=armorHealth(item))return 'owned';
  return c.resources.diamonds<ARMOR_PRICES[item]?'short':'bought';
}
export function purchaseArmor(c:Campaign,item:number):{campaign:Campaign;result:StoreResult} {
  const result=storeStatus(c,item);
  if(result!=='bought')return {campaign:c,result};
  const maxHealth=armorHealth(item);
  return {campaign:{...c,resources:{...c.resources,diamonds:c.resources.diamonds-ARMOR_PRICES[item],maxHealth,health:maxHealth}},result};
}
