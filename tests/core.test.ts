import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { useExtractedResources } from '../tools/routes/engineResources.ts';
import { loadRouteResources } from '../tools/routes/loadResources.ts';
import { playCoreRoute } from '../tools/routes/CoreRoute.ts';
import type { CoreRouteFixture } from '../tools/routes/CoreRoute.ts';
import { S700Engine } from '../src/core/s700/Engine.ts';
import { Simulation } from '../src/core/Simulation.ts';
import type { InputFrame } from '../src/core/Simulation.ts';
import { CanonicalSave } from '../src/platform/CanonicalSave.ts';
import { campaignFromRecord } from '../src/platform/CanonicalCampaign.ts';
import { restoreReplay, sessionReplay, validateReplay } from '../src/platform/Session.ts';

useExtractedResources();
const {worlds,maps}=loadRouteResources();
const C=S700Engine.core;
const start=(world:number,level:number,weaponTier=0)=>({world,level,lives:5,diamonds:0,redDiamonds:0,maxHealth:4,weaponTier});
function observe(e:S700Engine){
  const g=e.game,w=g.crtLevelWidth,h=g.crtLevelHeight;let hash=0x811c9dc5|0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){hash^=C.field_334[x][y]&255;hash=Math.imul(hash^(C.field_332[x][y]&255),0x01000193);}
  return [C.gameState,g.playerXPos,g.playerYPos,g.field_232,g.field_239,g.playerLifeCount,g.collectedDiamonds,hash>>>0].join(',');
}
/** Deterministic pseudo-random controls. */
function controls(seed:number,count:number){
  const out:{direction:0|1|2|3|4;action:boolean}[]=[];
  for(let i=0;i<count;i++){seed=(Math.imul(seed,1103515245)+12345)|0;out.push({direction:((seed>>>16)%5) as 0|1|2|3|4,action:((seed>>>8)&15)===0});}
  return out;
}

test('every stage of the three worlds loads in the generated core with the original entrance',()=>{
  for(const w of worlds)for(const l of w.levels){
    const e=new S700Engine(start(l.world,l.index,2));
    assert.equal(C.gameState,1,`world ${l.world} level ${l.index}`);
    assert.equal(e.game.crtLevelWidth,l.width);assert.equal(e.game.crtLevelHeight,l.height);
    // loadLevelData/method_296: the hero enters from column 0 and walks to the marker.
    const marker=l.tiles.indexOf(79);
    assert.equal(e.game.playerXPos,0);assert.equal(e.game.playerYPos,Math.floor(marker/l.width));
    assert.equal(e.game.field_195,marker%l.width);
  }
});

test('a new engine starts from pristine static state and snapshots restore the same timeline',()=>{
  const inputs=controls(7,400);
  const run=()=>{const e=new S700Engine(start(1,2,2));return inputs.map(c=>{e.step(c);return observe(e);});};
  assert.deepEqual(run(),run());
  const e=new S700Engine(start(2,4,2));
  for(const c of inputs.slice(0,150))e.step(c);
  const snapshot=e.snapshot(),after:string[]=[];
  for(const c of inputs.slice(150))after.push((e.step(c),observe(e)));
  e.restore(snapshot);
  assert.deepEqual(inputs.slice(150).map(c=>(e.step(c),observe(e))),after);
});

test('a session replay reconstructs the same game state',()=>{
  const level=worlds[0].levels[3];
  const sim=new Simulation(level,{world:0,level:3,resources:{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:1}});
  for(const c of controls(11,600))sim.step(c);
  const expected=observe(sim.engine);
  const replay=validateReplay(JSON.parse(JSON.stringify(sessionReplay(sim))),worlds);
  assert.equal(observe(restoreReplay(replay,worlds).engine),expected);
  assert.throws(()=>validateReplay({...replay,engine:'other'},worlds),/motor/);
  assert.throws(()=>validateReplay({...replay,inputs:[{ticks:0,direction:9,action:false}]},worlds),/Controle/);
});

const routeRoot=new URL('fixtures/core-routes/',import.meta.url);
const routes=existsSync(routeRoot)?readdirSync(routeRoot).filter(n=>n.endsWith('.json')).sort():[];
for(const name of routes)test(`control-only route reproduces its certified outcome: ${name}`,()=>{
  const fixture=JSON.parse(readFileSync(new URL(name,routeRoot),'utf8')) as CoreRouteFixture;
  const route=playCoreRoute(fixture);
  assert.notEqual(route.result,'playing');assert.notEqual(route.result,'game-over');
  assert.deepEqual(route.outcome(),fixture.expected);
});

test('a campaign stage writes its outcome into the original record',{skip:!routes.includes('0-angkor-01-normal.json')},()=>{
  const fixture=JSON.parse(readFileSync(new URL('0-angkor-01-normal.json',routeRoot),'utf8')) as CoreRouteFixture;
  const record=CanonicalSave.create(worlds,maps).export();
  const sim=new Simulation(worlds[0].levels[0],{world:0,level:0,record});
  for(const run of fixture.controls)for(let i=0;i<run.ticks;i++)sim.step(run);
  assert.equal(sim.status,'finishing');assert.equal(sim.result,'exit');
  // The original results screen waits for the action key, then loads the world map.
  const status=()=>sim.status as string;
  for(let i=0;i<600&&status()!=='complete';i++)sim.step({direction:0,action:i%20===10});
  assert.equal(status(),'complete');
  const save=new CanonicalSave(sim.record());
  assert.ok(save.worlds[0].levels[0].flags&2,'Angkor 1 is marked complete');
  assert.ok(save.worlds[0].levels[1].flags&64,'Angkor 2 is unlocked');
  assert.equal(save.diamonds,fixture.expected.diamonds);
  const campaign=campaignFromRecord(save,worlds,maps);
  assert.deepEqual(campaign.completed[0],[0]);
});

test('the tutorial completes with the web translations of its dialogues',{skip:!routes.includes('0-angkor-intro.json')},()=>{
  const fixture=JSON.parse(readFileSync(new URL('0-angkor-intro.json',routeRoot),'utf8')) as CoreRouteFixture;
  const level=worlds[0].levels[13];
  // The English route's controls outside dialogues; translated dialogues page differently.
  const english=new Simulation(level,{world:0,level:13}),free:InputFrame[]=[];
  for(const run of fixture.controls)for(let i=0;i<run.ticks;i++){if(!english.inDialogue)free.push(run);english.step(run);}
  assert.equal(english.status,'complete');
  try{
    for(const locale of ['pt-BR','es'] as const){
      Simulation.setLocale(locale);
      const sim=new Simulation(level,{world:0,level:13});let next=0,press=false;
      while(sim.status==='playing'&&sim.tick<5000){
        if(sim.inDialogue){press=!press;sim.step({direction:0,action:press});}
        else{press=false;sim.step(free[next++]??{direction:0,action:false});}
      }
      assert.equal(sim.status,'complete',locale);assert.equal(sim.result,'exit',locale);
    }
  }finally{Simulation.setLocale('en');}
});

test('the record template matches the record the original writes at New Game',()=>{
  // method_113 builds the record and the tutorial load (method_104) counts one stage load in byte 12.
  const written=new Simulation(worlds[0].levels[13],{world:0,level:13}).record();
  const created=CanonicalSave.create(worlds,maps).export();
  assert.equal(created.length,written.length);
  assert.equal(written[12],1);
  assert.deepEqual([...created].map((v,i)=>i===12?1:v),[...written]);
  assert.deepEqual(new CanonicalSave(written).worlds.map(w=>w.firstSecret),[9,9,9]);
});

test('each step is one iteration of cGame.run: logic, then the paint the logic depends on',()=>{
  const e=new S700Engine(start(0,0));const proto=Object.getPrototypeOf(e.game);
  const logic=proto.method_67,paint=proto.method_132,calls:string[]=[];
  proto.method_67=function(this:unknown){calls.push('logic');return logic.call(this);};
  proto.method_132=function(this:unknown,g:unknown){calls.push('paint');return paint.call(this,g);};
  try{
    const before=C.field_227;
    for(let i=0;i<3;i++)e.step({direction:2,action:false});
    assert.deepEqual(calls,['logic','paint','logic','paint','logic','paint']);
    assert.equal(C.field_227,before+3);assert.equal(e.game.field_229,false);assert.equal(e.game.field_370,0n);
  }finally{proto.method_67=logic;proto.method_132=paint;}
});

test('the generated core never passes a Java class as a value',()=>{
  // Static library calls must not turn the class name into an argument (String.valueOf(x) -> J.string_valueOf(x)).
  const core=readFileSync(new URL('../src/generated/s700.ts',import.meta.url),'utf8');
  assert.doesNotMatch(core,/J\.(string|integer|boxed|thread)_\w+\((String|Integer|Thread)[,)]/);
  assert.doesNotMatch(core,/this\.(wait|notify|notifyAll)\(\)/);
});

test('the frame after a checkpoint is a lag frame without paint, as cGame.run does after the checkpoint sleep',()=>{
  const e=new S700Engine(start(0,1));const proto=Object.getPrototypeOf(e.game),paint=proto.method_132;let painted=0;
  proto.method_132=function(this:unknown,g:unknown){painted++;return paint.call(this,g);};
  try{
    // Walk right from the entrance until a checkpoint activates (field_235 -> Thread.sleep(100), method_236).
    let lagFrames=0,steps=0;
    for(;steps<400&&!lagFrames;steps++){e.step({direction:steps%2?2:0,action:false});if(e.game.field_229)lagFrames++;}
    if(lagFrames){assert.equal(e.game.field_229,true);assert.equal(painted,steps-1);}
    else assert.fail('no checkpoint was reached');
  }finally{proto.method_132=paint;}
});

test('a snapshot taken mid-stage restores after the stage ended and freed its sprites',{skip:!routes.includes('0-angkor-01-normal.json')},()=>{
  const fixture=JSON.parse(readFileSync(new URL('0-angkor-01-normal.json',routeRoot),'utf8')) as CoreRouteFixture;
  const ticks=fixture.controls.flatMap(r=>Array.from({length:r.ticks},()=>r));
  const e=new S700Engine(fixture.start);
  for(let i=0;i<200;i++)e.step(ticks[i]);
  const snap=e.snapshot(),rows:string[]=[];
  for(let i=200;i<ticks.length;i++){e.step(ticks[i]);rows.push(observe(e));}
  for(let i=0;i<300;i++)e.step({direction:0,action:i%20===10}); // results screen, then the world map loader frees the sprites
  e.restore(snap);
  for(let i=200;i<ticks.length;i++){e.step(ticks[i]);assert.equal(observe(e),rows[i-200],`tick ${i+1}`);}
});

test('a session replay is restored in the languages it was played in',{skip:!routes.includes('0-angkor-intro.json')},()=>{
  const fixture=JSON.parse(readFileSync(new URL('0-angkor-intro.json',routeRoot),'utf8')) as CoreRouteFixture;
  // The tutorial up to a dialogue, then moves the translated pages leave in a different place (English is still talking).
  const route=fixture.controls.flatMap(r=>Array.from({length:r.ticks},()=>r));
  const idle={direction:0 as const,action:false},ticks=[...route.slice(0,506),...Array(6).fill({...idle,direction:1}),...Array(30).fill(idle),...Array(40).fill({...idle,direction:2})],N=ticks.length;
  /** Plays the first N tutorial controls; `switchAt` changes the language mid-session. */
  const play=(locale:'en'|'pt-BR',switchAt?:number)=>{
    Simulation.setLocale(locale);
    const sim=new Simulation(worlds[0].levels[13],{world:0,level:13});
    for(let i=0;i<N;i++){if(i===switchAt)Simulation.setLocale('pt-BR');sim.step(ticks[i]);}
    return sim;
  };
  const restore=(replay:object)=>observe(restoreReplay(validateReplay(JSON.parse(JSON.stringify(replay)),worlds),worlds).engine);
  try{
    const english=observe(play('en').engine);
    const pt=play('pt-BR'),expected=observe(pt.engine),replay=sessionReplay(pt);
    assert.notEqual(expected,english,'the two languages diverge by this tick, so the check below is meaningful');
    assert.equal(replay.locale,'pt-BR');
    Simulation.setLocale('en');
    const restored=restoreReplay(validateReplay(JSON.parse(JSON.stringify(replay)),worlds),worlds);
    assert.equal(observe(restored.engine),expected);
    assert.equal(Simulation.locale,'en');
    // Exporting the restored session again keeps its language history.
    assert.equal(restore(sessionReplay(restored)),expected);
    // Without its language, the same controls end elsewhere.
    assert.notEqual(restore({...replay,locale:undefined}),expected);
    // A change of language mid-session is recorded at its tick and replayed there.
    const mixed=play('en',300),mixedState=observe(mixed.engine),mixedReplay=sessionReplay(mixed);
    assert.deepEqual(mixedReplay.localeChanges,[{tick:300,locale:'pt-BR'}]);
    Simulation.setLocale('en');
    assert.equal(restore(mixedReplay),mixedState);
  }finally{Simulation.setLocale('en');}
});

test('rewinding a session restores the engine and cuts its replay at that point',()=>{
  const sim=new Simulation(worlds[0].levels[3],{world:0,level:3,resources:{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:1}});
  const moves=controls(7,500);
  for(const c of moves.slice(0,300))sim.step(c);
  const snap=sim.snapshot(),atSnapshot=observe(sim.engine);
  for(const c of moves.slice(300))sim.step(c);
  assert.notEqual(observe(sim.engine),atSnapshot);
  sim.restore(snap);
  assert.equal(sim.tick,300);assert.equal(sim.inputs.length,300);assert.equal(observe(sim.engine),atSnapshot);
  // The replay of the rewound session reproduces the same state, and play continues identically.
  assert.equal(observe(restoreReplay(validateReplay(JSON.parse(JSON.stringify(sessionReplay(sim))),worlds),worlds).engine),atSnapshot);
  const again=new Simulation(worlds[0].levels[3],{world:0,level:3,resources:{diamonds:0,redDiamonds:0,lives:5,health:4,weaponTier:1}});
  for(const c of moves)again.step(c);
  sim.restore(snap);for(const c of moves.slice(300))sim.step(c);
  assert.equal(observe(sim.engine),observe(again.engine));
});
