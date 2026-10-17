/**
 * The original HUD (cGame.method_166) laid out across a window wider than the phone. The bars run
 * from edge to edge and their contents keep to the sides: lives and the compass on the left, keys,
 * cauldrons and diamond counts on the right, the energy in the middle. The original code still draws
 * every piece with the original sprites; the port only moves each piece by its group and fills the
 * lengthened bars with their own 9×40 slice (ui.f sprite 2, module 20).
 *
 * The HUD goes to a layer of its own, redrawn in full on every paint: field_170 asks method_166 for a
 * full redraw, and method_166 clears it and refreshes its caches (field_410–416) itself, so the game's
 * state after the paint is the same as after the original incremental drawing. field_170 and those
 * caches are only read by method_166. The original screen's HUD bands are cleared instead, so what
 * the game draws over them after the HUD (cutscene bars, the closing letterbox) still lands there.
 */
import * as Core from '../../generated/s700.ts';
import { Graphics } from './j2me.ts';
import type { Image } from './j2me.ts';

/** Where the HUD is drawn: a canvas the size of the window, in the original screen's pixels. */
export interface HudLayer {
  ctx:CanvasRenderingContext2D;width:number;height:number;
  /** Position of the original 240×320 screen in the layer. */
  originX:number;originY:number;
  /** Space each bar keeps free at the sides (safe areas, on-screen controls over the bar). */
  top:BarInsets;bottom:BarInsets;
}
export interface BarInsets {left:number;right:number}
type Group='left'|'center'|'right';
const cGame:any=Core.cGame;
const SCREEN_WIDTH=240;
/** The bars' slice that lengthens them. */
const FILLER=20,FILLER_WIDTH=9,BAR_HEIGHT=40;
/**
 * Where the bars split, in screen x (method_166 draws both bars translated by 120). Top bar: lives
 * (bar x −75…−29) | keys (14…87). Bottom bar: compass (…−46) | energy (−46…25) | cauldrons (24…).
 */
const TOP_SPLIT=118,BOTTOM_LEFT_END=74,BOTTOM_CENTER_END=145,BOTTOM_RIGHT_START=144;

/** Graphics that moves what it draws by the group being drawn. */
class AnchoredGraphics extends Graphics {
  group:Group='center';
  readonly layer:HudLayer;
  constructor(layer:HudLayer){super(layer.ctx,layer.width,layer.height);this.layer=layer;}
  /** The bar being drawn: method_166 translates to the bottom bar by 320 and to the top bar by 0. */
  private insets(){return this.ty>=160?this.layer.bottom:this.layer.top;}
  /** Layer x of screen x 0 for the current group. */
  private shift(){const l=this.layer,i=this.insets();return this.group==='left'?i.left:this.group==='right'?l.width-SCREEN_WIDTH-i.right:l.originX;}
  override setClip(){}
  override clipRect(){}
  override drawImage(img:Image,x:number,y:number,anchor:number){super.drawImage(img,x+this.shift(),y+this.layer.originY,anchor);}
  override drawRegion(img:Image,sx:number,sy:number,w:number,h:number,transform:number,dx:number,dy:number,anchor:number){
    super.drawRegion(img,sx,sy,w,h,transform,dx+this.shift(),dy+this.layer.originY,anchor);
  }
  /** Lengthens a bar: the slice repeated over the spaces its groups leave between them. */
  fillBar(sprite:any,bar:'top'|'bottom'){
    const image:Image|undefined=sprite._modules_image?.[sprite._crt_pal]?.[FILLER],l=this.layer,c=l.ctx;
    if(!image?.surface)return;
    const i=bar==='top'?l.top:l.bottom,y=l.originY+(bar==='top'?0:320-BAR_HEIGHT),right=l.width-SCREEN_WIDTH-i.right;
    const gaps=bar==='top'?[[TOP_SPLIT+i.left,TOP_SPLIT+right]]
      :[[BOTTOM_LEFT_END+i.left,BOTTOM_LEFT_END+l.originX],[BOTTOM_CENTER_END+l.originX,BOTTOM_RIGHT_START+right]];
    for(const [from,to] of gaps){
      if(to<=from)continue;
      c.save();c.beginPath();c.rect(from,y,to-from,BAR_HEIGHT);c.clip();
      for(let x=from;x<to;x+=FILLER_WIDTH)c.drawImage(image.surface.canvas,x,y);
      c.restore();
    }
  }
}
/** The group of a piece of the HUD sprite (ui.f sprite 2, cGame.field_320[0]). */
function groupOf(sprite:any,frame:number,fmodule:number):Group{
  if(frame===0||frame===20){
    const o=(sprite._frames_fm_start[frame]+fmodule)<<2,x=120+sprite.frameModules[o+1],width=sprite.modules[(sprite.frameModules[o]&255)<<1]&255;
    if(frame===20)return x+width/2<TOP_SPLIT+2?'left':'right';
    return x+width<=BOTTOM_LEFT_END?'left':x>=BOTTOM_RIGHT_START?'right':'center';
  }
  // 1: the cauldrons; 2–18: the compass and its needle; 19: the soft key mark in the bottom left corner.
  return frame===1||frame>19?'right':'left';
}

class WideHud {
  private graphics:AnchoredGraphics|null=null;
  get active(){return this.graphics!==null;}
  /** Null draws the HUD in the original screen, as the original does. */
  setLayer(layer:HudLayer|null){this.graphics=layer?new AnchoredGraphics(layer):null;}
  paint(game:any,original:()=>void){
    const g=this.graphics!,screen:Graphics=game.field_314;
    // method_153 has just set the screen's clip to the whole screen.
    screen.ctx?.clearRect(0,0,SCREEN_WIDTH,BAR_HEIGHT);screen.ctx?.clearRect(0,320-BAR_HEIGHT,SCREEN_WIDTH,BAR_HEIGHT);
    g.layer.ctx.clearRect(0,0,g.layer.width,g.layer.height);
    g.tx=0;g.ty=0;g.group='center';
    game.field_170=true;game.field_314=g;
    try{original.call(game);}finally{game.field_314=screen;}
  }
}
export const wideHud=new WideHud();

let installed=false;
/** Routes the original HUD through wideHud when it has a layer. Browser only; the tests and tools run the original. */
export function installWideHud(){
  if(installed)return;installed=true;
  const game=cGame.prototype,sprite=(Core.ASprite as any).prototype;
  const paintHud=game.method_166;
  game.method_166=function(this:any){if(wideHud.active)wideHud.paint(this,paintHud);else paintHud.call(this);};
  const drawFrame=sprite.drawFrame;
  sprite.drawFrame=function(this:any,g:any,frame:number,...rest:any[]){
    if(g instanceof AnchoredGraphics&&this===cGame.field_320[0]&&(frame===0||frame===20))g.fillBar(this,frame===0?'bottom':'top');
    return drawFrame.call(this,g,frame,...rest);
  };
  const drawFrameModule=sprite.drawFrameModule;
  sprite.drawFrameModule=function(this:any,g:any,frame:number,fmodule:number,...rest:any[]){
    if(!(g instanceof AnchoredGraphics)||this!==cGame.field_320[0])return drawFrameModule.call(this,g,frame,fmodule,...rest);
    const previous=g.group;g.group=groupOf(this,frame,fmodule);
    try{return drawFrameModule.call(this,g,frame,fmodule,...rest);}finally{g.group=previous;}
  };
  // Lives (x −29) on the left; keys and diamond counts on the right.
  const drawNumber=cGame.method_209;
  cGame.method_209=function(this:any,g:any,x:number,...rest:any[]){
    if(!(g instanceof AnchoredGraphics))return drawNumber.call(this,g,x,...rest);
    const previous=g.group;g.group=x<0?'left':'right';
    try{return drawNumber.call(this,g,x,...rest);}finally{g.group=previous;}
  };
}
