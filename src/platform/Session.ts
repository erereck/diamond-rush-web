import { Simulation } from '../core/Simulation.ts';
import type { LocaleChange } from '../core/Simulation.ts';
import type { InputFrame, StageStart } from '../core/Simulation.ts';
import { CORE_REVISION } from '../core/s700/Engine.ts';
import { S700_SOURCE_SHA256 } from '../generated/s700.ts';
import type { WorldDefinition } from '../level/LevelParser.ts';
import type { GameLocale } from '../core/Localization.ts';

/**
 * Development session: the stage, its starting record values (or the campaign's RMS record 1)
 * and the controls of every tick. Replaying it on the same generated core reproduces the session.
 */
export interface Replay {
  version:4;engine:string;source:string;world:number;level:number;
  /** Translated dialogues page differently, so a replay is restored in the language it started in, with the same changes. */
  locale?:GameLocale;localeChanges?:LocaleChange[];
  resources?:StageStart;record?:string;inputs:{ticks:number;direction:number;action:boolean;reset?:boolean;back?:boolean}[];
}
export const SESSION_KEY='diamond-rush:session:v4';
const SOURCE=S700_SOURCE_SHA256.slice(0,16);
function toBase64(bytes:Uint8Array){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);}
function fromBase64(text:string){const s=atob(text);return Uint8Array.from(s,c=>c.charCodeAt(0));}
export function sessionReplay(sim:Simulation):Replay{
  const runs:Replay['inputs']=[];
  for(const input of sim.inputs){
    const last=runs.at(-1);
    if(last&&last.direction===input.direction&&last.action===input.action&&!!last.reset===!!input.reset&&!!last.back===!!input.back)last.ticks++;
    else runs.push({ticks:1,direction:input.direction,action:input.action,...(input.reset?{reset:true}:{}),...(input.back?{back:true}:{})});
  }
  return {version:4,engine:CORE_REVISION,source:SOURCE,world:sim.start.world,level:sim.start.level,...(sim.locale!=='en'?{locale:sim.locale}:{}),...(sim.localeChanges.length?{localeChanges:sim.localeChanges.map(c=>({...c}))}:{}),
    ...(sim.start.resources?{resources:{...sim.start.resources}}:{}),...(sim.start.record?{record:toBase64(sim.start.record)}:{}),inputs:runs};
}
export function validateReplay(value:unknown,worlds:WorldDefinition[]):Replay {
  if(!value||typeof value!=='object')throw new Error('Arquivo de sessão inválido.');
  const r=value as Replay;
  if(r.version!==4||r.engine!==CORE_REVISION)throw new Error('Versão de replay ou motor incompatível.');
  if(r.source!==SOURCE)throw new Error('Replay gravado com outra versão das fontes S700.');
  if(!Number.isInteger(r.world)||!Number.isInteger(r.level)||!worlds[r.world]?.levels[r.level])throw new Error('Fase não encontrada.');
  if(!Array.isArray(r.inputs))throw new Error('Replay sem controles.');
  const locales=['en','pt-BR','es'];
  if(r.locale!==undefined&&!locales.includes(r.locale))throw new Error('Idioma do replay desconhecido.');
  if(r.localeChanges!==undefined&&(!Array.isArray(r.localeChanges)||r.localeChanges.some(c=>!c||!Number.isInteger(c.tick)||c.tick<0||!locales.includes(c.locale))))throw new Error('Mudança de idioma inválida no replay.');
  let total=0;
  for(const run of r.inputs){
    if(!run||!Number.isInteger(run.ticks)||run.ticks<1||!Number.isInteger(run.direction)||run.direction<0||run.direction>4||typeof run.action!=='boolean'||
      (run.reset!==undefined&&typeof run.reset!=='boolean')||(run.back!==undefined&&typeof run.back!=='boolean')||(total+=run.ticks)>144000)throw new Error('Controle inválido ou acima do limite de duas horas.');
  }
  const s=r.resources;
  if(s&&(![s.diamonds,s.redDiamonds].every(v=>Number.isInteger(v)&&v>=0&&v<=65535)||!Number.isInteger(s.lives)||s.lives<0||s.lives>99||
    (s.maxHealth!==undefined&&(!Number.isInteger(s.maxHealth)||s.maxHealth<4||s.maxHealth>8))||![0,1,2,8].includes(s.weaponTier??0)))
    throw new Error('Recursos iniciais inválidos.');
  if(r.record!==undefined&&(typeof r.record!=='string'||fromBase64(r.record).length>1000))throw new Error('Record RMS inválido no replay.');
  return {version:4,engine:r.engine,source:r.source,world:r.world,level:r.level,...(r.locale&&r.locale!=='en'?{locale:r.locale}:{}),...(r.localeChanges?.length?{localeChanges:r.localeChanges.map(c=>({tick:c.tick,locale:c.locale}))}:{}),...(s?{resources:{...s}}:{}),...(r.record?{record:r.record}:{}),inputs:r.inputs.map(i=>({...i}))};
}
export function restoreReplay(replay:Replay,worlds:WorldDefinition[]){
  const previous=Simulation.locale;
  Simulation.setLocale(replay.locale??'en');
  try{
  const sim=new Simulation(worlds[replay.world].levels[replay.level],{world:replay.world,level:replay.level,
    ...(replay.resources?{resources:replay.resources}:{}),...(replay.record?{record:fromBase64(replay.record)}:{})});
  const changes=[...(replay.localeChanges??[])].sort((a,b)=>a.tick-b.tick);
  for(const run of replay.inputs)for(let i=0;i<run.ticks;i++){
    while(changes.length&&changes[0].tick<=sim.tick)Simulation.setLocale(changes.shift()!.locale);
    sim.step({direction:run.direction as InputFrame['direction'],action:run.action,...(run.reset?{reset:true}:{}),...(run.back?{back:true}:{})});
  }
  while(changes.length)Simulation.setLocale(changes.shift()!.locale);
  return sim;
  // Back to the page's language: the restored session records it as a change, so exporting it again replays the same.
  }finally{Simulation.setLocale(previous);}
}
