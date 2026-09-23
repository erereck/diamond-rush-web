import type { Simulation } from './Simulation.ts';

// mm1.f/0 is the guardian's sprite; these totals come from its animation frames.
const LENGTHS=[51,47,17,17,26,26,16,16,18,18,10,10,38,32,32];
function frameAt(animation:number,age:number){
  // The sprite data is loaded by the renderer. Only the attack threshold matters
  // to the simulation; frame five occurs after the first five AF durations.
  if(animation===6||animation===7)return age>=9?5:0;
  if(animation===13||animation===14)return age>=5?5:0;
  return 0;
}

/** Tibet's five-hit ice guardian, based on cGame.method_281/282 and mm1.f. */
export class TibetBoss {
  phase=-1;health=5;x=360;animation=0;animationAge=0;age=0;
  attackAt=0;ceilingPulseAt=0;bridgePosition=0;bridgeDirection=0;
  wallCells:number[]=[];wallTypes:number[]=[];
  get visible(){return this.phase!==15;}
  get maxHealth(){return 5;}
  get showHealth(){return this.phase!==-1&&this.phase!==15&&this.health>0;}
  reset(){this.phase=-1;this.health=5;this.x=360;this.animation=0;this.animationAge=0;this.age=0;
    this.attackAt=0;this.ceilingPulseAt=0;this.bridgePosition=0;this.bridgeDirection=0;}
  private setAnimation(n:number){if(n!==this.animation){this.animation=n;this.animationAge=0;}else this.animationAge++;}
  private nextAttack(tick:number){return tick+340+((Math.imul(tick+1,1103515245)>>>16)%101);}
  flipBridge(sim:Simulation){
    if(this.bridgeDirection||this.phase===15)return;
    this.bridgeDirection=this.bridgePosition===0?1:-1;sim.events.push('tibet-switch');
  }
  private bridge(sim:Simulation){
    if(!this.wallCells.length)for(let i=0;i<sim.level.tiles.length;i++)if(sim.level.tiles[i]===34||sim.level.tiles[i]===35){
      this.wallCells.push(i);this.wallTypes.push(sim.level.tiles[i]);
    }
    if(!this.bridgeDirection||sim.tick%4>=2)return;
    this.bridgePosition+=this.bridgeDirection;
    if(this.bridgePosition===5){
      for(let j=0;j<this.wallCells.length;j++){
        const i=this.wallCells[j],kind=this.wallTypes[j];
        sim.tiles[i]=this.bridgeDirection>0?(kind===34?34:-1):(kind===34?-1:35);
        sim.level.objects[i]=sim.tiles[i]===-1?(kind===34?15:16):255;
        sim.wake(i%sim.level.width,Math.floor(i/sim.level.width));
      }
      const left=this.bridgeDirection<=0;
      for(const [x,y] of this.health<=2?[[left?10:26,16],[left?26:10,19]]:[[left?26:10,19]]){
        const i=sim.index(x,y);if(i>=0){sim.tiles[i]=45;sim.state[i]=0;sim.motion[i]=0;sim.active[i]=48;sim.wake(x,y);}
      }
      sim.events.push('tibet-bridge');
    }
    if(this.bridgePosition===0||this.bridgePosition===9)this.bridgeDirection=0;
  }
  private ceiling(sim:Simulation){
    if(!this.ceilingPulseAt)return;
    if(sim.tick>=this.ceilingPulseAt){
      for(let x=14;x<=21;x++){
        const i=sim.index(x,15);if(i<0||sim.tiles[i]!==44||sim.tick<this.ceilingPulseAt+21-x)continue;
        if((sim.state[i]&56)===0){sim.state[i]=8;sim.motion[i]=10;sim.active[i]=24;sim.events.push('boss-ceiling');}
      }
    }
    if(sim.tick>=this.ceilingPulseAt+80){
      for(let x=14;x<=21;x++){const i=sim.index(x,15);if(i>=0){sim.tiles[i]=44;sim.state[i]=0;sim.motion[i]=0;sim.active[i]=24;sim.wake(x,15);}}
      this.ceilingPulseAt=0;
    }
  }
  private stones(sim:Simulation){
    if(this.phase===10||this.phase===11)return;
    const center=Math.floor((this.x+24)/24);
    for(let y=21;y<=22;y++)for(let x=center-1;x<=center+1;x++){
      const i=sim.index(x,y);if(i<0||sim.tiles[i]!==9)continue;
      if((sim.state[i]&7)===3){
        this.health--;this.phase=[0,2,4,6].includes(this.phase)?2:3;
        this.age=0;this.setAnimation(this.phase);sim.events.push('boss-hurt');
      }
      sim.tiles[i]=30;sim.state[i]=4;sim.motion[i]=0;sim.frozenKinds[i]=-1;sim.active[i]=24;
      sim.wake(x,y);sim.events.push('boss-stone');
    }
    if(this.health<=0){this.health=0;this.phase=12;this.age=0;this.setAnimation(12);sim.events.push('boss-defeated');}
  }
  step(sim:Simulation){
    this.bridge(sim);this.ceiling(sim);
    if(this.phase===15)return;
    if(this.phase===12){this.animationAge++;if(this.age++>100){this.phase=15;sim.events.push('boss-clear');}return;}
    if(this.phase===-1){
      if(sim.player.x*24<336)return;
      this.phase=0;this.setAnimation(0);this.attackAt=this.nextAttack(sim.tick);return;
    }
    const playerX=sim.player.x*24+12,playerY=sim.player.y*24;
    const speed=sim.tick%this.health===0||([10,11].includes(this.phase)&&(sim.tick&11)===0)?2:1;
    this.age++;let nextAnim=-1;
    for(let n=0;n<speed;n++){
      const center=this.x+24,ended=this.animationAge>=LENGTHS[this.animation]-1;
      switch(this.phase){
        case 0:this.phase=center>360?4:5;nextAnim=this.phase;break;
        case 1:this.phase=center<504?5:4;nextAnim=this.phase;break;
        case 2:case 3:
          if(ended){this.phase=sim.tick>this.attackAt?(this.phase===2?13:14):(this.phase===2?4:5);nextAnim=this.phase;}
          break;
        case 4:
          if(sim.tick>this.attackAt){this.phase=13;nextAnim=13;}
          else if(playerY>=504&&playerX<center&&this.x-48>=360){this.phase=10;nextAnim=10;}
          else if(center<=360){this.phase=5;nextAnim=5;}
          else this.x--;
          break;
        case 5:
          if(sim.tick>this.attackAt){this.phase=14;nextAnim=14;}
          else if(playerY>=504&&playerX>center&&this.x+48<=504){this.phase=11;nextAnim=11;}
          else if(center>=504){this.phase=4;nextAnim=4;}
          else this.x++;
          break;
        case 6:case 7:case 13:case 14: {
          const left=this.phase===6||this.phase===13,heavy=this.phase>=13;
          if(frameAt(this.animation,this.animationAge)>=5&&playerY>=504&&
             playerX>=center-(left?48:24)&&playerX<=center+(left?24:48))sim.hurt(1);
          if(ended){
            if(heavy){this.ceilingPulseAt=sim.tick+40;this.attackAt=this.nextAttack(sim.tick);}
            this.phase=left?4:5;nextAnim=this.phase;
          }
          break;
        }
        case 10:case 11:
          if(ended){
            if(sim.tick>this.attackAt)this.phase=this.phase===10?13:14;
            else if(playerY>=504&&Math.abs(playerX-center)<=48)this.phase=this.phase===10?6:7;
            else this.phase=this.phase===10?4:5;
            nextAnim=this.phase;
          }else this.x+=this.phase===10?-2:2;
          break;
      }
      if(playerY>=504&&playerX>=this.x&&playerX<=this.x+48)sim.hurt(1);
    }
    const healthBefore=this.health;
    this.stones(sim);
    if(this.phase!==12&&this.health===healthBefore)this.setAnimation(nextAnim<0?this.animation:nextAnim);
  }
  snapshot(){return {phase:this.phase,health:this.health,x:this.x,animation:this.animation,animationAge:this.animationAge,
    age:this.age,attackAt:this.attackAt,ceilingPulseAt:this.ceilingPulseAt,bridgePosition:this.bridgePosition,bridgeDirection:this.bridgeDirection,
    wallCells:[...this.wallCells],wallTypes:[...this.wallTypes]};}
}
