import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Simulation} from '../src/core/Simulation.ts';
import type {LevelDefinition} from '../src/level/LevelParser.ts';
const trace=JSON.parse(readFileSync(new URL('fixtures/crawler-s700.json',import.meta.url),'utf8'));
function level():LevelDefinition{
 const width=7,height=7,tiles:number[]=Array.from({length:49},(_,i)=>i%7===0||i%7===6||i<7||i>=42?80:255);
 tiles[8]=79;return {world:0,index:0,width,height,offset:0,tiles,objects:tiles.map(()=>255),parameters:tiles.map(()=>255)};
}
test('wall crawler matches the isolated source Java branch and motion cases',()=>{
 assert.equal(trace.scope,'isolated-source-methods');assert.equal(trace.cases.length,174);
 const source=readFileSync(new URL('../../../work/reference-s700/src/cGame.java',import.meta.url),'utf8').replaceAll('\r\n','\n');
 assert.equal(createHash('sha256').update(source).digest('hex'),trace.sourceHash);
 for(const [n,{input:c,expected}] of trace.cases.entries()){
  const l=level();for(const [dx,dy] of c.blocked)l.tiles[3+dx+(3+dy)*7]=80;
  if(c.gatePhase>=0){l.objects[25]=7;l.parameters[25]=0;}
  l.tiles[24]=11;const s=new Simulation(l);s.state[24]=c.state;s.motion[24]=c.motion;s.tick=c.frame;
  if(c.gatePhase>=0)s.gatePhases[25]=c.gatePhase;
  if(c.hero){s.player.x=3;s.player.y=3;}
  s.updateWallCrawler(3,3);
  const cells:number[]=[];for(let y=2;y<=4;y++)for(let x=2;x<=4;x++){const i=s.index(x,y);cells.push(s.tiles[i],s.state[i],s.motion[i]);}
  assert.deepEqual({damage:4-s.health,cells},expected,`Java case ${n}`);
 }
});
test('crawler initialization, active scan and checkpoint preserve its encoded handedness',()=>{
 const l=level();l.tiles[24]=11;l.parameters[24]=1;l.tiles[23]=80;
 const s=new Simulation(l);assert.equal(s.state[24],16);
 for(let i=0;i<12;i++)s.step({direction:0,action:false});
 assert.notEqual(s.tiles[24],11);assert.equal(Array.from(s.tiles).filter(t=>t===11).length,1);
 s.restoreCheckpoint();assert.equal(s.tiles[24],11);assert.equal(s.state[24],16);assert.equal(s.motion[24],0);
});
