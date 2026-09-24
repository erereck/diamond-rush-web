import { Simulation } from '../core/Simulation.ts';
import type { Replay, InputFrame, StageStart } from '../core/Simulation.ts';
import type { WorldDefinition } from '../level/LevelParser.ts';
import { ENGINE_REVISION, levelFingerprint } from '../core/Compatibility.ts';
/** Development sessions use input replays, NOT an invented substitute for canonical RMS. */
export function validateReplay(value:unknown,worlds:WorldDefinition[]):Replay {
  if(!value||typeof value!=='object')throw new Error('Arquivo de sessão inválido.');
  const r=value as Replay;
  if(r.version!==3||r.target!=='1.2.0-s700'||r.engine!==ENGINE_REVISION)throw new Error('Versão de replay ou motor incompatível.');
  if(!Number.isInteger(r.world)||!Number.isInteger(r.level)||!worlds[r.world]?.levels[r.level])throw new Error('Fase não encontrada.');
  if(r.levelFingerprint!==levelFingerprint(worlds[r.world].levels[r.level]))throw new Error('Dados da fase incompatíveis com o replay.');
  if(!Array.isArray(r.inputs)||r.inputs.length>144000)throw new Error('Replay ausente ou acima do limite de duas horas.');
  const initial=r.initial as StageStart|undefined;
  if(!initial||!Number.isInteger(initial.diamonds)||initial.diamonds<0||initial.diamonds>65535||
    !Number.isInteger(initial.redDiamonds)||initial.redDiamonds<0||initial.redDiamonds>65535||
    !Number.isInteger(initial.lives)||initial.lives<0||initial.lives>99||
    !Number.isInteger(initial.health)||initial.health<1||initial.health>4||![0,1,2,8].includes(initial.weaponTier??0))
    throw new Error('Estado inicial da fase inválido.');
  const cellCount=worlds[r.world].levels[r.level].tiles.length;
  if(initial.openedChests!==undefined&&(!Array.isArray(initial.openedChests)||initial.openedChests.length>128||
    initial.openedChests.some(cell=>!Number.isInteger(cell)||cell<0||cell>=cellCount||![14,33].includes(worlds[r.world].levels[r.level].objects[cell]))))
    throw new Error('Baús iniciais inválidos no replay.');
  for(const input of r.inputs){
    if(!input||!Number.isInteger(input.direction)||input.direction<0||input.direction>4||typeof input.action!=='boolean'||(input.reset!==undefined&&typeof input.reset!=='boolean'))throw new Error('Entrada inválida no replay.');
    if(input.demoEdits!==undefined&&(!Array.isArray(input.demoEdits)||input.demoEdits.length>8||input.demoEdits.some(edit=>
      !edit||!Number.isInteger(edit.cell)||edit.cell<0||edit.cell>=cellCount||
      (edit.object===undefined&&edit.parameter===undefined&&edit.state===undefined)||
      (edit.object!==undefined&&(!Number.isInteger(edit.object)||edit.object<0||edit.object>255))||
      (edit.parameter!==undefined&&(!Number.isInteger(edit.parameter)||edit.parameter<0||edit.parameter>255))||
      (edit.state!==undefined&&(!Number.isInteger(edit.state)||edit.state< -2147483648||edit.state>2147483647))
    )))throw new Error('Edição de cena inválida no replay.');
  }
  return {version:3,target:'1.2.0-s700',engine:ENGINE_REVISION,levelFingerprint:r.levelFingerprint,world:r.world,level:r.level,
    initial:{...initial},inputs:r.inputs.map((i:InputFrame)=>({direction:i.direction,action:i.action,reset:i.reset??false,demoEdits:i.demoEdits?.map(edit=>({...edit}))}))};
}
export function restoreReplay(replay:Replay,worlds:WorldDefinition[]){const sim=new Simulation(worlds[replay.world].levels[replay.level],replay.initial);for(const input of replay.inputs){sim.step(input);for(const edit of input.demoEdits??[])sim.applyDemoEdit(edit);}return sim;}
export const SESSION_KEY='diamond-rush:experimental-session:v3';
