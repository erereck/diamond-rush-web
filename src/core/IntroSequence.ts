import type { LevelDefinition } from '../level/LevelParser.ts';
import { Simulation } from './Simulation.ts';
import type { Direction, InputFrame } from './Simulation.ts';
import type { DemoCommand, DemoScript } from './DemoScript.ts';

interface RunningCommand {
  command:DemoCommand;ticks:number;startX:number;startY:number;page:number;children?:RunningCommand[];done?:boolean;
}
export function wrapDemoText(value:string,maxCharacters:number):string[]{
  const lines:string[]=[];let line='';
  for(const word of value.trim().split(/\s+/)){
    if(line&&line.length+word.length+1>maxCharacters){lines.push(line);line=word;}
    else line+=(line?' ':'')+word;
  }
  if(line)lines.push(line);return lines;
}
const STOPS=[
  {id:29,x:6,y:4}, // first encounter and three opening lines
  {id:10,x:31,y:7}, // chest hint
  {id:11,x:28,y:6}, // compass in the chest
  {id:13,x:37,y:7}, // pushing-rock lesson
  {id:16,x:46,y:7}, // return-to-circle lesson
  {id:28,x:57,y:8}  // seal and exit
] as const;

const NO_INPUT:InputFrame={direction:0,action:false};
/** Playable S700 tutorial: free movement between the original demo.f scripts. */
export class IntroSequence {
  readonly sim:Simulation;readonly scripts:Map<number,DemoScript>;
  section=0;phase:'free'|'script'|'ending'|'done'='free';
  commandIndex=0;active:RunningCommand|null=null;tick=0;phaseTicks=0;
  cameraX=0;cameraY=0;
  portraitVisible=false;portraitFrame=2;portraitSprite=2;portraitX=17;portraitY=50;blinkFrame=-1;flashColor='#fff';flash=false;
  private pressed=false;
  constructor(level:LevelDefinition,scripts:Map<number,DemoScript>){
    for(const stop of STOPS)if(!scripts.has(stop.id))throw new Error(`Missing original intro script ${stop.id}`);
    const copy={...level,tiles:[...level.tiles],parameters:[...level.parameters],objects:[...level.objects]};
    this.sim=new Simulation(copy);this.scripts=scripts;this.followHero();
  }
  get heroX(){const p=this.sim.player;return p.x*24-p.dx*p.offset;}
  get heroY(){const p=this.sim.player;return p.y*24-p.dy*p.offset;}
  get scriptId(){return this.phase==='script'?STOPS[this.section].id:null;}
  get finished(){return this.phase==='done';}
  get dialogue():{lines:string[];popup:boolean;slide:number}|null{
    const running=this.findDialogue(this.active);
    if(!running)return null;
    const popup=running.command.opcode===27,lines=wrapDemoText(running.command.text??'',popup?23:18);
    return {lines:lines.slice(running.page,running.page+(popup?2:running.command.args[0])),popup,slide:Math.min(0,-240+running.ticks*30)};
  }
  private findDialogue(r:RunningCommand|null):RunningCommand|null{
    if(!r||r.done)return null;
    if(r.command.opcode===2||r.command.opcode===27)return r;
    for(const child of r.children??[]){const found=this.findDialogue(child);if(found)return found;}
    return null;
  }
  press(){
    if(this.dialogue){this.pressed=true;return;}
    // The original softkey can skip the current automatic animation.
    if(this.phase==='script'&&this.active&&[1,6,12,16,17,18].includes(this.active.command.opcode))this.active.ticks=10000;
  }
  step(input:InputFrame=NO_INPUT){
    if(this.phase==='done')return;
    if(this.phase==='free'){
      this.sim.step(input);this.tick=this.sim.tick;this.followHero();
      if(this.sim.status==='dead'){
        this.sim.lives=5;this.sim.status='playing';this.sim.restoreCheckpoint(true,true);
      }
      if(this.atTrigger())this.startScript();
      return;
    }
    if(this.phase==='ending'){
      this.sim.step(NO_INPUT);this.tick=this.sim.tick;
      this.phaseTicks++;this.flash=this.phaseTicks%4<2;
      if(this.phaseTicks>=16){this.phase='done';this.flash=false;}
      return;
    }
    if(this.phase!=='script')return;
    const commands=this.scripts.get(STOPS[this.section].id)!.commands;
    if(!this.active){
      if(this.commandIndex>=commands.length){this.nextSection();return;}
      this.active=this.running(commands[this.commandIndex]);
    }
    // The same physics and collision path runs while the hero is scripted.
    this.sim.step({direction:this.scriptedDirection(this.active),action:false});this.tick=this.sim.tick;
    if(this.sim.deathTicks>0||this.sim.status==='dead'){
      this.phase='free';this.active=null;this.portraitVisible=false;this.pressed=false;
      return;
    }
    if(this.sim.hurtTicks>0||this.sim.respawnTravel)return;
    if(this.stepCommand(this.active)){this.active=null;this.commandIndex++;}
  }
  private atTrigger(){
    if(this.sim.status!=='playing'||this.sim.player.offset!==0||this.sim.chestCell>=0)return false;
    const stop=STOPS[this.section],i=this.sim.index(stop.x,stop.y);
    if(this.section===2)return this.sim.opened.has(i);
    return this.sim.player.x===stop.x&&this.sim.player.y===stop.y;
  }
  private startScript(){
    this.phase='script';this.commandIndex=0;this.active=null;this.pressed=false;
    this.sim.pendingDirection=0;
  }
  private nextSection(){
    this.section++;
    if(this.section>=STOPS.length){this.phase='ending';this.phaseTicks=0;return;}
    this.commandIndex=0;this.active=null;this.portraitVisible=false;this.blinkFrame=-1;
    this.phase='free';this.followHero();
    if(this.atTrigger())this.startScript();
  }
  private scriptedDirection(r:RunningCommand):Direction{
    if(r.done)return 0;
    if(r.command.opcode===10)return r.command.args[0] as Direction;
    if(r.command.opcode===0)r.children??=r.command.children!.map(c=>this.running(c));
    for(const child of r.children??[]){const direction=this.scriptedDirection(child);if(direction)return direction;}
    return 0;
  }
  private followHero(){this.cameraX=this.sim.camera.x;this.cameraY=this.sim.camera.y;}
  private running(command:DemoCommand):RunningCommand{return {command,ticks:0,startX:this.cameraX,startY:this.cameraY,page:0};}
  private stepCommand(r:RunningCommand):boolean{
    const {opcode,args}=r.command;r.ticks++;
    if(opcode===0){
      r.children??=r.command.children!.map(c=>this.running(c));
      for(const child of r.children)if(!child.done)child.done=this.stepCommand(child);
      return r.children.every(c=>c.done);
    }
    if(opcode===1){
      const duration=Math.max(1,args[2]),t=Math.min(1,r.ticks/duration),maxX=this.sim.level.width*24-240,maxY=this.sim.level.height*24-240;
      this.cameraX=Math.max(0,Math.min(maxX,Math.round(r.startX+(args[0]*24-108-r.startX)*t)));
      this.cameraY=Math.max(0,Math.min(maxY,Math.round(r.startY+(args[1]*24-108-r.startY)*t)));
      return r.ticks>=duration;
    }
    if(opcode===2||opcode===27){
      if(this.pressed){
        this.pressed=false;
        if(r.ticks<8){r.ticks=8;return false;}
        const lines=wrapDemoText(r.command.text??'',opcode===27?23:18),perPage=opcode===27?2:args[0];
        if(r.page+perPage<lines.length){r.page+=perPage;return false;}
        return true;
      }
      return false;
    }
    if(opcode===6)return r.ticks>=args[0];
    if(opcode===10)return r.ticks>=4;
    if(opcode===11){this.portraitFrame=args[0];this.portraitSprite=args[1];return true;}
    if(opcode===12){this.portraitX=args[0];this.portraitY=args[1];this.portraitVisible=true;return r.ticks>=5;}
    if(opcode===13){
      const t=Math.min(1,r.ticks/Math.max(1,args[2]));
      this.portraitX=Math.round(r.startX+(args[0]-r.startX)*t);this.portraitY=Math.round(r.startY+(args[1]-r.startY)*t);
      return r.ticks>=args[2];
    }
    if(opcode===14){this.portraitVisible=true;return true;}
    if(opcode===15){this.portraitVisible=false;this.blinkFrame=-1;return true;}
    if(opcode===16||opcode===17){this.blinkFrame=r.ticks%2?args[0]:-1;return r.ticks>=args[1]*4;}
    if(opcode===18){this.flashColor=`#${args.slice(1).map(n=>n.toString(16).padStart(2,'0')).join('')}`;this.flash=r.ticks%2===1;return r.ticks>=args[0]*4;}
    if(opcode===25){
      const i=this.sim.index(args[0],args[1]);if(i>=0){this.sim.level.objects[i]=args[2];this.sim.level.parameters[i]=args[3];}
      return true;
    }
    if(opcode===26){const i=this.sim.index(args[0],args[1]);if(i>=0)this.sim.state[i]=args[2];return true;}
    // Resource edits and animation overlays not used in the Angkor introduction.
    return true;
  }
}
