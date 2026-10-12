import { AssetManager } from '../assets/AssetManager.ts';
import type { LevelDefinition } from '../level/LevelParser.ts';
import { SpriteRenderer } from './SpriteRenderer.ts';
import { spikeExtension, spikeReach } from '../core/LaterStageRules.ts';
import { rollingStoneVisual, scotlandExplosiveVisual, snakeVisual, tibetSliderVisual } from './OriginalAnimationRules.ts';
const tileSprite:Record<number,string>={8:'gen0-5',11:'gen1-4',14:'gen1-2',16:'gen1-3',18:'gen3-9',22:'gen0-9',23:'gen0-9',28:'gen1-1',34:'gen2-4',35:'gen2-4',36:'gen0-8',37:'gen2-5',38:'gen2-6',39:'gen2-6',40:'gen2-7',42:'gen3-1',44:'gen3-4',45:'gen3-5',46:'gen3-7',47:'gen2-3',48:'gen3-2',49:'gen4-1'};

/** The three planes of a stage, from its file (lab) or from the running game (the area around the screen). */
export interface CellSource {
  world:number;index:number;width:number;height:number;
  /** Tile plane value, -1 when empty (255). */
  tile(i:number):number;
  object(i:number):number;
  parameter(i:number):number;
}
export function levelCells(level:LevelDefinition):CellSource{
  return {world:level.world,index:level.index,width:level.width,height:level.height,
    tile:i=>level.tiles[i]===255?-1:level.tiles[i],object:i=>level.objects[i],parameter:i=>level.parameters[i]};
}
export interface CellRange {x0:number;y0:number;x1:number;y1:number}

/**
 * Static view of a stage's three data planes: the preservation lab's map inspector, and the scenery the
 * port draws around the original screen. Gameplay inside the original screen is drawn by the original code.
 */
export class LevelRenderer {
  assets:AssetManager; sprites:SpriteRenderer;
  constructor(assets:AssetManager,sprites:SpriteRenderer){this.assets=assets;this.sprites=sprites;}
  draw(ctx:CanvasRenderingContext2D,level:LevelDefinition,tick:number,debug=false){
    this.drawCells(ctx,levelCells(level),{x0:0,y0:0,x1:level.width,y1:level.height},0,0,tick,{objects:true,debug});
  }
  /** The world's background module (`<world>-3`), which also fills cells outside the stage. */
  backdrop(ctx:CanvasRenderingContext2D,world:number,px:number,py:number){this.sprites.module(ctx,this.assets.sprite(`${world}-3`),0,px,py);}
  /**
   * Draws the cells of `range` (cell coordinates, end exclusive; may extend beyond the stage, where the
   * background continues) with the stage's (0,0) at (ox,oy). `objects` adds items, stones and creatures.
   */
  drawCells(ctx:CanvasRenderingContext2D,source:CellSource,range:CellRange,ox:number,oy:number,tick:number,options:{objects:boolean;debug?:boolean}){
    const {assets:a,sprites:r}=this,w=source.world,{width,height}=source;
    const inside=(x:number,y:number)=>x>=0&&y>=0&&x<width&&y<height;
    const frame=(id:string,f:number,x:number,y:number,p=0,flags=0)=>{const s=a.sprite(id);if(s.frames[f])r.frame(ctx,s,f,x,y,flags,p);};
    const anim=(id:string,n:number,x:number,y:number,p=0,flags=0,time=tick)=>{const s=a.sprite(id);if(s.animations[n])r.animation(ctx,s,n,time,x,y,flags,p);};
    const {x0,y0,x1,y1}=range;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const px=ox+x*24,py=oy+y*24;
      this.backdrop(ctx,w,px,py);
      if(!inside(x,y))continue;
      const i=x+y*width,t=source.tile(i),obj=source.object(i);
      if(t>=80)frame(`${w}-2`,t-80,px,py);
      if(t===10)frame(`${w}-1`,0,px,py);
      if(obj===6){const plate=a.sprite('gen2-9');r.module(ctx,plate,0,px,py+24-plate.modules[0].height);}
      if(obj===4)frame('cm-6',(tick>>1)%7,px,py);
      if(obj===5||obj===28)r.module(ctx,a.sprite('cm-0'),0,px,py);
      if(obj===8||obj===9)frame('gen2-8',0,px,py,obj===8?1:0);
      if(obj===7){if(!(y>0&&[8,9].includes(source.object(i-width))))frame('cm-1',0,px,py);frame('cm-1',3,px,py);}
      if(obj===16)frame('gen2-4',4,px,py,1);
    }
    if(w===0&&source.index===13){
      const seal=a.sprite('mmv-0');
      for(let y=Math.max(2,y0);y<Math.min(7,y1);y++)for(let x=Math.max(60,x0);x<Math.min(65,x1);x++)r.frame(ctx,seal,4+(y-2)*5+x-60,ox+x*24,oy+y*24);
    }
    if(options.objects){
      const sparkle=((tick&63)>>1)<4?(tick&63)>>1:0;
      for(let y=Math.max(0,y0);y<Math.min(height,y1);y++)for(let x=Math.max(0,x0);x<Math.min(width,x1);x++){
        const i=x+y*width,t=source.tile(i),px=ox+x*24,py=oy+y*24,obj=source.object(i),p=source.parameter(i);
        if(obj===14||obj===33){const s=a.sprite(obj===14?'gen2-2':'gen3-3'),an=s.animations[0],af=s.animationFrames[an.start];r.frame(ctx,s,af.frame,px,py,af.flags);}
        else if(t===0)frame(`${w}-0`,0,px,py);
        else if(t===8)frame('gen0-5',(tick>>1)&1,px,py);
        else if(t===1)frame('cm-2',sparkle,px,py);
        else if(t===2)frame('cm-2',sparkle,px,py,1);
        else if(t===4||t===5)r.module(ctx,a.sprite('gen0-2'),0,px,py,0,t===5?1:0);
        else if(t===24||t===27||t===26)r.module(ctx,a.sprite('gen1-9'),t===24?0:t===27?1:2,px,py);
        else if(t===19||t===43){
          const id=w===1?'gen1-7':'gen1-5',sprite=a.sprite(id),selection=snakeVisual(w,p,tick,1),animation=sprite.animations[selection.animation];
          if(animation){const af=sprite.animationFrames[animation.start+snakeVisual(w,p,tick,animation.count).frame];frame(id,af.frame,px,py,t===43?1:w===2?2:0,af.flags);}
        }else if(t===11){const visual=scotlandExplosiveVisual(p===1?16:0,0,tick);if(visual)r.module(ctx,a.sprite('gen1-4'),visual.module,px+visual.x,py+visual.y);}
        else if(t===6||t===7)r.module(ctx,a.sprite('cm-4'),t===6?0:1,px,py);
        else if(t===12){
          const lock=a.sprite('cm-5'),digits=a.sprite('ui-2');
          r.module(ctx,lock,1,px+6,py);r.module(ctx,lock,0,px+3,py+7);
          let right=px+21;for(let n=p;n>0;n=Math.floor(n/10)){const digit=n%10;right-=digits.modules[digit].width;r.module(ctx,digits,digit,right,py+13);}
        }
        else if(t===30)frame('gen0-7',0,px,py);
        else if(t===36){const sprite=a.sprite('gen0-8'),animation=sprite.animations[p===1?1:0],af=sprite.animationFrames[animation.start+(tick>>1)%animation.count];frame('gen0-8',af.frame,px,py,0,af.flags);}
        else if(t===37)r.module(ctx,a.sprite('gen2-5'),0,px,py);
        else if(t===18)frame('gen3-9',a.sprite('gen3-9').animationFrames[a.sprite('gen3-9').animations[0].start].frame,px,py);
        else if(t===34||t===35)frame('gen2-4',t===34?0:4,px,py,t===35?1:0);
        else if(t===28){
          const raw=p>10?(Math.floor(p/11)|8):p,down=(raw&7)===3,alternate=(raw&8)!==0,extension=spikeExtension(tick,alternate),reach=spikeReach(tick,alternate);
          for(let segment=0;segment<reach;segment++)frame('gen1-1',down?segment:3-segment,px+3,py+(down?1:-1)*(extension-segment*24));
        }
        else if(t===14){
          const visual=rollingStoneVisual(p,0,tick,x>0&&source.tile(i-1)>=0),sprite=a.sprite('gen1-2');
          r.module(ctx,sprite,visual.body,px+visual.x,py+visual.y);
        }
        else if(t===48){const visual=tibetSliderVisual(p,0);if(visual)frame('gen3-2',visual.frame,px+visual.x,py+visual.y);}
        else if(tileSprite[t]){
          const id=tileSprite[t],s=a.sprite(id);
          if(s.animations.length)anim(id,0,px,py,0,0,t===16?0:tick);else if(s.frames.length)frame(id,0,px,py);else r.module(ctx,s,0,px,py);
          if(t===22||t===23)anim('gen1-0',0,t===22?px+24:px,py,0,t===23?1:0);
        }else if(t===79)frame('o-0',0,px,py);
        if(options.debug&&t>=0&&t<80&&![0,1,2,4,5,6,7,10,12,19,43,54,79].includes(t)&&!tileSprite[t]){
          ctx.fillStyle='#ed489d';ctx.fillRect(px,py,24,24);ctx.fillStyle='#100719';ctx.font='10px monospace';ctx.fillText(String(t),px+2,py+15);
        }
      }
    }
    for(let y=Math.max(0,y0);y<Math.min(height,y1);y++)for(let x=Math.max(0,x0);x<Math.min(width,x1);x++){
      const i=x+y*width,o=source.object(i),px=ox+x*24,py=oy+y*24;
      if(o>=80&&o!==255)frame(`${w}-2`,o-80,px,py);
      if(options.objects&&o>=20&&o<26&&w!==2){const s=a.sprite(w===1?'gen2-1':'gen0-4'),an=s.animations[o-20];if(an){const af=s.animationFrames[an.start+((tick>>2)%an.count)];r.frame(ctx,s,af.frame,px,py,af.flags);}}
    }
    if(options.debug){
      ctx.strokeStyle='#ffffff20';ctx.lineWidth=1;
      for(let x=x0;x<=x1;x++){ctx.beginPath();ctx.moveTo(ox+x*24+.5,oy+y0*24);ctx.lineTo(ox+x*24+.5,oy+y1*24);ctx.stroke();}
      for(let y=y0;y<=y1;y++){ctx.beginPath();ctx.moveTo(ox+x0*24,oy+y*24+.5);ctx.lineTo(ox+x1*24,oy+y*24+.5);ctx.stroke();}
    }
  }
}
