/** Per-tick observations of the generated core in the same format as tools/oracle/Oracle.java. */
import { S700Engine } from '../../src/core/s700/Engine.ts';
import type { EngineControl, EngineStart } from '../../src/core/s700/Engine.ts';
import type { ControlRun } from './CoreRoute.ts';
import type { OracleMap, OracleRow, OracleRun } from './JavaOracle.ts';

function hash(read:(x:number,y:number)=>number,w:number,h:number,plane:unknown){
  if(!plane)return '0'; // between stages the planes are released
  let value=0x811c9dc5|0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){value^=read(x,y)&255;value=Math.imul(value,0x01000193);}
  return (value>>>0).toString(16);
}
export function engineRow(e:S700Engine,tick:number):OracleRow{
  const g=e.game,C=S700Engine.core,w=g.crtLevelWidth,h=g.crtLevelHeight;
  return {tick,gameState:C.gameState,x:g.playerXPos,y:g.playerYPos,offset:g.field_232,direction:g.field_233&7,animation:C.field_323?.[0]?._nCrtAnim??-1,
    health:g.field_239,lives:g.playerLifeCount,diamonds:g.collectedDiamonds,redDiamonds:g.collectedRedDiamonds,goldKeys:g.playerGoldKeys,silverKeys:g.playerSilverKeys,
    tilesHash:hash((x,y)=>C.field_334[x][y],w,h,C.field_334),objectsHash:hash((x,y)=>C.field_332[x][y],w,h,C.field_332)};
}
export function engineMap(e:S700Engine):OracleMap{
  const g=e.game,C=S700Engine.core,w=g.crtLevelWidth,h=g.crtLevelHeight;
  const plane=(read:(x:number,y:number)=>number)=>{const v:number[]=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)v.push(read(x,y));return v;};
  return {tiles:plane((x,y)=>C.field_334[x][y]),objects:plane((x,y)=>C.field_332[x][y]&255),objectParameters:plane((x,y)=>C.field_332[x][y]>>8),
    state:plane((x,y)=>C.field_333[x][y]),motion:plane((x,y)=>C.field_335[x][y]),active:plane((x,y)=>C.field_336[x][y])};
}
/** Run the generated core like runJavaOracle, including the 200 settle frames after the controls. */
export function runEngine(start:EngineStart,controls:ControlRun[],mapTicks:number[]=[]):OracleRun{
  const e=new S700Engine(start);const C=S700Engine.core;
  const run:OracleRun={loaded:{world:e.game.currentWorld,level:e.game.currentLevel,width:e.game.crtLevelWidth,height:e.game.crtLevelHeight},rows:[engineRow(e,0)],maps:new Map(),states:[],end:null,error:null};
  const maps=new Set(mapTicks);if(maps.has(0)&&C.field_334)run.maps.set(0,engineMap(e));
  let tick=0;
  for(const r of controls)for(let i=0;i<r.ticks;i++){
    const before=C.gameState;e.step({direction:r.direction,action:r.action,reset:!!r.reset} as EngineControl);tick++;
    run.rows.push(engineRow(e,tick));if(maps.has(tick)&&C.field_334)run.maps.set(tick,engineMap(e));
    if(C.gameState!==before)run.states.push(`${tick},${before},${C.gameState}`);
  }
  for(let i=1;i<=200;i++){const before=C.gameState;e.step({direction:0,action:false});if(C.gameState!==before)run.states.push(`+${i},${before},${C.gameState}`);}
  run.end=engineRow(e,tick);
  return run;
}
