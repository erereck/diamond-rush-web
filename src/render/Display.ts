import type { BarInsets, HudLayer } from '../core/s700/Hud.ts';
import type { Filter, Scaling, Surround } from '../platform/Settings.ts';
import type { CellSource, LevelRenderer } from './LevelRenderer.ts';

/** The original screen and the area of it where the stage is drawn (cGame.method_153 translates by 40). */
export const SCREEN_WIDTH=240,SCREEN_HEIGHT=320,PLAY_TOP=40;
/** DemoInterpreter.method_22's cutscene bars, at the top and bottom of the screen. */
const CUTSCENE_BARS=42;

/** What the window around the original screen needs from a running stage. */
export interface StageView {
  cells:CellSource;camera:{x:number;y:number};tick:number;
  /** The original's whole-screen effects (Simulation.effects). */
  shake:number;closing:number;cutscene:boolean;blackout:boolean;
  /** The HUD is in the HUD layer (wide HUD); under the screen while the port's pause menu covers it. */
  hud:boolean;paused:boolean;
}

/**
 * Presents the 240×320 picture (drawn by the original code or the port's menus into `screen`) in a
 * canvas that fills the window. The canvas works in logical pixels of the original screen: it is
 * larger than 240×320 when the window is wider or taller, and the extra area shows the chosen
 * surround (black, the world's background, or the stage beyond the original camera), the wide HUD,
 * and the original's whole-screen effects carried to the window's edges.
 */
export class Display {
  readonly screen=document.createElement('canvas');
  readonly screenContext:CanvasRenderingContext2D;
  /** The wide HUD (core/s700/Hud.ts) draws here, over the whole canvas. */
  readonly hud=document.createElement('canvas');
  private readonly hudContext:CanvasRenderingContext2D;
  hudLayer:HudLayer;
  /** Called after the canvas changes size or the HUD layer is replaced. */
  onLayout:()=>void=()=>{};
  private readonly context:CanvasRenderingContext2D;
  /** Logical canvas size and where the original screen sits in it. */
  width=SCREEN_WIDTH;height=SCREEN_HEIGHT;originX=0;originY=0;
  /** CSS pixels per logical pixel (horizontal and vertical differ only when stretching). */
  scaleX=1;scaleY=1;
  private scaling:Scaling='fit';private surround:Surround='black';
  /** The surround changes with the game (20 Hz), not with the display: it is redrawn once per tick. */
  private readonly surroundCanvas=document.createElement('canvas');
  private surroundKey='';
  /** Reads the safe-area insets (a phone's notch and rounded corners) in CSS pixels. */
  private readonly safeArea=document.createElement('div');
  /** On-screen controls (CSS pixel rectangles) the HUD's contents keep clear of; read on every layout. */
  obstacles:()=>DOMRect[]=()=>[];
  constructor(readonly canvas:HTMLCanvasElement,private readonly levels:LevelRenderer,private readonly crt:HTMLElement){
    this.screen.width=SCREEN_WIDTH;this.screen.height=SCREEN_HEIGHT;
    this.screenContext=this.screen.getContext('2d')!;this.screenContext.imageSmoothingEnabled=false;
    this.hudContext=this.hud.getContext('2d')!;
    this.hudLayer={ctx:this.hudContext,width:SCREEN_WIDTH,height:SCREEN_HEIGHT,originX:0,originY:0,top:{left:0,right:0},bottom:{left:0,right:0}};
    this.context=canvas.getContext('2d')!;
    this.safeArea.style.cssText='position:fixed;inset:0;visibility:hidden;pointer-events:none;'+
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.append(this.safeArea);
  }
  configure(options:{scaling:Scaling;filter:Filter;surround:Surround}){
    this.scaling=options.scaling;this.surround=options.surround;
    this.canvas.dataset.filter=options.filter;this.crt.hidden=options.filter!=='crt';
    this.layout();
  }
  /** Fits the picture to the canvas's container (the window, or the fullscreen element). */
  layout(){
    const host=this.canvas.parentElement!,cssWidth=host.clientWidth||window.innerWidth,cssHeight=host.clientHeight||window.innerHeight;
    // A hidden window has no size; the picture keeps its last layout until it has one again.
    if(!(cssWidth>0&&cssHeight>0))return;
    const ratio=window.devicePixelRatio||1;
    if(this.scaling==='stretch'){
      this.width=SCREEN_WIDTH;this.height=SCREEN_HEIGHT;this.scaleX=cssWidth/SCREEN_WIDTH;this.scaleY=cssHeight/SCREEN_HEIGHT;
    }else{
      let scale=Math.min(cssWidth/SCREEN_WIDTH,cssHeight/SCREEN_HEIGHT);
      // Whole device pixels per game pixel keep every pixel the same size.
      if(this.scaling==='integer')scale=Math.max(1,Math.floor(scale*ratio))/ratio;
      this.scaleX=this.scaleY=scale;
      this.width=Math.max(SCREEN_WIDTH,Math.floor(cssWidth/scale));this.height=Math.max(SCREEN_HEIGHT,Math.floor(cssHeight/scale));
    }
    this.originX=Math.floor((this.width-SCREEN_WIDTH)/2);this.originY=Math.floor((this.height-SCREEN_HEIGHT)/2);
    if(this.canvas.width!==this.width)this.canvas.width=this.width;
    if(this.canvas.height!==this.height)this.canvas.height=this.height;
    this.canvas.style.width=`${this.width*this.scaleX}px`;this.canvas.style.height=`${this.height*this.scaleY}px`;
    this.crt.style.setProperty('--pixel',`${this.scaleY}px`);
    this.context.imageSmoothingEnabled=false;
    const top=this.barInsets(this.originY),bottom=this.barInsets(this.originY+SCREEN_HEIGHT-PLAY_TOP),h=this.hudLayer;
    if(h.width!==this.width||h.height!==this.height||h.originX!==this.originX||h.originY!==this.originY||
      h.top.left!==top.left||h.top.right!==top.right||h.bottom.left!==bottom.left||h.bottom.right!==bottom.right){
      this.hud.width=this.width;this.hud.height=this.height;this.hudContext.imageSmoothingEnabled=false;
      this.hudLayer={ctx:this.hudContext,width:this.width,height:this.height,originX:this.originX,originY:this.originY,top,bottom};
      this.onLayout();
    }
  }
  /**
   * The space a HUD bar (40 rows from canvas row `y`) keeps free at each side: the safe area, and any
   * control over the bar's rows on that side. It never pushes the bar's contents past their original place.
   */
  private barInsets(y:number):BarInsets{
    const area=getComputedStyle(this.safeArea),r=this.canvas.getBoundingClientRect(),extra=this.width-SCREEN_WIDTH;
    let left=(parseFloat(area.paddingLeft)||0)/this.scaleX,right=(parseFloat(area.paddingRight)||0)/this.scaleX;
    for(const o of this.obstacles()){
      if(!o.width||!o.height)continue;
      const x0=(o.left-r.left)/this.scaleX,x1=(o.right-r.left)/this.scaleX,y0=(o.top-r.top)/this.scaleY,y1=(o.bottom-r.top)/this.scaleY;
      if(y1<=y||y0>=y+PLAY_TOP)continue;
      if(x0+x1<this.width)left=Math.max(left,x1);else right=Math.max(right,this.width-x0);
    }
    return {left:Math.min(this.originX,Math.ceil(left)),right:Math.min(extra-this.originX,Math.ceil(right))};
  }
  /** Draws the frame: the surround, the original screen and the HUD, and the effects that cover the whole window. */
  present(view:StageView|null){
    const c=this.context,ox=this.originX,oy=this.originY;
    c.fillStyle='#000';c.fillRect(0,0,this.width,this.height);
    if(view&&!view.blackout&&this.surround!=='black'&&(this.width>SCREEN_WIDTH||this.height>SCREEN_HEIGHT)){
      // The shake raises the original camera while the stage is painted; the scenery around it shakes along.
      const camera={x:view.camera.x,y:view.camera.y-view.shake};
      const key=`${view.tick}/${camera.x},${camera.y}/${this.width}x${this.height}/${this.surround}/${view.hud}`;
      if(key!==this.surroundKey){this.surroundKey=key;this.drawSurround(view.cells,camera,view.tick,!view.hud);}
      c.drawImage(this.surroundCanvas,0,0);
    }
    const hud=!!view?.hud,hudOnTop=hud&&!view!.paused&&!view!.cutscene;
    if(hud&&view!.paused)c.drawImage(this.hud,0,0);
    c.drawImage(this.screen,ox,oy);
    if(hudOnTop)c.drawImage(this.hud,0,0);
    if(!view)return;
    // The bars that close the screen reach the window's edges, over the surround and the HUD.
    const edge=view.cutscene?CUTSCENE_BARS:view.closing;
    if(edge>0){
      this.fillOutside(0,oy+edge);this.fillOutside(oy+SCREEN_HEIGHT-edge,this.height);
      // Inside the original screen the game's own bars (and the hero it draws over them) stay above the HUD.
      if(hudOnTop){
        c.drawImage(this.screen,0,0,SCREEN_WIDTH,edge,ox,oy,SCREEN_WIDTH,edge);
        c.drawImage(this.screen,0,SCREEN_HEIGHT-edge,SCREEN_WIDTH,edge,ox,oy+SCREEN_HEIGHT-edge,SCREEN_WIDTH,edge);
      }
    }
  }
  /** Black over rows from…to of the canvas, except where the original screen is. */
  private fillOutside(from:number,to:number){
    const c=this.context,ox=this.originX,oy=this.originY,w=this.width;
    c.fillStyle='#000';
    const band=(a:number,b:number,x:number,width:number)=>{a=Math.max(a,from);b=Math.min(b,to);if(b>a&&width>0)c.fillRect(x,a,width,b-a);};
    band(0,oy,0,w);band(oy+SCREEN_HEIGHT,this.height,0,w);
    band(oy,oy+SCREEN_HEIGHT,0,ox);band(oy,oy+SCREEN_HEIGHT,ox+SCREEN_WIDTH,w-ox-SCREEN_WIDTH);
  }
  private drawSurround(cells:CellSource,camera:{x:number;y:number},tick:number,hudBands:boolean){
    const s=this.surroundCanvas;
    if(s.width!==this.width||s.height!==this.height){s.width=this.width;s.height=this.height;}
    const c=s.getContext('2d')!;c.imageSmoothingEnabled=false;c.clearRect(0,0,this.width,this.height);
    // Map pixel (mx,my) appears at canvas (originX + mx - camera.x, originY + PLAY_TOP + my - camera.y).
    const ox=this.originX-camera.x,oy=this.originY+PLAY_TOP-camera.y;
    const range={x0:Math.floor(-ox/24),y0:Math.floor(-oy/24),x1:Math.ceil((this.width-ox)/24),y1:Math.ceil((this.height-oy)/24)};
    if(this.surround==='backdrop'){
      for(let y=range.y0;y<range.y1;y++)for(let x=range.x0;x<range.x1;x++)this.levels.backdrop(c,cells.world,ox+x*24,oy+y*24);
      return;
    }
    this.levels.drawCells(c,cells,range,ox,oy,tick,{objects:this.surround==='stage-objects'});
    // With the original HUD, its bands continue across the window, as the phone's frame would.
    if(hudBands){
      c.fillStyle='rgba(0,0,0,.45)';
      c.fillRect(0,this.originY,this.width,PLAY_TOP);c.fillRect(0,this.originY+SCREEN_HEIGHT-PLAY_TOP,this.width,PLAY_TOP);
    }
  }
  /** Converts a pointer position to the original screen's coordinates (0..240, 0..320). */
  toScreen(clientX:number,clientY:number){
    const r=this.canvas.getBoundingClientRect();
    return {x:(clientX-r.left)/r.width*this.width-this.originX,y:(clientY-r.top)/r.height*this.height-this.originY};
  }
}
