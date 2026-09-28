import type { Simulation } from './Simulation.ts';

export interface RiddleState {
  active:number;remaining:number[];hints:number[];lockedChests:number[];
  phase:number;ticks:number;target:number;view:{x:number;y:number};held:boolean;hint:number;hintTicks:number;
}
/** cGame methods 296, 319, 301–303 and 327. Camera and counters keep running with the map. */
export class RiddleRooms {
  active=-1;remaining:number[]=[];hints:number[]=[];lockedChests=new Set<number>();
  phase=0;ticks=0;target=-1;view={x:0,y:0};held=false;hint=-1;hintTicks=0;
  initialize(s:Simulation){
    for(let i=0;i<s.tiles.length;i++)if(s.level.objects[i]===17){
      const id=s.level.parameters[i]===255?-1:s.level.parameters[i],above=i-s.level.width;
      if([14,33].includes(s.level.objects[above]))this.lockedChests.add(above);
      if(id>=0){while(this.remaining.length<=id){this.remaining.push(0);this.hints.push(59);}}
      const kind=s.tiles[above];
      if([19,36,43,45,46,49].includes(kind)){
        if(id>=0){this.remaining[id]++;if(kind!==36)this.hints[id]=s.boss?s.level.world===0?95:s.level.world===1?93:94:57;
          else if(this.hints[id]===59)this.hints[id]=58;}
        s.level.objects[i]=255;s.level.parameters[i]=255;
      }
    }
  }
  trigger(s:Simulation,x:number,y:number){
    if(!s.isPlayer(x,y)||s.player.offset>6)return false;
    const i=s.index(x,y),id=s.level.parameters[i]===255?-1:s.level.parameters[i];
    // method_319 closes the horizontal cell behind the hero, even when facing vertically.
    s.closeGate(s.index(s.player.x-[0,0,1,0,-1][s.player.direction],s.player.y));
    this.active=id>=0&&id<this.remaining.length?id:-1;
    if(this.active>=0){this.phase=1;this.selectTarget(s,id);s.events.push('riddle');}
    s.level.objects[i]=255;s.level.parameters[i]=255;s.pendingDirection=0;
    return true;
  }
  /** method_302 selects the last eligible marker in the row-major scan. */
  selectTarget(s:Simulation,id:number){
    for(let y=1;y<s.level.height-1;y++)for(let x=1;x<s.level.width-1;x++){
      const i=s.index(x,y),above=s.index(x,y-1);
      if(s.level.objects[i]!==17||s.level.parameters[i]!==id)continue;
      let cell=-1;
      if(s.tiles[i]===18)cell=i;
      else if([14,33].includes(s.level.objects[above])||(s.level.objects[above]===7&&s.gatePhases[above]!==0))cell=above;
      if(cell>=0){this.target=cell;this.view={x:24*(cell%s.level.width)-108,y:24*Math.floor(cell/s.level.width)-108};}
    }
  }
  /** method_303 opens rewards without consuming the pressure-plate/lock count. */
  solve(s:Simulation,id:number){
    for(let i=0;i<s.tiles.length;i++)if(s.level.objects[i]===17&&s.level.parameters[i]===id){
      const above=i-s.level.width;
      if(s.level.objects[above]===7&&s.gatePhases[above]===0){s.gatePhases[above]=1;s.active[above]=24;s.events.push('gate-open');}
      else if([14,33].includes(s.level.objects[above]))this.lockedChests.delete(above);
    }
    s.events.push('riddle-solved');
  }
  destroyed(s:Simulation){
    if(this.active<0||(s.boss&&s.boss.health>0))return;
    // Java stores the counter in a signed byte and leaves the active id selected after completion.
    this.remaining[this.active]=(this.remaining[this.active]-1<<24)>>24;
    if(this.remaining[this.active]===0)this.solve(s,this.active);
  }
  step(s:Simulation){
    if(this.hintTicks>0&&--this.hintTicks===0)this.hint=-1;
    const travel=(speed:number)=>{
      const goal={x:Math.max(0,Math.min(s.level.width*24-240,this.view.x)),y:Math.max(0,Math.min(s.level.height*24-240,this.view.y))};
      for(const axis of ['x','y'] as const){const delta=goal[axis]-s.camera[axis];s.camera[axis]+=Math.sign(delta)*Math.min(speed,Math.abs(delta));}
      return s.camera.x===goal.x&&s.camera.y===goal.y;
    };
    if(this.phase===1){if(travel(8)){this.phase=2;this.ticks=40;}}
    else if(this.phase===2){
      if(--this.ticks===30)s.closeGate(this.target);
      else if(this.ticks===0){this.phase=3;this.view={x:s.player.x*24-108,y:s.player.y*24-108};this.hint=this.hints[this.active];this.hintTicks=80;}
    }else if(this.phase===3){if(travel(5)){this.phase=4;this.ticks=20;}}
    else if(this.phase===4&&--this.ticks===0){this.phase=0;this.held=true;}
  }
  snapshot():RiddleState{return {active:this.active,remaining:[...this.remaining],hints:[...this.hints],lockedChests:[...this.lockedChests],phase:this.phase,ticks:this.ticks,target:this.target,view:{...this.view},held:this.held,hint:this.hint,hintTicks:this.hintTicks};}
  restore(state:RiddleState){
    this.active=state.active;this.remaining=[...state.remaining];this.hints=[...state.hints];this.lockedChests=new Set(state.lockedChests);
    this.phase=0;this.ticks=0;this.target=-1;this.held=false;this.hint=-1;this.hintTicks=0;
  }
}
