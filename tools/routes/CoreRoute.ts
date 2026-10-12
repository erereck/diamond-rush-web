/**
 * Control-only routes for the generated S700 core. A route starts a stage through the same
 * New Game loader the JVM reference uses, sends one control per tick and must reach the
 * recorded outcome. Completion is read from the game's own state machine.
 */
import { CORE_REVISION, S700Engine } from '../../src/core/s700/Engine.ts';
import type { EngineStart } from '../../src/core/s700/Engine.ts';
import { S700_SOURCE_SHA256 } from '../../src/generated/s700.ts';
import * as Core from '../../src/generated/s700.ts';
import * as J from '../../src/core/s700/runtime.ts';
/** A run of identical per-tick controls: direction 0..4 (none/up/right/down/left), action, reset. */
export interface ControlRun {ticks:number;direction:0|1|2|3|4;action:boolean;reset?:boolean}

export { CORE_REVISION };
export const CORE_SOURCE=S700_SOURCE_SHA256.slice(0,16);
export type CoreResult='exit'|'secret-exit'|'crystal'|'game-over'|'playing';
export interface CoreOutcome {
  result:CoreResult;ticks:number;gameState:number;x:number;y:number;health:number;lives:number;
  diamonds:number;redDiamonds:number;goldKeys:number;silverKeys:number;weaponTier:number;
}
export interface CoreRouteFixture {
  version:2;engine:string;source:string;world:number;level:number;kind:'stage';
  start:EngineStart;provenance:string;controls:ControlRun[];expected:CoreOutcome;
}
const START_KEYS=['world','level','lives','diamonds','redDiamonds','maxHealth','weaponTier','diving'];
export function validateStart(start:EngineStart){
  if(!start||Object.keys(start).some(k=>!START_KEYS.includes(k)))throw new Error('Route start accepts stage and record values only');
  const int=(v:unknown,min:number,max:number)=>Number.isInteger(v)&&(v as number)>=min&&(v as number)<=max;
  if(!int(start.world,0,2)||!int(start.level,0,13)||!int(start.lives,0,99)||!int(start.diamonds,0,65535)||!int(start.redDiamonds,0,65535)||
    !int(start.maxHealth,4,8)||![0,1,2,8].includes(start.weaponTier)||(start.diving!==undefined&&typeof start.diving!=='boolean'))
    throw new Error('Invalid route start values');
}
export class CoreRoute {
  engine:S700Engine;ticks=0;result:CoreResult='playing';
  readonly controls:ControlRun[]=[];
  readonly start:EngineStart;
  constructor(start:EngineStart){validateStart(start);this.start={...start};this.engine=new S700Engine(start);}
  get game(){return this.engine.game;}
  get finished(){return this.result!=='playing';}
  step(direction:0|1|2|3|4,action:boolean,reset=false){
    if(this.finished)throw new Error('Route contains controls after its terminal state');
    const before=S700Engine.core.gameState;
    this.engine.step({direction,action,reset});this.ticks++;
    const last=this.controls.at(-1);
    if(last&&last.direction===direction&&last.action===action&&!!last.reset===reset)last.ticks++;
    else this.controls.push({ticks:1,direction,action,...(reset?{reset:true}:{})});
    const now=S700Engine.core.gameState;
    if(before===1&&now!==1)this.result=resultFor(now,this.game,this.start);
  }
  outcome():CoreOutcome{
    const g=this.game,C=S700Engine.core;
    return {result:this.result,ticks:this.ticks,gameState:C.gameState,x:g.playerXPos,y:g.playerYPos,health:g.field_239,lives:g.playerLifeCount,
      diamonds:g.collectedDiamonds,redDiamonds:g.collectedRedDiamonds,goldKeys:g.playerGoldKeys,silverKeys:g.playerSilverKeys,weaponTier:C.recordData[9]};
  }
  fixture(provenance:string):CoreRouteFixture{
    return {version:2,engine:CORE_REVISION,source:CORE_SOURCE,world:this.start.world,level:this.start.level,kind:'stage',start:{...this.start},provenance,
      controls:this.controls.map(r=>({...r})),expected:this.outcome()};
  }
}
/**
 * cGame.method_236 leaves state 1 for 35/20 after an exit walk and method_67 enters 28 after a crystal.
 * The tutorial (world 0, stage 13) ends when its seal scene loads Angkor 1 (method_86, state 11).
 */
function resultFor(state:number,g:any,start:EngineStart):CoreResult{
  if(start.world===0&&start.level===13&&state===11)return 'exit';
  if(state===28)return 'crystal';
  if(state===12)return 'game-over';
  if(state===20||state===35)return g.field_551?'exit':'secret-exit';
  return 'playing';
}
export function playCoreRoute(f:CoreRouteFixture){
  if(!f||f.version!==2||f.engine!==CORE_REVISION||f.kind!=='stage')throw new Error('Unsupported core route version');
  if(f.source!==CORE_SOURCE)throw new Error('Route was recorded with different reference sources');
  // The stage the route claims (and is credited for) must be the stage it plays.
  if(f.world!==f.start?.world||f.level!==f.start?.level)throw new Error('Route stage and start values disagree');
  const route=new CoreRoute(f.start);
  if(!Array.isArray(f.controls)||!f.controls.length)throw new Error('Route has no controls');
  let total=0;
  for(const run of f.controls){
    if(!run||Object.keys(run).some(k=>!['ticks','direction','action','reset'].includes(k))||!Number.isInteger(run.ticks)||run.ticks<1||(total+=run.ticks)>144000||
      !Number.isInteger(run.direction)||run.direction<0||run.direction>4||typeof run.action!=='boolean'||(run.reset!==undefined&&typeof run.reset!=='boolean'))
      throw new Error('Route accepts direction/action/reset controls only');
    for(let i=0;i<run.ticks;i++)route.step(run.direction,run.action,!!run.reset);
  }
  return route;
}
/**
 * The harness seeds java.util.Random with 0 (ReferencePatches); a handset seeds it with the clock and
 * the title screen draws from it before New Game. This replays a route with other seeds after the
 * stage loads and reports how many random numbers it drew and with how many seeds it still completes.
 */
export function seedRobustness(f:CoreRouteFixture,seeds=50){
  const proto=J.JRandom.prototype,next=proto.next;let draws=0;
  proto.next=function(this:J.JRandom,bits:number){draws++;return next.call(this,bits);};
  try{playCoreRoute(f);}finally{proto.next=next;}
  if(!draws)return {draws,seeds:0,completed:0};
  let completed=0;
  for(let i=1;i<=seeds;i++){
    const route=new CoreRoute(f.start);(Core.Utils as any).random=new J.JRandom(BigInt(i)*0x9E3779B9n);
    // Another seed may end the stage early (a death, an earlier exit): that trial stops there.
    trial:for(const run of f.controls)for(let k=0;k<run.ticks;k++){if(route.result!=='playing')break trial;route.step(run.direction,run.action,!!run.reset);}
    if(route.result===f.expected.result)completed++;
  }
  // The next engine restores the pristine statics, including Utils.random.
  return {draws,seeds,completed};
}
