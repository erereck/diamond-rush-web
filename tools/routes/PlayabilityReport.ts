import { isDeepStrictEqual } from 'node:util';
import { readFileSync, readdirSync } from 'node:fs';
import { ENGINE_REVISION } from '../../src/core/Compatibility.ts';
import { completedRoute, playRoute } from './RouteRunner.ts';
import type { RouteFixture, RouteOutcome } from './RouteRunner.ts';
import { loadRouteResources } from './loadResources.ts';

export interface RouteEvidence {file:string;world:number;level:number;goal:string;initial:RouteFixture['initial'];outcome:RouteOutcome}
export function verifyRouteFiles(directory='routes',requireCompletion=true):RouteEvidence[]{
  const root=new URL(`../../tests/fixtures/${directory}/`,import.meta.url),resources=loadRouteResources();
  return readdirSync(root).filter(name=>name.endsWith('.json')).sort().map(name=>{
    const fixture=JSON.parse(readFileSync(new URL(name,root),'utf8')) as RouteFixture;
    const runner=playRoute(fixture,resources),outcome=runner.outcome();
    if(!isDeepStrictEqual(outcome,fixture.expected))throw new Error(`${name}: route outcome changed`);
    if(requireCompletion&&!completedRoute(runner))throw new Error(`${name}: exit or boss victory not completed`);
    if(!requireCompletion&&completedRoute(runner))throw new Error(`${name}: completed attempts should be promoted to routes`);
    const goal=fixture.kind==='tutorial'?'tutorial':runner.sim.boss?'crystal':outcome.exitObject===28?'secret':'normal';
    return {file:`tests/fixtures/${directory}/${name}`,world:fixture.world,level:fixture.level,goal,initial:fixture.initial,outcome};
  });
}
/** These handlers are still absent outside the existing source-traced subset.
 * Presence is a review priority, never proof that the map cannot be finished. */
const HANDLERS_TO_REVIEW:Record<number,string>={
  8:'Objeto 8: queda e interações de method_351/331',
  11:'Objeto móvel 11: method_331',
  18:'Interruptores/ponte fora da arena de Tibet: method_240',
  36:'Objeto 36: method_318',37:'Objeto 37: method_330',
  38:'Mecanismo 38 e gatilhos associados',
  47:'Objeto 47: method_351/311',48:'Objeto 48: method_306/305 e puxão de method_263'
};
export function buildPlayabilityReport(){
  const resources=loadRouteResources(),routes=verifyRouteFiles(),attempts=verifyRouteFiles('route-attempts',false);
  const levels=resources.worlds.flatMap(world=>world.levels.map(level=>{
    const node=resources.maps[world.world].find(node=>node.level===level.index);
    const boss=world.world===0&&level.index===8||world.world===1&&level.index===9||world.world===2&&level.index===10;
    const tutorial=world.world===0&&level.index===13;
    const kind=tutorial?'tutorial':boss?'boss':node?.type===1?'secret':'normal';
    const goals=tutorial?[{kind:'tutorial',x:61,y:3}]:boss?level.tiles.flatMap((tile,i)=>[51,52,53].includes(tile)?[{kind:'crystal',x:i%level.width,y:Math.floor(i/level.width)}]:[]):
      level.objects.flatMap((object,i)=>[5,28].includes(object)?[{kind:object===28?'secret':'normal',x:i%level.width,y:Math.floor(i/level.width)}]:[]);
    const evidence=routes.filter(route=>route.world===world.world&&route.level===level.index);
    const pendingAttempts=attempts.filter(route=>route.world===world.world&&route.level===level.index);
    const covered=new Set(evidence.map(route=>route.goal));
    const status=goals.length&&goals.every(goal=>covered.has(goal.kind))?'verified':evidence.length?'partial':pendingAttempts.length?'attempted':'unverified';
    const reviews=[...new Set(level.tiles)].filter(tile=>HANDLERS_TO_REVIEW[tile]&&!(tile===18&&boss&&world.world===2))
      .sort((a,b)=>a-b).map(tile=>({tile,description:HANDLERS_TO_REVIEW[tile],count:level.tiles.filter(t=>t===tile).length}));
    return {world:world.world,level:level.index,kind,width:level.width,height:level.height,goals,status,evidence,pendingAttempts,reviews};
  }));
  return {engine:ENGINE_REVISION,reference:'5e05c42aa1aae3377790600eb6d27497101b79e7',
    scope:'Control-only routes from the original spawn in isolated stages. This is not a new-save campaign or Java parity certificate.',
    counts:{maps:levels.length,playableStages:levels.filter(level=>level.kind!=='tutorial').length,
      secretStages:levels.filter(level=>level.kind==='secret').length,
      goals:levels.reduce((sum,level)=>sum+level.goals.length,0),
      verifiedMaps:levels.filter(level=>level.status==='verified').length,verifiedBosses:levels.filter(level=>level.kind==='boss'&&level.status==='verified').length,
      completedRoutes:routes.length,attemptedMaps:levels.filter(level=>level.status==='attempted').length},levels};
}
export function renderPlayabilityReport(report:ReturnType<typeof buildPlayabilityReport>){
  const worlds=['Angkor','Bavaria','Tibet'],status={verified:'Percurso aprovado',partial:'Saídas parcialmente aprovadas',attempted:'Tentativa pendente',unverified:'Ainda não verificada'};
  const goalName:Record<string,string>={tutorial:'Tutorial',crystal:'Cristal após vencer o chefe',normal:'Saída comum',secret:'Saída secreta'};
  const lines=['# Percursos e possibilidade de conclusão','',
    `Motor: \`${report.engine}\`. Dados S700 fixados em \`${report.reference}\`.`, '',
    `Inventário: **${report.counts.maps} mapas**, sendo ${report.counts.playableStages} fases e a introdução; ${report.counts.secretStages} fases são secretas. Há ${report.counts.goals} conclusões a verificar, contando as saídas alternativas.`, '',
    `Nesta rodada: **${report.counts.completedRoutes} percursos aprovados**, incluindo ${report.counts.verifiedBosses} chefes. São percursos isolados desde o spawn, com recursos iniciais explícitos. A aquisição dos equipamentos e a liberação dessas fases em uma campanha nova ainda não estão certificadas.`, '',
    'O executor aceita somente direção, ação e retorno ao checkpoint. Diálogos e edições de cena vêm dos mesmos gatilhos e intérprete usados no jogo. Não aceita posições, chaves, baús previamente abertos ou edições de mapa no arquivo de controles. Para aprovar um chefe, exige o evento de derrota concluída e zero de vida antes de terminar o percurso.', '',
    '“Tentativa pendente” registra um percurso incompleto reproduzível. Ela não prova que a fase seja impossível. Os objetos listados para revisão indicam funções ainda ausentes/parciais; sua presença também não prova que bloqueiem a saída.', '',
    '## Lista por mapa', '',
    '| Fase (numeração do menu; índice interno entre parênteses) | Conclusões exigidas | Estado | Objetos a revisar |',
    '|---|---|---|---|'];
  for(const level of report.levels){
    const label=level.kind==='tutorial'?'Introdução':`${worlds[level.world]} ${level.level+1}${level.kind==='boss'?' · chefe':level.kind==='secret'?' · secreta':''}`;
    const goals=level.goals.map(goal=>`${goalName[goal.kind]} (${goal.x},${goal.y})`).join('; ');
    const links=level.evidence.map(e=>`[${e.outcome.ticks} ticks](../${e.file})`).join(', ');
    const attempts=level.pendingAttempts.map(e=>`[tentativa em (${e.outcome.x},${e.outcome.y})](../${e.file})`).join(', ');
    lines.push(`| ${label} (${level.level}) | ${goals} | ${status[level.status as keyof typeof status]}${links?' · '+links:''}${attempts?' · '+attempts:''} | ${level.reviews.map(r=>r.tile).join(', ')||'—'} |`);
  }
  lines.push('', '## Percursos aprovados', '');
  for(const level of report.levels)for(const evidence of level.evidence){
    const e=evidence.outcome;
    lines.push(`- [${worlds[level.world]} ${level.kind==='tutorial'?'introdução':level.level+1}](../${evidence.file}): ${e.ticks} ticks de controles, ${e.hits} ${e.hits===1?'dano':'danos'}, ${e.retries} ${e.retries===1?'retorno':'retornos'}; equipamento inicial ${evidence.initial.weaponTier??0}; diálogos ${e.demos.join(', ')||'nenhum'}.`);
  }
  lines.push('', 'Angkor 1 comprova a saída comum, sem exigir coleta de todos os diamantes/baús. Angkor e Bavaria comprovam todos os golpes, reposição das pedras, derrota, cristal e diálogo final. A introdução cobre a caminhada automática e os oito roteiros, incluindo os dois retornos ao círculo.', '',
    '## Próximas verificações', '',
    '1. Resolver a aproximação de Angkor 2 com a gravidade e o empurrão atuais; a tentativa salva para em (13,5), antes de comprovar a saída.',
    '2. Concluir os cinco golpes de Tibet, com as duas metades da ponte, geração de inimigos, congelamento e puxão. A tentativa salva é incompleta e inclui uma morte; não é um bloqueio confirmado.',
    '3. Obter martelo, gancho e gelo durante uma campanha nova e encadear os percursos com os recursos, recompensas e save reais.',
    '4. Aprovar cada saída comum/secreta e as dez fases secretas. Exigir todas as saídas de um mapa antes de marcá-lo como aprovado.',
    '5. Repetir com mortes/checkpoints e recarga do save; depois comparar percursos e tempos com a execução Java.', '',
    '## Objetos para revisão de cobertura', '');
  for(const [tile,description] of Object.entries(HANDLERS_TO_REVIEW))lines.push(`- ${tile}: ${description}.`);
  lines.push('', '## Reproduzir', '',
    'Após `npm run extract-assets`, execute `npm run verify:routes`. A verificação falha se os resultados gravados mudarem, se algum percurso aprovado não terminar ou se um chefe não tiver sido derrotado. `npm test` também executa os percursos e verifica a reconstrução dos replays.', '',
    'Para regenerar esta tabela e `PLAYABILITY.json`: `npm run verify:routes -- --write-report`. Os arquivos de tentativa são conferidos separadamente e nunca entram na contagem de aprovação.', '');
  return lines.join('\n');
}
