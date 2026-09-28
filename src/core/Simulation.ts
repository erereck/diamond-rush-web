import type { LevelDefinition } from '../level/LevelParser.ts';
import { Camera } from './Camera.ts';
import { ENGINE_REVISION, levelFingerprint } from './Compatibility.ts';
import { animationFrameAt, BOULDER_BRACE_TICKS, BOULDER_PRESSURE_TICKS, CHEST_OPEN_DURATIONS, GRASS_DESTRUCTION_FRAMES, ITEM_PRESENTATION_TICKS, MANUAL_RESET_TICKS, fireReach, HAMMER_ATTACK_TICKS, HAMMER_BOUNCE_TICKS, HAMMER_IMPACT_TICK } from './PhaseOneRules.ts';
import { spikeExtension, spikeReach } from './LaterStageRules.ts';
import { AngkorBoss } from './AngkorBoss.ts';
import { BavariaBoss } from './BavariaBoss.ts';
import { TibetBoss } from './TibetBoss.ts';
import { RiddleRooms } from './RiddleRooms.ts';
import type { RiddleState } from './RiddleRooms.ts';
import { IceBridges } from './IceBridges.ts';
export type Direction=0|1|2|3|4;
export const DX=[0,0,1,0,-1], DY=[0,-1,0,1,0];
export interface DemoEdit {cell:number;object?:number;parameter?:number;state?:number;checkpoint?:boolean}
export interface InputFrame {direction:Direction;action:boolean;reset?:boolean;scripted?:boolean;scriptedView?:{x:number;y:number;follow:boolean};demoEdits?:DemoEdit[]}
export interface StageStart {diamonds:number;redDiamonds:number;lives:number;health:number;weaponTier?:0|1|2|8;openedChests?:number[]}
export interface Replay {version:3;target:'1.2.0-s700';engine:typeof ENGINE_REVISION;levelFingerprint:string;world:number;level:number;initial:StageStart;inputs:InputFrame[]}
/** Tile cases which set var15=true in cGame.method_288. */
export const WALKABLE_TILES=new Set([-1,1,2,4,5,6,7,11,14,19,24,26,27,33,40,41,42,43,45,50,51,52,53]);
interface CheckpointState {
  tiles:Int16Array; state:Int32Array; motion:Int16Array; active:Int16Array; chestFrames:Int16Array; frozenKinds:Int16Array;
  objects:number[];parameters:number[];
  gatePhases:Int16Array;gateCounts:Int16Array;unlockedGates:number[];goldKeys:number;silverKeys:number;
  x:number;y:number;diamonds:number;redDiamonds:number;opened:number[];
  riddles:RiddleState;
  bridges:{position:number;direction:number};
}
/** Experimental, source-traced subset. Unsupported mechanics remain explicit in coverage. */
export class Simulation {
  level:LevelDefinition; tiles:Int16Array; state:Int32Array; motion:Int16Array; active:Int16Array;
  player={x:0,y:0,dx:1,dy:0,offset:0,direction:2 as Direction};
  camera=new Camera();tick=0;diamonds=0;redDiamonds=0;health=4;invulnerable=0;
  playerAnimation=1;animationTick=0;pushDelay=6;checkpoint=-1;status:'playing'|'dead'|'complete'='playing';
  opened=new Set<number>();events:string[]=[];inputs:InputFrame[]=[];
  chestFrames:Int16Array;checkpointOrder=-1;private savedCheckpoint!:CheckpointState;
  lives=5;hurtTicks=0;deathTicks=0;chestCell=-1;chestTicks=0;exitDirection:Direction=0;exitObject:0|5|28=0;stonePressure=0;
  pendingCrystalCompletion=false;
  chestReward=-1;chestRewardAmount=0;
  itemSparkles:{x:number;y:number;kind:number;age:number}[]=[];
  respawnTravel=false;respawnFlash=0;respawnTarget={x:0,y:0};
  enemySmoke:{cell:number;age:number}[]=[];hits=0;retries=0;
  bonusDiamondTotal=0;
  weaponTier:0|1|2|8=0;attackTicks=0;
  pendingHammer:{x:number;y:number}|null=null;
  hook:{x:number;y:number;direction:2|4;ticks:number}|null=null;
  frozenKinds:Int16Array;permanentEquipmentChests=new Set<number>();
  goldKeys=0;silverKeys=0;gatePhases:Int16Array;gateCounts:Int16Array;unlockedGates=new Set<number>();
  permanentPickups=new Set<number>();
  pendingDirection:Direction=0;private actionHeld=false;private lastInputDirection:Direction=0;entranceGate=-1;
  readonly initial:StageStart;
  readonly initialLevelFingerprint:string;
  boss:AngkorBoss|BavariaBoss|TibetBoss|null=null;
  riddles=new RiddleRooms();
  bridges=new IceBridges();
  constructor(level:LevelDefinition,initial:StageStart={diamonds:0,redDiamonds:0,lives:5,health:4}){
    this.initialLevelFingerprint=levelFingerprint(level);
    this.initial={...initial,...(initial.openedChests?{openedChests:[...initial.openedChests]}:{})};this.diamonds=initial.diamonds;this.redDiamonds=initial.redDiamonds;
    this.lives=initial.lives;this.health=initial.health;this.weaponTier=initial.weaponTier??0;
    this.level={...level,tiles:[...level.tiles],parameters:[...level.parameters],objects:[...level.objects]};
    if(level.world===0&&level.index===8)this.boss=new AngkorBoss();
    if(level.world===1&&level.index===9)this.boss=new BavariaBoss();
    if(level.world===2&&level.index===10)this.boss=new TibetBoss();
    this.tiles=Int16Array.from(level.tiles,t=>t===255?-1:t);this.state=new Int32Array(this.tiles.length);
    this.motion=new Int16Array(this.tiles.length);this.active=new Int16Array(this.tiles.length);
    this.chestFrames=new Int16Array(this.tiles.length);this.frozenKinds=new Int16Array(this.tiles.length).fill(-1);
    this.gatePhases=new Int16Array(this.tiles.length);this.gateCounts=new Int16Array(this.tiles.length);
    this.tiles.forEach((t,i)=>{
      const p=level.parameters[i]===255?-1:level.parameters[i];
      if(t===79){this.player.x=i%level.width;this.player.y=Math.floor(i/level.width);this.tiles[i]=-1;}
      if(t===12)this.tiles[i]=-1;
      // cGame's level initialization turns tile 34 into the open half of
      // the alternating ice bridge (background object 15). Tile 35 stays solid.
      if(t===34){this.tiles[i]=-1;this.level.objects[i]=15;}
      if(t===35)this.level.objects[i]=255;
      if(t===0||t===1||t===8)this.active[i]=48;
      if(t===19||t===43||t===49){this.state[i]=p;this.active[i]=48;}
      if(t===43)this.state[i]=(p&~98304)|65536;
      if(t===11){this.state[i]=p===1?16:0;this.active[i]=48;}
      if(t===45||t===46){this.state[i]=0;this.motion[i]=0;this.active[i]=24;}
      if(t===22||t===23)this.active[i]=48;
      if(t===14){this.state[i]=p===4?8:0;this.active[i]=24;}
      if(t===16){this.state[i]=p<0?2:p;this.active[i]=24;}
      if(t===28){this.state[i]=p<0?0:p>10?(Math.floor(p/11)|8):p;this.active[i]=24;}
      if(t===44){this.state[i]=0;this.active[i]=24;}
      if(t===36){this.state[i]=p===1?1:0;this.active[i]=24;}
      if(t===37){this.state[i]=0;this.active[i]=24;}
    });
    // loadLevelData creates the upper half of each paired Bavaria crusher.
    for(let y=1;y<level.height-1;y++)for(let x=1;x<level.width-1;x++){
      const i=this.index(x,y),above=this.index(x,y-1),below=this.index(x,y+1);
      if(this.tiles[i]===16&&this.tiles[below]!==16&&this.tiles[above]!==16){
        this.tiles[above]=16;this.state[above]=this.state[i];this.active[above]=24;
      }
    }
    // The equipment level lives in recordData[9], so revisiting its chest
    // after a campaign save must not award the same upgrade a second time.
    for(let i=0;i<this.tiles.length;i++){
      const reward=this.tiles[i],required=reward===24?1:reward===27?2:reward===26?8:0;
      if(required&&this.weaponTier>=required&&[14,33].includes(level.objects[i])){
        this.tiles[i]=-1;this.chestFrames[i]=level.objects[i]===14?2:3;this.opened.add(i);this.permanentEquipmentChests.add(i);
      }
    }
    for(const i of initial.openedChests??[])if(i>=0&&i<this.tiles.length&&[14,33].includes(level.objects[i])){
      this.tiles[i]=-1;this.chestFrames[i]=level.objects[i]===14?2:3;this.opened.add(i);
    }
    this.riddles.initialize(this);
    // cGame.method_294/296: activate plates/triggers and count each door's linked locks.
    for(let i=0;i<this.tiles.length;i++)if([6,26].includes(this.level.objects[i]))this.active[i]=48;
    for(let i=0;i<this.tiles.length;i++)if(this.level.objects[i]===7){
      const id=this.level.parameters[i],x=i%level.width,y=Math.floor(i/level.width);
      this.gateCounts[i]=level.objects.reduce((count,o,j)=>count+([6,8,9].includes(o)&&level.parameters[j]===id?1:0),0);
      const above=this.index(x,y-1),below=this.index(x,y+1);
      if(this.level.objects[above]===17||(this.level.objects[below]===17&&level.objects[this.index(x-1,y)]!==26&&level.objects[this.index(x+1,y)]!==26)){
        this.gatePhases[i]=3;this.active[i]=24;
        if(this.level.objects[above]===17){this.level.objects[above]=255;this.level.parameters[above]=255;}
      }
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
  applyDemoEdit(edit:DemoEdit,record=false){
    if(edit.cell<0||edit.cell>=this.tiles.length)return;
    if(edit.object!==undefined)this.level.objects[edit.cell]=edit.object;
    if(edit.parameter!==undefined)this.level.parameters[edit.cell]=edit.parameter;
    if(edit.state!==undefined)this.state[edit.cell]=edit.state;
    if(edit.checkpoint){
      if(edit.object!==undefined)this.savedCheckpoint.objects[edit.cell]=edit.object;
      if(edit.parameter!==undefined)this.savedCheckpoint.parameters[edit.cell]=edit.parameter;
      if(edit.state!==undefined)this.savedCheckpoint.state[edit.cell]=edit.state;
    }
    if(record&&this.inputs.length)(this.inputs[this.inputs.length-1].demoEdits??=[]).push({...edit});
  }
  tile(x:number,y:number){const i=this.index(x,y);return i<0?80:this.tiles[i];}
  object(x:number,y:number){const i=this.index(x,y);return i<0?255:i===this.entranceGate?7:this.level.objects[i];}
  isPlayer(x:number,y:number){return this.player.x===x&&this.player.y===y;}
  /** method_309: grass debris is only foreground; it cannot support a stone. */
  free(x:number,y:number){return this.tile(x,y)===-1&&![14,33,5,28].includes(this.object(x,y));}
  /** method_310: enemies also avoid circles and grass destruction effects. */
  enemyFree(x:number,y:number){return this.tile(x,y)===-1&&![14,33,4,32].includes(this.object(x,y))&&!(this.object(x,y)===7&&this.gatePhases[this.index(x,y)]===0);}
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
      objects:[...this.level.objects],parameters:[...this.level.parameters],
      chestFrames:this.chestFrames.slice(),frozenKinds:this.frozenKinds.slice(),gatePhases:this.gatePhases.slice(),gateCounts:this.gateCounts.slice(),
      unlockedGates:[...this.unlockedGates],goldKeys:this.goldKeys,silverKeys:this.silverKeys,
      x:this.player.x,y:this.player.y,diamonds:this.diamonds,redDiamonds:this.redDiamonds,opened:[...this.opened],riddles:this.riddles.snapshot(),bridges:this.bridges.snapshot()};
  }
  restoreCheckpoint(heal=false,travel=false){
    const previousCamera={x:this.camera.x,y:this.camera.y};
    const save=this.savedCheckpoint;
    this.tiles.set(save.tiles);this.state.set(save.state);this.motion.set(save.motion);this.active.set(save.active);this.chestFrames.set(save.chestFrames);this.frozenKinds.set(save.frozenKinds);
    this.level.objects.splice(0,this.level.objects.length,...save.objects);
    this.level.parameters.splice(0,this.level.parameters.length,...save.parameters);
    for(const i of this.permanentPickups){this.tiles[i]=-1;if([14,33].includes(this.level.objects[i]))this.chestFrames[i]=this.level.objects[i]===14?2:3;}
    for(const i of this.permanentEquipmentChests){this.tiles[i]=-1;this.chestFrames[i]=this.level.objects[i]===14?2:3;}
    this.gatePhases.set(save.gatePhases);this.gateCounts.set(save.gateCounts);this.unlockedGates=new Set(save.unlockedGates);
    this.goldKeys=save.goldKeys;this.silverKeys=save.silverKeys;
    this.riddles.restore(save.riddles);
    this.bridges.restore(save.bridges);
    this.boss?.reset();
    this.player={x:save.x,y:save.y,dx:0,dy:1,offset:0,direction:3};
    this.diamonds=save.diamonds;this.redDiamonds=save.redDiamonds;this.opened=new Set([...save.opened,...this.permanentEquipmentChests,...[...this.permanentPickups].filter(i=>[14,33].includes(this.level.objects[i]))]);
    this.hurtTicks=0;this.deathTicks=0;this.chestCell=-1;this.chestTicks=0;this.exitDirection=0;this.exitObject=0;this.pendingDirection=0;this.pushDelay=6;this.stonePressure=0;this.attackTicks=0;this.pendingHammer=null;this.hook=null;
    this.pendingCrystalCompletion=false;
    this.chestReward=-1;this.chestRewardAmount=0;this.itemSparkles=[];
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
    else {this.hurtTicks=0;this.deathTicks=MANUAL_RESET_TICKS;this.invulnerable=0;this.pendingDirection=0;this.setAnimation(19);this.events.push('death');}
  }
  setAnimation(n:number){if(n!==this.playerAnimation){this.playerAnimation=n;this.animationTick=0;}}
  private setLocomotionAnimation(n:number){
    // method_211/260 select different idle/walk/push poses without a tile
    // supporting the hero. The newly selected animation advances this tick.
    const below=this.tile(this.player.x,this.player.y+1);
    if((below<0||below===14)&&(n===1||n===3))n=n===1?35:34;
    if(below<0&&[5,7,8,9].includes(n))n=n===5?24:n===7?25:n===8?26:27;
    const changed=n!==this.playerAnimation;this.setAnimation(n);
    if(changed)this.animationTick=1;
  }
  /** Subset of method_351: normal gravity, diamonds, ice blocks, boulder support and delayed rolling. */
  updateFalling(x:number,y:number){
    const i=this.index(x,y),t=this.tiles[i];let s=this.state[i],m=this.motion[i],dir=s&7;
    const below=this.index(x,y+1);
    if(t===1&&this.overlap(x,y,dir,m)){this.tiles[i]=-1;this.diamonds++;this.events.push('diamond');this.wake(x,y);return;}
    if(m<=0){
      if(!this.free(x,y+1)&&((s&4063232)>>17)>=2){
        if(t===8){this.tiles[i]=54;this.state[i]=0;this.active[i]=24;this.wake(x,y);return;}
        if(this.tiles[below]===8&&this.motion[below]<=0){this.tiles[below]=54;this.state[below]=0;this.active[below]=24;this.wake(x,y+1);return;}
      }
      if(dir===3&&this.isPlayer(x,y+1)&&this.free(x,y+1)){if(t===0||t===9)this.hurt(2);this.state[i]=s&~7;}
      else if(this.free(x,y+1)&&!this.isPlayer(x,y)&&!this.isPlayer(x,y+1)&&
        // method_351's extra AABB test prevents falling through a departing hero.
        !(Math.abs(x*24-(this.player.x*24-this.player.dx*this.player.offset))<24&&
          Math.abs(y*24-(this.player.y*24-this.player.dy*this.player.offset-1))<24)){
        this.moveObject(i,below,t,(s+131072)&~7|3,18);this.wake(x,y);return;
      }else if([0,1,8,9].includes(this.tile(x,y+1))&&this.motion[below]<=0){
        s&=~4063232;
        const side=this.free(x-1,y)&&this.free(x-1,y+1)&&!this.isPlayer(x-1,y)?-1:this.free(x+1,y)&&this.free(x+1,y+1)&&!this.isPlayer(x+1,y)?1:0;
        if(side){this.motion[i]=((s&28672)>>12)+1;this.active[i]=24;s=((s&~7)|(side<0?4:2))&~3072|(side<0?2048:1024)|512;}
        this.state[i]=s;
      }else this.state[i]=s&~3072&~4063232&~7;
    }else if(!(s&512)){
      // method_351 sinks a descending weight into a pressure plate one pixel
      // on odd ticks, after reaching its last 12 pixels of travel.
      const plateLanding=dir===3&&this.object(x,y)===6&&m<=12;
      m-=plateLanding?(this.tick&1):6;
      if(plateLanding)this.active[i]=24;
      if(m===0||m===12){if(s&1024)s=s&~56|(s+8)&56;else if(s&2048)s=s&~56|(s-8)&56;}
      this.motion[i]=m;
      if(m===0&&dir===3){
        if(plateLanding)s&=~448;
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
    if(from!==to){
      this.tiles[from]=-1;this.state[from]=0;this.motion[from]=0;
      this.frozenKinds[to]=this.frozenKinds[from];this.frozenKinds[from]=-1;
    }
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
    if(above>=0&&[0,1].includes(this.tiles[above])&&this.motion[above]<=6&&(this.state[above]&7)===3){this.tiles[i]=-1;this.destroyEffect(i);this.wake(x,y);return;}
    if(s&248){
      if((this.tick&3)===0){s-=8;if(kind===43&&(s&248)===0)s=s&~3840|3072;this.state[i]=s;}
      this.active[i]=24;return;
    }
    if(m<=0){
      this.wake(x,y);
      if(kind===43&&(s&3840)){
        // method_325 uses method_324 for the red snake's short pursuit after a hit.
        const gapX=this.player.x-x,gapY=this.player.y-y;
        const horizontal:Direction=gapX>0?2:gapX<0?4:0;
        const vertical:Direction=gapY>0?3:gapY<0?1:0;
        const choices=Math.abs(gapX)>Math.abs(gapY)?[horizontal,vertical]:[vertical,horizontal];
        dir=choices.find(side=>side>0&&this.enemyFree(x+DX[side],y+DY[side]))??0;
        m=dir?18:0;s=(s&~7)|dir;s-=256;
        tx+=DX[dir];ty+=DY[dir];
      }
      else if(!dir){dir=(s&28672)>>12;m=21;s=s&~7|dir;if(this.enemyFree(x+DX[dir],y+DY[dir])){tx+=DX[dir];ty+=DY[dir];}else m=0;}
      else if(this.enemyFree(x+DX[dir],y+DY[dir])){m=21;tx+=DX[dir];ty+=DY[dir];}
      else {const reverse=[0,3,4,1,2][dir];s=s&~28672|(reverse<<12);s&=~7;dir=0;m=21;}
      const dest=this.index(tx,ty);this.moveObject(i,dest,kind,s,m);
    }else {m=Math.max(0,m-3);this.motion[i]=m;}
    if(this.overlap(tx,ty,dir,Math.max(0,m)))this.hurt(1,dir as Direction);
  }
  /** cGame.method_206: Tibet's ice creature changes direction on AF completion. */
  updateIceCreature(x:number,y:number){
    const i=this.index(x,y),above=this.index(x,y-1);
    if(above>=0&&[0,1].includes(this.tiles[above])&&this.motion[above]<=6&&(this.state[above]&7)===3){
      this.tiles[i]=-1;this.destroyEffect(i);this.wake(x,y);return;
    }
    const durations=[16,16,6,6,12,12,12,12,12,12,100];
    const state=this.state[i],phase=state&15,age=((state&2088960)>>13)+1;
    const duration=durations[phase]??16;
    this.active[i]=24;this.motion[i]=phase>=4&&phase<=9?12:0;
    if(age>duration/2&&phase!==10&&this.overlap(x,y,0,0))this.hurt(1);
    if(age<duration){this.state[i]=(state&~2088960)|(age<<13);return;}
    const gapX=x-this.player.x,gapY=y-this.player.y;
    const horizontal:Direction=gapX>0?4:gapX<0?2:0;
    const vertical:Direction=gapY>0?1:gapY<0?3:0;
    let direction:Direction=0;
    if(Math.abs(gapX)>Math.abs(gapY)&&horizontal&&this.free(x+DX[horizontal],y))direction=horizontal;
    if(!direction&&vertical&&this.free(x,y+DY[vertical]))direction=vertical;
    if(!direction&&horizontal&&this.free(x+DX[horizontal],y))direction=horizontal;
    const facingLeft=[0,3,4,7,9].includes(phase);
    let nextPhase=direction===4?3:2,tx=x,ty=y;
    if(facingLeft===(direction===4)){
      tx=x+DX[direction];ty=y+DY[direction];
      nextPhase=direction===4?9:direction===3?facingLeft?7:8:direction===1?facingLeft?4:5:direction===2?6:facingLeft?0:1;
      if(!direction||!this.free(tx,ty)){tx=x;ty=y;nextPhase=0;}
    }
    const to=this.index(tx,ty);
    this.moveObject(i,to,45,(state&7168)|nextPhase,0);this.wake(tx,ty);
  }
  /** cGame.method_312: the Tibet shooter falls between ledges and aims a dart. */
  updateIceShooter(x:number,y:number){
    const i=this.index(x,y),above=this.index(x,y-1),state=this.state[i],phase=state&31;
    if(above>=0&&[0,1].includes(this.tiles[above])&&this.motion[above]<=6&&(this.state[above]&7)===3){
      this.tiles[i]=-1;this.destroyEffect(i);this.wake(x,y);return;
    }
    this.active[i]=24;
    if(phase===8||phase===9){
      this.motion[i]-=6;
      if(this.motion[i]>0){if(this.overlap(x,y,3,this.motion[i]))this.hurt(1);return;}
      if(this.free(x,y+1)&&!this.isPlayer(x,y+1)){
        this.moveObject(i,this.index(x,y+1),46,phase,18);this.wake(x,y+1);
      }else {this.state[i]=phase===8?10:11;this.motion[i]=0;}
      return;
    }
    if(this.free(x,y+1)&&!this.isPlayer(x,y+1)){
      this.moveObject(i,this.index(x,y+1),46,(phase&1)?9:8,18);this.wake(x,y+1);return;
    }
    if(this.overlap(x,y,0,0))this.hurt(1);
    const durations=[14,14,14,14,8,8,8,8,1,1,4,4,14,14,14,1,1,1];
    const age=((state&8160)>>5)+1,duration=durations[phase]??14;
    const firstFrame=phase>=4&&phase<=7?2:0;
    if(firstFrame&&age===firstFrame){
      const direction:Direction=phase===4?4:phase===5?2:1;
      const tx=x+DX[direction],ty=y+DY[direction],to=this.index(tx,ty);
      if(to>=0&&this.free(tx,ty)){
        this.tiles[to]=21;this.state[to]=direction;this.motion[to]=18;this.active[to]=48;
        this.wake(tx,ty);this.events.push('enemy-shot');
      }
    }
    if(age<=duration){this.state[i]=(state&~8160)|(age<<5);return;}
    const gapX=this.player.x-x,gapY=this.player.y-y;
    const nextPhase=Math.abs(gapX)>Math.abs(gapY)?gapX<0?4:5:gapY<0?gapX<0?6:7:gapX<0?0:1;
    this.state[i]=nextPhase;this.motion[i]=0;
  }
  /** cGame.method_334: a Tibet dart crosses cells and bursts at an obstacle. */
  updateIceDart(x:number,y:number){
    const i=this.index(x,y),state=this.state[i],direction=(state&7) as Direction;
    this.active[i]=24;
    if(state&8){if(++this.motion[i]>=8){this.tiles[i]=-1;this.state[i]=0;this.motion[i]=0;this.wake(x,y);}return;}
    if(this.overlap(x,y,direction,Math.max(0,this.motion[i])))this.hurt(1);
    if(this.motion[i]>0){this.motion[i]=Math.max(0,this.motion[i]-12);return;}
    const tx=x+DX[direction],ty=y+DY[direction],to=this.index(tx,ty);
    if(to>=0&&this.free(tx,ty)){
      this.moveObject(i,to,21,direction,direction===4?12:24);this.wake(tx,ty);
      if(this.overlap(tx,ty,direction,this.motion[to]))this.hurt(1);
      return;
    }
    if(to>=0){
      if(this.tiles[to]===10){this.state[to]=1;this.active[to]=24;this.events.push('grass');}
      if(this.tiles[to]===30)this.triggerBrick(tx,ty);
      if([19,43,45,46,49].includes(this.tiles[to])){
        this.tiles[to]=-1;this.destroyEffect(to);this.wake(tx,ty);
      }
    }
    this.state[i]=direction|8;this.motion[i]=0;this.events.push('dart-impact');
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
  /** cGame.method_338: timed spikes damage at the currently extended tip. */
  updateSpikes(x:number,y:number){
    const i=this.index(x,y),s=this.state[i],down=(s&7)===3,alternate=(s&8)!==0;
    const reach=spikeReach(this.tick,alternate),tipY=y+(reach-1)*(down?1:-1);
    if(this.isPlayer(x,tipY))this.hurt(2,down?3:1);
    const tip=this.index(x,tipY);
    if(tip>=0&&tip!==i&&![-1,28,32].includes(this.tiles[tip])){
      if([19,43,45,46,49].includes(this.tiles[tip])){
        this.destroyEffect(tip);
      }
      this.tiles[tip]=-1;this.state[tip]=0;this.motion[tip]=0;
      this.wake(x,tipY);this.events.push('spike-impact');
    }
    this.active[i]=24;
  }
  /** cGame.method_336: Scotland rolling hazard falls first, then travels sideways. */
  updateRollingHazard(x:number,y:number){
    const i=this.index(x,y),s=this.state[i],side=(s&8)?-1:1,
      direction=(s&7) as Direction,cooldown=(s>>8)&255;
    this.active[i]=24;
    if(this.overlap(x,y,direction,this.motion[i]))this.hurt(1,direction);
    if(cooldown>=20){
      if(this.free(x,y+1)||this.free(x+side,y))this.state[i]=(s&~0xff00)|(19<<8);
      return;
    }
    if(cooldown>0){this.state[i]=(s&~0xff00)|((cooldown-1)<<8);return;}
    if(this.motion[i]>0){this.motion[i]=Math.max(0,this.motion[i]-6);return;}
    let tx=x,ty=y,nextDirection:Direction=side<0?4:2;
    if(this.free(x,y+1)){ty++;nextDirection=3;}
    else if(this.free(x+side,y))tx+=side;
    else {
      // method_336 keeps retrying immediately beside moving obstacles.
      this.state[i]=[16,19,43].includes(this.tile(x+side,y))?(s&~0xff07):(s&~0xff00)|(20<<8);
      return;
    }
    const to=this.index(tx,ty),nextState=(s&~0xff07)|nextDirection;
    this.moveObject(i,to,14,nextState,18);this.active[to]=24;
    this.wake(tx,ty);
    if(this.overlap(tx,ty,nextDirection,18))this.hurt(1,nextDirection);
  }
  /** cGame.method_337: the two-tile crusher waits for approach, then strikes. */
  updateCrusher(x:number,y:number){
    const i=this.index(x,y);
    this.active[i]=24;
    if(this.tile(x,y+1)===16)return; // Upper half shares the lower timer.
    const above=this.index(x,y-1),paired=this.tiles[above]===16;
    const side=(this.state[i]&7)===4?1:-1;
    const adjacent=this.isPlayer(x+side,y)||(paired&&this.isPlayer(x+side,y-1));
    if(this.motion[i]<=0&&adjacent){
      this.motion[i]=36;this.events.push('crusher-trigger');
    }else if(this.motion[i]>0){
      this.motion[i]--;
      if(this.motion[i]<=11&&adjacent)this.hurt(1,side<0?2:4);
    }
    if(paired){this.motion[above]=this.motion[i];this.active[above]=24;}
  }
  /** cGame.method_314: a Tibet ceiling stone warns, drops, then shatters. */
  updateCeilingTrap(x:number,y:number){
    const i=this.index(x,y),phase=(this.state[i]&56)>>3;
    this.active[i]=24;
    if(phase===0){
      if(this.player.x!==x||this.player.y<=y)return;
      for(let row=y+1;row<this.level.height;row++){
        if(this.player.y===row){this.state[i]=8;this.motion[i]=10;this.events.push('trap-trigger');return;}
        if(this.tile(x,row)>=80||[0,30,34,35].includes(this.tile(x,row)))return;
      }
      return;
    }
    if(phase===1){
      if(--this.motion[i]<=0){this.state[i]=27;this.motion[i]=0;this.events.push('trap-fall');}
      return;
    }
    if(phase===3){
      if(this.motion[i]>0){this.motion[i]-=5;return;}
      const below=this.index(x,y+1);
      if(below<0){this.state[i]=32;this.motion[i]=0;return;}
      const target=this.tiles[below];
      if(this.isPlayer(x,y+1)){this.hurt(1,3);this.state[i]=32;this.motion[i]=0;this.events.push('trap-impact');return;}
      if(target===10){this.destroyGrass(x,y+1);this.events.push('grass');}
      else if(target===30){this.triggerBrick(x,y+1);this.state[i]=32;this.motion[i]=0;this.events.push('trap-impact');return;}
      else if([19,43,45,46,49].includes(target)){
        this.tiles[below]=-1;this.destroyEffect(below);
      }else if(target>=0){this.state[i]=32;this.motion[i]=0;this.events.push('trap-impact');return;}
      this.tiles[i]=-1;this.state[i]=0;this.motion[i]=0;
      this.tiles[below]=44;this.state[below]=27;this.motion[below]=19;this.active[below]=24;
      this.wake(x,y+1);
      return;
    }
    if(phase===4){
      if((this.tick&1)===0&&++this.motion[i]>=3){this.tiles[i]=-1;this.state[i]=0;this.motion[i]=0;this.wake(x,y);}
    }
  }
  private freeze(x:number,y:number){
    const i=this.index(x,y),kind=this.tile(x,y);
    if(i<0||![1,19,43,45,46,49].includes(kind))return false;
    this.frozenKinds[i]=kind;this.tiles[i]=9;this.state[i]=0;this.motion[i]=0;this.active[i]=24;
    this.events.push('freeze');this.wake(x,y);return true;
  }
  private thaw(x:number,y:number){
    const i=this.index(x,y),kind=this.frozenKinds[i];if(i<0||kind<0)return;
    this.tiles[i]=kind;this.frozenKinds[i]=-1;
    // method_231 restores snakes through method_233, leaving them stunned.
    this.state[i]=kind===45?10:kind===49?(this.isPlayer(x,y-1)?2:1):[19,43].includes(kind)?120|(this.isPlayer(x,y-1)?2:1):0;
    this.motion[i]=0;
    this.active[i]=48;this.events.push('thaw');this.wake(x,y);
  }
  /** method_335 overlays the destruction effect and notifies the active riddle. */
  destroyEffect(cell:number){
    this.enemySmoke.push({cell,age:0});this.events.push('enemy-death');this.riddles.destroyed(this);
  }
  /** method_318: the wall crawler lights a torch from the cell above. */
  updateTorch(x:number,y:number){
    const i=this.index(x,y);this.active[i]=24;
    if(this.state[i]===0){
      if(this.tile(x,y-1)===11){this.state[i]=1;this.riddles.destroyed(this);this.events.push('torch-lit');}
    }else if(this.isPlayer(x,y-1))this.hurt(1);
  }
  /** method_330: explosive rubble is idle until its state becomes positive. */
  updateRubble(x:number,y:number){
    const i=this.index(x,y),state=this.state[i];
    if(state<=0)return;
    if(state>=8){this.tiles[i]=-1;this.wake(x,y);this.events.push('rubble-break');}
    this.state[i]=state+1;this.active[i]=24;
  }
  /** method_317, gen0.f/3 animation 0: twelve ticks, blast at tick six. */
  updateMineBlast(x:number,y:number){
    const i=this.index(x,y),age=this.state[i]+1;
    if(age>=12){this.tiles[i]=-1;this.wake(x,y);return;}
    if(age===1){this.events.push('mine-blast');this.wake(x,y);}
    else if(age===6)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const j=this.index(x+dx,y+dy);if(j<0)continue;
      const kind=this.tiles[j];
      if(kind===8){this.tiles[j]=54;this.state[j]=0;this.wake(x+dx,y+dy);}
      else if(kind===30||kind===37||(kind===10&&this.weaponTier===8)){this.state[j]=1;this.wake(x+dx,y+dy);}
      else if([16,19,43,49].includes(kind)){this.tiles[j]=-1;this.destroyEffect(j);this.active[j]=24;}
      if(this.isPlayer(x+dx,y+dy))this.hurt(1);
    }
    this.state[i]=age;this.active[i]=24;
  }
  /** method_233: a fresh hit removes one red-snake resistance unit; a stunned hit only renews it. */
  stunSnake(x:number,y:number){
    const i=this.index(x,y),kind=this.tiles[i];let state=this.state[i];
    if(kind===43&&(state&248)===0){
      if((state&98304)===0){this.tiles[i]=-1;this.destroyEffect(i);this.wake(x,y);return;}
      const reduced=state-32768,position=(reduced&-16646145|x<<17)&-2130706433|y<<24;
      state=(position&7)!==1&&(position&7)!==3?position&2147483647:position|-2147483648;
    }
    this.state[i]=(state&~248)|120;
  }
  private hammer(x:number,y:number){
    const i=this.index(x,y),kind=this.tile(x,y);if(i<0)return;
    if(kind===9){this.thaw(x,y);return;}
    if(kind===30){this.triggerBrick(x,y);return;}
    if(kind===10&&this.weaponTier===8&&this.state[i]<=0){this.state[i]=1;this.active[i]=24;this.events.push('grass');return;}
    if(kind===18&&this.weaponTier===8){
      if(this.boss instanceof TibetBoss){if(![15,16].includes(this.object(this.player.x,this.player.y)))this.boss.flipBridge(this);}
      else this.bridges.flip(this);
      return;
    }
    const blocked=kind===16||kind>=80||(this.object(x,y)===7&&this.gatePhases[i]===0);
    if(kind===0||blocked){
      this.setAnimation(40+this.player.direction);
      this.attackTicks=HAMMER_BOUNCE_TICKS[this.player.direction];
      this.events.push('hammer-block');
    }
    if(blocked)return;
    // method_230 tests the impact cell and four neighbours against the moving enemy's 24px box.
    for(const [tx,ty] of [[x,y],[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){
      const j=this.index(tx,ty),target=this.tile(tx,ty);if(j<0)continue;
      if(target===1&&this.weaponTier===8&&tx===this.player.x+DX[this.player.direction]&&ty===this.player.y+DY[this.player.direction]){this.freeze(tx,ty);continue;}
      if(![19,43,45,46,49].includes(target))continue;
      const direction=this.state[j]&7,motion=direction?this.motion[j]:0;
      if(Math.abs(tx*24-DX[direction]*motion-x*24)>=24||Math.abs(ty*24-DY[direction]*motion-y*24)>=24)continue;
      if(this.weaponTier===8&&(tx!==this.player.x||ty!==this.player.y)){this.freeze(tx,ty);continue;}
      if(target===19||target===43){this.stunSnake(tx,ty);this.active[j]=24;this.events.push('enemy-hit');}
      else if(target===45){
        const hits=(this.state[j]&7168)>>10;
        if(hits===3){this.tiles[j]=-1;this.destroyEffect(j);this.wake(tx,ty);}
        else {this.state[j]=((10|((hits+1)<<10))&~248)|120;this.motion[j]=0;this.active[j]=24;this.events.push('enemy-hit');}
      }
    }
  }
  /** The hook reaches two or three cells horizontally and draws its target toward the hero. */
  private hookTarget(direction:2|4){
    const p=this.player;
    for(let distance=1;distance<=3;distance++){
      const x=p.x+DX[direction]*distance,y=p.y,kind=this.tile(x,y);
      if(this.index(x,y)<0||[14,33,7].includes(this.object(x,y)))return null;
      if(kind<0)continue;
      if(distance>=2&&[0,1,2,4,5,6,7,8,9,11,14,19,43,47,48,49].includes(kind))return {x,y,direction,ticks:0};
      return null;
    }
    return null;
  }
  private useWeapon(){
    const p=this.player,direction=p.direction;
    // method_227 checks the hook on both sides, then nearby hammer targets.
    const forwardHook=this.weaponTier>=2&&(direction===2||direction===4)?this.hookTarget(direction):null;
    const hookDirections: (2|4)[]=direction===4?[2]:direction===2?[4]:[2,4];
    const adjacent:[Direction,number,number][]=[direction,1,2,3,4]
      .filter((side,index,sides)=>side!==0&&sides.indexOf(side)===index)
      .map(side=>[side as Direction,p.x+DX[side],p.y+DY[side]]);
    const aimed=adjacent.find(([,x,y])=>[9,10,18,19,30,43,45,46,49].includes(this.tile(x,y)));
    const target=forwardHook??(!aimed&&this.weaponTier>=2?hookDirections.map(side=>this.hookTarget(side)).find(Boolean):null);
    if(target){
      p.direction=target.direction;this.hook=target;this.attackTicks=4+Math.abs(target.x-p.x)*4;
      this.setAnimation(18+target.direction);this.events.push('hook');return;
    }
    const [side,x,y]=aimed??adjacent[0];
    p.direction=side;this.attackTicks=HAMMER_ATTACK_TICKS[side];this.pendingHammer={x,y};this.setAnimation(12+side);this.events.push('hammer');
  }
  private advanceHook(){
    const hook=this.hook;if(!hook)return;
    if(++hook.ticks<4)return;hook.ticks=0;
    if(Math.abs(hook.x-this.player.x)<=1)return;
    const nextX=hook.x-DX[hook.direction],from=this.index(hook.x,hook.y),to=this.index(nextX,hook.y);
    if(from<0||to<0||this.tiles[from]<0||!this.free(nextX,hook.y)){this.hook=null;return;}
    this.moveObject(from,to,this.tiles[from],this.state[from],0);hook.x=nextX;
    this.wake(nextX,hook.y);this.events.push('hook-pull');
  }
  /** method_256 preserves the final count nibble when opening a door. */
  private openLinkedGate(id:number){
    if(id<0||id===255)return;
    for(let i=0;i<this.tiles.length;i++)if(this.level.objects[i]===7&&this.level.parameters[i]===id&&this.gatePhases[i]===0){
      const remaining=this.gateCounts[i]-1;
      if(remaining===0){this.gatePhases[i]=1;this.active[i]=24;this.events.push('gate-open');}
      else this.gateCounts[i]=remaining;
    }
  }
  /** method_316 runs before the moving tile in the same cell. */
  updatePressurePlate(x:number,y:number){
    const i=this.index(x,y),t=this.tiles[i];
    let occupied=[0,1,8,9,47,48].includes(t),motion=this.motion[i];
    if(!occupied&&this.isPlayer(x,y)){occupied=true;motion=this.player.offset;}
    const id=this.level.parameters[i];
    if(occupied&&motion<12){this.openLinkedGate(id);return;}
    if(id<0||id===255)return;
    for(let j=0;j<this.tiles.length;j++)if(this.level.objects[j]===7&&this.level.parameters[j]===id&&this.gatePhases[j]!==0){
      this.closeGate(j);
    }
  }
  /** method_258 is shared by room triggers, the camera sequence and plates. */
  closeGate(j:number){
    if(j<0||this.level.objects[j]!==7||this.gatePhases[j]===0||this.tiles[j]===32)return;
    this.gatePhases[j]=0;this.active[j]=24;this.events.push('gate-close');
    const x=j%this.level.width,y=Math.floor(j/this.level.width);
    if(this.isPlayer(x,y)){this.invulnerable=0;this.hurt(4);}
    else if([0,1,19,43,45].includes(this.tiles[j])){
      this.tiles[j]=-1;this.destroyEffect(j);this.state[j]=0;this.motion[j]=0;this.frozenKinds[j]=-1;
      this.events.push('gate-crush');this.wake(x,y);
    }
  }
  /** method_340 updates only when the door is in the active map scan. */
  updateGate(x:number,y:number){
    const i=this.index(x,y);
    if(this.tick%3===0&&(this.gatePhases[i]===1||this.gatePhases[i]===2)){
      this.gatePhases[i]++;this.active[i]=24;this.events.push('gate-opening');
    }
  }
  /** method_331: tile 11 follows a wall on its encoded left/right side. */
  updateWallCrawler(x:number,y:number){
    const i=this.index(x,y),state=this.state[i],phase=(state&3840)>>8;
    if(phase){
      if(phase>=4)this.tiles[i]=-1;
      else if(((this.tick>>1)&1)===0)this.state[i]+=256;
    }else if(this.motion[i]<=4){
      this.active[i]=24;
      const reverse=(state&16)!==0,direction=(state&7) as Direction;
      if(direction){
        const side=([0,reverse?4:2,reverse?1:3,reverse?2:4,reverse?3:1][direction]) as Direction;
        const turn=([0,reverse?2:4,reverse?3:1,reverse?4:2,reverse?1:3][direction]) as Direction;
        const free=(nx:number,ny:number)=>this.tile(nx,ny)===-1&&![14,33,4,32].includes(this.object(nx,ny))
          &&!(this.object(nx,ny)===7&&this.gatePhases[this.index(nx,ny)]===0);
        const forward=free(x+DX[direction],y+DY[direction]),wallSide=free(x+DX[side],y+DY[side]);
        const move=(d:Direction,next:number)=>{
          const j=this.index(x+DX[d],y+DY[d]);
          this.state[j]=next;this.tiles[j]=11;this.tiles[i]=-1;this.motion[j]=18;
        };
        if(forward&&wallSide&&free(x+DX[side]-DX[direction],y+DY[side]-DY[direction])){
          if(this.motion[i]<=0)move(direction,state);
        }else if(wallSide)move(side,(state&~7)|side);
        else if(forward){if(this.motion[i]<=0)move(direction,state);}
        else this.state[i]=(state&~7)|turn;
      }else{
        if(this.tile(x-1,y)>=0)this.state[i]=(state&~7)|(reverse?1:3);
        else if(this.tile(x,y+1)>=0)this.state[i]=(state&~7)|(reverse?2:4);
        if(this.tile(x+1,y)>=0)this.state[i]=(state&~7)|(reverse?3:1);
        if(this.tile(x,y+1)>=0)this.state[i]=(state&~7)|(reverse?4:2);
      }
      this.wake(x,y);
    }
    if(this.isPlayer(x,y))this.hurt(1);
    if(this.motion[i]>0)this.motion[i]-=5;
  }
  step(input:InputFrame){
    if(this.status!=='playing')return;
    this.inputs.push({...input});this.events=[];this.tick++;this.animationTick++;
    if(input.scriptedView&&!this.respawnTravel){
      this.camera.x=input.scriptedView.x;this.camera.y=input.scriptedView.y;
      if(input.scriptedView.follow){const p=this.player;this.camera.update(p.x*24-p.dx*p.offset,p.y*24-p.dy*p.offset,this.level.width,this.level.height);}
    }
    this.enemySmoke=this.enemySmoke.filter(s=>++s.age<14);
    // cGame uses animation-frame indices for cm.f/7 effects, ignoring duration.
    this.itemSparkles=this.itemSparkles.filter(s=>++s.age<[10,10,10,10,9][s.kind]);
    if(input.reset){this.manualReset();if(this.deathTicks)this.updateCamera();return;}
    if(this.respawnTravel){this.travelToCheckpoint();return;}
    if(this.respawnFlash>0)this.respawnFlash--;
    if(this.invulnerable)this.invulnerable--;
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
    let roomTriggered=false;
    if(!(this.boss instanceof TibetBoss))this.bridges.step(this);
    // method_304 precedes player movement; scan bottom-to-top, left-to-right, ±8.
    for(let y=Math.min(this.level.height-2,this.player.y+8);y>=Math.max(1,this.player.y-8);y--){
      for(let x=Math.max(1,this.player.x-8);x<=Math.min(this.level.width-2,this.player.x+8);x++){
        const i=this.index(x,y);if(this.active[i]<=0)continue;this.active[i]-=6;
        if(this.level.objects[i]===6)this.updatePressurePlate(x,y);
        if(this.level.objects[i]===7)this.updateGate(x,y);
        if(this.level.objects[i]===26){this.active[i]=24;roomTriggered=this.riddles.trigger(this,x,y)||roomTriggered;}
        if(this.level.objects[i]===32){
          // method_315 advances foreground grass debris on the global parity.
          if((this.tick&1)===0)this.level.parameters[i]++;
          if(this.level.parameters[i]>=GRASS_DESTRUCTION_FRAMES[this.level.world]){
            this.level.objects[i]=255;this.level.parameters[i]=255;
          }
          this.active[i]=24;
        }
        if(this.level.objects[i]===36){
          if(++this.level.parameters[i]>=16){this.level.objects[i]=255;this.level.parameters[i]=255;}
          else this.active[i]=24;
        }
        if(this.hook?.x===x&&this.hook.y===y){this.active[i]=24;continue;}
        if(this.tiles[i]===0||this.tiles[i]===1||this.tiles[i]===8||this.tiles[i]===9)this.updateFalling(x,y);
        else if(this.tiles[i]===19||this.tiles[i]===43||this.tiles[i]===49)this.updateSnake(x,y);
        else if(this.tiles[i]===11)this.updateWallCrawler(x,y);
        else if(this.tiles[i]===36)this.updateTorch(x,y);
        else if(this.tiles[i]===37)this.updateRubble(x,y);
        else if(this.tiles[i]===54)this.updateMineBlast(x,y);
        else if(this.tiles[i]===45)this.updateIceCreature(x,y);
        else if(this.tiles[i]===46)this.updateIceShooter(x,y);
        else if(this.tiles[i]===21)this.updateIceDart(x,y);
        else if(this.tiles[i]===30)this.updateBrick(x,y);
        else if(this.tiles[i]===14)this.updateRollingHazard(x,y);
        else if(this.tiles[i]===16)this.updateCrusher(x,y);
        else if(this.tiles[i]===28)this.updateSpikes(x,y);
        else if(this.tiles[i]===44)this.updateCeilingTrap(x,y);
        else if(this.tiles[i]===22||this.tiles[i]===23){
          this.active[i]=24;const side=this.tiles[i]===23?-1:1;
          if(this.player.y===y)for(let n=0;n<=fireReach(this.tick);n++)if(this.player.x===x+n*side)this.hurt(1);
        }
        if(this.tiles[i]===10&&this.state[i]>0)this.destroyGrass(x,y);
        const lastChestFrame=this.level.objects[i]===14?2:3;
        if(this.chestFrames[i]>0&&this.chestFrames[i]<lastChestFrame&&((this.tick>>1)&1)===0)this.chestFrames[i]++;
      }
    }
    if(!this.deathTicks&&!this.hurtTicks)this.boss?.step(this);
    if(this.events.includes('boss-clear'))this.riddles.destroyed(this);
    this.riddles.step(this);
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
      this.openLinkedGate(id);
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
      // The map scan consumes the item as opening begins. method_260 awards it
      // when frame 13 is processed, after that frame first becomes visible.
      if(this.chestReward<0&&!this.opened.has(this.chestCell)){
        this.chestReward=this.tiles[this.chestCell];this.tiles[this.chestCell]=-1;
        this.chestRewardAmount=this.level.parameters[this.chestCell];
        if(this.chestReward===6&&this.lives>=99)this.chestReward=7;
        if(this.chestReward===7&&this.health===4){this.chestReward=41;this.chestRewardAmount=10;this.bonusDiamondTotal+=10;}
      }
      if(animationFrameAt(CHEST_OPEN_DURATIONS,this.chestTicks-1,false)>=13&&!this.opened.has(this.chestCell)){
        this.opened.add(this.chestCell);
        const reward=this.chestReward;
        if(reward===2)this.redDiamonds++;
        else if(reward===4)this.goldKeys++;
        else if(reward===5)this.silverKeys++;
        else if(reward===6){this.lives=Math.min(99,this.lives+1);this.permanentPickups.add(this.chestCell);}
        else if(reward===7)this.health=4;
        else if(reward===41){const amount=this.chestRewardAmount;this.diamonds+=amount===255?1:Math.max(1,amount);}
        else if(reward===24||reward===27||reward===26){
          this.weaponTier=reward===24?Math.max(this.weaponTier,1) as 1|2|8:reward===27?Math.max(this.weaponTier,2) as 2|8:8;
          this.permanentEquipmentChests.add(this.chestCell);this.events.push('weapon',`demo:${reward===24?22:reward===27?23:25}`);
        }
        else if(reward===40)this.events.push('demo:24');
        else if(reward===42)this.events.push('demo:11');
        else if(reward===51||reward===52||reward===53){this.pendingCrystalCompletion=true;this.events.push(`demo:${reward===53?32:reward===51?30:31}`);}
        if([24,26,27,40,42,51,52,53].includes(reward)){this.setAnimation(47);this.animationTick=1;}
        this.events.push('chest-reward');
      }
      if(this.playerAnimation===47&&this.animationTick>1&&(this.tick&1)===0){
        let x=p.x-2+this.tick%5;const y=p.y-2+this.tick%3;
        if(x===p.x&&(y===p.y||y===p.y-1))x+=((this.tick>>1)&1)===0?1:-1;
        this.itemSparkles.push({x,y,kind:this.tick*3%5,age:0});
        if(this.itemSparkles.length>7)this.itemSparkles.shift();
      }
      if(this.playerAnimation===47?this.animationTick>=ITEM_PRESENTATION_TICKS:this.chestTicks>=CHEST_OPEN_DURATIONS.reduce((a,b)=>a+b,0)){
        this.chestCell=-1;this.chestReward=-1;this.chestRewardAmount=0;this.setAnimation(p.direction-1);this.animationTick=1;
        if(this.pendingCrystalCompletion){this.pendingCrystalCompletion=false;this.status='complete';this.events.push('complete');}
      }
      this.updateCamera();return;
    }
    if(this.hurtTicks||this.deathTicks){p.offset=Math.max(0,p.offset-6);this.pendingDirection=0;this.attackTicks=0;this.pendingHammer=null;this.hook=null;this.updateCamera();return;}
    if(this.attackTicks>0){
      if(this.pendingHammer&&this.animationTick===HAMMER_IMPACT_TICK){this.hammer(this.pendingHammer.x,this.pendingHammer.y);this.pendingHammer=null;}
      if(this.hook)this.advanceHook();
      if(--this.attackTicks===0){this.pendingHammer=null;this.hook=null;this.setAnimation(p.direction-1);}
      this.pendingDirection=0;this.updateCamera();return;
    }
    if(actionPressed&&this.index(p.x,p.y)===this.checkpoint&&p.offset===0){this.restoreCheckpoint(false,true);return;}
    if(actionPressed&&!roomTriggered&&this.weaponTier>0&&p.offset===0&&!this.exitDirection){
      this.useWeapon();this.pendingDirection=0;this.updateCamera();return;
    }
    if(this.riddles.phase&&!input.action)this.pendingDirection=0;
    const direction=roomTriggered||(this.riddles.phase&&!input.action)?0:this.exitDirection||input.direction||this.pendingDirection;
    if(direction)this.riddles.held=false;
    if(p.offset>0)p.offset=Math.max(0,p.offset-6);
    else if(direction){
      this.pendingDirection=0;p.direction=direction;p.dx=DX[p.direction];p.dy=DY[p.direction];
      const x=p.x+p.dx,y=p.y+p.dy,i=this.index(x,y),t=this.tile(x,y),o=this.object(x,y);
      let pass=WALKABLE_TILES.has(t)||t===10,blockedBySweep=false;
      // Gate object 7 is solid while its opening phase is below 2.
      if(o===7&&this.gatePhases[i]<2)pass=false;
      // The entrance corridor is closed after spawning. Exterior cells are only
      // reachable during the original automatic exit walk.
      if(!this.exitDirection&&(x<=0||y<=0||x>=this.level.width-1||y>=this.level.height-1))pass=false;
      if(this.exitDirection)pass=true;
      // method_288: do not enter the trailing portion of a descending boulder.
      const belowTarget=this.index(x,y+1);
      if(p.dx&&this.tile(x,y+1)===0&&belowTarget>=0&&(this.state[belowTarget]&7)===3&&this.motion[belowTarget]>0){pass=false;blockedBySweep=true;}
      // method_288 also prevents walking into the swept path of an extended spike.
      if(t===-1)for(const sy of [y-1,y+1]){
        const spike=this.index(x,sy);
        if(spike<0||this.tiles[spike]!==28)continue;
        if(spikeExtension(this.tick,(this.state[spike]&8)!==0)>=24){pass=false;blockedBySweep=true;break;}
      }
      if((t===0||t===8||t===9)&&p.dx){
        this.pushDelay--;this.setLocomotionAnimation(p.dx>0?8:9);
        const destination=this.index(x+p.dx,y);
        if(this.pushDelay<0&&this.free(x+p.dx,y)&&!(this.object(x+p.dx,y)===7&&this.gatePhases[destination]===0)&&(![19,43,45,49].includes(this.tile(x,y+1))||this.object(x,y+1)===35)){
          this.moveObject(i,this.index(x+p.dx,y),t,(this.state[i]&~(7|3072|512))|p.direction| (p.dx>0?1024:2048),18);this.wake(x+p.dx,y);pass=true;
        }
      }
      if(pass){
        this.wake(p.x,p.y);p.x=x;p.y=y;p.offset=18;this.wake(x,y);
        this.setLocomotionAnimation((t===0||t===9)&&p.dx?(p.dx>0?8:9):3+p.direction);
        if(t===10){this.state[i]=1;this.events.push('grass');}
      }else if(t!==0&&t!==9&&this.stonePressure===0)this.setLocomotionAnimation(blockedBySweep&&p.dx?(p.dx>0?8:9):p.direction-1);
    }else {this.pushDelay=input.scripted?0:6;if(this.stonePressure===0)this.setLocomotionAnimation(p.direction-1);}
    const i=this.index(p.x,p.y),t=this.tiles[i],o=this.level.objects[i];
    if(p.offset===0){
      const insideChest=[14,33].includes(o);
      if(!insideChest&&(t===4||t===5)){this.tiles[i]=-1;if(t===4)this.goldKeys++;else this.silverKeys++;this.events.push(t===4?'gold-key':'silver-key');}
      if(!insideChest&&t===6){this.tiles[i]=-1;if(this.lives>=99)this.collectHealthOrDiamonds();else{this.permanentPickups.add(i);this.lives++;this.events.push('extra-life');}}
      if(!insideChest&&t===7){this.tiles[i]=-1;this.collectHealthOrDiamonds();}
      if(o===4&&this.level.parameters[i]>this.checkpointOrder){this.checkpoint=i;this.checkpointOrder=this.level.parameters[i];this.captureCheckpoint();this.events.push('checkpoint');}
      if([14,33].includes(o)&&!this.riddles.lockedChests.has(i)&&!this.opened.has(i)&&this.chestFrames[i]===0){
        this.chestCell=i;this.chestTicks=0;this.chestReward=-1;this.chestRewardAmount=0;this.chestFrames[i]=1;this.setAnimation(40);this.events.push('chest');
      }else if(!insideChest&&t===2&&!this.opened.has(i)){this.tiles[i]=-1;this.redDiamonds++;this.events.push('red-diamond');}
      if(o===5||o===28){this.exitDirection=p.direction;this.exitObject=o;}
      if(this.exitDirection&&(p.x>this.level.width+5||p.x< -5||p.y>this.level.height+5||p.y< -5)){this.status='complete';this.events.push('complete');}
    }
    const rockAbove=this.index(p.x,p.y-1);
    if(p.offset>0||rockAbove<0||![0,8,9,48].includes(this.tiles[rockAbove]))this.stonePressure=0;
    else if((this.animationTick>=BOULDER_BRACE_TICKS||this.stonePressure>=BOULDER_PRESSURE_TICKS)&&!this.invulnerable)
      this.hurt(4);
    this.updateCamera();
  }
  private updateCamera(){
    // DemoInterpreter updates the camera before scripted movement; normal
    // gameplay follows it after movement. Pans/dialogues keep their own view.
    if(this.inputs.at(-1)?.scripted||this.riddles.phase||this.riddles.held)return;
    const p=this.player;this.camera.update(p.x*24-p.dx*p.offset,p.y*24-p.dy*p.offset,this.level.width,this.level.height);
  }
  private destroyGrass(x:number,y:number){
    const i=this.index(x,y);
    this.tiles[i]=-1;this.level.objects[i]=32;this.level.parameters[i]=0;
    this.wake(x,y);this.active[i]=24;
  }
  /** cGame.method_322 converts a field health pickup into ten diamonds at full health. */
  private collectHealthOrDiamonds(){
    if(this.health===4){this.diamonds+=10;this.bonusDiamondTotal+=10;this.events.push('diamond');}
    else {this.health=4;this.events.push('health');}
  }
  replay():Replay{return {version:3,target:'1.2.0-s700',engine:ENGINE_REVISION,levelFingerprint:this.initialLevelFingerprint,world:this.level.world,level:this.level.index,initial:{...this.initial},inputs:this.inputs.map(i=>({...i,demoEdits:i.demoEdits?.map(edit=>({...edit}))}))};}
  snapshot(){return {bridges:this.bridges.snapshot(),riddles:this.riddles.snapshot(),chestReward:this.chestReward,chestRewardAmount:this.chestRewardAmount,itemSparkles:this.itemSparkles.map(s=>({...s})),tick:this.tick,player:{...this.player},camera:{x:this.camera.x,y:this.camera.y},tiles:[...this.tiles],state:[...this.state],motion:[...this.motion],active:[...this.active],objects:[...this.level.objects],parameters:[...this.level.parameters],frozenKinds:[...this.frozenKinds],diamonds:this.diamonds,bonusDiamondTotal:this.bonusDiamondTotal,redDiamonds:this.redDiamonds,goldKeys:this.goldKeys,silverKeys:this.silverKeys,gatePhases:[...this.gatePhases],gateCounts:[...this.gateCounts],unlockedGates:[...this.unlockedGates],permanentPickups:[...this.permanentPickups],permanentEquipmentChests:[...this.permanentEquipmentChests],weaponTier:this.weaponTier,attackTicks:this.attackTicks,pendingHammer:this.pendingHammer?{...this.pendingHammer}:null,hook:this.hook?{...this.hook}:null,health:this.health,invulnerable:this.invulnerable,status:this.status,playerAnimation:this.playerAnimation,animationTick:this.animationTick,pushDelay:this.pushDelay,checkpoint:this.checkpoint,checkpointOrder:this.checkpointOrder,opened:[...this.opened],chestFrames:[...this.chestFrames],chestCell:this.chestCell,chestTicks:this.chestTicks,pendingCrystalCompletion:this.pendingCrystalCompletion,lives:this.lives,hurtTicks:this.hurtTicks,deathTicks:this.deathTicks,respawnTravel:this.respawnTravel,respawnFlash:this.respawnFlash,respawnTarget:{...this.respawnTarget},exitDirection:this.exitDirection,exitObject:this.exitObject,stonePressure:this.stonePressure,pendingDirection:this.pendingDirection,lastInputDirection:this.lastInputDirection,actionHeld:this.actionHeld,entranceGate:this.entranceGate,boss:this.boss?.snapshot()??null,enemySmoke:this.enemySmoke.map(s=>({...s})),hits:this.hits,retries:this.retries,savedCheckpoint:structuredClone(this.savedCheckpoint)};}
}
