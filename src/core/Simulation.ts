import type { LevelDefinition } from '../level/LevelParser.ts';
import { Camera } from './Camera.ts';
import { ENGINE_REVISION, levelFingerprint } from './Compatibility.ts';
export type Direction=0|1|2|3|4;
export const DX=[0,0,1,0,-1], DY=[0,-1,0,1,0];
export interface InputFrame {direction:Direction;action:boolean}
export interface Replay {version:2;target:'1.2.0-s700';engine:typeof ENGINE_REVISION;levelFingerprint:string;world:number;level:number;inputs:InputFrame[]}
/** Experimental, source-traced subset. Unsupported mechanics remain explicit in coverage. */
export class Simulation {
  level:LevelDefinition; tiles:Int16Array; state:Int32Array; motion:Int16Array; active:Int16Array;
  player={x:0,y:0,dx:1,dy:0,offset:0,direction:2 as Direction};
  camera=new Camera();tick=0;diamonds=0;redDiamonds=0;health=4;invulnerable=0;
  playerAnimation=1;animationTick=0;pushDelay=6;checkpoint=-1;status:'playing'|'dead'|'complete'='playing';
  opened=new Set<number>();events:string[]=[];inputs:InputFrame[]=[];
  constructor(level:LevelDefinition){
    this.level=level;this.tiles=Int16Array.from(level.tiles,t=>t===255?-1:t);this.state=new Int32Array(this.tiles.length);
    this.motion=new Int16Array(this.tiles.length);this.active=new Int16Array(this.tiles.length);
    this.tiles.forEach((t,i)=>{
      const p=level.parameters[i]===255?-1:level.parameters[i];
      if(t===79){this.player.x=i%level.width;this.player.y=Math.floor(i/level.width);this.tiles[i]=-1;}
      if(t===12)this.tiles[i]=-1;
      if(t===0||t===1)this.active[i]=48;
      if(t===19||t===43){this.state[i]=p;this.active[i]=48;}
    });
    this.camera.y=Math.max(0,this.player.y*24-160);
    this.camera.update(this.player.x*24,this.player.y*24,level.width,level.height);
    this.wake(this.player.x,this.player.y);
  }
  index(x:number,y:number){return x<0||y<0||x>=this.level.width||y>=this.level.height?-1:x+y*this.level.width;}
  tile(x:number,y:number){const i=this.index(x,y);return i<0?80:this.tiles[i];}
  object(x:number,y:number){const i=this.index(x,y);return i<0?255:this.level.objects[i];}
  isPlayer(x:number,y:number){return this.player.x===x&&this.player.y===y;}
  free(x:number,y:number){return this.tile(x,y)===-1&&![14,33,5,28].includes(this.object(x,y));}
  enemyFree(x:number,y:number){return this.tile(x,y)===-1&&![14,33,4,32,7].includes(this.object(x,y));}
  wake(x:number,y:number){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const i=this.index(x+dx,y+dy);if(i>=0)this.active[i]=48;}}
  hurt(amount:number){if(this.invulnerable||this.status!=='playing')return;this.health=Math.max(0,this.health-amount);this.invulnerable=48;this.events.push('hurt');if(!this.health){this.status='dead';this.events.push('death');}}
  setAnimation(n:number){if(n!==this.playerAnimation){this.playerAnimation=n;this.animationTick=0;}}
  /** Subset of method_351: normal gravity, diamonds, boulder support and delayed rolling. */
  updateFalling(x:number,y:number){
    const i=this.index(x,y),t=this.tiles[i];let s=this.state[i],m=this.motion[i],dir=s&7;
    const below=this.index(x,y+1);
    if(t===1&&this.overlap(x,y,dir,m)){this.tiles[i]=-1;this.diamonds++;this.events.push('diamond');this.wake(x,y);return;}
    if(m<=0){
      if(dir===3&&this.isPlayer(x,y+1)&&this.free(x,y+1)){if(t===0)this.hurt(2);this.state[i]=s&~7;}
      else if(this.free(x,y+1)&&!this.isPlayer(x,y)&&!this.isPlayer(x,y+1)){
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
      if(m===0&&dir===3){this.active[i]=30;if(t===0&&!this.free(x,y+1))this.events.push('boulder');if(!this.isPlayer(x,y+1))s&=~7;}
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
  moveObject(from:number,to:number,t:number,state:number,motion:number){this.tiles[from]=-1;this.tiles[to]=t;this.state[to]=state;this.motion[to]=motion;this.active[to]=48;}
  overlap(x:number,y:number,dir:number,m:number){
    if(Math.abs(x-this.player.x)>1||Math.abs(y-this.player.y)>1)return false;
    const px=this.player.x*24-this.player.dx*this.player.offset,py=this.player.y*24-this.player.dy*this.player.offset;
    // cGame.method_350 -> method_349 uses strict 24-pixel AABB overlap.
    return Math.abs(x*24-DX[dir]*m-px)<24&&Math.abs(y*24-DY[dir]*m-py)<24;
  }
  /** Normal patrolling snake subset of method_325. Red snake pursuit remains unported. */
  updateSnake(x:number,y:number){
    const i=this.index(x,y);let s=this.state[i],dir=s&7,m=this.motion[i],tx=x,ty=y;
    const above=this.index(x,y-1);
    if(above>=0&&[0,1].includes(this.tiles[above])&&this.motion[above]<=6&&(this.state[above]&7)===3){this.tiles[i]=-1;this.wake(x,y);return;}
    if(m<=0){
      this.wake(x,y);
      if(!dir){dir=(s&28672)>>12;m=21;s=s&~7|dir;if(this.enemyFree(x+DX[dir],y+DY[dir])){tx+=DX[dir];ty+=DY[dir];}else m=0;}
      else if(this.enemyFree(x+DX[dir],y+DY[dir])){m=21;tx+=DX[dir];ty+=DY[dir];}
      else {const reverse=[0,3,4,1,2][dir];s=s&~28672|(reverse<<12);s&=~7;dir=0;m=21;}
      const dest=this.index(tx,ty);this.moveObject(i,dest,19,s,m);
    }else this.motion[i]=m-3;
    if(this.overlap(tx,ty,dir,Math.max(0,m)))this.hurt(1);
  }
  step(input:InputFrame){
    if(this.status!=='playing')return;
    this.inputs.push({...input});this.events=[];this.tick++;this.animationTick++;if(this.invulnerable)this.invulnerable--;
    // method_304 precedes player movement; scan bottom-to-top, left-to-right, ±8.
    for(let y=Math.min(this.level.height-2,this.player.y+8);y>=Math.max(1,this.player.y-8);y--){
      for(let x=Math.max(1,this.player.x-8);x<=Math.min(this.level.width-2,this.player.x+8);x++){
        const i=this.index(x,y);if(this.active[i]<=0)continue;this.active[i]-=6;
        if(this.tiles[i]===0||this.tiles[i]===1)this.updateFalling(x,y);
        else if(this.tiles[i]===19)this.updateSnake(x,y);
      }
    }
    if(this.status!=='playing')return;
    const p=this.player;
    if(p.offset>0)p.offset=Math.max(0,p.offset-6);
    else if(input.direction){
      p.direction=input.direction;p.dx=DX[p.direction];p.dy=DY[p.direction];
      const x=p.x+p.dx,y=p.y+p.dy,i=this.index(x,y),t=this.tile(x,y),o=this.object(x,y);
      let pass=[-1,1,2,4,5,6,7,10,19].includes(t)&&o!==7;
      if(t===0&&p.dx){
        this.pushDelay--;this.setAnimation(p.dx>0?8:9);
        if(this.pushDelay<0&&this.free(x+p.dx,y)&&this.motion[i]===0){
          this.moveObject(i,this.index(x+p.dx,y),0,p.direction| (p.dx>0?1024:2048),18);this.wake(x,y);pass=true;
        }
      }else this.pushDelay=6;
      if(pass){
        this.wake(p.x,p.y);p.x=x;p.y=y;p.offset=18;this.wake(x,y);this.setAnimation(3+p.direction);
        if(t===10){this.tiles[i]=-1;this.events.push('grass');}
      }else if(t!==0)this.setAnimation(p.direction-1);
    }else {this.pushDelay=6;this.setAnimation(p.direction-1);}
    const i=this.index(p.x,p.y),t=this.tiles[i],o=this.level.objects[i];
    if(p.offset===0){
      if(o===4&&this.checkpoint!==i){this.checkpoint=i;this.events.push('checkpoint');}
      if(t===2){this.tiles[i]=-1;this.redDiamonds++;this.events.push('red-diamond');}
      if(o===5||o===28){this.status='complete';this.events.push('complete');}
    }
    this.camera.update(p.x*24-p.dx*p.offset,p.y*24-p.dy*p.offset,this.level.width,this.level.height);
  }
  replay():Replay{return {version:2,target:'1.2.0-s700',engine:ENGINE_REVISION,levelFingerprint:levelFingerprint(this.level),world:this.level.world,level:this.level.index,inputs:this.inputs.map(i=>({...i}))};}
  snapshot(){return {tick:this.tick,player:{...this.player},camera:{x:this.camera.x,y:this.camera.y},tiles:[...this.tiles],state:[...this.state],motion:[...this.motion],active:[...this.active],diamonds:this.diamonds,redDiamonds:this.redDiamonds,health:this.health,invulnerable:this.invulnerable,status:this.status,playerAnimation:this.playerAnimation,animationTick:this.animationTick,pushDelay:this.pushDelay,checkpoint:this.checkpoint,opened:[...this.opened]};}
}
