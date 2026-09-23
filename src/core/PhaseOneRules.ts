// Animation durations from canonical S700 o.f/0 and gen1.f/0.
export const CHEST_OPEN_DURATIONS=[1,1,4,11,1,2,3,3,2,3,3,3,2,2,1,25];
export const FIRE_DURATIONS=[20,...Array<number>(35).fill(2)];
export const BOULDER_BRACE_TICKS=31; // o.f/0 animation 11
export const BOULDER_PRESSURE_TICKS=40; // cGame.field_93
export const HAMMER_IMPACT_TICK=3; // o.f/0 animations 13–16: frame 2 begins after 2+1 ticks
export const HAMMER_ATTACK_TICKS=[0,11,12,12,12] as const;
export const HAMMER_BOUNCE_TICKS=[0,16,17,16,17] as const; // o.f/0 animations 41–44
export function animationFrameAt(durations:readonly number[],tick:number,loop=true){
  const total=durations.reduce((a,b)=>a+b,0);
  let time=loop?Math.max(0,tick)%total:Math.min(Math.max(0,tick),total-1);
  for(let frame=0;frame<durations.length;frame++){
    if(time<durations[frame])return frame;
    time-=durations[frame];
  }
  return durations.length-1;
}
export function fireReach(tick:number){
  const frame=animationFrameAt(FIRE_DURATIONS,tick);
  return frame===0?0:frame<=10?1:frame<=20?2:3;
}
/** method_192: rolling is measured FROM the origin, falling FROM the destination. */
export function fallingDrawOffset(state:number,motion:number,tick:number){
  const direction=state&7;
  let x=motion*([0,0,-1,0,1][direction]??0),y=motion*([0,1,0,-1,0][direction]??0);
  if(state&512){x=-x-(-1+tick%3);y+=Math.trunc(motion*motion/24);}
  return {x,y};
}
