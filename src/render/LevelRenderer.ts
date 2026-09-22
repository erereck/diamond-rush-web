import { AssetManager } from '../assets/AssetManager.ts';
import type { LevelDefinition } from '../level/LevelParser.ts';
import { SpriteRenderer } from './SpriteRenderer.ts';
import type { Simulation } from '../core/Simulation.ts';
import { animationFrameAt, CHEST_OPEN_DURATIONS, fallingDrawOffset } from '../core/PhaseOneRules.ts';
const tileSprite:Record<number,string>={8:'gen0-5',11:'gen1-4',14:'gen1-2',16:'gen1-3',18:'gen3-9',22:'gen0-9',23:'gen0-9',24:'gen1-9',26:'gen1-9',27:'gen1-9',28:'gen0-8',30:'gen0-7',34:'gen2-4',35:'gen2-4',36:'gen0-8',37:'gen2-5',38:'gen2-6',39:'gen2-6',40:'gen2-7',42:'gen3-1',44:'gen3-4',45:'gen3-5',46:'gen3-7',47:'gen2-3',48:'gen3-2',49:'gen4-1'};
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
      if(obj===8||obj===9)r.module(ctx,a.sprite('gen2-8'),sim?.unlockedGates.has(i)?1:0,px,py,obj===8?1:0);
      if(obj===7){
        const phase=sim?.gatePhases[i]??0,frameNumber=Math.max(0,phase-1);
        if(![8,9].includes(level.objects[i-level.width]))frame('cm-1',frameNumber,px,py);
        frame('cm-1',frameNumber+3,px,py);
      }
      if(sim?.entranceGate===i){frame('cm-1',2,px,py);frame('cm-1',5,px,py);}
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
      else if(t===19||t===43) {
        const id=w===1?'gen1-7':'gen1-5',direction=sim?((sim.state[i]&7)||((sim.state[i]&28672)>>12)):level.parameters[i];
        anim(id,w===1?0:Math.max(0,direction-1),px,py,t===43?1:w===2?2:0,0,tick>>1);
      } else if(t===6||t===7)r.module(ctx,a.sprite('cm-4'),t===6?0:1,px,py);
      else if(tileSprite[t]) {
        const id=tileSprite[t],s=a.sprite(id);
        if(s.animations.length)anim(id,0,px,py);else if(s.frames.length)frame(id,0,px,py);else r.module(ctx,s,0,px,py);
        if(t===22||t===23)anim('gen1-0',0,t===22?x*24+24:x*24,y*24,0,t===23?1:0);
      } else if(t===79&&!sim)frame('o-0',0,px,py);
      if(debug&&t>=0&&t<80&&![0,1,2,4,5,6,7,10,12,19,43,79].includes(t)&&!tileSprite[t]) {
        ctx.fillStyle='#ed489d';ctx.fillRect(px,py,24,24);ctx.fillStyle='#100719';ctx.font='10px monospace';ctx.fillText(String(t),px+2,py+15);
      }
    }
    if(sim) {
      const p=sim.player;
      if(sim.invulnerable%4<2){
        const hero=a.sprite('o-0'),af=r.animationFrame(hero,sim.playerAnimation,sim.animationTick);
        // cGame.method_159 adds each animation frame's X/Y before drawing the
        // hero. Left-facing frames are mirrored around x+24 or x+26.
        r.frame(ctx,hero,af.frame,p.x*24-p.dx*p.offset+af.x,p.y*24-p.dy*p.offset+af.y,af.flags);
        if(sim.chestCell>=0&&sim.opened.has(sim.chestCell)&&
          animationFrameAt(CHEST_OPEN_DURATIONS,sim.chestTicks,false)>13)
          r.frame(ctx,a.sprite('cm-2'),0,p.x*24-p.dx*p.offset+af.x,p.y*24-p.dy*p.offset+af.y-24,0,
            level.tiles[sim.chestCell]===41?0:1);
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
