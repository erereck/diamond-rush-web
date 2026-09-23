/** cGame.method_264: the two spike clocks have independent 89/44 tick cycles. */
export function spikeExtension(tick:number,alternate:boolean):number {
  if(alternate){
    const phase=tick%44;
    if(phase<7)return 0;
    if(phase<22)return Math.floor(48*(phase-7)/15);
    if(phase<30)return 48;
    return 48-Math.floor(48*(phase-30)/15);
  }
  const phase=tick%89;
  if(phase<15)return 0;
  if(phase<45)return Math.floor(48*(phase-15)/30);
  if(phase<60)return 48;
  return 48-Math.floor(48*(phase-60)/30);
}

/** cGame.method_264/338: the tip can reach one to three map cells. */
export function spikeReach(tick:number,alternate:boolean):number {
  const extent=spikeExtension(tick,alternate);
  return extent>0?Math.floor((extent-1)/24)+2:1;
}
