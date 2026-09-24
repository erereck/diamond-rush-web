import type { LevelDefinition } from '../level/LevelParser.ts';
import { Simulation } from './Simulation.ts';
import type { Direction, InputFrame } from './Simulation.ts';
import type { DemoCommand, DemoScript } from './DemoScript.ts';
import type { DecodedSprite } from '../assets/SpriteDecoder.ts';

interface RunningCommand {
  command:DemoCommand;ticks:number;startX:number;startY:number;page:number;children?:RunningCommand[];done?:boolean;
  blinkRemaining?:number;blinkOn?:boolean;closingTicks?:number;closingStart?:number;
}
export function wrapDemoText(value:string,maxCharacters:number):string[]{
  const lines:string[]=[];let line='';
  for(const word of value.trim().split(/\s+/)){
    if(line&&line.length+word.length+1>maxCharacters){lines.push(line);line=word;}
    else line+=(line?' ':'')+word;
  }
  if(line)lines.push(line);return lines;
}
export function demoFontWidth(font:DecodedSprite,map:Uint8Array,value:string){
  const spacing=font.frameModules[0].x;
  return [...value].reduce((total,char)=>{
    if(char===' ')return total+font.modules[0].width+spacing;
    const n=map[char.charCodeAt(0)]??map[63];
    if(n>=font.frames[0].count){const r=font.frames[n-font.frames[0].count].rect;return total+r[2]-(r[0]&255)+spacing;}
    const fm=font.frameModules[n];return total+font.modules[fm.module].width-fm.x+spacing;
  },-spacing);
}
export function wrapDemoTextPixels(value:string,maxWidth:number,font:DecodedSprite,map:Uint8Array){
  const lines:string[]=[];
  for(const paragraph of value.trim().split('\n')){
    let line='';
    for(const word of paragraph.trim().split(/\s+/)){
      const candidate=line?`${line} ${word}`:word;
      if(line&&demoFontWidth(font,map,candidate)>maxWidth){lines.push(line);line=word;}
      else line=candidate;
    }
    if(line)lines.push(line);
  }
  return lines;
}
const STOPS=[
  {id:29,x:6,y:4}, // first dialogue triggers one cell after the automatic entrance
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
  readonly stops:readonly {id:number;x:number;y:number}[];readonly standalone:boolean;
  readonly font?:DecodedSprite;readonly fontMap?:Uint8Array;
  section=0;phase:'opening'|'free'|'script'|'done'='free';
  commandIndex=0;active:RunningCommand|null=null;tick=0;
  cameraX=0;cameraY=0;
  portraitVisible=false;portraitFrame=2;portraitSprite=2;portraitX=17;portraitY=50;portraitRevealTicks=0;blinkFrame=-1;flashColor='#fff';flash=false;
  private pressed=false;
  private auxiliaryScriptId:number|null=null;private recoveryAfterReset:number|null=null;
  constructor(level:LevelDefinition,scripts:Map<number,DemoScript>,sim?:Simulation,scriptId?:number,font?:DecodedSprite,fontMap?:Uint8Array){
    this.standalone=scriptId!==undefined;
    this.stops=this.standalone?[{id:scriptId!,x:0,y:0}]:STOPS;
    for(const stop of this.stops)if(!scripts.has(stop.id))throw new Error(`Missing original demo script ${stop.id}`);
    const copy={...level,tiles:[...level.tiles],parameters:[...level.parameters],objects:[...level.objects]};
    this.sim=sim??new Simulation(copy);this.scripts=scripts;this.font=font;this.fontMap=fontMap;
    this.phase=this.standalone?'script':'opening';
    if(!this.standalone){
      // S700 starts the tutorial five cells left of the map's checkpoint.
      // The normal movement step covers the 18/12/6/0 pixel offsets.
      this.sim.player.x=0;this.sim.player.y=4;this.sim.player.offset=0;this.sim.player.direction=0;
    }
    this.followHero();
  }
  get heroX(){const p=this.sim.player;return p.x*24-p.dx*p.offset;}
  get heroY(){const p=this.sim.player;return p.y*24-p.dy*p.offset;}
  get scriptId(){return this.phase==='script'?(this.auxiliaryScriptId??this.stops[this.section].id):null;}
  get finished(){return this.phase==='done';}
  get commandTick(){return this.active?.ticks??0;}
  get dialogue():{lines:string[];popup:boolean;slide:number}|null{
    const running=this.findDialogue(this.active);
    if(!running)return null;
    const popup=running.command.opcode===27,lines=this.wrap(running.command.text??'',popup);
    return {lines:lines.slice(running.page,running.page+(popup?2:running.command.args[0])),popup,
      slide:running.closingTicks===undefined?Math.min(0,-240+running.ticks*30):Math.min(263,running.closingStart!+running.closingTicks*30)};
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
    if(this.phase==='opening'){
      this.sim.step({direction:2,action:false});this.tick=this.sim.tick;this.followHero();
      if(this.sim.player.x===5&&this.sim.player.offset===0)this.phase='free';
      return;
    }
    if(this.phase==='free'){
      if(input.reset)this.recoveryAfterReset=this.recoveryAtPlayer()??this.recoveryAfterReset;
      this.sim.step(input);this.tick=this.sim.tick;this.followHero();
      if(this.sim.deathTicks>0)this.recoveryAfterReset=this.recoveryAtPlayer()??this.recoveryAfterReset;
      if(this.sim.status==='dead'){
        this.sim.lives=5;this.sim.status='playing';this.sim.restoreCheckpoint(true,true);
      }
      if(this.recoveryAfterReset!==null&&this.sim.events.includes('respawn')){
        this.auxiliaryScriptId=this.recoveryAfterReset;this.recoveryAfterReset=null;this.startScript();return;
      }
      if(this.section>=this.stops.length){
        if(this.atSealExit())this.phase='done';
      }else if(this.atTrigger())this.startScript();
      return;
    }
    if(this.phase!=='script')return;
    const commands=this.scripts.get(this.scriptId!)!.commands;
    if(!this.active){
      if(this.commandIndex>=commands.length){this.nextSection();return;}
      this.active=this.running(commands[this.commandIndex]);
    }
    // The same physics and collision path runs while the hero is scripted.
    const direction=this.scriptedDirection(this.active);
    this.sim.step({direction,action:false});this.tick=this.sim.tick;
    if(direction)this.followHero();
    if(this.sim.deathTicks>0||this.sim.status==='dead'){
      this.recoveryAfterReset=this.recoveryAtPlayer()??this.recoveryAfterReset;
      this.phase=this.standalone?'done':'free';this.active=null;this.portraitVisible=false;this.portraitRevealTicks=0;this.pressed=false;
      return;
    }
    if(this.sim.hurtTicks>0||this.sim.respawnTravel)return;
    if(this.stepCommand(this.active)){this.active=null;this.commandIndex++;}
  }
  private wrap(value:string,popup:boolean){
    return this.font&&this.fontMap?wrapDemoTextPixels(value,popup?196:222,this.font,this.fontMap):wrapDemoText(value,popup?23:18);
  }
  private atTrigger(){
    if(this.sim.status!=='playing'||this.sim.player.offset!==0||this.sim.chestCell>=0)return false;
    const stop=this.stops[this.section],i=this.sim.index(stop.x,stop.y);
    if(this.section===2)return this.sim.opened.has(i);
    return this.sim.player.x===stop.x&&this.sim.player.y===stop.y;
  }
  private atSealExit(){return [60,61].includes(this.sim.player.x)&&this.sim.player.y===3&&this.sim.player.offset===0;}
  private recoveryAtPlayer(){
    const i=this.sim.index(this.sim.player.x,this.sim.player.y);
    if(i<0||this.sim.level.objects[i]!==0)return null;
    return this.sim.level.parameters[i]===13?15:this.sim.level.parameters[i]===16?17:null;
  }
  private startScript(){
    this.phase='script';this.commandIndex=0;this.active=null;this.pressed=false;
    this.sim.pendingDirection=0;
  }
  private nextSection(){
    if(this.auxiliaryScriptId!==null){this.auxiliaryScriptId=null;this.commandIndex=0;this.active=null;this.phase='free';this.followHero();return;}
    this.section++;
    if(this.section>=this.stops.length){this.phase=this.standalone||this.atSealExit()?'done':'free';this.flash=false;return;}
    this.commandIndex=0;this.active=null;this.portraitVisible=false;this.portraitRevealTicks=0;this.blinkFrame=-1;
    this.phase='free';this.followHero();
    if(this.atTrigger())this.startScript();
  }
  private scriptedDirection(r:RunningCommand):Direction{
    if(r.done)return 0;
    // The source releases direction for the final settled tick of a walk command.
    if(r.command.opcode===10)return r.ticks>=4&&this.sim.player.offset===0?0:r.command.args[0] as Direction;
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
      this.cameraX=Math.max(0,Math.min(maxX,Math.trunc(r.startX+(args[0]*24-108-r.startX)*t)));
      this.cameraY=Math.max(0,Math.min(maxY,Math.trunc(r.startY+(args[1]*24-108-r.startY)*t)));
      // DemoInterpreter marks the command complete only after field_46
      // exceeds its duration; the next command begins on the following tick.
      return r.ticks>=duration+2;
    }
    if(opcode===2||opcode===27){
      if(r.closingTicks!==undefined){this.pressed=false;return r.closingStart!+(++r.closingTicks)*30>=263;}
      if(this.pressed){
        this.pressed=false;
        const lines=this.wrap(r.command.text??'',opcode===27),perPage=opcode===27?2:args[0];
        if(r.page+perPage<lines.length){r.page+=perPage;return false;}
        // Dialogue can be dismissed before it has fully slid in. The Java
        // continues from its current X instead of jumping to the open position.
        r.closingStart=Math.min(0,-240+(r.ticks-1)*30);
        r.closingTicks=1;return false;
      }
      return false;
    }
    if(opcode===6)return r.ticks>=args[0];
    if(opcode===10)return r.ticks>4&&this.sim.player.offset<=0;
    if(opcode===11){this.portraitFrame=args[0];this.portraitSprite=args[1];return true;}
    if(opcode===12){
      this.portraitX=args[0];this.portraitY=args[1];
      if(r.ticks<=6){this.portraitRevealTicks=r.ticks;return false;}
      this.portraitRevealTicks=0;this.portraitVisible=true;return true;
    }
    if(opcode===13){
      const t=Math.min(1,r.ticks/Math.max(1,args[2]));
      this.portraitX=Math.round(r.startX+(args[0]-r.startX)*t);this.portraitY=Math.round(r.startY+(args[1]-r.startY)*t);
      return r.ticks>=args[2];
    }
    if(opcode===14){this.portraitVisible=true;return true;}
    if(opcode===15){this.portraitVisible=false;this.portraitRevealTicks=0;this.blinkFrame=-1;return true;}
    if(opcode===16||opcode===17||opcode===18){
      r.blinkRemaining??=opcode===18?args[0]:args[1];r.blinkOn??=false;
      if(opcode===18)this.flashColor=`#${args.slice(1).map(n=>n.toString(16).padStart(2,'0')).join('')}`;
      if(r.ticks%2===1){
        if(r.blinkOn){r.blinkOn=false;r.blinkRemaining--;}
        else if(r.blinkRemaining>0)r.blinkOn=true;
      }
      if(opcode===18)this.flash=!!r.blinkOn;
      else this.blinkFrame=r.blinkOn?args[0]:-1;
      if(r.blinkRemaining<=0&&r.ticks>=(opcode===18?args[0]:args[1])*4){
        if(opcode===18)this.flash=false;
        else this.blinkFrame=opcode===16?args[0]:-1;
        return true;
      }
      return false;
    }
    if(opcode===25){
      const i=this.sim.index(args[0],args[1]);if(i>=0)this.sim.applyDemoEdit({cell:i,object:args[2],parameter:args[3]},this.standalone);
      return true;
    }
    if(opcode===26){const i=this.sim.index(args[0],args[1]);if(i>=0)this.sim.applyDemoEdit({cell:i,state:args[2]},this.standalone);return true;}
    // Resource edits and animation overlays not used in the Angkor introduction.
    return true;
  }
}
