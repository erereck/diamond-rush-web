import type { Filter, Scaling, Surround } from '../platform/Settings.ts';
import type { CellSource, LevelRenderer } from './LevelRenderer.ts';

/** The original screen and the area of it where the stage is drawn (cGame.method_153 translates by 40). */
export const SCREEN_WIDTH=240,SCREEN_HEIGHT=320,PLAY_TOP=40;

/** What the area around the original screen needs from a running stage. */
export interface SurroundState {cells:CellSource;camera:{x:number;y:number};tick:number}

/**
 * Presents the 240×320 picture (drawn by the original code or the port's menus into `screen`) in a
 * canvas that fills the window. The canvas works in logical pixels of the original screen: it is
 * larger than 240×320 when the window is wider or taller, and the extra area shows the chosen
 * surround (black, the world's background, or the stage beyond the original camera).
 */
export class Display {
  readonly screen=document.createElement('canvas');
  readonly screenContext:CanvasRenderingContext2D;
  private readonly context:CanvasRenderingContext2D;
  /** Logical canvas size and where the original screen sits in it. */
  width=SCREEN_WIDTH;height=SCREEN_HEIGHT;originX=0;originY=0;
  /** CSS pixels per logical pixel (horizontal and vertical differ only when stretching). */
  scaleX=1;scaleY=1;
  private scaling:Scaling='fit';private surround:Surround='black';
  /** The surround changes with the game (20 Hz), not with the display: it is redrawn once per tick. */
  private readonly surroundCanvas=document.createElement('canvas');
  private surroundKey='';
  constructor(readonly canvas:HTMLCanvasElement,private readonly levels:LevelRenderer,private readonly crt:HTMLElement){
    this.screen.width=SCREEN_WIDTH;this.screen.height=SCREEN_HEIGHT;
    this.screenContext=this.screen.getContext('2d')!;this.screenContext.imageSmoothingEnabled=false;
    this.context=canvas.getContext('2d')!;
  }
  configure(options:{scaling:Scaling;filter:Filter;surround:Surround}){
    this.scaling=options.scaling;this.surround=options.surround;
    this.canvas.dataset.filter=options.filter;this.crt.hidden=options.filter!=='crt';
    this.layout();
  }
  /** Fits the picture to the canvas's container (the window, or the fullscreen element). */
  layout(){
    const host=this.canvas.parentElement!,cssWidth=host.clientWidth||window.innerWidth,cssHeight=host.clientHeight||window.innerHeight;
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
  }
  /** Draws the frame: the surround (when a stage is running and asked for), then the original screen. */
  present(state:SurroundState|null){
    const c=this.context;
    c.fillStyle='#000';c.fillRect(0,0,this.width,this.height);
    if(state&&this.surround!=='black'&&(this.width>SCREEN_WIDTH||this.height>SCREEN_HEIGHT)){
      const key=`${state.tick}/${state.camera.x},${state.camera.y}/${this.width}x${this.height}/${this.surround}`;
      if(key!==this.surroundKey){this.surroundKey=key;this.drawSurround(state);}
      c.drawImage(this.surroundCanvas,0,0);
    }
    c.drawImage(this.screen,this.originX,this.originY);
  }
  private drawSurround({cells,camera,tick}:SurroundState){
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
    // The original HUD bands continue across the window, as the phone's frame would.
    c.fillStyle='rgba(0,0,0,.45)';
    c.fillRect(0,this.originY,this.width,PLAY_TOP);c.fillRect(0,this.originY+SCREEN_HEIGHT-PLAY_TOP,this.width,PLAY_TOP);
  }
  /** Converts a pointer position to the original screen's coordinates (0..240, 0..320). */
  toScreen(clientX:number,clientY:number){
    const r=this.canvas.getBoundingClientRect();
    return {x:(clientX-r.left)/r.width*this.width-this.originX,y:(clientY-r.top)/r.height*this.height-this.originY};
  }
}
