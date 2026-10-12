/**
 * Host for the generated S700 core (src/generated/s700.ts). It owns the frame loop the MIDlet
 * thread used to run: one call per tick advances the 20 fps device clock, delivers key events
 * like a handset (press/release on change) and runs cGame.method_67 once.
 *
 * The generated classes keep most state in static fields, so only one engine is live at a time.
 * Starting a new engine restores the statics captured when the module was loaded.
 */
import * as Core from '../../generated/s700.ts';
import { RecordStore, Display, Image, Graphics } from './j2me.ts';
import * as J from './runtime.ts';

export interface EngineStart {
  world:number;level:number;lives:number;diamonds:number;redDiamonds:number;maxHealth:number;weaponTier:number;diving?:boolean;
  /**
   * Stage loads earlier in the same session (cGame.field_167). The original keeps counting across the
   * stages of a session (only New Game and Continue reset it) and writes min(count,3) to record byte 12.
   */
  stageLoads?:number;
}
/** Bump when the host, the harness patches or the translator change how a control stream behaves. */
export const CORE_REVISION='s700-core-3';
/** Map files in world order, as cGame.method_425 and method_113 name them. */
const WORLD_MAPS=['/map_angkor.out','/map_scotland.out','/map_tibet.out'];
/** `back` is the right soft key (SKEY_RSH), used by the original's own menus (shop, seal, results). */
export interface EngineControl {direction:0|1|2|3|4;action:boolean;reset?:boolean;back?:boolean}
const CLASSES:any[]=[Core.DeviceClock,Core.Define,Core.Utils,Core.ASprite,Core.ASpriteInstance,Core.DemoInterpreter,Core.GemsRain,Core.IGA,Core.cSoundEngine,Core.cGame,Core.GloftDIRU];
const cGame:any=Core.cGame;
/** Objects that never change after loading (decoded images, drawing surfaces) are shared by snapshots. */
// ASprite is copied: the game frees sprite caches in place (ASprite.freeCache) when a stage ends.
function shared(v:any){return v instanceof Image||v instanceof Graphics||(v&&v.ctx&&v.canvas);}
export function deepCopy<T>(value:T,memo=new Map<any,any>()):T{
  const v:any=value;
  if(v===null||typeof v!=='object'||shared(v))return v;
  const seen=memo.get(v);if(seen!==undefined)return seen;
  if(ArrayBuffer.isView(v)){const c=(v as any).slice();memo.set(v,c);return c;}
  if(Array.isArray(v)){const c:any[]=new Array(v.length);memo.set(v,c);for(let i=0;i<v.length;i++)c[i]=deepCopy(v[i],memo);return c as any;}
  if(v instanceof Map){const c=new Map();memo.set(v,c);for(const [k,x] of v)c.set(k,deepCopy(x,memo));return c as any;}
  const c=Object.create(Object.getPrototypeOf(v));memo.set(v,c);
  for(const k of Object.keys(v))c[k]=deepCopy(v[k],memo);
  return c;
}
function staticKeys(cls:any){return Object.getOwnPropertyNames(cls).filter(k=>!['length','name','prototype'].includes(k)&&typeof cls[k]!=='function');}
interface StaticState {values:any[][]}
function captureStatics(memo=new Map<any,any>()):StaticState{return {values:CLASSES.map(cls=>staticKeys(cls).map(k=>deepCopy(cls[k],memo)))};}
function restoreStatics(state:StaticState,memo=new Map<any,any>()){
  CLASSES.forEach((cls,i)=>staticKeys(cls).forEach((k,j)=>{cls[k]=deepCopy(state.values[i][j],memo);}));
}
const pristine=captureStatics();
const DIRECTION_KEYS=[0,50,54,56,52]; // KEY_NUM2 up, KEY_NUM6 right, KEY_NUM8 down, KEY_NUM4 left
export const ACTION_KEY=53,RESET_KEY=42,BACK_KEY=-7; // KEY_NUM5, KEY_STAR, S700 right soft key
export interface EngineSnapshot {statics:StaticState;game:any;midlet:any;records:Map<string,any>;keys:[number,boolean,boolean,boolean];ticks:number}

export class S700Engine {
  game:any;midlet:any;ticks=0;loadFrames=0;
  private heldDirection=0;private heldAction=false;private heldReset=false;private heldBack=false;
  /**
   * `record` (optional) is a campaign's RMS record 1 payload. It replaces the fresh New Game record
   * entirely, as if the stage were chosen on the world map of that save; `start` then only selects
   * the stage. Without it, the New Game record receives the start values (isolated stage routes).
   */
  constructor(start:EngineStart,record?:Uint8Array){
    restoreStatics(pristine);RecordStore.STORES.clear();J.swallowed.length=0;
    this.midlet=new Core.GloftDIRU();
    this.game=this.midlet.field_575;this.midlet.field_576=Display.getDisplay();
    const g=this.game;
    g.field_228=Core.DeviceClock.now();
    g.method_65();g.loadPreferenceData();
    // Boot to the title menu, then run the New Game loader; method_113 rebuilds the record and
    // selects the tutorial, which is replaced by the requested stage and record values.
    let frames=0;
    while(cGame.gameState!==4){
      if(cGame.gameState===30){cGame.gameState=4;g.openMenu(0);break;}
      if(cGame.gameState===7)g.field_261=true;
      this.frame();
      if(++frames>20000)throw new Error(`S700 boot stuck in state ${cGame.gameState}`);
    }
    g.method_218();
    let patched=false;frames=0;
    while(cGame.gameState!==1){
      this.frame();
      if(!patched&&cGame.gameState===5&&g.assetsLoaded===5&&g.field_329){
        const r=cGame.recordData,d=start.diamonds,red=start.redDiamonds;
        g.currentWorld=start.world;g.currentLevel=start.level;
        if(record){
          if(record.length>r.length)throw new Error('RMS record 1 is larger than the game buffer');
          r.fill(0);for(let i=0;i<record.length;i++)r[i]=(record[i]<<24)>>24;
          g.field_382=record.length;
          // The seal sets field_532 to the world's furthest stage before the map opens (sealMenuSelectionHandler).
          cGame.field_532=g.method_119(start.world);
        }else{
          r[3]=start.lives;r[4]=d&255;r[5]=d>>8;r[6]=red&255;r[7]=red>>8;r[8]=start.maxHealth;r[9]=start.weaponTier;r[10]=start.diving?1:0;
        }
        // Every stage but the tutorial is entered from its world map: state 21 reloads that world's map
        // (method_408/method_425: field_515=100, method_409, method_426) and the pick (method_424) keeps the
        // cursor on the stage's node (method_427). Secret exits (method_131) and unlocks (method_252) read it.
        if(!(start.world===0&&start.level===13)){
          g.field_515=100;g.method_409();g.method_426(WORLD_MAPS[start.world]);g.field_446=true;g.method_427();
          // By then the session has the compass: the tutorial chest, Continue and the seal set it; only New Game clears it.
          g.field_179=true;
        }
        g.field_167=start.stageLoads??0;
        patched=true;
      }
      if(++frames>20000)throw new Error(`S700 level load stuck in state ${cGame.gameState}`);
    }
    this.loadFrames=frames;
  }
  /**
   * One iteration of cGame.run() on a handset that computes instantly: logic (method_67), then the paint
   * (method_132), which also moves sprites the logic reads (the bosses' positions, for one), then the
   * sleep that completes 50 ms. Only Thread.sleep inside the logic (the checkpoint's 100 ms pause,
   * DeviceClock.sleep) makes a frame overrun; run() then takes its lag branch on the next frame, which
   * skips the paint (field_229 = true) and does not wait, because 100 - field_370 - field_369 < 0.
   */
  private frame(){
    const g=this.game,clock=Core.DeviceClock;
    g.field_368=clock.now();
    g.method_67();
    if(cGame.gameState!==2)cGame.frameCounter=(cGame.frameCounter+1)|0;
    g.field_369=clock.now();
    if(g.field_370>65n){
      const wait=100n-(g.field_370 as bigint)-(g.field_369 as bigint);if(wait>0n)clock.time+=wait;
      g.field_229=true;g.field_370=0n;
    }else{
      g.method_132(g.getGraphics());
      g.field_229=false;
      if(cGame.gameState!==2)cGame.field_227=(cGame.field_227+1)|0;
      const elapsed=(clock.now() as bigint)-(g.field_368 as bigint);g.field_370=elapsed<0n?-elapsed:elapsed;
      const wait=50n-elapsed;if(wait>0n)clock.time+=wait;
    }
  }
  private keys(direction:number,action:boolean,reset:boolean,back:boolean){
    const g=this.game;
    if(direction!==this.heldDirection){if(this.heldDirection)g.keyReleased(DIRECTION_KEYS[this.heldDirection]);if(direction)g.keyPressed(DIRECTION_KEYS[direction]);this.heldDirection=direction;}
    if(action!==this.heldAction){if(action)g.keyPressed(ACTION_KEY);else g.keyReleased(ACTION_KEY);this.heldAction=action;}
    if(reset!==this.heldReset){if(reset)g.keyPressed(RESET_KEY);else g.keyReleased(RESET_KEY);this.heldReset=reset;}
    if(back!==this.heldBack){if(back)g.keyPressed(BACK_KEY);else g.keyReleased(BACK_KEY);this.heldBack=back;}
  }
  step(control:EngineControl){this.keys(control.direction,control.action,!!control.reset,!!control.back);this.frame();this.ticks++;}
  get gameState():number{return cGame.gameState;}
  /** Static and instance state of the whole game; restoring it continues the same timeline. */
  snapshot():EngineSnapshot{
    const memo=new Map<any,any>();
    const statics=captureStatics(memo),game=deepCopy(this.game,memo),midlet=deepCopy(this.midlet,memo);
    const records=new Map([...RecordStore.STORES].map(([k,v])=>[k,deepCopy(v,memo)]));
    return {statics,game,midlet,records,keys:[this.heldDirection,this.heldAction,this.heldReset,this.heldBack],ticks:this.ticks};
  }
  restore(s:EngineSnapshot){
    const memo=new Map<any,any>();
    restoreStatics(s.statics,memo);
    this.game=deepCopy(s.game,memo);this.midlet=deepCopy(s.midlet,memo);
    RecordStore.STORES.clear();for(const [k,v] of s.records)RecordStore.STORES.set(k,deepCopy(v,memo));
    [this.heldDirection,this.heldAction,this.heldReset,this.heldBack]=s.keys;this.ticks=s.ticks;
  }
  static get core(){return cGame;}
}
