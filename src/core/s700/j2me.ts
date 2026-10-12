/**
 * MIDP 2.0 surface used by the generated S700 core. Headless by default (tests, tools, routes):
 * images only keep their size and drawing does nothing. enableRendering() backs images and the
 * screen with Canvas 2D surfaces so the original drawing code produces the game picture.
 * RecordStore is in memory; audio players are inert (the port plays music itself).
 */
import { openResource } from './runtime.ts';

export interface Surface {canvas:CanvasImageSource&{width:number;height:number};ctx:CanvasRenderingContext2D}
type SurfaceFactory=(width:number,height:number)=>Surface;
let createSurface:SurfaceFactory|null=null;
const decoded=new Map<string,Surface>();
/** Turns on drawing. `factory` creates an offscreen 2D surface (HTMLCanvasElement or OffscreenCanvas). */
export function enableRendering(factory:SurfaceFactory|null){createSurface=factory;}
export function renderingEnabled(){return createSurface!==null;}
/** PNG files must be decoded before the game asks for them synchronously (Image.createImage(byte[])). */
export function registerDecodedImage(bytes:ArrayLike<number>,surface:Surface){decoded.set(imageKey(bytes,0,bytes.length),surface);}
function imageKey(bytes:ArrayLike<number>,off:number,len:number){
  let h=0x811c9dc5;for(let i=0;i<len;i++){h^=bytes[off+i]&255;h=Math.imul(h,0x01000193);}
  return `${len}:${h>>>0}`;
}
function css(color:number){return `#${(color&0xffffff).toString(16).padStart(6,'0')}`;}

export class Graphics {
  static HCENTER=1;static VCENTER=2;static LEFT=4;static RIGHT=8;static TOP=16;static BOTTOM=32;static BASELINE=64;static SOLID=0;static DOTTED=1;
  cx=0;cy=0;cw:number;ch:number;tx=0;ty=0;color=0;font:Font=Font.def;
  readonly ctx:CanvasRenderingContext2D|null;readonly width:number;readonly height:number;
  constructor(ctx:CanvasRenderingContext2D|null=null,width=240,height=320){
    this.ctx=ctx;this.width=width;this.height=height;this.cw=width;this.ch=height;
    if(ctx){ctx.imageSmoothingEnabled=false;ctx.save();}
  }
  private applyClip(){
    const c=this.ctx;if(!c)return;
    c.restore();c.save();c.beginPath();c.rect(this.cx,this.cy,this.cw,this.ch);c.clip();
  }
  setColor(r:number,g?:number,b?:number){this.color=g===undefined?r&0xffffff:((r&255)<<16)|((g&255)<<8)|(b!&255);}
  getColor(){return this.color;}
  setClip(x:number,y:number,w:number,h:number){this.cx=x+this.tx;this.cy=y+this.ty;this.cw=w;this.ch=h;this.applyClip();}
  clipRect(x:number,y:number,w:number,h:number){
    const x0=Math.max(this.cx,x+this.tx),y0=Math.max(this.cy,y+this.ty);
    const x1=Math.min(this.cx+this.cw,x+this.tx+w),y1=Math.min(this.cy+this.ch,y+this.ty+h);
    this.cx=x0;this.cy=y0;this.cw=Math.max(0,x1-x0);this.ch=Math.max(0,y1-y0);this.applyClip();
  }
  getClipX(){return this.cx-this.tx;} getClipY(){return this.cy-this.ty;} getClipWidth(){return this.cw;} getClipHeight(){return this.ch;}
  translate(x:number,y:number){this.tx+=x;this.ty+=y;} getTranslateX(){return this.tx;} getTranslateY(){return this.ty;}
  setFont(f:Font){this.font=f??Font.def;} getFont(){return this.font;} setStrokeStyle(){}
  fillRect(x:number,y:number,w:number,h:number){const c=this.ctx;if(!c||w<=0||h<=0)return;c.fillStyle=css(this.color);c.fillRect(x+this.tx,y+this.ty,w,h);}
  drawRect(x:number,y:number,w:number,h:number){
    if(!this.ctx||w<0||h<0)return;
    this.fillRect(x,y,w+1,1);this.fillRect(x,y+h,w+1,1);this.fillRect(x,y,1,h+1);this.fillRect(x+w,y,1,h+1);
  }
  drawLine(x1:number,y1:number,x2:number,y2:number){
    if(!this.ctx)return;
    if(y1===y2){this.fillRect(Math.min(x1,x2),y1,Math.abs(x2-x1)+1,1);return;}
    if(x1===x2){this.fillRect(x1,Math.min(y1,y2),1,Math.abs(y2-y1)+1);return;}
    // Bresenham, like a handset framebuffer.
    let dx=Math.abs(x2-x1),dy=-Math.abs(y2-y1),sx=x1<x2?1:-1,sy=y1<y2?1:-1,err=dx+dy,x=x1,y=y1;
    for(;;){this.fillRect(x,y,1,1);if(x===x2&&y===y2)break;const e2=2*err;if(e2>=dy){err+=dy;x+=sx;}if(e2<=dx){err+=dx;y+=sy;}}
  }
  private roundPath(x:number,y:number,w:number,h:number,aw:number,ah:number){
    const c=this.ctx!;c.beginPath();
    if(typeof (c as any).roundRect==='function')(c as any).roundRect(x+this.tx,y+this.ty,w,h,[Math.min(aw,w)/2,Math.min(ah,h)/2].map(v=>Math.max(0,v))[0]);
    else c.rect(x+this.tx,y+this.ty,w,h);
  }
  fillRoundRect(x:number,y:number,w:number,h:number,aw:number,ah:number){if(!this.ctx)return;this.roundPath(x,y,w,h,aw,ah);this.ctx.fillStyle=css(this.color);this.ctx.fill();}
  drawRoundRect(x:number,y:number,w:number,h:number,aw:number,ah:number){if(!this.ctx)return;this.roundPath(x+0.5,y+0.5,w,h,aw,ah);this.ctx.strokeStyle=css(this.color);this.ctx.lineWidth=1;this.ctx.stroke();}
  fillArc(x:number,y:number,w:number,h:number,start:number,arc:number){
    const c=this.ctx;if(!c)return;
    c.beginPath();c.ellipse(x+this.tx+w/2,y+this.ty+h/2,w/2,h/2,0,-start*Math.PI/180,-(start+arc)*Math.PI/180,arc>0);c.lineTo(x+this.tx+w/2,y+this.ty+h/2);c.fillStyle=css(this.color);c.fill();
  }
  drawArc(x:number,y:number,w:number,h:number,start:number,arc:number){
    const c=this.ctx;if(!c)return;
    c.beginPath();c.ellipse(x+this.tx+w/2+0.5,y+this.ty+h/2+0.5,w/2,h/2,0,-start*Math.PI/180,-(start+arc)*Math.PI/180,arc>0);c.strokeStyle=css(this.color);c.lineWidth=1;c.stroke();
  }
  fillTriangle(x1:number,y1:number,x2:number,y2:number,x3:number,y3:number){
    const c=this.ctx;if(!c)return;
    c.beginPath();c.moveTo(x1+this.tx,y1+this.ty);c.lineTo(x2+this.tx,y2+this.ty);c.lineTo(x3+this.tx,y3+this.ty);c.closePath();c.fillStyle=css(this.color);c.fill();
  }
  drawImage(img:Image,x:number,y:number,anchor:number){
    if(!this.ctx||!img?.surface)return;
    if(anchor&Graphics.HCENTER)x-=img.w>>1;else if(anchor&Graphics.RIGHT)x-=img.w;
    if(anchor&Graphics.VCENTER)y-=img.h>>1;else if(anchor&Graphics.BOTTOM)y-=img.h;
    this.ctx.drawImage(img.surface.canvas,x+this.tx,y+this.ty);
  }
  /** javax.microedition.lcdui.game.Sprite transforms, applied about the destination region. */
  drawRegion(img:Image,sx:number,sy:number,w:number,h:number,transform:number,dx:number,dy:number,anchor:number){
    const c=this.ctx;if(!c||!img?.surface||w<=0||h<=0)return;
    const swap=transform>=4;const tw=swap?h:w,th=swap?w:h;
    if(anchor&Graphics.HCENTER)dx-=tw>>1;else if(anchor&Graphics.RIGHT)dx-=tw;
    if(anchor&Graphics.VCENTER)dy-=th>>1;else if(anchor&Graphics.BOTTOM)dy-=th;
    const x=dx+this.tx,y=dy+this.ty;
    // Matrices map source (u,v) in [0,w)x[0,h) to the transformed region at (x,y).
    const m:[number,number,number,number,number,number]=[
      [1,0,0,1,x,y],[1,0,0,-1,x,y+th],[-1,0,0,1,x+tw,y],[-1,0,0,-1,x+tw,y+th],
      [0,1,1,0,x,y],[0,1,-1,0,x+tw,y],[0,-1,1,0,x,y+th],[0,-1,-1,0,x+tw,y+th],
    ][transform] as any??[1,0,0,1,x,y];
    c.save();c.setTransform(m[0],m[1],m[2],m[3],m[4],m[5]);
    c.drawImage(img.surface.canvas,sx,sy,w,h,0,0,w,h);
    c.restore();this.applyClip();
  }
  drawRGB(data:ArrayLike<number>,offset:number,scan:number,x:number,y:number,w:number,h:number,alpha:boolean){
    if(!this.ctx||!createSurface||w<=0||h<=0)return;
    const tmp=createSurface(w,h),pixels=tmp.ctx.createImageData(w,h);
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const v=data[offset+j*scan+i],p=(j*w+i)*4;
      pixels.data[p]=(v>>16)&255;pixels.data[p+1]=(v>>8)&255;pixels.data[p+2]=v&255;pixels.data[p+3]=alpha?(v>>>24)&255:255;
    }
    tmp.ctx.putImageData(pixels,0,0);this.ctx.drawImage(tmp.canvas,x+this.tx,y+this.ty);
  }
  drawString(s:string,x:number,y:number,anchor:number){
    const c=this.ctx;if(!c)return;
    const f=this.font,width=f.stringWidth(s);
    if(anchor&Graphics.HCENTER)x-=width>>1;else if(anchor&Graphics.RIGHT)x-=width;
    if(anchor&Graphics.BOTTOM)y-=f.getHeight();else if(anchor&Graphics.BASELINE)y-=f.getBaselinePosition();
    c.font=`${f.getHeight()-2}px monospace`;c.textBaseline='top';c.fillStyle=css(this.color);c.fillText(s,x+this.tx,y+this.ty);
  }
  drawSubstring(s:string,o:number,l:number,x:number,y:number,a:number){this.drawString(s.substring(o,o+l),x,y,a);}
  drawChar(ch:number,x:number,y:number,a:number){this.drawString(String.fromCharCode(ch),x,y,a);}
  drawChars(chars:ArrayLike<number>,o:number,l:number,x:number,y:number,a:number){let s='';for(let i=0;i<l;i++)s+=String.fromCharCode(chars[o+i]);this.drawString(s,x,y,a);}
}
export class Image {
  w:number;h:number;surface:Surface|null;
  constructor(w:number,h:number,surface:Surface|null=null){this.w=w;this.h=h;this.surface=surface;}
  static mutable(w:number,h:number){
    const s=createSurface?createSurface(w,h):null;
    if(s){s.ctx.fillStyle='#fff';s.ctx.fillRect(0,0,w,h);}
    return new Image(w,h,s);
  }
  static createImage(a:any,b?:any,c?:any,d?:any,e?:any):Image{
    if(typeof a==='number')return Image.mutable(a,b);
    if(typeof a==='string'){
      const s=openResource(a);if(!s)throw new Error(`IOException ${a}`);
      const bytes=new Int8Array(s.available());s.read(bytes);return Image.createImage(bytes,0,bytes.length);
    }
    if(a instanceof Image){
      if(d===undefined)return new Image(a.w,a.h,a.surface);
      const img=Image.mutable(d,e);if(img.surface&&a.surface)img.surface.ctx.drawImage(a.surface.canvas,b,c,d,e,0,0,d,e);return img;
    }
    const o=b??0,l=c??a.length;
    if(l>24&&a[o+1]===80&&a[o+2]===78&&a[o+3]===71){
      const u=(i:number)=>a[o+i]&255;
      const w=((u(16)<<24)|(u(17)<<16)|(u(18)<<8)|u(19))>>>0,h=((u(20)<<24)|(u(21)<<16)|(u(22)<<8)|u(23))>>>0;
      return new Image(w,h,createSurface?decoded.get(imageKey(a,o,l))??null:null);
    }
    return new Image(1,1);
  }
  static createRGBImage(data:ArrayLike<number>,w:number,h:number,alpha:boolean){
    if(!createSurface)return new Image(w,h);
    const s=createSurface(w,h),pixels=s.ctx.createImageData(w,h);
    for(let i=0;i<w*h;i++){const v=data[i],p=i*4;pixels.data[p]=(v>>16)&255;pixels.data[p+1]=(v>>8)&255;pixels.data[p+2]=v&255;pixels.data[p+3]=alpha?(v>>>24)&255:255;}
    s.ctx.putImageData(pixels,0,0);
    return new Image(w,h,s);
  }
  getWidth(){return this.w;} getHeight(){return this.h;}
  getGraphics(){return new Graphics(this.surface?.ctx??null,this.w,this.h);} isMutable(){return true;}
  getRGB(out:any,offset:number,scan:number,x:number,y:number,w:number,h:number){
    if(!this.surface)return;const px=this.surface.ctx.getImageData(x,y,w,h).data;
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){const p=(j*w+i)*4;out[offset+j*scan+i]=((px[p+3]<<24)|(px[p]<<16)|(px[p+1]<<8)|px[p+2])|0;}
  }
}
export class Font {
  static FACE_SYSTEM=0;static STYLE_PLAIN=0;static STYLE_BOLD=1;static SIZE_SMALL=8;static SIZE_MEDIUM=0;static SIZE_LARGE=16;static FACE_MONOSPACE=32;static FACE_PROPORTIONAL=64;static STYLE_ITALIC=2;static STYLE_UNDERLINED=4;
  static def=new Font();
  static getDefaultFont(){return Font.def;} static getFont(){return Font.def;}
  getHeight(){return 12;} stringWidth(s:string){return s.length*6;} charWidth(){return 6;} substringWidth(_s:string,_o:number,l:number){return l*6;} getBaselinePosition(){return 10;}
}
export class Displayable {getWidth(){return 240;} getHeight(){return 320;} isShown(){return true;}}
export class Canvas extends Displayable {
  static UP=1;static DOWN=6;static LEFT=2;static RIGHT=5;static FIRE=8;
  static KEY_NUM0=48;static KEY_NUM1=49;static KEY_NUM2=50;static KEY_NUM3=51;static KEY_NUM4=52;static KEY_NUM5=53;static KEY_NUM6=54;static KEY_NUM7=55;static KEY_NUM8=56;static KEY_NUM9=57;static KEY_STAR=42;static KEY_POUND=35;
  getGameAction(){return 0;} getKeyCode(){return 0;} getKeyName(){return '';}
  setFullScreenMode(){} repaint(){} serviceRepaints(){} hasPointerEvents(){return false;} hasRepeatEvents(){return false;} isDoubleBuffered(){return true;}
}
export class GameCanvas extends Canvas {
  static UP_PRESSED=2;static DOWN_PRESSED=64;static LEFT_PRESSED=4;static RIGHT_PRESSED=32;static FIRE_PRESSED=256;
  screen:Surface|null=null;g:Graphics;
  constructor(_s?:boolean){super();this.screen=createSurface?createSurface(240,320):null;this.g=new Graphics(this.screen?.ctx??null);}
  getGraphics(){return this.g;} flushGraphics(){} getKeyStates(){return 0;} paint(){}
}
export class Display {
  static d=new Display();
  static getDisplay(){return Display.d;}
  setCurrent(){} vibrate(){return true;} flashBacklight(){return true;} getCurrent(){return null;}
}
export class Sprite {static TRANS_NONE=0;static TRANS_ROT90=5;static TRANS_ROT180=3;static TRANS_ROT270=6;static TRANS_MIRROR=2;static TRANS_MIRROR_ROT90=7;static TRANS_MIRROR_ROT180=1;static TRANS_MIRROR_ROT270=4;}
export class MIDlet {
  notifyDestroyed(){} notifyPaused(){} resumeRequest(){}
  getAppProperty(k:string){return k==='MIDlet-Version'?'1.2.0':null;}
  platformRequest(){return false;}
}
export class RecordStore {
  static STORES=new Map<string,RecordStore>();
  records:Int8Array[]=[];
  static openRecordStore(n:string,create:boolean){
    let r=RecordStore.STORES.get(n);
    if(!r){if(!create)throw new Error(`RecordStoreNotFoundException ${n}`);r=new RecordStore();RecordStore.STORES.set(n,r);}
    return r;
  }
  static deleteRecordStore(n:string){RecordStore.STORES.delete(n);}
  closeRecordStore(){}
  getNumRecords(){return this.records.length;}
  getRecord(id:number){if(id<1||id>this.records.length)throw new Error('InvalidRecordIDException');return this.records[id-1].slice();}
  addRecord(d:Int8Array,o:number,l:number){this.records.push(d.slice(o,o+l));return this.records.length;}
  setRecord(id:number,d:Int8Array,o:number,l:number){if(id<1||id>this.records.length)throw new Error('InvalidRecordIDException');this.records[id-1]=d.slice(o,o+l);}
  getRecordSize(id:number){return this.records[id-1].length;}
}
class Player {
  state=100;level=100;mute=false;
  realize(){this.state=200;} prefetch(){this.state=300;} start(){} stop(){} deallocate(){this.state=200;} close(){this.state=0;}
  getState(){return this.state;} setLoopCount(){} setMediaTime(){return 0n;} getMediaTime(){return 0n;} getDuration(){return 0n;}
  addPlayerListener(){} removePlayerListener(){} getContentType(){return 'audio/midi';}
  getControl(){return this;} getControls(){return [this];}
  setLevel(l:number){this.level=l;return l;} getLevel(){return this.level;} setMute(m:boolean){this.mute=m;} isMuted(){return this.mute;}
}
export class Manager {static createPlayer(){return new Player();}}
