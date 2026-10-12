/**
 * Gameplay session on the generated S700 core. The original game logic runs every tick and,
 * when rendering is enabled, also draws the play screen (stage, HUD, dialogues, results).
 * The port's own interface (menus, map, shop, settings, lab) reads this adapter.
 */
import type { LevelDefinition } from '../level/LevelParser.ts';
import { S700Engine } from './s700/Engine.ts';
import type { EngineSnapshot, EngineStart } from './s700/Engine.ts';
import { cSoundEngine } from '../generated/s700.ts';
import { Display } from './s700/j2me.ts';
import { setDecodedTextTranslator } from './s700/runtime.ts';
import { languageStrings, localizeDemoText } from './Localization.ts';
import type { GameLocale } from './Localization.ts';

export type Direction=0|1|2|3|4;
export interface InputFrame {direction:Direction;action:boolean;reset?:boolean;back?:boolean}
/** Record values for a stage started outside a saved campaign. */
export interface StageStart {diamonds:number;redDiamonds:number;lives:number;health:number;maxHealth?:number;weaponTier?:0|1|2|8;diving?:boolean}
export type StageResult='exit'|'secret-exit'|'crystal'|'game-over';
/**
 * playing: stage in progress · finishing: the game's own result flow (results screen, record writes)
 * · dead: the game's game-over screen (action continues) · complete: the game reached its world map,
 * so the record holds the outcome and the port's interface takes over.
 */
export type SessionStatus='playing'|'finishing'|'dead'|'complete';
export interface SimulationSnapshot {engine:EngineSnapshot;tick:number;status:SessionStatus;result:StageResult|null;inputs:number;localeChanges:number}
/** `stageLoads`: stages loaded earlier in the same session (see EngineStart). */
export interface SessionStart {world:number;level:number;resources?:StageStart;record?:Uint8Array;stageLoads?:number}

const CORE=S700Engine.core;
/**
 * Sound requests from cSoundEngine.playSound (snd.f index) and vibrations, collected per tick. A request
 * of SOUND_CUT is the game's freeCrtPlayerResource(), which stops the sound playing (scene changes, seal).
 */
export const SOUND_CUT=-1;
let soundQueue:number[]=[];let vibrations=0;
const originalPlay=(cSoundEngine.prototype as any).playSound;
(cSoundEngine.prototype as any).playSound=function(this:unknown,id:number){soundQueue.push(id);return originalPlay.call(this,id);};
const originalCut=(cSoundEngine.prototype as any).freeCrtPlayerResource;
(cSoundEngine.prototype as any).freeCrtPlayerResource=function(this:unknown){soundQueue.push(SOUND_CUT);return originalCut.call(this);};
(Display.prototype as any).vibrate=function(){vibrations++;return true;};

let menuLocale:GameLocale='en';
/** The English lang.f table of the live session, so a language change applies to it at once. */
let originalMenuText:string[]|null=null;
/** The session a language change applies to; it records the change so its replay can repeat it. */
let liveSession:Simulation|null=null;
/** A language change during a session, applied before the step numbered `tick`. */
export interface LocaleChange {tick:number;locale:GameLocale}
export class Simulation {
  /**
   * Web translations (pt-BR, es) of the original texts: dialogue lines decoded from demo.f and the
   * lang.f table. Applies to sessions created afterwards; routes and tests use the original English.
   */
  static get locale():GameLocale{return menuLocale;}
  static setLocale(locale:GameLocale){
    if(liveSession&&locale!==menuLocale)liveSession.localeChanges.push({tick:liveSession.tick,locale});
    menuLocale=locale;
    setDecodedTextTranslator(locale==='en'?null:value=>localizeDemoText(locale,value));
    if(originalMenuText)CORE.menuText=locale==='en'?originalMenuText.slice():languageStrings(locale,originalMenuText);
  }
  readonly level:LevelDefinition;readonly start:SessionStart;readonly engine:S700Engine;
  tick=0;status:SessionStatus='playing';result:StageResult|null=null;
  readonly inputs:InputFrame[]=[];
  /** The language the session started in, and the changes made while it ran (translated dialogues page differently). */
  readonly locale:GameLocale=menuLocale;readonly localeChanges:LocaleChange[]=[];
  sounds:number[]=[];vibrate=false;
  constructor(level:LevelDefinition,start:SessionStart){
    if(level.world!==start.world||level.index!==start.level)throw new Error('Stage definition does not match the session');
    this.level=level;this.start={...start};
    const r=start.resources;
    const engineStart:EngineStart={world:start.world,level:start.level,lives:r?.lives??5,diamonds:r?.diamonds??0,redDiamonds:r?.redDiamonds??0,
      maxHealth:r?.maxHealth??4,weaponTier:r?.weaponTier??0,diving:r?.diving,stageLoads:start.stageLoads};
    soundQueue=[];
    this.engine=new S700Engine(engineStart,start.record);
    this.sounds=soundQueue;soundQueue=[];
    const english:string[]=CORE.menuText.slice();originalMenuText=english;liveSession=this;
    if(menuLocale!=='en')CORE.menuText=languageStrings(menuLocale,english);
  }
  get game(){return this.engine.game;}
  /** A point of the session to come back to (rewind, quick states): the engine and the session bookkeeping. */
  snapshot():SimulationSnapshot{
    return {engine:this.engine.snapshot(),tick:this.tick,status:this.status,result:this.result,inputs:this.inputs.length,localeChanges:this.localeChanges.length};
  }
  /** Returns to a snapshot of this session; later inputs are dropped, so its replay stays exact. */
  restore(s:SimulationSnapshot){
    this.engine.restore(s.engine);this.tick=s.tick;this.status=s.status;this.result=s.result;
    this.inputs.length=s.inputs;this.localeChanges.length=s.localeChanges;this.sounds=[];this.vibrate=false;
  }
  get gameState():number{return CORE.gameState;}
  /** One 50 ms frame of the original game. */
  step(input:InputFrame){
    if(this.status==='complete')return;
    this.inputs.push({direction:input.direction,action:input.action,...(input.reset?{reset:true}:{}),...(input.back?{back:true}:{})});
    const before=CORE.gameState;vibrations=0;
    this.engine.step(input);this.tick++;
    this.sounds=soundQueue;soundQueue=[];this.vibrate=vibrations>0;
    const now=CORE.gameState;
    if(now===12){this.status='dead';this.result='game-over';}
    else if(this.status==='playing'&&before===1&&now===11&&this.level.world===0&&this.level.index===13){
      // The tutorial's seal scene loads Angkor 1 itself (method_86); its record writes are done.
      this.status='complete';this.result='exit';return;
    }
    else if(this.status==='playing'&&before===1&&now!==1){
      this.status='finishing';this.result=now===28?'crystal':this.game.field_551?'exit':'secret-exit';
    }
    // The tutorial reloads itself after a game over (method_226 -> method_86).
    if(now===1&&this.status==='dead'){this.status='playing';this.result=null;}
    // States 21/15 load and show the original world map: the record is final by then.
    if(this.status!=='playing'&&(now===21||now===15||now===4||now===22))this.status='complete';
  }
  /**
   * cGame.method_74 runs when the original world map opens: it announces the world unlocked by
   * the result (method_249(5)) and the newly affordable armor (method_249(8)), and records the
   * world bits. The port shows its own map, so it takes the notice here.
   */
  takeMapNotice(){
    const g=this.game,world:number=g.field_143,armor:number=g.field_144;
    if(world===1)CORE.recordData[2]|=8;
    else if(world===2)CORE.recordData[2]|=24;
    g.field_143=0;g.field_144=0;
    return {world:world===1||world===2?world as 1|2:null,armor:armor>0?armor as 1|2|3|4:null};
  }
  /** The record (RMS record 1 payload) as the game keeps it, trimmed to its used length. */
  record(){return Uint8Array.from(CORE.recordData.subarray(0,this.game.field_382) as Int8Array,(v:number)=>v&255);}
  /** Shows the last frame the original painted (each step runs cGame.method_132; requires enableRendering). */
  draw(ctx:CanvasRenderingContext2D){
    const g=this.game;
    if(g.screen)ctx.drawImage(g.screen.canvas,0,0);
  }
  /**
   * The stage's live planes while it is loaded (tiles, objects, parameters), for the scenery the port
   * draws around the original screen; null between stages.
   */
  liveCells(){
    const g=this.game,tiles=CORE.field_334 as Int8Array[]|null,objects=CORE.field_332 as Int32Array[]|null;
    if(!tiles||!objects||CORE.gameState!==1)return null;
    const width:number=g.crtLevelWidth,height:number=g.crtLevelHeight;
    return {world:g.currentWorld as number,index:g.currentLevel as number,width,height,
      tile:(i:number)=>{const v=tiles[i%width][Math.floor(i/width)]&255;return v===255?-1:v;},
      object:(i:number)=>objects[i%width][Math.floor(i/width)]&255,
      parameter:(i:number)=>(objects[i%width][Math.floor(i/width)]>>8)&255};
  }
  /** The original camera (cGame.field_201/202, method_285): the map pixel shown at the play area's top left (screen y 40). */
  get camera(){return {x:this.game.field_201 as number,y:this.game.field_202 as number};}
  /** The world whose map the original opens: the stage's world, or the one chosen on its seal after a crystal (method_75). */
  get mapWorld():number{return this.game.currentWorld;}
  /** The session's stage-load count after this stage loaded (cGame.field_167). */
  get stageLoads():number{return this.game.field_167;}
  get lives():number{return this.game.playerLifeCount;}
  get health():number{return this.game.field_239;}
  get maxHealth():number{return CORE.recordData[8];}
  get weaponTier():0|1|2|8{return CORE.recordData[9];}
  get stageDiamonds():number{return this.game.collectedDiamonds;}
  get stageRedDiamonds():number{return this.game.collectedRedDiamonds;}
  get goldKeys():number{return this.game.playerGoldKeys;}
  get silverKeys():number{return this.game.playerSilverKeys;}
  get hero(){return {x:this.game.playerXPos,y:this.game.playerYPos,offset:this.game.field_232};}
  get inDialogue():boolean{return this.game.field_354!==null;}
}
