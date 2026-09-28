import type { DecodedSprite } from '../../src/assets/SpriteDecoder.ts';
import type { DemoScript } from '../../src/core/DemoScript.ts';
import { IntroSequence } from '../../src/core/IntroSequence.ts';
import { Simulation } from '../../src/core/Simulation.ts';
import type { Direction, StageStart } from '../../src/core/Simulation.ts';
import { nextStageDemo } from '../../src/core/StageDemoTrigger.ts';
import type { WorldDefinition } from '../../src/level/LevelParser.ts';
import { ENGINE_REVISION, levelFingerprint } from '../../src/core/Compatibility.ts';

/** Only physical controls enter a route; scene edits must come from demo.f. */
export interface RouteControl {direction:Direction;action:boolean;reset?:boolean}
export interface ControlRun extends RouteControl {ticks:number}
export interface RouteResources {worlds:WorldDefinition[];scripts:Map<number,DemoScript>;font:DecodedSprite;fontMap:Uint8Array}
export interface RouteOutcome {
  status:string;ticks:number;x:number;y:number;exitObject:number;diamonds:number;redDiamonds:number;
  lives:number;health:number;weaponTier:number;hits:number;retries:number;opened:number[];
  demos:number[];bossHealth:number|null;bossCleared:boolean;
}
export interface RouteFixture {
  version:1;engine:string;levelFingerprint:string;world:number;level:number;
  kind:'stage'|'tutorial';scope:'isolated-stage';initial:StageStart;
  provenance:string;controls:ControlRun[];expected:RouteOutcome;
}
export class RouteRunner {
  readonly resources:RouteResources;
  readonly sim:Simulation;
  scene:IntroSequence|null=null;
  readonly controls:RouteControl[]=[];
  readonly demos:number[]=[];
  readonly eventCounts:Record<string,number>={};
  bossCleared=false;
  private actionHeld=false;
  private tutorial:boolean;
  constructor(resources:RouteResources,world:number,level:number,initial:StageStart,kind:'stage'|'tutorial'='stage'){
    this.resources=resources;
    const definition=resources.worlds[world]?.levels[level];
    if(!definition)throw new Error('Route level does not exist');
    this.tutorial=kind==='tutorial';
    if(this.tutorial){
      if(world!==0||level!==13)throw new Error('The S700 tutorial is world 0, level 13');
      this.scene=new IntroSequence(definition,resources.scripts,undefined,undefined,resources.font,resources.fontMap);
      this.sim=this.scene.sim;
      if(initial.diamonds!==this.sim.initial.diamonds||initial.redDiamonds!==this.sim.initial.redDiamonds||
        initial.lives!==this.sim.initial.lives||initial.health!==this.sim.initial.health||(initial.weaponTier??0)!==0)
        throw new Error('Tutorial must use its canonical initial resources');
    }else this.sim=new Simulation(definition,initial);
  }
  get finished(){return this.tutorial?this.scene?.finished===true:this.sim.status==='complete'&&this.scene===null;}
  step(control:RouteControl){
    if(this.finished||this.sim.status==='dead')throw new Error('Route contains controls after its terminal state');
    validateControl(control);
    this.controls.push({...control});
    const beforeTick=this.sim.tick;
    if(this.scene){
      if(control.action&&!this.actionHeld)this.scene.press();
      const id=this.scene.scriptId;
      this.scene.step(control);this.actionHeld=control.action;
      if(this.scene.scriptId!==null&&this.scene.scriptId!==id)this.demos.push(this.scene.scriptId);
      if(this.scene.finished&&!this.tutorial)this.scene=null;
    }else{
      this.sim.step(control);
      const id=nextStageDemo(this.sim,this.resources.scripts);
      if(id!==null){
        this.demos.push(id);
        this.scene=new IntroSequence(this.sim.level,this.resources.scripts,this.sim,id,this.resources.font,this.resources.fontMap);
        this.actionHeld=false;
      }
    }
    if(this.sim.events.includes('boss-clear'))this.bossCleared=true;
    // A finished dialogue may retain the last simulation events without an
    // update. Count each real update once, including updates inside cutscenes.
    if(this.sim.tick!==beforeTick)for(const event of this.sim.events)
      this.eventCounts[event]=(this.eventCounts[event]??0)+1;
  }
  outcome():RouteOutcome {
    const s=this.sim;
    return {status:this.tutorial&&this.finished?'intro-complete':s.status,ticks:this.controls.length,
      x:s.player.x,y:s.player.y,exitObject:s.exitObject,diamonds:s.diamonds,redDiamonds:s.redDiamonds,
      lives:s.lives,health:s.health,weaponTier:s.weaponTier,hits:s.hits,retries:s.retries,
      opened:[...s.opened].sort((a,b)=>a-b),demos:[...this.demos],bossHealth:s.boss?.health??null,bossCleared:this.bossCleared};
  }
  fixture(provenance:string):RouteFixture {
    return {version:1,engine:ENGINE_REVISION,levelFingerprint:this.sim.initialLevelFingerprint,
      world:this.sim.level.world,level:this.sim.level.index,kind:this.tutorial?'tutorial':'stage',scope:'isolated-stage',initial:{...this.sim.initial},
      provenance,controls:compressControls(this.controls),expected:this.outcome()};
  }
}
function validateControl(input:RouteControl){
  if(!input||Object.keys(input).some(key=>!['direction','action','reset'].includes(key))||
    !Number.isInteger(input.direction)||input.direction<0||input.direction>4||typeof input.action!=='boolean'||
    (input.reset!==undefined&&typeof input.reset!=='boolean'))throw new Error('Route accepts direction/action/reset controls only');
}
export function compressControls(controls:RouteControl[]):ControlRun[]{
  const runs:ControlRun[]=[];
  for(const control of controls){
    validateControl(control);
    const previous=runs.at(-1);
    if(previous&&previous.direction===control.direction&&previous.action===control.action&&!!previous.reset===!!control.reset)previous.ticks++;
    else runs.push({ticks:1,direction:control.direction,action:control.action,...(control.reset?{reset:true}:{})});
  }
  return runs;
}
export function playRoute(fixture:RouteFixture,resources:RouteResources):RouteRunner {
  if(!fixture||fixture.version!==1||fixture.engine!==ENGINE_REVISION||fixture.scope!=='isolated-stage'||
    !['stage','tutorial'].includes(fixture.kind))throw new Error('Unsupported route version or scope');
  const definition=resources.worlds[fixture.world]?.levels[fixture.level];
  if(!definition||fixture.levelFingerprint!==levelFingerprint(definition))throw new Error('Route map fingerprint changed');
  const initial=fixture.initial;
  // Never accept pre-opened chests or injected keys/positions in certification.
  if(!initial||Object.keys(initial).some(key=>!['diamonds','redDiamonds','lives','health','weaponTier'].includes(key))||
    !Number.isInteger(initial.diamonds)||initial.diamonds<0||initial.diamonds>65535||
    !Number.isInteger(initial.redDiamonds)||initial.redDiamonds<0||initial.redDiamonds>65535||
    !Number.isInteger(initial.lives)||initial.lives<0||initial.lives>99||
    !Number.isInteger(initial.health)||initial.health<1||initial.health>4||![0,1,2,8].includes(initial.weaponTier??0))throw new Error('Invalid route initial resources');
  if(!Array.isArray(fixture.controls)||!fixture.controls.length)throw new Error('Route has no controls');
  let ticks=0;
  const runner=new RouteRunner(resources,fixture.world,fixture.level,initial,fixture.kind);
  for(const run of fixture.controls){
    if(!run||Object.keys(run).some(key=>!['ticks','direction','action','reset'].includes(key))||
      !Number.isInteger(run.ticks)||run.ticks<1||(ticks+=run.ticks)>144000)throw new Error('Invalid route run length');
    const control={direction:run.direction,action:run.action,...(run.reset!==undefined?{reset:run.reset}:{})};
    validateControl(control);
    for(let tick=0;tick<run.ticks;tick++)runner.step(control);
  }
  return runner;
}
export function completedRoute(runner:RouteRunner){
  return runner.finished&&(!runner.sim.boss||(runner.bossCleared&&runner.sim.boss.health===0));
}
