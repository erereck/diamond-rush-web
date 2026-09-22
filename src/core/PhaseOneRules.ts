// Animation durations from canonical S700 o.f/0 and gen1.f/0.
export const CHEST_OPEN_DURATIONS=[1,1,4,11,1,2,3,3,2,3,3,3,2,2,1,25];
export const FIRE_DURATIONS=[20,...Array<number>(35).fill(2)];
export const BOULDER_BRACE_TICKS=31; // o.f/0 animation 11
export const BOULDER_PRESSURE_TICKS=40; // cGame.field_93
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
