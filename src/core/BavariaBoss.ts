import type { Simulation } from './Simulation.ts';

// b1.f/0 animation timing, in 20 Hz ticks (cGame.method_269).
const DURATIONS=[
  [3,3,3,3,3,3,3,3],[2,2,2,3,2,2,2,3],
  [1,2,6,1,1,1,1,1,1,1,1,1,1,1,1,1,6,1,1,1,1,1],
  [1,2,6,1,1,1,1,1,1,1,1,1,1,1,1,1,6,1,1,1,1,1],
  [3],[3],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],
  [1,1,3,1,1,1,1,1,1,1,1,10,2,2,2,1,1],
  [1,1,3,1,1,1,1,1,1,1,1,10,2,2,2,1,1],
  [4,3,3,3,4,3,3,3],[4,3,3,3,4,3,3,3],
  [4,4,3,3,2,2,1,1,90],
  [6,1,1,1,2,2,2,2,2,1,1,1,1,2,3,2,3,3,2,2,2,2,2,3,3,4,4,5,6,3,2,2,2,2,2,2,2,2]
];
const total=(n:number)=>DURATIONS[n].reduce((a,b)=>a+b,0);
function frame(n:number,elapsed:number){let t=elapsed%total(n);for(let i=0;i<DURATIONS[n].length;i++){if(t<DURATIONS[n][i])return i;t-=DURATIONS[n][i];}return DURATIONS[n].length-1;}

/** Bavaria's horizontal guardian, source-traced from cGame.method_129/269. */
export class BavariaBoss {
  phase=13;health=4;x=408;animation=13;animationAge=0;age=0;
  awakened=false;attack=false;attackOffset=0;attackDone=false;
  get visible(){return this.phase!==15;}
  get maxHealth(){return 4;}
  get showHealth(){return ![13,12,15].includes(this.phase)&&this.health>0;}
  get spriteFrame(){return frame(this.animation,this.animationAge);}
  reset(){this.phase=13;this.health=4;this.x=408;this.animation=13;this.animationAge=0;this.age=0;
    this.awakened=false;this.attack=false;this.attackOffset=0;this.attackDone=false;}
  private setAnimation(n:number){if(n!==this.animation){this.animation=n;this.animationAge=0;}else this.animationAge++;}
  private stones(sim:Simulation){
    if([6,7,12,15].includes(this.phase))return;
    const center=Math.floor((this.x+24)/24);
    for(let y=21;y<=22;y++)for(let x=center-1;x<=center+1;x++){
      const i=sim.index(x,y);if(i<0||sim.tiles[i]!==0)continue;
      if((sim.state[i]&7)===3&&this.phase!==13){
        this.health--;const left=[0,2,4,8,10].includes(this.phase);
        this.phase=left?4:5;this.setAnimation(this.phase);this.age=0;sim.events.push('boss-hurt');
      }
      sim.tiles[i]=30;sim.state[i]=4;sim.motion[i]=0;sim.active[i]=24;sim.wake(x,y);
      sim.events.push('boss-stone');
    }
    if(this.health<=0){this.health=0;this.phase=12;this.age=0;this.setAnimation(12);sim.events.push('boss-defeated');}
  }
  private replenish(sim:Simulation){
    for(const x of [16,19])if(sim.tile(x,18)===-1){const i=sim.index(x,16);
      if(i>=0){sim.tiles[i]=0;sim.state[i]=0;sim.motion[i]=0;sim.active[i]=48;sim.wake(x,16);}
    }
  }
  step(sim:Simulation){
    if(this.phase===15)return;
    if(this.phase===12){this.animationAge++;if(this.age++>100){this.phase=15;sim.events.push('boss-clear');}return;}
    if(this.phase===13){
      if(sim.player.x*24+12>this.x+24)this.awakened=true;
      this.stones(sim);
      if(!this.awakened)return;
      this.age++;this.animationAge+=sim.tick%this.health===0?3:2;
      if(this.animationAge>=total(13)){this.phase=0;this.age=0;this.setAnimation(0);}
      return;
    }
    const playerX=sim.player.x*24+12,playerY=sim.player.y*24;
    const speed=this.health>0&&sim.tick%this.health===0?2:1;
    this.age++;
    if([0,1].includes(this.phase)&&!this.attack){
      this.attackOffset=this.phase===0?-36:36;
      if(playerY<504&&(playerX===this.x+24+this.attackOffset||sim.tick%76===0))this.attack=true;
    }
    let nextAnim=-1;
    for(let n=0;n<speed;n++){
      switch(this.phase){
        case 0:
          if(playerY>=504&&this.x+24>360){if(playerX<this.x+24){this.phase=6;nextAnim=6;}else this.x--;}
          else if(this.attack){this.phase=2;nextAnim=2;}
          else if(this.x+24<=360){this.phase=1;nextAnim=1;}
          else this.x--;
          break;
        case 1:
          if(playerY>=504&&this.x+24<504){if(playerX>=this.x+24){this.phase=7;nextAnim=7;}else this.x++;}
          else if(this.attack){this.phase=3;nextAnim=3;}
          else if(this.x+24>=504){this.phase=0;nextAnim=0;}
          else this.x++;
          break;
        case 2:case 3:
          if(this.spriteFrame>=7&&playerY<504&&playerX===this.x+24+this.attackOffset&&!this.attackDone){sim.hurt(1);this.attackDone=true;}
          if(this.animationAge>=total(this.animation)-1){this.phase=this.phase===2?10:11;nextAnim=this.phase;
            this.attack=false;this.attackOffset=0;this.attackDone=false;}
          break;
        case 4:case 5:
          if(this.animationAge>=total(this.animation)-1){this.phase=this.phase===4?0:1;nextAnim=this.phase;}
          this.attack=false;this.attackOffset=0;break;
        case 6:case 7:
          if(playerY>=504){
            if(this.phase===6){if(playerX>=this.x+24-48){this.phase=8;nextAnim=8;}else this.x-=2;}
            else if(playerX<=this.x+24+48){this.phase=9;nextAnim=9;}else this.x+=2;
      }else if(this.phase===6&&this.x+24>=360){this.phase=0;nextAnim=0;}
          else if(this.phase===7&&this.x+24<=504){this.phase=1;nextAnim=1;}
          break;
        case 8:case 9:
          if(this.spriteFrame>=4&&playerY>=504&&playerX>=this.x+24-(this.phase===8?48:0)&&
             playerX<=this.x+24+(this.phase===9?48:0))sim.hurt(1);
          if(this.spriteFrame===5)this.replenish(sim);
          if(this.animationAge>=total(this.animation)-1){this.phase=this.phase===8?10:11;nextAnim=this.phase;}
          break;
        case 10:case 11:
          if(playerX>this.x+24&&this.x+24<504){this.phase=1;nextAnim=1;}
          else if(playerX<this.x+24&&this.x+24>360){this.phase=0;nextAnim=0;}
          this.attack=false;this.attackOffset=0;
          break;
      }
      if(playerY>=504&&playerX===this.x+24)sim.hurt(1);
    }
    // The impact check follows movement in the Java update, before animation advances.
    this.stones(sim);
    if(nextAnim>=0&&this.phase!==4&&this.phase!==5&&this.phase!==12)this.setAnimation(nextAnim);
    else if(this.phase!==12)this.setAnimation(this.animation);
  }
  snapshot(){return {phase:this.phase,health:this.health,x:this.x,animation:this.animation,animationAge:this.animationAge,
    age:this.age,awakened:this.awakened,attack:this.attack,attackOffset:this.attackOffset,attackDone:this.attackDone};}
}
