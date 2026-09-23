import type { DemoScript } from './DemoScript.ts';
import type { Simulation } from './Simulation.ts';

/** cGame.method_299: a reward or consumed map marker schedules its demo.f script. */
export function nextStageDemo(sim:Simulation,scripts:Map<number,DemoScript>):number|null {
  if(sim.status!=='playing')return null;
  const reward=sim.events.find(event=>event.startsWith('demo:'));
  if(reward){const id=Number(reward.slice(5));return scripts.has(id)?id:null;}
  const p=sim.player,i=sim.index(p.x,p.y);
  if(i<0||p.offset!==0||sim.chestCell>=0||![0,30].includes(sim.level.objects[i]))return null;
  const id=sim.level.parameters[i];
  if(!scripts.has(id))return null;
  sim.applyDemoEdit({cell:i,object:255},true);
  return id;
}
