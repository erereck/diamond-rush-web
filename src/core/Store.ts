import type { Campaign } from './Campaign.ts';

/** cGame.method_212–215 and Define.itemPrices in S700 1.2.0. */
export const ARMOR_PRICES=[150,400,1000,3000] as const;
export const WORLD_RED_PRICES=[0,10,25] as const;
/** Up, right, down, left; -1 means that direction has no destination. */
export const SEAL_MOVE=[[-1,-1,0,-1],[1,-1,3,-1],[2,2,-1,-1],[-1,0,-1,2]] as const;
export const nextSealItem=(selected:number,direction:1|2|3|4):number=>SEAL_MOVE[direction-1]?.[selected]??-1;
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
