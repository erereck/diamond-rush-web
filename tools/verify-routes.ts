import { writeFileSync } from 'node:fs';
import { buildPlayabilityReport, renderPlayabilityReport } from './routes/PlayabilityReport.ts';

const options=process.argv.slice(2);
if(options.some(option=>option!=='--write-report'))throw new Error('Usage: npm run verify:routes -- [--write-report]');
const report=buildPlayabilityReport();
if(options.includes('--write-report')){
  writeFileSync(new URL('../docs/PLAYABILITY.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  writeFileSync(new URL('../docs/PLAYABILITY.md',import.meta.url),renderPlayabilityReport(report));
}
console.log(JSON.stringify(report.counts));
for(const level of report.levels)if(level.evidence.length)
  console.log(`${['Angkor','Bavaria','Tibet'][level.world]} ${level.kind==='tutorial'?'intro':level.level+1}: ${level.status}; ${level.evidence.map(e=>`${e.outcome.ticks} ticks, ${e.outcome.hits} hits, ${e.outcome.retries} returns`).join('; ')}`);
