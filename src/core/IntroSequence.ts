import type { LevelDefinition } from '../level/LevelParser.ts';
import { DX, DY, Simulation, WALKABLE_TILES } from './Simulation.ts';
import type { Direction } from './Simulation.ts';
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
  {id:29,x:5,y:4}, // first encounter and three opening lines
  {id:10,x:31,y:7}, // chest hint
  {id:11,x:28,y:6}, // compass in the chest
  {id:13,x:37,y:7}, // pushing-rock lesson
  {id:16,x:46,y:7}, // return-to-circle lesson
  {id:28,x:57,y:8}  // seal and exit
] as const;

/** A guided playthrough of the S700 introduction map and its original demo.f scripts. */
export class IntroSequence {
  readonly sim:Simulation;readonly scripts:Map<number,DemoScript>;
  section=0;phase:'route'|'chest'|'script'|'ending'|'done'='route';
  route:{x:number;y:number}[]=[];routeIndex=0;routePixels=0;routeOriginX=0;routeOriginY=4*24;
  commandIndex=0;active:RunningCommand|null=null;tick=0;phaseTicks=0;
  heroX=0;heroY=4*24;cameraX=0;cameraY=0;
  portraitVisible=false;portraitFrame=2;portraitSprite=2;portraitX=17;portraitY=50;blinkFrame=-1;flashColor='#fff';flash=false;
  private pressed=false;
  constructor(level:LevelDefinition,scripts:Map<number,DemoScript>){
    for(const stop of STOPS)if(!scripts.has(stop.id))throw new Error(`Missing original intro script ${stop.id}`);
    const copy={...level,tiles:[...level.tiles],parameters:[...level.parameters],objects:[...level.objects]};
    this.sim=new Simulation(copy);this.sim.player.x=0;this.sim.player.y=4;this.sim.player.offset=0;
    this.scripts=scripts;this.route=this.pathTo(STOPS[0].x,STOPS[0].y);
  }
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
  step(){
    this.tick++;this.sim.tick++;this.sim.animationTick++;
    if(this.phase==='route'){this.stepRoute();return;}
    if(this.phase==='chest'){
      this.phaseTicks++;const i=this.sim.index(28,6);
      this.sim.chestFrames[i]=Math.min(14,this.phaseTicks);
      if(this.phaseTicks>=14){this.sim.opened.add(i);this.phase='script';this.phaseTicks=0;}
      return;
    }
    if(this.phase==='ending'){
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
    if(this.stepCommand(this.active)){this.active=null;this.commandIndex++;}
  }
  private nextSection(){
    this.section++;
    if(this.section>=STOPS.length){this.phase='ending';this.phaseTicks=0;return;}
    const stop=STOPS[this.section];this.commandIndex=0;this.active=null;this.portraitVisible=false;this.blinkFrame=-1;
    this.routeOriginX=this.heroX;this.routeOriginY=this.heroY;
    this.route=this.pathTo(stop.x,stop.y);this.routeIndex=0;this.routePixels=0;this.phase='route';
  }
  private stepRoute(){
    if(this.routeIndex>=this.route.length){
      this.phase=this.section===2?'chest':'script';this.phaseTicks=0;this.commandIndex=0;this.active=null;
      this.sim.playerAnimation=1;return;
    }
    const target=this.route[this.routeIndex],fromX=this.routeIndex?this.route[this.routeIndex-1].x*24:this.routeOriginX,
      fromY=this.routeIndex?this.route[this.routeIndex-1].y*24:this.routeOriginY;
    this.routePixels=Math.min(24,this.routePixels+6);
    this.setHero(fromX+(target.x*24-fromX)*this.routePixels/24,fromY+(target.y*24-fromY)*this.routePixels/24);
    const dx=Math.sign(target.x*24-fromX),dy=Math.sign(target.y*24-fromY);
    this.sim.player.direction=(dx>0?2:dx<0?4:dy>0?3:1) as Direction;
    this.sim.playerAnimation=3+this.sim.player.direction;
    this.followHero();
    if(this.routePixels>=24){this.routeIndex++;this.routePixels=0;}
  }
  private pathTo(x:number,y:number){
    const level=this.sim.level,start={x:Math.round(this.heroX/24),y:Math.round(this.heroY/24)},queue=[start],seen=new Set([start.x+start.y*level.width]),previous=new Map<number,number>();
    const goal=x+y*level.width;
    for(let at=0;at<queue.length;at++){
      const cell=queue[at],key=cell.x+cell.y*level.width;if(key===goal)break;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=cell.x+dx,ny=cell.y+dy,ni=nx+ny*level.width;
        if(nx<0||ny<0||nx>=level.width||ny>=level.height||seen.has(ni))continue;
        const tile=level.tiles[ni];if(tile!==255&&tile!==10&&tile!==79&&!WALKABLE_TILES.has(tile))continue;
        seen.add(ni);previous.set(ni,key);queue.push({x:nx,y:ny});
      }
    }
    if(!seen.has(goal))throw new Error(`Intro marker ${x},${y} unreachable`);
    const route:{x:number;y:number}[]=[];let key=goal;
    while(key!==start.x+start.y*level.width){route.push({x:key%level.width,y:Math.floor(key/level.width)});key=previous.get(key)!;}
    return route.reverse();
  }
  private setHero(x:number,y:number){
    this.heroX=x;this.heroY=y;
    const p=this.sim.player,cellX=Math.ceil(x/24),cellY=Math.ceil(y/24);
    p.x=cellX;p.y=cellY;p.dx=x%24?1:0;p.dy=y%24?1:0;
    p.offset=p.dx?cellX*24-x:p.dy?cellY*24-y:0;
  }
  private followHero(){
    this.cameraX=Math.max(0,Math.min(this.sim.level.width*24-240,this.heroX-108));
    this.cameraY=Math.max(0,Math.min(this.sim.level.height*24-240,this.heroY-108));
  }
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
    if(opcode===10){
      const direction=args[0] as Direction,x=this.heroX+DX[direction]*6,y=this.heroY+DY[direction]*6;
      this.setHero(x,y);this.sim.player.direction=direction;this.sim.playerAnimation=3+direction;
      return r.ticks>=4;
    }
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
