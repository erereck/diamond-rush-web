/**
 * Rebuild a locally checked-out S700 decompilation with an isolated trace hook.
 * The original Java sources and the emulator stay outside this repository.
 * Usage: node tools/trace-s700.ts <reference-s700> <jdk-bin> <freej2me.jar> <output-dir>
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [referenceArg,jdkArg,emulatorArg,outputArg]=process.argv.slice(2);
if(!referenceArg||!jdkArg||!emulatorArg||!outputArg){
  console.error('Usage: node tools/trace-s700.ts <reference-s700> <jdk-bin> <freej2me.jar> <output-dir>');
  process.exit(2);
}
const reference=resolve(referenceArg),jdk=resolve(jdkArg),emulator=resolve(emulatorArg),output=resolve(outputArg);
const source=join(reference,'src'),resources=join(reference,'res'),traceSource=join(output,'src'),classes=join(output,'classes');
mkdirSync(traceSource,{recursive:true});mkdirSync(classes,{recursive:true});
const sources=readdirSync(source).filter(name=>name.endsWith('.java'));
for(const name of sources)copyFileSync(join(source,name),join(traceSource,name));
const gamePath=join(traceSource,'cGame.java');
let game=readFileSync(gamePath,'utf8');
function replaceOnce(before:string,after:string){
  if(game.split(before).length!==2)throw new Error(`S700 source marker changed: ${before}`);
  game=game.replace(before,after);
}
replaceOnce('private void method_304() {',`private int traceTicks;
  private boolean traceStarted;
  private void method_304() {
    if (Boolean.getBoolean("diamond.trace")) {
      System.out.println("DRTRACE," + traceTicks + "," + currentWorld + "," + currentLevel + "," + playerXPos + "," + playerYPos + "," + field_232 + "," + field_197 + "," + collectedDiamonds + "," + collectedRedDiamonds + "," + playerLifeCount + "," + gameState);
      if (++traceTicks >= 300) System.exit(0);
    }
`);
replaceOnce('this.method_67();',`if (Boolean.getBoolean("diamond.trace") && gameState == 7) field_261 = true;
          if (Boolean.getBoolean("diamond.trace") && gameState == 30) { gameState = 4; this.openMenu(0); }
          if (Boolean.getBoolean("diamond.trace") && gameState == 4 && !traceStarted) {
            traceStarted = true;
            this.method_218();
          }
          this.method_67();`);
writeFileSync(gamePath,game);
const exe=(name:string)=>join(jdk,process.platform==='win32'?`${name}.exe`:name);
function run(file:string,args:string[],timeout=120000){
  const result=spawnSync(file,args,{cwd:output,encoding:'utf8',windowsHide:true,timeout,maxBuffer:16*1024*1024});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`${file} exited ${result.status}:\n${result.stderr}\n${result.stdout}`);
  return result;
}
run(exe('javac'),['--release','8','-cp',emulator,'-d',classes,...sources.map(name=>join(traceSource,name))]);
const manifest=join(output,'trace-manifest.mf');
writeFileSync(manifest,'Manifest-Version: 1.0\nMIDlet-Name: Diamond Rush\nMIDlet-Version: 1.2.0\nMIDlet-Vendor: Gameloft SA\nMIDlet-1: Diamond Rush, /icon.png, GloftDIRU\nMicroEdition-Profile: MIDP-2.0\nMicroEdition-Configuration: CLDC-1.0\n\n');
const jar=join(output,'trace-s700.jar');
run(exe('jar'),['cfm',jar,manifest,'-C',classes,'.','-C',resources,'.']);
const jarUrl=process.platform==='win32'?`file:////${jar.replaceAll('\\','/')}`:pathToFileURL(jar).href;
const result=run(exe('java'),['-Ddiamond.trace=true','-Dfile.encoding=ISO_8859_1','-jar',emulator,jarUrl,'0','240','320','1','0','20','10']);
writeFileSync(join(output,'emulator.log'),result.stdout);
writeFileSync(join(output,'emulator-error.log'),result.stderr);
const rows=result.stdout.split(/\r?\n/).filter(line=>line.startsWith('DRTRACE,')).map(line=>line.slice(8));
if(rows.length!==300)throw new Error(`Expected 300 Java ticks, received ${rows.length}; inspect ${join(output,'emulator.log')}`);
const csv='tick,world,level,x,y,offset,direction,diamonds,redDiamonds,lives,gameState\n'+rows.join('\n')+'\n';
writeFileSync(join(output,'trace-s700.csv'),csv);
console.log(`Captured ${rows.length} Java S700 ticks: ${join(output,'trace-s700.csv')}`);
