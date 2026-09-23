import type { LevelDefinition } from '../level/LevelParser.ts';
import { Camera } from './Camera.ts';
import { ENGINE_REVISION, levelFingerprint } from './Compatibility.ts';
import { animationFrameAt, BOULDER_BRACE_TICKS, BOULDER_PRESSURE_TICKS, CHEST_OPEN_DURATIONS, fireReach } from './PhaseOneRules.ts';
export type Direction=0|1|2|3|4;
export const DX=[0,0,1,0,-1], DY=[0,-1,0,1,0];
export interface InputFrame {direction:Direction;action:boolean;reset?:boolean}
export interface StageStart {diamonds:number;redDiamonds:number;lives:number;health:number}
export interface Replay {version:3;target:'1.2.0-s700';engine:typeof ENGINE_REVISION;levelFingerprint:string;world:number;level:number;initial:StageStart;inputs:InputFrame[]}
/** Tile cases which set var15=true in cGame.method_288. */
export const WALKABLE_TILES=new Set([-1,1,2,4,5,6,7,11,14,19,24,26,27,33,40,41,42,43,45,50,51,52,53]);
interface CheckpointState {
  tiles:Int16Array; state:Int32Array; motion:Int16Array; active:Int16Array; chestFrames:Int16Array;
  gatePhases:Int16Array;gateCounts:Int16Array;unlockedGates:number[];goldKeys:number;silverKeys:number;
  x:number;y:number;diamonds:number;redDiamonds:number;opened:number[];
}
/** Experimental, source-traced subset. Unsupported mechanics remain explicit in coverage. */
export class Simulation {
  level:LevelDefinition; tiles:Int16Array; state:Int32Array; motion:Int16Array; active:Int16Array;
  player={x:0,y:0,dx:1,dy:0,offset:0,direction:2 as Direction};
  camera=new Camera();tick=0;diamonds=0;redDiamonds=0;health=4;invulnerable=0;
  playerAnimation=1;animationTick=0;pushDelay=6;checkpoint=-1;status:'playing'|'dead'|'complete'='playing';
  opened=new Set<number>();events:string[]=[];inputs:InputFrame[]=[];
  chestFrames:Int16Array;checkpointOrder=-1;private savedCheckpoint!:CheckpointState;
  lives=5;hurtTicks=0;deathTicks=0;chestCell=-1;chestTicks=0;exitDirection:Direction=0;stonePressure=0;
  respawnTravel=false;respawnFlash=0;respawnTarget={x:0,y:0};
  enemySmoke:{cell:number;age:number}[]=[];hits=0;retries=0;
  goldKeys=0;silverKeys=0;gatePhases:Int16Array;gateCounts:Int16Array;unlockedGates=new Set<number>();
  permanentPickups=new Set<number>();
  pendingDirection:Direction=0;private actionHeld=false;private lastInputDirection:Direction=0;entranceGate=-1;
  readonly initial:StageStart;
  constructor(level:LevelDefinition,initial:StageStart={diamonds:0,redDiamonds:0,lives:5,health:4}){
    this.initial={...initial};this.diamonds=initial.diamonds;this.redDiamonds=initial.redDiamonds;
    this.lives=initial.lives;this.health=initial.health;
    this.level=level;this.tiles=Int16Array.from(level.tiles,t=>t===255?-1:t);this.state=new Int32Array(this.tiles.length);
    this.motion=new Int16Array(this.tiles.length);this.active=new Int16Array(this.tiles.length);
    this.chestFrames=new Int16Array(this.tiles.length);
    this.gatePhases=new Int16Array(this.tiles.length);this.gateCounts=new Int16Array(this.tiles.length);
    this.tiles.forEach((t,i)=>{
      const p=level.parameters[i]===255?-1:level.parameters[i];
      if(t===79){this.player.x=i%level.width;this.player.y=Math.floor(i/level.width);this.tiles[i]=-1;}
      if(t===12)this.tiles[i]=-1;
      if(t===0||t===1)this.active[i]=48;
      if(t===19||t===43){this.state[i]=p;this.active[i]=48;}
      if(t===22||t===23)this.active[i]=48;
    });
    // cGame.method_294/296: each numbered door waits for its matching locks.
    for(let i=0;i<this.tiles.length;i++)if(this.level.objects[i]===7){
      const id=this.level.parameters[i],x=i%level.width,y=Math.floor(i/level.width);
      this.gateCounts[i]=level.objects.reduce((count,o,j)=>count+([6,8,9].includes(o)&&level.parameters[j]===id?1:0),0);
      const above=this.index(x,y-1),below=this.index(x,y+1);
      if(level.objects[above]===17||(level.objects[below]===17&&level.objects[this.index(x-1,y)]!==26&&level.objects[this.index(x+1,y)]!==26))this.gatePhases[i]=3;
      else this.active[i]=48;
    }
    this.camera.y=Math.max(0,this.player.y*24-160);
    this.camera.update(this.player.x*24,this.player.y*24,level.width,level.height);
    this.wake(this.player.x,this.player.y);
    const spawn=this.index(this.player.x,this.player.y);
    if(level.world===0&&level.index===0&&this.player.x===4&&this.player.y===17)
      this.entranceGate=this.index(2,17);
    if(this.object(this.player.x,this.player.y)===4){this.checkpoint=spawn;this.checkpointOrder=level.parameters[spawn];}
    this.captureCheckpoint();
  }
  index(x:number,y:number){return x<0||y<0||x>=this.level.width||y>=this.level.height?-1:x+y*this.level.width;}
  tile(x:number,y:number){const i=this.index(x,y);return i<0?80:this.tiles[i];}
  object(x:number,y:number){const i=this.index(x,y);return i<0?255:i===this.entranceGate?7:this.level.objects[i];}
  isPlayer(x:number,y:number){return this.player.x===x&&this.player.y===y;}
  free(x:number,y:number){return this.tile(x,y)===-1&&![14,33,5,28].includes(this.object(x,y))&&!(this.object(x,y)===7&&this.gatePhases[this.index(x,y)]<2);}
  enemyFree(x:number,y:number){return this.tile(x,y)===-1&&![14,33,4,32,7].includes(this.object(x,y));}
  wake(x:number,y:number){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const i=this.index(x+dx,y+dy);if(i>=0)this.active[i]=48;}}
  hurt(amount:number,knockback:Direction=0){
    if(this.invulnerable||this.hurtTicks||this.deathTicks||this.chestCell>=0||this.status!=='playing')return;
    this.health=Math.max(0,this.health-amount);this.hurtTicks=8;this.invulnerable=40;
    this.hits++;
    this.pendingDirection=0;this.setAnimation(10);this.events.push('hurt');
    if(knockback){
      // method_61 tries the direction behind the attacker, then rotates if blocked.
      for(let n=0;n<4;n++){
        const direction=((knockback-1+n)%4+1) as Direction,x=this.player.x-DX[direction],y=this.player.y-DY[direction];
        if(this.tile(x,y)===-1&&this.object(x,y)===255){
          this.player.x=x;this.player.y=y;this.player.dx=-DX[direction];this.player.dy=-DY[direction];this.player.offset=18;break;
        }
      }
    }
  }
  private captureCheckpoint(){
    this.savedCheckpoint={tiles:this.tiles.slice(),state:this.state.slice(),motion:this.motion.slice(),active:this.active.slice(),
      chestFrames:this.chestFrames.slice(),gatePhases:this.gatePhases.slice(),gateCounts:this.gateCounts.slice(),
      unlockedGates:[...this.unlockedGates],goldKeys:this.goldKeys,silverKeys:this.silverKeys,
      x:this.player.x,y:this.player.y,diamonds:this.diamonds,redDiamonds:this.redDiamonds,opened:[...this.opened]};
  }
  restoreCheckpoint(heal=false,travel=false){
    const previousCamera={x:this.camera.x,y:this.camera.y};
    const save=this.savedCheckpoint;
    this.tiles.set(save.tiles);this.state.set(save.state);this.motion.set(save.motion);this.active.set(save.active);this.chestFrames.set(save.chestFrames);
    for(const i of this.permanentPickups)this.tiles[i]=-1;
    this.gatePhases.set(save.gatePhases);this.gateCounts.set(save.gateCounts);this.unlockedGates=new Set(save.unlockedGates);
    this.goldKeys=save.goldKeys;this.silverKeys=save.silverKeys;
    this.player={x:save.x,y:save.y,dx:0,dy:1,offset:0,direction:3};
    this.diamonds=save.diamonds;this.redDiamonds=save.redDiamonds;this.opened=new Set(save.opened);
    this.hurtTicks=0;this.deathTicks=0;this.chestCell=-1;this.chestTicks=0;this.exitDirection=0;this.pendingDirection=0;this.pushDelay=6;this.stonePressure=0;
    if(heal){this.health=4;this.invulnerable=40;}
    this.playerAnimation=2;this.animationTick=0;
    // method_347 reactivates the saved objects; it does not reset the global clock.
    for(let i=0;i<this.tiles.length;i++)if(this.tiles[i]>=0&&this.tiles[i]<80)this.wake(i%this.level.width,Math.floor(i/this.level.width));
    this.respawnTarget={x:Math.max(0,Math.min(this.level.width*24-240,save.x*24-120)),
      y:Math.max(0,Math.min(this.level.height*24-240,save.y*24-120))};
    this.camera.x=travel?previousCamera.x:this.respawnTarget.x;
    this.camera.y=travel?previousCamera.y:this.respawnTarget.y;
    this.respawnTravel=travel&&(this.camera.x!==this.respawnTarget.x||this.camera.y!==this.respawnTarget.y);
    this.respawnFlash=this.respawnTravel?0:12;
    this.events.push(this.respawnTravel?'respawn-start':'respawn');
  }
  /** S700 method_300 moves both camera axes toward the saved checkpoint by 8 px/tick. */
  private travelToCheckpoint(){
    for(const axis of ['x','y'] as const){const delta=this.respawnTarget[axis]-this.camera[axis];this.camera[axis]+=Math.sign(delta)*Math.min(8,Math.abs(delta));}
    if(this.camera.x===this.respawnTarget.x&&this.camera.y===this.respawnTarget.y){
      this.respawnTravel=false;this.respawnFlash=12;this.events.push('respawn');
    }
  }
  manualReset(){
    if(this.status!=='playing'||this.hurtTicks||this.deathTicks||this.respawnTravel)return;
    if(this.index(this.player.x,this.player.y)===this.checkpoint&&this.player.offset===0)this.restoreCheckpoint(false,true);
    else {this.health=0;this.hurtTicks=0;this.deathTicks=80;this.invulnerable=0;this.pendingDirection=0;this.setAnimation(19);this.events.push('death');}
  }
  setAnimation(n:number){if(n!==this.playerAnimation){this.playerAnimation=n;this.animationTick=0;}}
  /** Subset of method_351: normal gravity, diamonds, boulder support and delayed rolling. */
  updateFalling(x:number,y:number){
    const i=this.index(x,y),t=this.tiles[i];let s=this.state[i],m=this.motion[i],dir=s&7;
    const below=this.index(x,y+1);
    if(t===1&&this.overlap(x,y,dir,m)){this.tiles[i]=-1;this.diamonds++;this.events.push('diamond');this.wake(x,y);return;}
    if(m<=0){
      if(dir===3&&this.isPlayer(x,y+1)&&this.free(x,y+1)){if(t===0)this.hurt(2);this.state[i]=s&~7;}
      else if(this.free(x,y+1)&&!this.isPlayer(x,y)&&!this.isPlayer(x,y+1)&&
        // method_351's extra AABB test prevents falling through a departing hero.
        !(Math.abs(x*24-(this.player.x*24-this.player.dx*this.player.offset))<24&&
          Math.abs(y*24-(this.player.y*24-this.player.dy*this.player.offset-1))<24)){
        this.moveObject(i,below,t,(s+131072)&~7|3,18);this.wake(x,y);return;
      }else if([0,1].includes(this.tile(x,y+1))&&this.motion[below]<=0){
        s&=~4063232;
        const side=this.free(x-1,y)&&this.free(x-1,y+1)&&!this.isPlayer(x-1,y)?-1:this.free(x+1,y)&&this.free(x+1,y+1)&&!this.isPlayer(x+1,y)?1:0;
        if(side){this.motion[i]=((s&28672)>>12)+1;this.active[i]=24;s=((s&~7)|(side<0?4:2))&~3072|(side<0?2048:1024)|512;}
        this.state[i]=s;
      }else this.state[i]=s&~3072&~4063232&~7;
    }else if(!(s&512)){
      m-=6;
      if(m===0||m===12){if(s&1024)s=s&~56|(s+8)&56;else if(s&2048)s=s&~56|(s-8)&56;}
      this.motion[i]=m;
      if(m===0&&dir===3){
        this.active[i]=30;
        if(t===0&&!this.free(x,y+1))this.events.push('boulder');
        if(this.tile(x,y+1)===30)this.triggerBrick(x,y+1);
        if(!this.isPlayer(x,y+1))s&=~7;
      }
      this.state[i]=s;
    }else {
      const side=dir===4?-1:dir===2?1:0;
      if(this.free(x,y+1)&&!this.isPlayer(x,y+1)){
        m=Math.max(0,m-6);if(!m)s=s&~512&~7;this.motion[i]=m;this.state[i]=s;this.active[i]=24;
      }else if(side&&this.free(x+side,y)&&this.free(x+side,y+1)&&!this.isPlayer(x+side,y)&&!this.isPlayer(x+side,y+1)&&!(this.state[below]&512)){
        if(m>=6||(this.tick&3)===0)m++;
        if(m>=12){this.moveObject(i,this.index(x+side,y+1),t,s&~512&~7|3,12);this.wake(x,y);}
        else {this.motion[i]=m;this.state[i]=s;this.active[i]=24;}
      }else {m=Math.max(0,m-6);if(!m)s=s&~512&~7;this.motion[i]=m;this.state[i]=s;this.active[i]=24;}
    }
  }
  moveObject(from:number,to:number,t:number,state:number,motion:number){
    if(from!==to){this.tiles[from]=-1;this.state[from]=0;this.motion[from]=0;}
    this.tiles[to]=t;this.state[to]=state;this.motion[to]=motion;this.active[to]=48;
  }
  overlap(x:number,y:number,dir:number,m:number){
    if(Math.abs(x-this.player.x)>1||Math.abs(y-this.player.y)>1)return false;
    const px=this.player.x*24-this.player.dx*this.player.offset,py=this.player.y*24-this.player.dy*this.player.offset;
    // cGame.method_350 -> method_349 uses strict 24-pixel AABB overlap.
    return Math.abs(x*24-DX[dir]*m-px)<24&&Math.abs(y*24-DY[dir]*m-py)<24;
  }
  /** Shared method_325 patrol and boulder collision for ordinary and red snakes. */
  updateSnake(x:number,y:number){
    const i=this.index(x,y),kind=this.tiles[i];let s=this.state[i],dir=s&7,m=this.motion[i],tx=x,ty=y;
    const above=this.index(x,y-1);
    if(above>=0&&[0,1].includes(this.tiles[above])&&this.motion[above]<=6&&(this.state[above]&7)===3){this.tiles[i]=-1;this.enemySmoke.push({cell:i,age:0});this.events.push('enemy-death');this.wake(x,y);return;}
    if(m<=0){
      this.wake(x,y);
      if(!dir){dir=(s&28672)>>12;m=21;s=s&~7|dir;if(this.enemyFree(x+DX[dir],y+DY[dir])){tx+=DX[dir];ty+=DY[dir];}else m=0;}
      else if(this.enemyFree(x+DX[dir],y+DY[dir])){m=21;tx+=DX[dir];ty+=DY[dir];}
      else {const reverse=[0,3,4,1,2][dir];s=s&~28672|(reverse<<12);s&=~7;dir=0;m=21;}
      const dest=this.index(tx,ty);this.moveObject(i,dest,kind,s,m);
    }else {m=Math.max(0,m-3);this.motion[i]=m;}
    if(this.overlap(tx,ty,dir,Math.max(0,m)))this.hurt(1,dir as Direction);
  }
  triggerBrick(x:number,y:number){
    const i=this.index(x,y);
    if(i<0||this.tiles[i]!==30||this.state[i]>0)return;
    this.state[i]=1;this.active[i]=24;this.events.push('break');
  }
  /** cGame.method_329: a struck brick propagates to its neighbors at frame 4. */
  updateBrick(x:number,y:number){
    const i=this.index(x,y),age=this.state[i];if(age<=0)return;
    if(age===4)for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
      const j=this.index(x+dx,y+dy);
      if(j>=0&&this.tiles[j]===30&&this.state[j]===0){this.state[j]=1;this.active[j]=24;}
    }
    if(age>=16){this.tiles[i]=-1;this.state[i]=0;this.wake(x,y);}
    else {this.state[i]=age+1;this.active[i]=24;}
  }
  step(input:InputFrame){
    if(this.status!=='playing')return;
    this.inputs.push({...input});this.events=[];this.tick++;this.animationTick++;
    this.enemySmoke=this.enemySmoke.filter(s=>++s.age<14);
    if(input.reset){this.manualReset();return;}
    if(this.respawnTravel){this.travelToCheckpoint();return;}
    if(this.respawnFlash>0)this.respawnFlash--;
    if(this.invulnerable)this.invulnerable--;
    if(this.tick%3===0)for(let i=0;i<this.gatePhases.length;i++){
      if(this.gatePhases[i]===1||this.gatePhases[i]===2){this.gatePhases[i]++;this.active[i]=24;this.events.push('gate-opening');}
    }
    const actionPressed=input.action&&!this.actionHeld;this.actionHeld=input.action;
    if(input.direction&&input.direction!==this.lastInputDirection)this.pendingDirection=input.direction;
    this.lastInputDirection=input.direction;
    if(this.hurtTicks>0){
      this.invulnerable=40;
      if(--this.hurtTicks===0){
        if(this.health===0){this.deathTicks=80;this.setAnimation(12);this.events.push('death');}
        else this.setAnimation(this.player.direction-1);
      }
    }else if(this.deathTicks>0&&--this.deathTicks===0){
      if(--this.lives>=0){this.retries++;this.restoreCheckpoint(true,true);return;}else {this.status='dead';return;}
    }
    // method_304 precedes player movement; scan bottom-to-top, left-to-right, ±8.
    for(let y=Math.min(this.level.height-2,this.player.y+8);y>=Math.max(1,this.player.y-8);y--){
      for(let x=Math.max(1,this.player.x-8);x<=Math.min(this.level.width-2,this.player.x+8);x++){
        const i=this.index(x,y);if(this.active[i]<=0)continue;this.active[i]-=6;
        if(this.tiles[i]===0||this.tiles[i]===1)this.updateFalling(x,y);
        else if(this.tiles[i]===19||this.tiles[i]===43)this.updateSnake(x,y);
        else if(this.tiles[i]===30)this.updateBrick(x,y);
        else if(this.tiles[i]===22||this.tiles[i]===23){
          this.active[i]=24;const side=this.tiles[i]===23?-1:1;
          if(this.player.y===y)for(let n=0;n<=fireReach(this.tick);n++)if(this.player.x===x+n*side)this.hurt(1);
        }
        if(this.tiles[i]===10&&this.state[i]>0){this.tiles[i]=-1;this.wake(x,y);}
        if(this.chestFrames[i]>0&&this.chestFrames[i]<3&&((this.tick>>1)&1)===0)this.chestFrames[i]++;
      }
    }
    if(this.status!=='playing')return;
    const p=this.player;
    if(!this.hurtTicks&&!this.deathTicks&&p.offset<=6)for(let i=0;i<this.level.objects.length;i++){
      const kind=this.level.objects[i];
      if((kind!==8&&kind!==9)||this.unlockedGates.has(i))continue;
      const x=i%this.level.width,y=Math.floor(i/this.level.width);
      if(p.y!==y||Math.abs(p.x-x)!==1)continue;
      if(kind===8?this.silverKeys===0:this.goldKeys===0)continue;
      if(kind===8)this.silverKeys--;else this.goldKeys--;
      this.unlockedGates.add(i);this.events.push(kind===8?'silver-gate':'gold-gate');
      const id=this.level.parameters[i];
      for(let j=0;j<this.level.objects.length;j++)if(this.level.objects[j]===7&&this.level.parameters[j]===id){
        this.gateCounts[j]=Math.max(0,this.gateCounts[j]-1);
        if(this.gateCounts[j]===0&&this.gatePhases[j]===0)this.gatePhases[j]=1;
      }
    }
    const overhead=this.index(p.x,p.y-1);
    this.stonePressure=overhead>=0&&[0,8,9,48].includes(this.tiles[overhead])&&p.offset===0
      ?this.stonePressure+1:0;
    // cGame.method_236/260: a hero trapped under a boulder braces with
    // animation 11; when that animation ends (or the 40-tick timer expires),
    // the weight is fatal. Moving clear resets the pressure.
    if(this.stonePressure>0&&!this.hurtTicks&&!this.deathTicks&&this.chestCell<0){
      if(this.playerAnimation!==11)this.setAnimation(11);
    }
    if(this.chestCell>=0){
      this.chestTicks++;this.pendingDirection=0;
      if(animationFrameAt(CHEST_OPEN_DURATIONS,this.chestTicks,false)>=13&&!this.opened.has(this.chestCell)){
        this.opened.add(this.chestCell);
        const reward=this.tiles[this.chestCell];this.tiles[this.chestCell]=-1;
        if(reward===2)this.redDiamonds++;
        else if(reward===4)this.goldKeys++;
        else if(reward===5)this.silverKeys++;
        else if(reward===6)this.lives=Math.min(99,this.lives+1);
        else if(reward===7)this.health=4;
        else if(reward===41){const amount=this.level.parameters[this.chestCell];this.diamonds+=amount===255?1:Math.max(1,amount);}
        this.events.push('chest-reward');
      }
      if(this.chestTicks>=CHEST_OPEN_DURATIONS.reduce((a,b)=>a+b,0)){this.chestCell=-1;this.setAnimation(p.direction-1);}
      this.updateCamera();return;
    }
    if(this.hurtTicks||this.deathTicks){p.offset=Math.max(0,p.offset-6);this.pendingDirection=0;this.updateCamera();return;}
    if(actionPressed&&this.index(p.x,p.y)===this.checkpoint&&p.offset===0){this.restoreCheckpoint(false,true);return;}
    const direction=this.exitDirection||input.direction||this.pendingDirection;
    if(p.offset>0)p.offset=Math.max(0,p.offset-6);
    else if(direction){
      this.pendingDirection=0;p.direction=direction;p.dx=DX[p.direction];p.dy=DY[p.direction];
      const x=p.x+p.dx,y=p.y+p.dy,i=this.index(x,y),t=this.tile(x,y),o=this.object(x,y);
      let pass=WALKABLE_TILES.has(t)||t===10;
      // Gate object 7 is solid while its opening phase is below 2.
      if(o===7&&this.gatePhases[i]<2)pass=false;
      // The entrance corridor is closed after spawning. Exterior cells are only
      // reachable during the original automatic exit walk.
      if(!this.exitDirection&&(x<=0||y<=0||x>=this.level.width-1||y>=this.level.height-1))pass=false;
      if(this.exitDirection)pass=true;
      // method_288: do not enter the trailing portion of a descending boulder.
      const belowTarget=this.index(x,y+1);
      if(p.dx&&this.tile(x,y+1)===0&&belowTarget>=0&&(this.state[belowTarget]&7)===3&&this.motion[belowTarget]>0)pass=false;
      if(t===0&&p.dx){
        this.pushDelay--;this.setAnimation(p.dx>0?8:9);
        if(this.pushDelay<0&&this.free(x+p.dx,y)&&this.motion[i]===0&&![19,43,45,49].includes(this.tile(x,y+1))){
          this.moveObject(i,this.index(x+p.dx,y),0,(this.state[i]&~(7|3072|512))|p.direction| (p.dx>0?1024:2048),18);this.wake(x+p.dx,y);pass=true;
        }
      }else this.pushDelay=6;
      if(pass){
        this.wake(p.x,p.y);p.x=x;p.y=y;p.offset=18;this.wake(x,y);this.setAnimation(3+p.direction);
        if(t===10){this.state[i]=1;this.events.push('grass');}
      }else if(t!==0&&this.stonePressure===0)this.setAnimation(p.direction-1);
    }else {this.pushDelay=6;if(this.stonePressure===0)this.setAnimation(p.direction-1);}
    const i=this.index(p.x,p.y),t=this.tiles[i],o=this.level.objects[i];
    if(p.offset===0){
      const insideChest=[14,33].includes(o);
      if(!insideChest&&(t===4||t===5)){this.tiles[i]=-1;if(t===4)this.goldKeys++;else this.silverKeys++;this.events.push(t===4?'gold-key':'silver-key');}
      if(!insideChest&&t===6){this.tiles[i]=-1;this.permanentPickups.add(i);if(this.lives>=99){this.health=4;this.events.push('health');}else{this.lives++;this.events.push('extra-life');}}
      if(!insideChest&&t===7){this.tiles[i]=-1;this.health=4;this.events.push('health');}
      if(o===4&&this.level.parameters[i]>this.checkpointOrder){this.checkpoint=i;this.checkpointOrder=this.level.parameters[i];this.captureCheckpoint();this.events.push('checkpoint');}
      if([14,33].includes(o)&&!this.opened.has(i)&&this.chestFrames[i]===0){
        this.chestCell=i;this.chestTicks=0;this.chestFrames[i]=1;this.setAnimation(40);this.events.push('chest');
      }else if(!insideChest&&t===2&&!this.opened.has(i)){this.tiles[i]=-1;this.redDiamonds++;this.events.push('red-diamond');}
      if(o===5||o===28)this.exitDirection=p.direction;
      if(this.exitDirection&&(p.x>this.level.width+5||p.x< -5||p.y>this.level.height+5||p.y< -5)){this.status='complete';this.events.push('complete');}
    }
    const rockAbove=this.index(p.x,p.y-1);
    if(p.offset>0||rockAbove<0||![0,8,9,48].includes(this.tiles[rockAbove]))this.stonePressure=0;
    else if((this.animationTick>=BOULDER_BRACE_TICKS||this.stonePressure>=BOULDER_PRESSURE_TICKS)&&!this.invulnerable)
      this.hurt(4);
    this.updateCamera();
  }
  private updateCamera(){const p=this.player;this.camera.update(p.x*24-p.dx*p.offset,p.y*24-p.dy*p.offset,this.level.width,this.level.height);}
  replay():Replay{return {version:3,target:'1.2.0-s700',engine:ENGINE_REVISION,levelFingerprint:levelFingerprint(this.level),world:this.level.world,level:this.level.index,initial:{...this.initial},inputs:this.inputs.map(i=>({...i}))};}
  snapshot(){return {tick:this.tick,player:{...this.player},camera:{x:this.camera.x,y:this.camera.y},tiles:[...this.tiles],state:[...this.state],motion:[...this.motion],active:[...this.active],diamonds:this.diamonds,redDiamonds:this.redDiamonds,goldKeys:this.goldKeys,silverKeys:this.silverKeys,gatePhases:[...this.gatePhases],gateCounts:[...this.gateCounts],unlockedGates:[...this.unlockedGates],permanentPickups:[...this.permanentPickups],health:this.health,invulnerable:this.invulnerable,status:this.status,playerAnimation:this.playerAnimation,animationTick:this.animationTick,pushDelay:this.pushDelay,checkpoint:this.checkpoint,checkpointOrder:this.checkpointOrder,opened:[...this.opened],chestFrames:[...this.chestFrames],chestCell:this.chestCell,chestTicks:this.chestTicks,lives:this.lives,hurtTicks:this.hurtTicks,deathTicks:this.deathTicks,respawnTravel:this.respawnTravel,respawnFlash:this.respawnFlash,respawnTarget:{...this.respawnTarget},exitDirection:this.exitDirection,stonePressure:this.stonePressure,pendingDirection:this.pendingDirection,lastInputDirection:this.lastInputDirection,actionHeld:this.actionHeld,entranceGate:this.entranceGate,enemySmoke:this.enemySmoke.map(s=>({...s})),hits:this.hits,retries:this.retries,savedCheckpoint:structuredClone(this.savedCheckpoint)};}
}
