import { AssetManager } from '../assets/AssetManager.ts';
import type { LevelDefinition } from '../level/LevelParser.ts';
import { SpriteRenderer } from './SpriteRenderer.ts';
import type { Simulation } from '../core/Simulation.ts';
import { animationFrameAt, CHEST_OPEN_DURATIONS, fallingDrawOffset } from '../core/PhaseOneRules.ts';
import { spikeExtension, spikeReach } from '../core/LaterStageRules.ts';
import { crusherFrameIndex, rollingStoneVisual, scotlandExplosiveVisual, snakeVisual, sourceFrameForElapsed, tibetSliderVisual } from './OriginalAnimationRules.ts';
import { AngkorBoss } from '../core/AngkorBoss.ts';
import { BavariaBoss } from '../core/BavariaBoss.ts';
import { TibetBoss } from '../core/TibetBoss.ts';
const tileSprite:Record<number,string>={8:'gen0-5',11:'gen1-4',14:'gen1-2',16:'gen1-3',18:'gen3-9',22:'gen0-9',23:'gen0-9',28:'gen1-1',34:'gen2-4',35:'gen2-4',36:'gen0-8',37:'gen2-5',38:'gen2-6',39:'gen2-6',40:'gen2-7',42:'gen3-1',44:'gen3-4',45:'gen3-5',46:'gen3-7',47:'gen2-3',48:'gen3-2',49:'gen4-1'};
export class LevelRenderer {
  assets:AssetManager; sprites:SpriteRenderer;
  constructor(assets:AssetManager,sprites:SpriteRenderer){this.assets=assets;this.sprites=sprites;}
  draw(ctx:CanvasRenderingContext2D,level:LevelDefinition,tick:number,sim?:Simulation,debug=false) {
    const {assets:a,sprites:r}=this, w=level.world;
    const tile=(i:number)=>sim?sim.tiles[i]:level.tiles[i]===255?-1:level.tiles[i];
    const frame=(id:string,f:number,x:number,y:number,p=0,flags=0)=>{const s=a.sprite(id);if(s.frames[f])r.frame(ctx,s,f,x,y,flags,p);};
    const anim=(id:string,n:number,x:number,y:number,p=0,flags=0,time=tick)=>{const s=a.sprite(id);if(s.animations[n])r.animation(ctx,s,n,time,x,y,flags,p);};
    // Full-map rendering also serves the forensic inspector. Canvas clipping handles viewport.
    for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++) {
      const i=x+y*level.width,t=tile(i),px=x*24,py=y*24;
      r.module(ctx,a.sprite(`${w}-3`),0,px,py);
      if(t>=80)frame(`${w}-2`,t-80,px,py);
      if(t===10)frame(`${w}-1`,0,px,py);
      const obj=level.objects[i];
      if(obj===4&&(sim?.checkpointOrder??-1)<=level.parameters[i])frame('cm-6',sim?.checkpoint===i?7:((tick>>1)%7),px,py);
      if(obj===5||obj===28)r.module(ctx,a.sprite('cm-0'),0,px,py);
      if(obj===8||obj===9)frame('gen2-8',sim?.unlockedGates.has(i)?1:0,px,py,obj===8?1:0);
      if(obj===7){
        const phase=sim?.gatePhases[i]??0,frameNumber=Math.max(0,phase-1);
        if(![8,9].includes(level.objects[i-level.width]))frame('cm-1',frameNumber,px,py);
        frame('cm-1',frameNumber+3,px,py);
      }
      if(sim?.entranceGate===i){frame('cm-1',2,px,py);frame('cm-1',5,px,py);}
    }
    // cGame.method_181: the tutorial seal is a 5×5 composite in mmv.f,
    // painted over otherwise empty map cells before moving entities and hero.
    if(w===0&&level.index===13){
      const seal=a.sprite('mmv-0');
      for(let y=2;y<7;y++)for(let x=60;x<65;x++)r.frame(ctx,seal,4+(y-2)*5+x-60,x*24,y*24);
    }
    const sparkle=((tick&63)>>1)<4?(tick&63)>>1:0;
    for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++) {
      const i=x+y*level.width,t=tile(i),motion=sim?.motion[i]??0;
      const {x:ox,y:oy}=fallingDrawOffset(sim?.state[i]??0,motion,tick);
      const px=x*24+ox,py=y*24+oy,obj=level.objects[i];
      if(obj===14||obj===33) {
        const id=obj===14?'gen2-2':'gen3-3',s=a.sprite(id),an=s.animations[0];
        const n=sim?.opened.has(i)?an.count-1:sim?.chestFrames[i]??0;
        const af=s.animationFrames[an.start+Math.min(n,an.count-1)];r.frame(ctx,s,af.frame,x*24,y*24,af.flags);
      } else if(t===0)frame(`${w}-0`,((sim?.state[i]??0)&56)>>3,px,py);
      else if(t===1)frame('cm-2',sparkle,px,py);
      else if(t===2)frame('cm-2',sparkle,px,py,1);
      else if(t===4||t===5)r.module(ctx,a.sprite('gen0-2'),0,px,py,0,t===5?1:0);
      else if(t===24||t===27||t===26)r.module(ctx,a.sprite('gen1-9'),t===24?0:t===27?1:2,px,py);
      else if(t===9&&sim){
        const kind=sim.frozenKinds[i];
        if(kind===1)frame('cm-2',0,px,py);
        else if(kind===19||kind===43)anim(w===1?'gen1-7':'gen1-5',0,px,py,kind===43?1:w===2?2:0);
        else if(kind===45)anim('gen3-5',0,px,py);
        else if(kind===46)frame('gen3-7',0,px,py);
        else if(kind===49)anim('gen4-1',0,px,py);
        ctx.fillStyle='#80d9ffe0';ctx.fillRect(px,py,24,24);ctx.strokeStyle='#eefbff';ctx.strokeRect(px+.5,py+.5,23,23);
      }
      else if(t===19||t===43) {
        const id=w===1?'gen1-7':'gen1-5',sprite=a.sprite(id),state=sim?.state[i]??level.parameters[i];
        const selection=snakeVisual(w,state,tick,1),animation=sprite.animations[selection.animation];
        if(animation){
          const af=sprite.animationFrames[animation.start+snakeVisual(w,state,tick,animation.count).frame];
          frame(id,af.frame,px,py,t===43?1:w===2?2:0,af.flags);
        }
      } else if(t===11){
        const visual=scotlandExplosiveVisual(sim?.state[i]??level.parameters[i],motion,tick);
        if(visual)r.module(ctx,a.sprite('gen1-4'),visual.module,x*24+visual.x,y*24+visual.y);
      } else if(t===6||t===7)r.module(ctx,a.sprite('cm-4'),t===6?0:1,px,py);
      else if(t===30)frame('gen0-7',Math.min(7,Math.floor(Math.max(0,(sim?.state[i]??0)-1)*7/16)),px,py);
      else if(t===28){
        const raw=sim?.state[i]??(level.parameters[i]>10?(Math.floor(level.parameters[i]/11)|8):level.parameters[i]),
          down=(raw&7)===3,alternate=(raw&8)!==0,
          extension=spikeExtension(tick,alternate),reach=spikeReach(tick,alternate);
        for(let segment=0;segment<reach;segment++)
          frame('gen1-1',down?segment:3-segment,px+3,py+(down?1:-1)*(extension-segment*24));
        const adjacent=i+(down?-level.width:level.width),wall=tile(adjacent);
        if(wall>=80)frame(`${w}-2`,wall-80,px,py+(down?-24:24));
      }
      else if(t===44){
        const phase=((sim?.state[i]??0)&56)>>3,age=sim?.motion[i]??0;
        const animId=phase;
        const sprite=a.sprite('gen3-4'),animation=sprite.animations[animId];
        // method_151 resets field_286 after method_160: every phase uses AF zero.
        if(animation){const af=sprite.animationFrames[animation.start];frame('gen3-4',af.frame,x*24,y*24-(phase===3?age:0));}
      }
      else if(t===45||t===46){
        const id=t===45?'gen3-5':'gen3-7',sprite=a.sprite(id),state=sim?.state[i]??level.parameters[i];
        const animationId=t===45?state&15:state&31,animation=sprite.animations[animationId];
        if(animation){
          const frames=sprite.animationFrames.slice(animation.start,animation.start+animation.count),
            elapsed=t===45?(state&2088960)>>13:(state&8160)>>5,
            index=t===46&&(animationId===8||animationId===9)?0:sourceFrameForElapsed(frames.map(f=>f.duration),elapsed,t===45&&animationId===10),
            af=frames[index],floorSlide=t===45&&(state&7)===1&&obj===35;
          const drawX=floorSlide?x*24:px,drawY=floorSlide?y*24+motion:py;
          frame(id,af.frame,drawX+(t===45&&animationId===10?0:af.x),
            drawY+(t===45&&animationId===10?0:t===46&&(animationId===8||animationId===9)?-motion:af.y),0,af.flags);
        }
      }
      else if(t===16&&sim){
        // The upper tile is a logical half only; method_202 draws at the lower tile.
        const below=i+level.width;
        if(below>=sim.tiles.length||sim.tiles[below]!==16){
          const sprite=a.sprite('gen1-3'),direction=(sim.state[i]&7)===4?1:0,
            animation=sprite.animations[direction];
          const durations=sprite.animationFrames.slice(animation.start,animation.start+animation.count).map(af=>af.duration);
          const af=sprite.animationFrames[animation.start+crusherFrameIndex(durations,sim.motion[i])];
          frame('gen1-3',af.frame,x*24+af.x,y*24);
        }
      }
      else if(t===21){
        const state=sim?.state[i]??0,direction=state&7;
        if(state&8){const animation=direction===4?12:direction===2?13:14;
          anim('gen3-7',animation,x*24,y*24,0,0,Math.max(0,motion));}
        else frame('gen3-7',direction===4?0:direction===2?1:2,px,py);
      }
      else if(t===14){
        const visual=rollingStoneVisual(sim?.state[i]??level.parameters[i],motion,tick,x>0&&tile(i-1)>=0);
        const sprite=a.sprite('gen1-2');
        if(visual.dust){
          const dustModule=sprite.modules[visual.dust.module];
          r.module(ctx,sprite,visual.dust.module,x*24+visual.dust.x,y*24+visual.dust.y-dustModule.height);
        }
        r.module(ctx,sprite,visual.body,x*24+visual.x,y*24+visual.y);
      }
      else if(t===48){
        const visual=tibetSliderVisual(sim?.state[i]??level.parameters[i],motion);
        if(visual)frame('gen3-2',visual.frame,x*24+visual.x,y*24+visual.y);
      }
      else if(t===49){
        const state=sim?.state[i]??level.parameters[i],direction=state&7,previous=(state&28672)>>12;
        const horizontal=[2,4].includes(previous)||[2,4].includes(direction),vertical=[1,3].includes(previous)||[1,3].includes(direction);
        const blockedHorizontal=horizontal&&x>0&&x<level.width-1&&tile(i-1)>=0&&tile(i+1)>=0;
        const blockedVertical=vertical&&y>0&&y<level.height-1&&tile(i-level.width)>=0&&tile(i+level.width)>=0;
        const animationId=blockedHorizontal||blockedVertical?1:[1,3].includes(direction)?direction-1:0;
        const sprite=a.sprite('gen4-1'),animation=sprite.animations[animationId];
        if(animation){const af=sprite.animationFrames[animation.start+(blockedHorizontal||blockedVertical?0:(tick>>1)%animation.count)];
          frame('gen4-1',af.frame,px,py,0,af.flags);}
      }
      else if(tileSprite[t]) {
        const id=tileSprite[t],s=a.sprite(id);
        if(s.animations.length)anim(id,0,px,py,0,0,t===16?0:tick);else if(s.frames.length)frame(id,0,px,py);else r.module(ctx,s,0,px,py);
        if(t===22||t===23)anim('gen1-0',0,t===22?x*24+24:x*24,y*24,0,t===23?1:0);
      } else if(t===79&&!sim)frame('o-0',0,px,py);
      if(debug&&t>=0&&t<80&&![0,1,2,4,5,6,7,10,12,19,43,79].includes(t)&&!tileSprite[t]) {
        ctx.fillStyle='#ed489d';ctx.fillRect(px,py,24,24);ctx.fillStyle='#100719';ctx.font='10px monospace';ctx.fillText(String(t),px+2,py+15);
      }
    }
    if(sim?.boss instanceof AngkorBoss){
      const boss=sim.boss;
      if(boss.visible)anim('b0-0',boss.animation,boss.x*24,boss.drawY,0,0,boss.animationAge);
      if(boss.phase===11)anim('gen1-0',2,(boss.x+1)*24,96,0,0,boss.age);
      if(boss.phase===7)anim('gen0-3',1,boss.x*24+tick*boss.age%48,boss.drawY,0,0,tick);
      for(const x of [10,12,15])frame('b0-1',1,x*24,216);
    }
    if(sim?.boss instanceof BavariaBoss&&sim.boss.visible){
      const boss=sim.boss,sprite=a.sprite('b1-0'),af=r.animationFrame(sprite,boss.animation,boss.animationAge);
      r.frame(ctx,sprite,af.frame,boss.x+af.x,504+af.y,af.flags);
      if(boss.phase===12)anim('gen0-3',0,boss.x+tick*boss.age%48,528,0,0,tick);
    }
    if(sim?.boss instanceof TibetBoss&&sim.boss.visible){
      const boss=sim.boss,sprite=a.sprite('mm1-0'),af=r.animationFrame(sprite,boss.animation,boss.animationAge);
      r.frame(ctx,sprite,af.frame,boss.x+af.x,504+af.y,af.flags);
      if(boss.phase===12)anim('gen0-3',0,boss.x+tick*boss.age%48,528,0,0,tick);
    }
    if(sim)for(const smoke of sim.enemySmoke)r.animation(ctx,a.sprite('cm-3'),0,Math.min(6,smoke.age>>1),(smoke.cell%level.width)*24,Math.floor(smoke.cell/level.width)*24);
    if(sim?.hook){
      const p=sim.player,h=sim.hook;
      ctx.strokeStyle='#e5d1a7';ctx.lineWidth=2;ctx.setLineDash([4,2]);ctx.beginPath();ctx.moveTo(p.x*24+12,p.y*24+12);ctx.lineTo(h.x*24+12,h.y*24+12);ctx.stroke();ctx.setLineDash([]);
    }
    if(sim&&!sim.respawnTravel) {
      const p=sim.player;
      if(sim.invulnerable%4<2){
        const hero=a.sprite('o-0'),af=r.animationFrame(hero,sim.playerAnimation,sim.animationTick);
        // cGame.method_159 adds each animation frame's X/Y before drawing the
        // hero. Left-facing frames are mirrored around x+24 or x+26.
        r.frame(ctx,hero,af.frame,p.x*24-p.dx*p.offset+af.x,p.y*24-p.dy*p.offset+af.y,af.flags);
        if(sim.chestCell>=0&&sim.opened.has(sim.chestCell)&&animationFrameAt(CHEST_OPEN_DURATIONS,sim.chestTicks,false)>13){
          const prize=level.tiles[sim.chestCell],rx=p.x*24-p.dx*p.offset+af.x,ry=p.y*24-p.dy*p.offset+af.y-24;
          if(prize===2||prize===41)r.frame(ctx,a.sprite('cm-2'),0,rx,ry,0,prize===2?1:0);
          else if(prize===42)r.frame(ctx,a.sprite('gen3-1'),0,rx,ry);
          else if(prize===24||prize===27||prize===26)r.module(ctx,a.sprite('gen1-9'),prize===24?0:prize===27?1:2,rx,ry);
          else if(prize===4||prize===5)r.module(ctx,a.sprite('gen0-2'),0,rx+6,ry,0,prize===5?1:0);
          else if(prize===6||prize===7)r.module(ctx,a.sprite('cm-4'),prize===6?0:1,rx,ry);
          else if(prize===51||prize===52||prize===53)r.module(ctx,a.sprite(`mmv-${prize===53?3:prize===51?2:1}`),0,rx,ry);
        }
      }
      if(sim.respawnFlash>0){
        const x=p.x*24+12,y=p.y*24+9,t=12-sim.respawnFlash;
        ctx.fillStyle=t%4<2?'#fff6a0':'#f4a728';
        for(let n=0;n<8;n++){const angle=n*Math.PI/4+t*.12,radius=5+t*.7;
          ctx.fillRect(Math.round(x+Math.cos(angle)*radius),Math.round(y+Math.sin(angle)*radius),2,2);
        }
      }
    }
    // Original foreground tiles and vegetation render after the player (method_153).
    for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++) {
      const i=x+y*level.width,o=level.objects[i];
      if(o>=80&&o!==255)frame(`${w}-2`,o-80,x*24,y*24);
      if(o>=20&&o<26&&w!==2){const s=a.sprite(w===1?'gen2-1':'gen0-4'),an=s.animations[o-20];if(an){const af=s.animationFrames[an.start+((tick>>2)%an.count)];r.frame(ctx,s,af.frame,x*24,y*24,af.flags);}}
    }
    if(debug){
      ctx.strokeStyle='#ffffff20';ctx.lineWidth=1;
      for(let x=0;x<=level.width;x++){ctx.beginPath();ctx.moveTo(x*24+.5,0);ctx.lineTo(x*24+.5,level.height*24);ctx.stroke();}
      for(let y=0;y<=level.height;y++){ctx.beginPath();ctx.moveTo(0,y*24+.5);ctx.lineTo(level.width*24,y*24+.5);ctx.stroke();}
    }
  }
}
