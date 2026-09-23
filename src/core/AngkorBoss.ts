import type { Simulation } from './Simulation.ts';

/** cGame.method_278 (S700): the first guardian's three-column stone puzzle. */
export class AngkorBoss {
  phase=0; age=0; health=3; column=0; animation=0; animationAge=0;
  markerX=-1;markerY=-1;attackDone=false;
  get x(){return [10,12,15][this.column];}
  get visible(){return ![0,6,8].includes(this.phase);}
  get maxHealth(){return 3;}
  get showHealth(){return this.phase!==0&&this.phase!==8&&this.health>0;}
  reset(){this.phase=0;this.age=0;this.health=3;this.column=0;this.animation=0;this.animationAge=0;
    this.markerX=-1;this.markerY=-1;this.attackDone=false;}
  private setAnimation(n:number){if(n!==this.animation){this.animation=n;this.animationAge=0;}else this.animationAge++;}
  private mark(sim:Simulation,x:number,y:number){this.clearMarker(sim);for(let dx=0;dx<2;dx++){const i=sim.index(x+dx,y);if(i>=0&&sim.tiles[i]===-1)sim.tiles[i]=50;}this.markerX=x;this.markerY=y;}
  private clearMarker(sim:Simulation){if(this.markerX<0)return;for(let dx=0;dx<2;dx++){const i=sim.index(this.markerX+dx,this.markerY);if(i>=0&&sim.tiles[i]===50)sim.tiles[i]=-1;}this.markerX=-1;this.markerY=-1;}
  private stoneImpact(sim:Simulation,x:number,upper:number,lower:number){
    let hit=false;
    for(let dx=0;dx<2;dx++)for(let y=upper;y<=lower;y++){
      const i=sim.index(x+dx,y);
      if(i<0||sim.tiles[i]!==0)continue;
      sim.tiles[i]=-1;sim.state[i]=0;sim.motion[i]=0;sim.active[i]=0;
      sim.wake(x+dx,y);hit=true;
    }
    return hit;
  }
  private spawnCeilingStones(sim:Simulation){
    for(const x of [12,15])if(sim.tile(x,5)===-1){const i=sim.index(x,2);if(i>=0&&sim.tiles[i]!==0){sim.tiles[i]=0;sim.state[i]=0;sim.motion[i]=0;sim.active[i]=48;sim.wake(x,2);}}
  }
  step(sim:Simulation){
    if(this.phase===8)return;
    this.age++;let nextAnim=-1;const x=this.x;
    // The two upper vents rebuild whenever their temporary stone is gone.
    for(const vent of [12,15]){const i=sim.index(vent,2);if(i>=0&&sim.tiles[i]===-1)sim.tiles[i]=31;}
    switch(this.phase){
      case 0:if(sim.player.x>=10){this.phase=6;this.age=0;}break;
      case 6:if(this.age>10){this.phase=1;this.age=0;nextAnim=2;}break;
      case 1:
        if(this.age>40){this.phase=2;this.age=0;}
        else if(this.age>20){this.stoneImpact(sim,x,7,8);this.mark(sim,x,8);}
        break;
      case 2:
        if(this.stoneImpact(sim,x,7,8)){
          this.health--;this.phase=3;this.age=0;this.clearMarker(sim);nextAnim=3;sim.events.push('boss-hurt');
        }else if(this.age>30){this.phase=4;this.age=0;this.clearMarker(sim);nextAnim=0;}
        else if(this.age>15&&this.animation!==6)nextAnim=6;
        break;
      case 3:
        if(this.age>40){
          if(this.health<=0){this.phase=7;this.age=0;sim.events.push('boss-defeated');}
          else {this.phase=4;this.age=0;nextAnim=2;}
        }
        break;
      case 4:
        this.stoneImpact(sim,x,Math.max(0,Math.floor((this.drawY-40)/24)),10);
        if(this.age>=(this.health<=1?5:10)){this.phase=5;this.age=0;nextAnim=4;}
        else if(this.age>(this.health<=1?5:10)/2&&this.animation!==1)nextAnim=1;
        break;
      case 5:
        this.stoneImpact(sim,x,Math.max(0,Math.floor((this.drawY-134)/24)),10);
        // method_280 releases another stone when the hero cleared a vent.
        if(this.age>=2){this.spawnCeilingStones(sim);this.phase=10;this.age=0;this.mark(sim,x,4);}
        break;
      case 10:
        if(this.age===28)nextAnim=7;
        if(this.age>=50){this.phase=11;this.age=0;this.clearMarker(sim);nextAnim=8;this.attackDone=false;}
        break;
      case 11:
        if(!this.attackDone&&sim.player.y===4&&sim.player.x>=x-3&&sim.player.x<=x+4){this.hitHero(sim);this.attackDone=true;}
        if(this.age>=12){this.phase=9;this.age=0;nextAnim=4;}
        break;
      case 9:
        if(this.age>=2){this.phase=6;this.age=0;const delta=sim.player.x-10;let target=Math.trunc(delta/3);
          if(delta===target*3+2)target+=Math.trunc(sim.tick%50/25);
          this.column=Math.max(0,Math.min(2,target));}
        break;
      case 7:
        if(this.age>80){this.phase=8;this.clearMarker(sim);sim.events.push('boss-clear');}
        break;
    }
    const attackYOffset=[4,7,8].includes(this.animation)?94:0;
    if([4,5,9,10].includes(this.phase)&&sim.player.x>=this.x&&sim.player.x<=this.x+1&&
       sim.player.y*24>this.drawY-40-attackYOffset&&sim.player.y*24<this.drawY+256-attackYOffset)this.hitHero(sim);
    this.setAnimation(nextAnim<0?this.animation:nextAnim);
  }
  private hitHero(sim:Simulation){sim.hurt(1,sim.player.x<=this.x?4:2);}
  /** World-space top of the ASpriteInstance, using method_186's vertical offsets. */
  get drawY(){
    const offset=this.phase===1?this.age:[2,3,7].includes(this.phase)?40:this.phase===4?40-this.age*4:
      this.phase===5?15+this.age*18:[10,11].includes(this.phase)?51:this.phase===9?51-this.age*18:-1000;
    return 256-offset;
  }
  snapshot(){return {phase:this.phase,age:this.age,health:this.health,column:this.column,animation:this.animation,
    animationAge:this.animationAge,markerX:this.markerX,markerY:this.markerY,attackDone:this.attackDone};}
}
