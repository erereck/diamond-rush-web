import {WALKABLE_TILES} from '../../src/core/Simulation.ts';
import type {Direction,StageStart} from '../../src/core/Simulation.ts';
import {loadRouteResources} from './loadResources.ts';
import {RouteRunner} from './RouteRunner.ts';

const resources=loadRouteResources();
const directions:Direction[]=[1,2,3,4];
const dx=[0,0,1,0,-1],dy=[0,-1,0,1];
export interface SmokeResult {
  world:number;level:number;kind:'stage'|'boss';ticks:number;status:string;
  visited:number;checkpoints:number;chests:number;hits:number;retries:number;
  x:number;y:number;exitObject:number;events:Record<string,number>;
}
function start(world:number,level:number):StageStart {
  return {diamonds:82,redDiamonds:world===2?25:world===1?10:0,lives:12,health:4,
    weaponTier:world===2?(level>=5?8:2):world===1?(level>=2?2:1):level>=3?1:0};
}
/** Finds the closest unvisited cell, then a reachable face of a breakable brick. */
function nextMove(runner:RouteRunner,visited:Set<number>,attemptedBricks:Set<number>):{direction:Direction;brick:number|null} {
  const sim=runner.sim,w=sim.level.width,origin=sim.index(sim.player.x,sim.player.y);
  const queue=[origin],seen=new Set(queue),first=new Map<number,Direction>();
  for(let head=0;head<queue.length;head++){
    const cell=queue[head],x=cell%w,y=Math.floor(cell/w);
    if(cell!==origin&&!visited.has(cell))return {direction:first.get(cell)!,brick:null};
    for(const direction of directions){
      const nx=x+dx[direction],ny=y+dy[direction],next=sim.index(nx,ny);
      if(next<0||nx===0||ny===0||nx===w-1||ny===sim.level.height-1||seen.has(next))continue;
      const tile=sim.tile(nx,ny),object=sim.object(nx,ny);
      const pushable=[0,8,9].includes(tile)&&dx[direction]!==0&&sim.free(nx+dx[direction],ny);
      if(!(WALKABLE_TILES.has(tile)||tile===10||pushable)||
        object===7&&sim.gatePhases[next]<2||object===8||object===9)continue;
      seen.add(next);first.set(next,cell===origin?direction:first.get(cell)!);queue.push(next);
    }
  }
  if(sim.weaponTier>=1)for(const cell of queue){
    const x=cell%w,y=Math.floor(cell/w);
    for(const direction of directions){
      const brick=sim.index(x+dx[direction],y+dy[direction]);
      if(brick>=0&&sim.tiles[brick]===30&&!attemptedBricks.has(brick))
        return {direction:cell===origin?0:first.get(cell)!,brick:cell===origin?brick:null};
    }
  }
  return {direction:0,brick:null};
}
/** A broad smoke pass, not a proof that any exit is beatable. */
export function smokeStage(world:number,level:number,maxTicks=900){
  const runner=new RouteRunner(resources,world,level,start(world,level)),sim=runner.sim;
  const visited=new Set<number>(),attemptedBricks=new Set<number>();let idle=0;
  for(let tick=0;tick<maxTicks&&!runner.finished&&sim.status==='playing';tick++){
    visited.add(sim.index(sim.player.x,sim.player.y));
    const move=runner.scene?{direction:0 as Direction,brick:null}:nextMove(runner,visited,attemptedBricks);
    const direction=move.direction;
    if(!direction&&!runner.scene&&move.brick===null)idle++;else idle=0;
    if(idle>=24)break;
    const action=!!runner.scene&&tick%2===0||move.brick!==null&&sim.player.offset===0&&tick%2===0;
    if(action&&move.brick!==null)attemptedBricks.add(move.brick);
    runner.step({direction,action});
  }
  visited.add(sim.index(sim.player.x,sim.player.y));
  const boss=sim.boss!==null;
  const result:SmokeResult={world,level,kind:boss?'boss':'stage',ticks:runner.controls.length,
    status:runner.finished?'complete':sim.status,visited:visited.size,
    checkpoints:runner.eventCounts.checkpoint??0,chests:runner.eventCounts.chest??0,
    hits:sim.hits,retries:sim.retries,x:sim.player.x,y:sim.player.y,
    exitObject:sim.exitObject,events:Object.fromEntries(Object.entries(runner.eventCounts).filter(([event])=>
      ['break','grass','hammer','hook','hook-pull','gate-open','gold-gate','silver-gate','slider-fall','ice-patch','boss-hurt'].includes(event)))};
  return {result,runner};
}
export function smokeAllStages(){
  return resources.worlds.flatMap(world=>world.levels
    .filter(level=>!(world.world===0&&level.index===13))
    .map(level=>smokeStage(world.world,level.index)));
}
