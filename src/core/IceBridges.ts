import type { Simulation } from './Simulation.ts';

/** Shared switch barriers: method_232 and the bridge block of method_236. */
export class IceBridges {
  position=0;direction=0;
  flip(s:Simulation){
    // method_232 checks the dry environment, not the weapon upgrade tier.
    if(s.environmentMode!==3)return false;
    if(!this.direction&&![15,16].includes(s.object(s.player.x,s.player.y))){
      this.direction=this.position<=0?1:-1;s.events.push('bridge-switch');
    }
    return true;
  }
  step(s:Simulation){
    if(!this.direction||((s.tick>>1)&1)!==0)return;
    this.position+=this.direction;
    if(this.position===0||this.position===9){this.direction=0;return;}
    if(this.position!==5)return;
    for(let y=1;y<s.level.height-1;y++)for(let x=1;x<s.level.width-1;x++){
      const i=s.index(x,y),object=s.level.objects[i],tile=s.tiles[i];
      if(object===15||object===16){
        // method_235 destroys occupants before replacing the barrier.
        s.level.objects[i]=255;s.level.parameters[i]=255;
        if([0,19,43,45,46].includes(tile))s.destroyEffect(i);
        s.tiles[i]=object===15?34:35;
      }else if(tile===34||tile===35){
        s.level.objects[i]=tile===34?15:16;s.level.parameters[i]=255;s.tiles[i]=-1;
      }else continue;
      s.wake(x,y);
    }
    s.events.push('bridge-change');
  }
  snapshot(){return {position:this.position,direction:this.direction};}
  restore(state:{position:number;direction:number}){this.position=state.position;this.direction=state.direction;}
}
