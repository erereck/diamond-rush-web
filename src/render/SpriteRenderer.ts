import type { AnimationFrame, DecodedSprite, FrameModule } from '../assets/SpriteDecoder.ts';
export class SpriteRenderer {
  cache=new Map<string,HTMLCanvasElement>();
  moduleImage(s:DecodedSprite,index:number,palette=0) {
    const key=`${s.name}/${index}/${palette}`; let image=this.cache.get(key); if(image)return image;
    const m=s.modules[index], p=s.palettes[palette];
    if(!m||!p)throw new Error(`Invalid module/palette ${key}`);
    image=document.createElement('canvas');image.width=m.width;image.height=m.height;
    if(m.width&&m.height){
      const pixels=new ImageData(m.width,m.height);
      m.indices.forEach((c,i)=>{const argb=p[c];pixels.data.set([(argb>>>16)&255,(argb>>>8)&255,argb&255,argb>>>24],i*4);});
      image.getContext('2d')!.putImageData(pixels,0,0);
    }
    this.cache.set(key,image);return image;
  }
  module(ctx:CanvasRenderingContext2D,s:DecodedSprite,index:number,x:number,y:number,flags=0,palette=0) {
    const image=this.moduleImage(s,index,palette);if(!image.width||!image.height)return;
    ctx.save();ctx.translate(Math.trunc(x)+((flags&1)?image.width:0),Math.trunc(y)+((flags&2)?image.height:0));
    ctx.scale((flags&1)?-1:1,(flags&2)?-1:1);ctx.drawImage(image,0,0);ctx.restore();
  }
  frameModule(ctx:CanvasRenderingContext2D,s:DecodedSprite,fm:FrameModule,x:number,y:number,flags=0,palette=0) {
    const m=s.modules[fm.module];
    const px=(flags&1)?x-fm.x-m.width:x+fm.x, py=(flags&2)?y-fm.y-m.height:y+fm.y;
    this.module(ctx,s,fm.module,px,py,(flags^fm.flags)&15,palette);
  }
  frame(ctx:CanvasRenderingContext2D,s:DecodedSprite,index:number,x:number,y:number,flags=0,palette=0) {
    const f=s.frames[index];if(!f)throw new Error(`${s.name}: invalid frame ${index}`);
    for(let i=0;i<f.count;i++)this.frameModule(ctx,s,s.frameModules[f.start+i],x,y,flags,palette);
  }
  animationFrame(s:DecodedSprite,animation:number,tick:number):AnimationFrame {
    const a=s.animations[animation];if(!a||!a.count)throw new Error(`${s.name}: invalid animation ${animation}`);
    const frames=s.animationFrames.slice(a.start,a.start+a.count), duration=frames.reduce((n,f)=>n+Math.max(1,f.duration),0);
    let t=((tick%duration)+duration)%duration, af=frames[0];
    for(const f of frames){af=f;if(t<Math.max(1,f.duration))break;t-=Math.max(1,f.duration);}
    return af;
  }
  animation(ctx:CanvasRenderingContext2D,s:DecodedSprite,animation:number,tick:number,x:number,y:number,flags=0,palette=0) {
    const af=this.animationFrame(s,animation,tick);
    // ASprite.drawAnimFrame: FLAG_OFFSET_AF subtracts the stored offset,
    // unless the caller also mirrors that axis.
    if(flags&32){x+=(flags&1)?af.x:-af.x;y+=(flags&2)?af.y:-af.y;}
    this.frame(ctx,s,af.frame,x,y,(flags^af.flags)&15,palette);
  }
  text(ctx:CanvasRenderingContext2D,s:DecodedSprite,map:Uint8Array,text:string,x:number,y:number,align:'left'|'center'|'right'='left',palette=0) {
    const spacing=s.frameModules[0].x;
    const glyph=(c:string)=>map[c.charCodeAt(0)]??map[63];
    const width=(c:string)=>{
      if(c===' ')return s.modules[0].width;
      const n=glyph(c);
      if(n>=s.frames[0].count){const r=s.frames[n-s.frames[0].count].rect;return r[2]-(r[0]&255);}
      const fm=s.frameModules[n];return s.modules[fm.module].width-fm.x;
    };
    const lines=text.split('\n');
    for(let line=0;line<lines.length;line++) {
      const str=lines[line], w=[...str].reduce((a,c)=>a+width(c)+spacing,0)-spacing;
      let px=x-(align==='center'?(w>>1):align==='right'?w:0), py=y-s.frameModules[0].y+line*(s.modules[0].height+2);
      for(const c of str){if(c!==' '){const n=glyph(c);if(n>=s.frames[0].count)this.frame(ctx,s,n-s.frames[0].count,px,py,0,palette);else this.frameModule(ctx,s,s.frameModules[n],px,py,0,palette);}px+=width(c)+spacing;}
    }
  }
}
