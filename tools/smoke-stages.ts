import {writeFileSync} from 'node:fs';
import {smokeAllStages} from './routes/StageSmoke.ts';

const rows=smokeAllStages().map(entry=>entry.result);
const total=(name:'visited'|'checkpoints'|'chests'|'hits'|'retries')=>rows.reduce((sum,row)=>sum+row[name],0);
const report={scope:'Automated control-only exploratory smoke pass from each canonical spawn. This is not an exit, puzzle, or Java parity certificate.',
  maxTicksPerMap:900,maps:rows.length,visitedCells:total('visited'),checkpoints:total('checkpoints'),
  chests:total('chests'),hits:total('hits'),retries:total('retries'),rows};
if(process.argv.includes('--write-report')){
  writeFileSync(new URL('../docs/STAGE_SMOKE.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  const worlds=['Angkor','Bavaria','Tibet'];
  const lines=['# Varredura automática das 40 fases','',
    'Cada mapa é iniciado no spawn original com recursos isolados explícitos. O explorador anda por células abertas, grama e pedras empurráveis, sem editar o mapa ou atravessar portões fechados. A introdução tem um percurso completo separado. Esta varredura **não comprova saída, solução de puzzle ou paridade com Java**; os percursos de conclusão ficam em [PLAYABILITY.md](PLAYABILITY.md).','',
    `Foram visitadas ${report.visitedCells} células ao todo; acionados ${report.checkpoints} checkpoints e abertos ${report.chests} baús em ${report.maps} mapas. O limite é ${report.maxTicksPerMap} entradas por fase.`, '',
    '| Fase | Entradas | Células | Checkpoints | Baús | Danos | Posição final |',
    '|---|---:|---:|---:|---:|---:|---|'];
  for(const row of rows)lines.push(`| ${worlds[row.world]} ${row.level+1}${row.kind==='boss'?' (chefe)':''} | ${row.ticks} | ${row.visited} | ${row.checkpoints} | ${row.chests} | ${row.hits} | (${row.x},${row.y}) |`);
  lines.push('', 'A mesma sequência é executada novamente a partir do replay em `tests/stage-smoke.test.ts`, que compara o estado integral de cada mapa. Os casos com poucos passos indicam uma fronteira de navegação para análise manual; não são classificados como falha da fase.', '');
  writeFileSync(new URL('../docs/STAGE_SMOKE.md',import.meta.url),lines.join('\n'));
}
console.log(JSON.stringify({maps:report.maps,visitedCells:report.visitedCells,checkpoints:report.checkpoints,chests:report.chests,hits:report.hits}));
