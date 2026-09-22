import { Simulation } from '../core/Simulation.ts';
import type { Replay, InputFrame } from '../core/Simulation.ts';
import type { WorldDefinition } from '../level/LevelParser.ts';
import { ENGINE_REVISION, levelFingerprint } from '../core/Compatibility.ts';
/** Development sessions use input replays, NOT an invented substitute for canonical RMS. */
export function validateReplay(value:unknown,worlds:WorldDefinition[]):Replay {
  if(!value||typeof value!=='object')throw new Error('Arquivo de sessão inválido.');
  const r=value as Replay;
  if(r.version!==2||r.target!=='1.2.0-s700'||r.engine!==ENGINE_REVISION)throw new Error('Versão de replay ou motor incompatível.');
  if(!Number.isInteger(r.world)||!Number.isInteger(r.level)||!worlds[r.world]?.levels[r.level])throw new Error('Fase não encontrada.');
  if(r.levelFingerprint!==levelFingerprint(worlds[r.world].levels[r.level]))throw new Error('Dados da fase incompatíveis com o replay.');
  if(!Array.isArray(r.inputs)||r.inputs.length>144000)throw new Error('Replay ausente ou acima do limite de duas horas.');
  for(const input of r.inputs){if(!input||!Number.isInteger(input.direction)||input.direction<0||input.direction>4||typeof input.action!=='boolean')throw new Error('Entrada inválida no replay.');}
  return {version:2,target:'1.2.0-s700',engine:ENGINE_REVISION,levelFingerprint:r.levelFingerprint,world:r.world,level:r.level,inputs:r.inputs.map((i:InputFrame)=>({direction:i.direction,action:i.action}))};
}
export function restoreReplay(replay:Replay,worlds:WorldDefinition[]){const sim=new Simulation(worlds[replay.world].levels[replay.level]);for(const input of replay.inputs)sim.step(input);return sim;}
export const SESSION_KEY='diamond-rush:experimental-session:v2';
