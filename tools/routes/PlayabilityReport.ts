/**
 * Completion goals of the 41 S700 maps and the control-only routes that reach them on the
 * generated core. Goals come from the stage data (object 5 exits, object 28 secret exits, the boss
 * crystal chests), plus the tutorial's end, which the game's code fixes at its seal.
 */
import type { MapNode, WorldDefinition } from '../../src/level/LevelParser.ts';
import type { CoreOutcome, CoreRouteFixture } from './CoreRoute.ts';

export type GoalKind='exit'|'secret-exit'|'crystal'|'tutorial';
export interface Goal {world:number;level:number;kind:GoalKind;x:number;y:number}
export interface CertifiedRoute {file:string;world:number;level:number;result:CoreOutcome['result'];ticks:number;start:CoreRouteFixture['start'];jvm:'agrees'|'disagrees'|'unchecked';provenance:string;
  /** Hash of the route and the core it was checked on; a cached JVM result is only valid for the same digest. */
  digest?:string;
  /** Set when the route draws random numbers: how it fares with other java.util.Random seeds. */
  randomDraws?:number;seedsTried?:number;seedsCompleted?:number}
export interface MapEntry {world:number;level:number;secret:boolean;boss:boolean;tutorial:boolean;goals:(Goal&{routes:CertifiedRoute[]})[];status:'verified'|'partial'|'unverified'}
export interface PlayabilityReport {maps:MapEntry[];totals:{maps:number;goals:number;verifiedGoals:number;verifiedMaps:number;routes:number;jvmAgreeing:number}}

export function stageGoals(worlds:WorldDefinition[]):Goal[]{
  const goals:Goal[]=[];
  for(const w of worlds)for(const l of w.levels){
    const at=(i:number)=>({x:i%l.width,y:Math.floor(i/l.width)});
    // The tutorial map has no exit object: cGame.method_267 ends it when the hero reaches the seal at 60,3 or 61,3.
    if(l.world===0&&l.index===13){goals.push({world:0,level:13,kind:'tutorial',x:60,y:3});continue;}
    l.objects.forEach((o,i)=>{
      if(o===5)goals.push({world:l.world,level:l.index,kind:'exit',...at(i)});
      if(o===28)goals.push({world:l.world,level:l.index,kind:'secret-exit',...at(i)});
      if((o===14||o===33)&&[51,52,53].includes(l.tiles[i]))goals.push({world:l.world,level:l.index,kind:'crystal',...at(i)});
    });
  }
  return goals;
}
function routeMeets(goal:Goal,route:CertifiedRoute){
  if(goal.world!==route.world||goal.level!==route.level)return false;
  if(goal.kind==='tutorial'||goal.kind==='exit')return route.result==='exit';
  return route.result===goal.kind;
}
export function buildPlayabilityReport(worlds:WorldDefinition[],maps:MapNode[][],routes:CertifiedRoute[]):PlayabilityReport{
  const goals=stageGoals(worlds);
  const entries:MapEntry[]=worlds.flatMap(w=>w.levels.map(l=>{
    const node=maps[l.world].find(n=>n.level===l.index);
    const own=goals.filter(g=>g.world===l.world&&g.level===l.index).map(g=>({...g,routes:routes.filter(r=>routeMeets(g,r))}));
    const done=own.filter(g=>g.routes.length).length;
    return {world:l.world,level:l.index,secret:node?.type===1,boss:own.some(g=>g.kind==='crystal'),tutorial:l.world===0&&l.index===13,goals:own,
      status:done===own.length?'verified':done?'partial':'unverified'} as MapEntry;
  }));
  const all=entries.flatMap(e=>e.goals);
  return {maps:entries,totals:{maps:entries.length,goals:all.length,verifiedGoals:all.filter(g=>g.routes.length).length,
    verifiedMaps:entries.filter(e=>e.status==='verified').length,routes:routes.length,jvmAgreeing:routes.filter(r=>r.jvm==='agrees').length}};
}
const WORLD=['Angkor','Bavaria','Tibet'];
const KIND:Record<GoalKind,string>={exit:'Saída comum','secret-exit':'Saída secreta',crystal:'Cristal do chefe',tutorial:'Fim do tutorial'};
const STATUS={verified:'Percurso aprovado',partial:'Saídas parcialmente aprovadas',unverified:'Sem percurso aprovado'};
export function stageName(e:{world:number;level:number;secret?:boolean;boss?:boolean;tutorial?:boolean}){
  if(e.tutorial)return 'Introdução (13)';
  return `${WORLD[e.world]} ${e.level+1}${e.boss?' · chefe':e.secret?' · secreta':''} (${e.level})`;
}
export function renderPlayabilityReport(report:PlayabilityReport,source:string){
  const t=report.totals;
  const rows=report.maps.map(e=>{
    const goals=e.goals.map(g=>`${KIND[g.kind]} (${g.x},${g.y})`).join('; ');
    const links=e.goals.flatMap(g=>g.routes.map(r=>`[${r.ticks} ticks](../tests/fixtures/core-routes/${r.file})${r.jvm==='agrees'?' ✓JVM':r.jvm==='disagrees'?' ✗JVM':''}${r.randomDraws?` (sorteios: ${r.seedsCompleted}/${r.seedsTried} sementes)`:''}`)).join(', ');
    return `| ${stageName(e)} | ${goals} | ${STATUS[e.status]}${links?` · ${links}`:''} |`;
  });
  return `# Percursos e possibilidade de conclusão

Motor: núcleo gerado da decompilação S700 (\`${source}\`). Gerado por \`npm run verify:routes -- --write-report\`; não edite à mão.

Inventário: **${t.maps} mapas** (40 fases e a introdução) e **${t.goals} objetivos de conclusão**, contando saídas comuns, secretas, cristais dos chefes e o fim do tutorial.

Cobertura atual: **${t.verifiedGoals} de ${t.goals} objetivos** com percurso aprovado; **${t.verifiedMaps} mapas** com todos os objetivos aprovados; ${t.routes} percursos, dos quais **${t.jvmAgreeing}** também conferidos na decompilação recompilada em Java.

Um percurso aprovado começa no carregamento original da fase (entrada automática desde a coluna 0) e contém apenas controles por tick: direção, ação e retorno ao checkpoint. O motor é a lógica original traduzida, com semente fixa de \`java.util.Random\` e relógio exato de 20 quadros por segundo ([NUCLEO_S700.md](NUCLEO_S700.md)); a marca ✓JVM indica que o mesmo fluxo de controles também concluiu na decompilação recompilada. Um percurso que não sorteia números conclui no jogo original com qualquer semente. Os que sorteiam (marcados com "sorteios") foram repetidos com outras sementes, como um aparelho que semeia pelo relógio, e a fração indica com quantas ainda concluem. Os recursos iniciais (vidas, equipamento, vida máxima) ficam declarados em cada arquivo.

| Fase (numeração do menu; índice interno entre parênteses) | Objetivos | Estado |
|---|---|---|
${rows.join('\n')}
`;
}
