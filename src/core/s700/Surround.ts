/**
 * The stage beyond the original screen, painted by the original's own code: method_151 (stones,
 * diamonds, creatures, doors, switches…), then method_153's foreground decorations and explosions, for
 * every cell the window shows. The port's level renderer only draws the scenery behind them.
 *
 * method_151 covers the 13×13 cells around the camera cell (field_402/403), and its paint changes the
 * state (creatures' animation bits, sprite instances, the hero's sprite for the letterbox). So the
 * host runs this on the frame's state just before the frame's own paint, in turns over the window
 * with the camera cell moved, and puts the engine back afterwards (Simulation: S700Engine.beforePaint).
 * Painted from the same state as the frame's paint, the pieces that cross the screen's edge match.
 */
import * as Core from '../../generated/s700.ts';
import { Graphics } from './j2me.ts';

/** Where the stage beyond the screen is painted: a canvas the size of the window, in the original screen's pixels. */
export interface SurroundLayer {ctx:CanvasRenderingContext2D;width:number;height:number;originX:number;originY:number}
const cGame:any=Core.cGame;
const CELL=24,PLAY_TOP=40,BLOCK=13;

/** Graphics over the whole layer: the original's clips to its 240×240 play area open to the window. */
class WindowGraphics extends Graphics {
  /** The clip back to the whole layer, at the current translation. */
  open(){super.setClip(-this.tx,-this.ty,this.width,this.height);}
  override setClip(){this.open();}
}

/**
 * method_153's preamble: the values its paint computes before method_151 (sparkle phase, shake, camera
 * cell and offset). field_202 keeps the shaken camera, as during the paint.
 */
function preparePaint(g:any){
  const counter=cGame.frameCounter|0;
  g.field_291=(g.field_233&4096)===0?g.field_197:0;
  let shake=0;
  if(g.field_255>0)shake=Math.imul(g.field_255,counter)%((g.field_255>>1)+1)%12;
  if(shake>g.field_202)shake=g.field_202;
  g.field_256=shake;g.field_202-=shake;
  g.field_402=(g.field_201/CELL)|0;g.field_403=(g.field_202/CELL)|0;
  g.field_404=g.field_201%CELL;g.field_405=g.field_202%CELL;
  let sparkle=(counter&63)>>1;if(sparkle>=4)sparkle=0;
  g.field_292=sparkle;
}
/** method_153's foreground: animated and decorated cells of the object plane, drawn over method_151 (cells relative to the camera cell). */
function paintDecorations(game:any,g:Graphics,c0:number,c1:number,r0:number,r1:number){
  const counter=cGame.frameCounter|0,s=cGame.field_320,objects=cGame.field_332,tiles=cGame.field_334;
  const col=game.field_402,row=game.field_403,dx=game.field_404,dy=game.field_405;
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
    const x=col+c,y=row+r;
    if(x<0||x>=game.crtLevelWidth||y<0||y>=game.crtLevelHeight)continue;
    const value=objects[x][y]|0,kind=value&255;
    if(kind>=38&&kind<80)continue;
    const px=c*CELL-dx,py=r*CELL-dy;
    if(kind>=20&&kind<26){
      const anim=kind-20;s[3]?.drawAnimFrame(g,anim,(counter>>2)%(s[3]._anims_naf[anim]&255),px,py,0,0,0);
    }else{
      if(kind===31){const anim=value>>8;s[15]?.drawAnimFrame(g,anim,(counter>>1)%(s[15]._anims_naf[anim]&255),px,py,0,0,0);}
      else if(kind===32)s[16]?.drawAnimFrame(g,0,(value>>8)&255,px,py,0,0,0);
      else if(kind===36)s[20]?.drawAnimFrame(g,0,(((value>>8)-1)*7/16)|0,px,py,0,0,0);
      else{const frame=((kind-80)<<24)>>24;if(frame>=0)s[42]?.drawFrame(g,frame,px,py,0,0,0);}
      const overlay=(value&-268435456)>>28;
      if(overlay>0)s[13]?.drawAnimFrame(g,0,overlay,px,py,0,0,0);
    }
    if(tiles[x][y]===54&&s[7])s[7].drawAnimFrame(g,0,cGame.method_204(s[7],0,cGame.field_333[x][y]),px,py,0,0,0);
  }
}
/** method_153's explosions and debris (up to eight, in map cells). */
function paintEffects(game:any,g:Graphics){
  const at=cGame.field_159,frames=cGame.field_160,anims=cGame.field_161,s=cGame.field_320;
  for(let i=game.field_162;i!==game.field_163;i=(i+1)&7){
    const x=at[i<<1]*CELL-game.field_201,y=at[(i<<1)+1]*CELL-game.field_202;
    if(anims[i]<0)s[2]?.drawAnimFrame(g,0,cGame.method_204(s[2],0,frames[i]),x,y,0,0,0);
    else s[9]?.drawAnimFrame(g,anims[i],frames[i],x,y,0,0,0);
  }
}

class SurroundObjects {
  private layer:SurroundLayer|null=null;
  get active(){return this.layer!==null;}
  setLayer(layer:SurroundLayer|null){this.layer=layer;}
  /** Paints the layer from the game's state (changing it: the caller puts the engine back). */
  paint(game:any){
    const l=this.layer;if(!l)return;
    l.ctx.clearRect(0,0,l.width,l.height);
    preparePaint(game);
    const col=game.field_402,row=game.field_403,dx=game.field_404,dy=game.field_405,top=l.originY+PLAY_TOP;
    // Cells (relative to the camera cell) the window shows, with one more around for pieces that overhang.
    const c0=Math.floor((dx-l.originX)/CELL)-1,c1=Math.ceil((l.width-l.originX+dx)/CELL)+1;
    const r0=Math.floor((dy-top)/CELL)-1,r1=Math.ceil((l.height-top+dy)/CELL)+1;
    const g=new WindowGraphics(l.ctx,l.width,l.height),screen=game.field_314;
    game.field_314=g;
    try{
      // method_151 paints cells −1…11 around the camera cell: one turn per 13×13 block of the window.
      for(let j=r0+1;j-1<=r1;j+=BLOCK)for(let k=c0+1;k-1<=c1;k+=BLOCK){
        game.field_402=col+k;game.field_403=row+j;
        g.tx=l.originX+k*CELL;g.ty=top+j*CELL;g.open();
        game.method_151(g);
      }
      game.field_402=col;game.field_403=row;
      g.tx=l.originX;g.ty=top;g.open();
      paintDecorations(game,g,c0,c1,r0,r1);
      paintEffects(game,g);
    }finally{game.field_314=screen;l.ctx.restore();}
  }
}
export const surroundObjects=new SurroundObjects();
