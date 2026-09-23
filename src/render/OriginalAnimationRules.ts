/** cGame.method_201: rolling stone frames and its separately painted dust. */
export function rollingStoneVisual(state:number,motion:number,tick:number,leftOccupied:boolean) {
  const direction=state&7, left=(state&8)!==0, cycle=tick>>1;
  let x=Math.min(24,motion)*([0,0,-1,0,1][direction]??0);
  let y=Math.min(24,motion)*([0,1,0,-1,0][direction]??0);
  const dust=direction===3?null:{module:(left?8:3)+cycle%5,
    x:x+(left?12+(cycle%5)*3:-(cycle%5)*4),y:y+24};
  if(left&&dust&&(cycle&1)===0&&leftOccupied){x--;y++;}
  return {body:left?2-cycle%3:cycle%3,x,y,dust};
}

/** cGame.method_204 retains the frame whose duration ends at elapsed tick. */
export function sourceFrameForElapsed(durations:readonly number[],elapsed:number,loop=false):number {
  if(elapsed<=0)return 0;
  if(loop){
    const total=durations.reduce((sum,d)=>sum+d,0);
    if(total>0)elapsed=((elapsed-1)%total)+1;
  }
  let index=0;
  while(elapsed>0&&index<durations.length){elapsed-=durations[index];index++;}
  return Math.max(0,index-1);
}

/** cGame.method_202 counts backwards from 36 as the crusher approaches. */
export function crusherFrameIndex(durations:readonly number[],motion:number) {
  return motion<=0?0:sourceFrameForElapsed(durations,36-motion);
}

/** cGame.method_194 indexes animation frames directly, ignoring AF durations. */
export function snakeVisual(world:number,state:number,tick:number,animationCount:number) {
  const direction=state&7,stunned=((state&248)>>3)>0;
  const animation=world===1?(stunned?2:0):stunned?4:Math.max(0,(direction||((state&28672)>>12))-1);
  return {animation,frame:(world===1?tick:tick>>1)%Math.max(1,animationCount)};
}

/** cGame.method_197 paints Bavaria's six pre-rendered explosive images. */
export function scotlandExplosiveVisual(state:number,motion:number,tick:number) {
  const phase=(state&3840)>>8;
  if(phase>=4)return null;
  const direction=state&7,reverse=(state&16)!==0;
  let x=motion*([0,0,-1,0,1][direction]??0)+2;
  let y=motion*([0,1,0,-1,0][direction]??0)+2;
  const wobble=reverse?-4:4;
  if(direction===1)x+=wobble;
  else if(direction===2)y+=wobble;
  else if(direction===3)x-=wobble;
  else if(direction===4)y-=wobble;
  return {module:phase===0?(tick>>1)%3:phase+2,x,y};
}

/** cGame.method_155: the upper half of Tibet's sliding gate is invisible. */
export function tibetSliderVisual(state:number,motion:number) {
  if(state&8)return null;
  const direction=state&7,opening=(state&16)===0;
  const frame=(opening&&direction===2)||(!opening&&direction===4)?2:opening?1:0;
  return {frame,x:motion*([0,0,-1,0,1][direction]??0),y:motion*([0,1,0,-1,0][direction]??0)};
}
