import { isDeepStrictEqual } from 'node:util';
import { readFileSync, readdirSync } from 'node:fs';
import { ENGINE_REVISION } from '../../src/core/Compatibility.ts';
import { completedRoute, playRoute } from './RouteRunner.ts';
import type { RouteFixture, RouteOutcome } from './RouteRunner.ts';
import { loadRouteResources } from './loadResources.ts';
import { verifyCampaignRoute } from './CampaignRoute.ts';
import type { CampaignRouteFixture } from './CampaignRoute.ts';

export interface RouteEvidence {file:string;world:number;level:number;goal:string;initial:RouteFixture['initial'];outcome:RouteOutcome;events:Record<string,number>}
export function verifyRouteFiles(directory='routes',requireCompletion=true):RouteEvidence[]{
  const root=new URL(`../../tests/fixtures/${directory}/`,import.meta.url),resources=loadRouteResources();
  return readdirSync(root).filter(name=>name.endsWith('.json')).sort().map(name=>{
    const fixture=JSON.parse(readFileSync(new URL(name,root),'utf8')) as RouteFixture;
    const runner=playRoute(fixture,resources),outcome=runner.outcome();
    if(!isDeepStrictEqual(outcome,fixture.expected))throw new Error(`${name}: route outcome changed`);
    if(requireCompletion&&!completedRoute(runner))throw new Error(`${name}: exit or boss victory not completed`);
    if(!requireCompletion&&completedRoute(runner))throw new Error(`${name}: completed attempts should be promoted to routes`);
    const goal=fixture.kind==='tutorial'?'tutorial':runner.sim.boss?'crystal':outcome.exitObject===28?'secret':'normal';
    return {file:`tests/fixtures/${directory}/${name}`,world:fixture.world,level:fixture.level,goal,initial:fixture.initial,outcome,events:runner.eventCounts};
  });
}
/** These handlers are still absent outside the existing source-traced subset.
 * Presence is a review priority, never proof that the map cannot be finished. */
const HANDLERS_TO_REVIEW:Record<number,string>={
  8:'Minas: queda padrão/explosão implementadas; água e demais casos de method_351',
  37:'Escombros explosivos implementados; inundação de method_397 pendente',
  38:'Emissor de água 38: inicialização e propagação de method_293/method_369 pendentes',
  47:'Peso de gelo 47: queda, placa e empurrão implementados, deposição comparada com Java; água pendente',48:'Deslizador 48: par, queda, puxão e empurrão implementados, descida comparada com Java; ligação visual e água pendentes'
};
export function buildPlayabilityReport(){
  const resources=loadRouteResources(),routes=verifyRouteFiles(),attempts=verifyRouteFiles('route-attempts',false);
  const campaignRoot=new URL('../../tests/fixtures/campaign-routes/',import.meta.url);
  const campaignPrefixes=readdirSync(campaignRoot).filter(name=>name.endsWith('.json')).sort().map(name=>({
    file:`tests/fixtures/campaign-routes/${name}`,
    ...verifyCampaignRoute(JSON.parse(readFileSync(new URL(name,campaignRoot),'utf8')) as CampaignRouteFixture)
  }));
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
      .sort((a,b)=>a-b).map(tile=>({plane:'tile',tile,description:HANDLERS_TO_REVIEW[tile],count:level.tiles.filter(t=>t===tile).length}));
    return {world:world.world,level:level.index,kind,width:level.width,height:level.height,goals,status,evidence,pendingAttempts,reviews};
  }));
  return {engine:ENGINE_REVISION,reference:'5e05c42aa1aae3377790600eb6d27497101b79e7',
    scope:'Control-only routes from the original spawn and explicitly bounded New Game prefixes. Not a full campaign or Java parity certificate.',
    counts:{maps:levels.length,playableStages:levels.filter(level=>level.kind!=='tutorial').length,
      secretStages:levels.filter(level=>level.kind==='secret').length,
      goals:levels.reduce((sum,level)=>sum+level.goals.length,0),
      verifiedMaps:levels.filter(level=>level.status==='verified').length,verifiedBosses:levels.filter(level=>level.kind==='boss'&&level.status==='verified').length,
      completedRoutes:routes.length,attemptedMaps:levels.filter(level=>level.status==='attempted').length,
      campaignPrefixes:campaignPrefixes.length,campaignPrefixStages:Math.max(0,...campaignPrefixes.map(prefix=>prefix.stages.length-1))},campaignPrefixes,levels};
}
export function renderPlayabilityReport(report:ReturnType<typeof buildPlayabilityReport>){
  const worlds=['Angkor','Bavaria','Tibet'],status={verified:'Percurso aprovado',partial:'Saídas parcialmente aprovadas',attempted:'Tentativa pendente',unverified:'Ainda não verificada'};
  const goalName:Record<string,string>={tutorial:'Tutorial',crystal:'Cristal após vencer o chefe',normal:'Saída comum',secret:'Saída secreta'};
  const lines=['# Percursos e possibilidade de conclusão','',
    `Motor: \`${report.engine}\`. Dados S700 fixados em \`${report.reference}\`.`, '',
    `Inventário: **${report.counts.maps} mapas**, sendo ${report.counts.playableStages} fases e a introdução; ${report.counts.secretStages} fases são secretas. Há ${report.counts.goals} conclusões a verificar, contando as saídas alternativas.`, '',
    `Cobertura atual: **${report.counts.completedRoutes} percursos aprovados**, incluindo os ${report.counts.verifiedBosses} chefes. Os percursos isolados partem do spawn, com recursos iniciais explícitos. Os chefes usam armas predefinidas; obter essas armas e liberar os chefes durante uma campanha nova ainda não está certificado.`, '',
    'O executor aceita somente direção, ação e retorno ao checkpoint. Diálogos e edições de cena vêm dos mesmos gatilhos e intérprete usados no jogo. Não aceita posições, chaves, baús previamente abertos ou edições de mapa no arquivo de controles. Para aprovar um chefe, exige o evento de derrota concluída e zero de vida antes de terminar o percurso.', '',
    'Uma [varredura exploratória separada](STAGE_SMOKE.md) executa controles em todos os 40 mapas e confere seus replays. Ela não altera o estado de aprovação de saídas nesta tabela.', '',
    '“Tentativa pendente” registra um percurso incompleto reproduzível. Ela não prova que a fase seja impossível. Tentativas antigas continuam vinculadas para registrar onde o planejamento anterior parava, mesmo quando outro percurso já aprovou a fase. Os objetos listados para revisão indicam funções ainda ausentes/parciais; sua presença também não prova que bloqueiem a saída.', '',
    '## Lista por mapa', '',
    '| Fase (numeração do menu; índice interno entre parênteses) | Conclusões exigidas | Estado | Objetos a revisar (obj. = plano de objetos) |',
    '|---|---|---|---|'];
  for(const level of report.levels){
    const label=level.kind==='tutorial'?'Introdução':`${worlds[level.world]} ${level.level+1}${level.kind==='boss'?' · chefe':level.kind==='secret'?' · secreta':''}`;
    const goals=level.goals.map(goal=>`${goalName[goal.kind]} (${goal.x},${goal.y})`).join('; ');
    const links=level.evidence.map(e=>`[${e.outcome.ticks} ticks](../${e.file})`).join(', ');
    const attempts=level.pendingAttempts.map(e=>`[${level.status==='verified'?'tentativa anterior':'tentativa'} em (${e.outcome.x},${e.outcome.y})](../${e.file})`).join(', ');
    lines.push(`| ${label} (${level.level}) | ${goals} | ${status[level.status as keyof typeof status]}${links?' · '+links:''}${attempts?' · '+attempts:''} | ${level.reviews.map(r=>r.plane==='object'?`obj.${r.tile}`:r.tile).join(', ')||'—'} |`);
  }
  lines.push('', '## Percursos aprovados', '');
  for(const level of report.levels)for(const evidence of level.evidence){
    const e=evidence.outcome;
    lines.push(`- [${worlds[level.world]} ${level.kind==='tutorial'?'introdução':level.level+1}](../${evidence.file}): ${e.ticks} ticks de controles, ${e.hits} ${e.hits===1?'dano':'danos'}, ${e.retries} ${e.retries===1?'retorno':'retornos'}; equipamento inicial ${evidence.initial.weaponTier??0}; diálogos ${e.demos.join(', ')||'nenhum'}.`);
  }
  lines.push('', 'Angkor 1–8 comprovam a saída comum, sem exigir coleta de todos os diamantes/baús. Angkor 3 abre as fechaduras prateada e dourada. Angkor 4 resolve sua sala de combate e usa pedras nas duas placas, obtém o martelo, executa seu aviso 22 e quebra tijolos para sair; começa com os recursos explicitados da campanha e inclui uma morte com retorno ao círculo. Angkor 5 resolve as duas placas, vence a cobra vermelha com golpes reais de martelo, pega a chave dourada e sai; seu percurso inclui uma morte e recuperação da sala inicial. Angkor 6 atravessa o poço das pedras, aciona o checkpoint, executa a cena 3, abre o baú vermelho e chega à saída. Angkor 7 vence outra sala de combate, empilha duas pedras para manter a placa pressionada, obtém a chave dourada e sai. Sua saída secreta também foi aprovada com gancho predefinido: desloca a segunda pedra para liberar o retorno e atravessa o portão ainda mantido pela primeira pedra. Angkor 8 abre duas fechaduras prateadas, derrota as cobras da sala, leva uma pedra à placa, usa a chave dourada e sai. Sua saída secreta foi aprovada com martelo de gelo predefinido. Angkor 13, fase secreta, foi concluída desde o spawn com martelo comum, três barreiras de tijolos rompidas e dois checkpoints ativados, sem receber dano. Em Angkor 10, uma tentativa com gancho predefinido põe uma pedra na primeira placa, atravessa o portão, ativa o checkpoint e alcança a segunda placa; a saída ainda não foi aprovada. Os chefes de Angkor e Bavaria comprovam todos os golpes, reposição das pedras, derrota, cristal e diálogo final. Tibet comprova cinco impactos após congelar/puxar inimigos reais, as cinco alternâncias da ponte, a derrota, o cristal e a apresentação de entrada 35. O cristal pede o roteiro 31 em method_322, mas esse ID está ausente do demo.f canônico; nenhum diálogo final de Tibet foi reproduzido ou inventado. A introdução cobre a caminhada automática e os oito roteiros, incluindo os dois retornos ao círculo. Bavaria 1 tem tentativas por controles até o segundo checkpoint e um poço de tijolos aberto pelo martelo, com dois trituradores destruídos por pedras e quatro joias adicionais; outra tentativa usa o martelo comum para destruir duas gramas sob uma coluna de pedras, sem atravessar a passagem. Bavaria 2 agora tem uma tentativa reproduzível que ativa dois checkpoints e destrói as duas metades de cada triturador com bolas rolantes; a saída ainda não foi certificada.', '',
    'Bavaria 3 tem um percurso parcial que quebra a barreira inicial, ativa dois checkpoints e abre temporariamente a porta de uma placa; a saída e a aquisição do gancho ainda precisam ser verificadas. Bavaria 7, com o equipamento de gancho predefinido, aciona a mina, o checkpoint e o interruptor da ponte inferior com martelo comum; sua saída secreta continua pendente. Tibet 2 agora tem as saídas comum e secreta aprovadas. A rota comum parte do spawn com gancho e armadura de oito corações explícitos, atravessa as armadilhas de teto, vence duas salas de desafio, coleta as duas chaves em baús, abre as fechaduras, aciona a ponte de gelo e sai pela passagem comum. Tibet 4 tem uma tentativa reproduzível até o primeiro checkpoint e a primeira placa, com queda de pesos de gelo; as portas e a saída permanecem pendentes. Tibet 6 tem saída comum aprovada desde o spawn com martelo de gelo predefinido: abre um baú de vida, alcança o checkpoint, congela o inimigo, empurra o bloco congelado para cair na placa da porta e sai. A obtenção desse martelo durante a campanha ainda não está certificada. Tibet 12 atravessa nove ativações de armadilhas de teto, abre tijolos, chega ao segundo checkpoint, coleta a primeira chave prateada, abre sua fechadura e aciona a placa seguinte. A armadilha perto do baú destrói o apoio da pedra necessária para manter a passagem aberta nessa tentativa; a saída segue pendente. Tibet 14 agora tem saída comum aprovada desde o spawn com gancho predefinido: remove as pedras que bloqueiam o corredor, aciona o checkpoint e a placa superior, atravessa nove armadilhas de teto e alcança a saída inferior.', '',
    'Tibet 1 tem uma tentativa desde o spawn que abre o baú vermelho, atravessa dez armadilhas de teto e chega ao primeiro checkpoint sem dano; o acesso às salas inferiores e à saída segue pendente. Tibet 5 agora tem uma tentativa única que resolve a sala esquerda, coleta e usa a primeira chave prateada, volta ao ramo superior, desloca uma pedra com o gancho e abre o segundo baú de chave prateada. Ainda falta retornar desse baú, abrir a segunda fechadura e verificar as salas das chaves douradas e a saída comum. A saída secreta dessa fase já tem percurso aprovado. Tibet 13 agora tem uma tentativa reproduzível que quebra a primeira barreira de tijolos, alterna a ponte de gelo duas vezes e alcança a primeira fechadura prateada; suas chaves e saída ainda não foram verificadas.', '',
    'Tibet 8 tem uma tentativa desde o spawn com martelo de gelo predefinido: aciona o primeiro checkpoint, rompe a barreira superior, congela e desloca dois atiradores e registra a morte de um deles por projétil do outro. Falta a segunda eliminação exigida pelo enigma e a saída. Tibet 9 tem uma tentativa que rompe três barreiras, cruza o primeiro portão, alcança o checkpoint e ativa a placa superior que abre outro portão; a saída continua pendente.', '',
    'Bavaria 13, fase secreta, tem um percurso parcial sem dano: usa o gancho para retirar a pedra da base, abre o poço de tijolos e ativa o primeiro checkpoint com o diálogo original 19. A chave prateada e a saída ainda não foram verificadas.', '',
    'Angkor 11 secreta tem saída aprovada desde o spawn com gancho predefinido: ativa três checkpoints, abre a fechadura dourada e alcança a saída após dois retornos ao círculo. Angkor 12 tem uma tentativa reproduzível desde o spawn, também com gancho inicial explícito: as três primeiras salas de cobras e pedras são resolvidas e seus baús entregam três chaves douradas. A quarta sala, sua chave e as fechaduras finais ainda não têm percurso aprovado. Bavaria 5 alcança o primeiro checkpoint com gancho; Bavaria 6 limpa a primeira barreira com uma mina, pega duas chaves prateadas nos baús, abre suas fechaduras e ativa o primeiro checkpoint; Bavaria 9 chega à fechadura dourada junto ao portão da saída, mas ainda não obtém a chave; Bavaria 11 secreta aciona seu primeiro checkpoint e a placa que inicia a abertura do portão. Tibet 10 ativa seu primeiro enigma de quatro inimigos e alcança a fechadura de diamantes superior com martelo de gelo predefinido. Essas cinco saídas seguem pendentes. Tibet 3 tem saída comum aprovada: o tiro vertical do inimigo quebra a vegetação sob uma pedra, que o esmaga; o gancho então desloca a pedra e libera o corredor.', '',
    '## Começo de campanha desde New Game', '');
  for(const prefix of report.campaignPrefixes)lines.push(
    `- [Percurso salvo](../${prefix.file}): introdução e ${prefix.stages.length-1} fases encadeadas, com recursos derivados da campanha, recompensas, recarga JSON e importação/reexportação RMS após cada conclusão.`,
    `- Resultado: ${prefix.resources.diamonds} diamantes, ${prefix.resources.redDiamonds} vermelhos, ${prefix.resources.lives} vidas, saúde ${prefix.resources.health}/4 e equipamento ${prefix.resources.weaponTier??0}. RMS SHA-256: \`${prefix.recordHash}\`.`);
  lines.push('', 'A fase 5 recebe 37 diamantes, sete vidas, saúde 1 e o martelo da fase 4; termina com 58 diamantes, seis vidas e saúde 3. A fase 6 usa esses recursos, termina com 68 diamantes, um vermelho, oito vidas após as recompensas e saúde 1, liberando Angkor 7. A fase 7 obtém cura, resolve a sala de combate, coloca uma pedra na placa, pega a chave e sai com 70 diamantes, um vermelho, nove vidas após a recompensa e saúde 2, liberando Angkor 8. A campanha encadeada comprova a introdução, Angkor 1–8 e o chefe de Angkor, incluindo a aquisição e persistência do martelo. A fase 8 termina com 82 diamantes, um vermelho, oito vidas e saúde 1; o chefe é derrotado com esses recursos e deixa doze vidas após as recompensas. A fase 2 começa com saúde 3 e seis vidas da fase 1; a fase 4 recebe saúde 3, oito vidas e equipamento 0 da fase 3. A morte da fase 4 retorna ao checkpoint sem impedir a aquisição posterior do martelo. Os baús de cura/chaves/equipamento continuam consumidos após recarga. O RMS armazena vida máxima, e a importação repõe a saúde; ele é conferido separadamente, sem substituir os recursos do percurso. Como no fluxo atual do jogo, os recursos das lições da introdução não são transferidos à campanha. Isso ainda não comprova gancho/gelo na campanha, os chefes posteriores na campanha, Bavaria, Tibet, finais ou segredos.', '',
    '## Próximas verificações', '',
    '1. Obter os diamantes vermelhos necessários para abrir Bavaria após o chefe de Angkor e certificar a primeira fase. Conferir a continuidade de física/animações com uma execução Java completa.',
    '2. Obter gancho e gelo durante a campanha nova e encadear os percursos com os recursos, recompensas e save reais.',
    '3. Aprovar cada saída comum/secreta e as dez fases secretas. Exigir todas as saídas de um mapa antes de marcá-lo como aprovado.',
    '4. Repetir os demais percursos com mortes/checkpoints e recarga do save; depois comparar percursos e tempos com a execução Java.', '',
    '## Objetos para revisão de cobertura', '');
  for(const [tile,description] of Object.entries(HANDLERS_TO_REVIEW))lines.push(`- ${tile}: ${description}.`);
  lines.push('', 'As placas de objeto 6 foram implementadas com abertura/fechamento, esmagamento, scan antes da queda e afundamento visual. Há 137 casos comparados com métodos originais extraídos e executados em Java (`tests/pressure.test.ts`, `tools/trace-pressure-s700.ts`). O harness isola os métodos e substitui som, invalidação visual, efeito de destruição e callback de dano; não certifica execução integral do jogo ou os comportamentos ainda ausentes dos tiles 47/48.');
  lines.push('', 'Salas de combate/tochas, câmera, pistas, liberação de prêmios, crawler e mecanismos de minas/barreiras têm 667 estados adicionais comparados com Java isolado. Os percursos de Angkor 3–5 e dos três chefes foram regravados com esses eventos ativos. Ver `RIDDLES.md` e `STAGE_MECHANISMS.md` para métodos, hashes e limites da comparação.');
  lines.push('', '## Reproduzir', '',
    'Após `npm run extract-assets`, execute `npm run verify:routes`. A verificação falha se os resultados gravados mudarem, se algum percurso aprovado não terminar ou se um chefe não tiver sido derrotado. `npm test` também executa os percursos e verifica a reconstrução dos replays.', '',
    'Para regenerar esta tabela e `PLAYABILITY.json`: `npm run verify:routes -- --write-report`. Os arquivos de tentativa são conferidos separadamente e nunca entram na contagem de aprovação.', '');
  return lines.join('\n');
}
