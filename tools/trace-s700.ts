/**
 * Rebuild a locally checked-out S700 decompilation with an isolated trace hook.
 * The original Java sources and the emulator stay outside this repository.
 * Usage: node tools/trace-s700.ts <reference-s700> <jdk-bin> <freej2me.jar> <output-dir> [--auto-dialogue|--walk-chest|--open-chest|--rock-lesson|--checkpoint-lesson|--seal-scene] [--ticks=N]
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [referenceArg,jdkArg,emulatorArg,outputArg]=process.argv.slice(2);
if(!referenceArg||!jdkArg||!emulatorArg||!outputArg){
  console.error('Usage: node tools/trace-s700.ts <reference-s700> <jdk-bin> <freej2me.jar> <output-dir> [--auto-dialogue|--walk-chest|--open-chest|--rock-lesson|--checkpoint-lesson|--seal-scene] [--ticks=N]');
  process.exit(2);
}
const options=process.argv.slice(6),sealScene=options.includes('--seal-scene'),checkpointLesson=options.includes('--checkpoint-lesson'),rockLesson=options.includes('--rock-lesson')||checkpointLesson,openChest=options.includes('--open-chest')||rockLesson,walkChest=options.includes('--walk-chest')||openChest,autoDialogue=options.includes('--auto-dialogue')||walkChest||sealScene;
const ticksArg=options.find(arg=>arg.startsWith('--ticks='));
const tickLimit=ticksArg?Number(ticksArg.slice(8)):300;
if(!Number.isInteger(tickLimit)||tickLimit<21||tickLimit>2000||options.some(arg=>!['--auto-dialogue','--walk-chest','--open-chest','--rock-lesson','--checkpoint-lesson','--seal-scene'].includes(arg)&&!arg.startsWith('--ticks=')))throw new Error('Invalid trace options');
if(sealScene&&walkChest)throw new Error('The isolated seal scene cannot be combined with a continuous route');
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
  private int traceRouteIndex;
  private int traceRecoveryStage;
  private boolean traceCheckpointSeen;
  private final int[][] traceRoute = new int[][] {{9,4},{9,6},{16,6},{16,5},{20,5},{20,6},{27,6},{27,5},{30,5},{30,7},{31,7}${openChest?',{30,6},{28,6}':''}${rockLesson?',{30,6},{30,7},{31,7},{31,8},{33,8},{33,7},{37,7}':''}};
  private final int[][] traceCheckpointRoute = new int[][] {{40,7},{40,8},{42,8},{42,7},{46,7}};
  private final int[][] traceCells = new int[][] {{36,6},{36,7},{37,7},{38,5},{39,5},{39,6},{39,7},{40,5},{40,6},{40,7},{42,8},{43,7},{44,5},{44,6},{44,7},{45,5},{45,6},{45,7},{46,7},{48,5},{50,7},{51,5},{50,8},{58,8},{59,8},{60,8},{61,8},{62,8},{62,7},{61,7},{61,6},{61,5},{61,4},{60,4},{60,3},{61,3}};
  private void method_304() {
    if (Boolean.getBoolean("diamond.trace")) {
      if (${sealScene} && traceTicks == 21) {
        playerXPos = 57; playerYPos = 8; field_232 = 0; field_233 = 2; field_197 = 2;
        field_201 = field_203 = 1248; field_202 = field_204 = 24;
        this.method_211(1);
        this.method_299(28);
      }
      System.out.println("DRTRACE," + traceTicks + "," + currentWorld + "," + currentLevel + "," + playerXPos + "," + playerYPos + "," + field_232 + "," + field_197 + "," + collectedDiamonds + "," + collectedRedDiamonds + "," + playerLifeCount + "," + gameState);
      ASpriteInstance hero = field_323[0];
      int traceDemoId = -1;
      if (field_354 != null) for (int n = 0; n < field_355.length; n++) if (field_355[n] == field_354) traceDemoId = field_356[n];
      if (traceDemoId == 16) traceCheckpointSeen = true;
      System.out.println("DRSCENE," + traceTicks + "," + traceDemoId + "," + field_201 + "," + field_202 + "," + field_338 + "," + field_239 + "," + field_293 + "," + field_294 + "," + (field_354 == null ? -1 : field_354.field_48) + "," + (field_354 == null ? -1 : field_354.field_49) + "," + (field_354 == null ? -1 : field_354.field_52) + "," + (field_354 == null ? false : field_354.field_47) + "," + (field_354 == null ? -1 : field_354.field_50) + "," + (field_354 == null || field_354.field_45 == null || field_354.field_45[0] != 18 ? false : field_354.field_45[7] != 0));
      System.out.println("DRCHEST," + traceTicks + "," + hero._nCrtAnim + "," + hero._nCrtAFrame + "," + hero._nCrtTime + "," + field_210 + "," + field_211 + "," + field_213 + "," + field_334[28][6] + "," + (field_332[28][6] >> 8));
      if ((${rockLesson} && traceTicks >= 423) || (${sealScene} && traceTicks >= 21)) for (int n = 0; n < traceCells.length; n++) {
        int x = traceCells[n][0], y = traceCells[n][1];
        System.out.println("DRMAP," + traceTicks + "," + x + "," + y + "," + field_334[x][y] + "," + field_333[x][y] + "," + field_335[x][y] + "," + (field_332[x][y] & 255) + "," + (field_332[x][y] >> 8) + "," + field_336[x][y]);
      }
      if (field_354 != null && field_354.field_45 != null) {
        int opcode = field_354.field_45[0] & 255;
        int page = opcode == 2 ? (field_354.field_45[9] & 255) : (opcode == 27 ? (field_354.field_45[6] & 255) : -1);
        System.out.println("DRDEMO," + traceTicks + "," + field_354.field_43 + "," + opcode + "," + field_354.field_46 + "," + page + "," + field_354.field_47 + "," + field_201 + "," + field_202);
      }
      if (++traceTicks >= ${tickLimit}) System.exit(0);
    }
`);
replaceOnce('this.method_67();',`if (Boolean.getBoolean("diamond.trace") && gameState == 7) field_261 = true;
          if (${sealScene} && traceStarted && traceTicks > 21 && gameState != 1) {
            if ((playerXPos == 60 || playerXPos == 61) && playerYPos == 3 && field_354 == null) System.out.println("DRDONE,seal," + traceTicks);
            System.exit(0);
          }
          if (Boolean.getBoolean("diamond.trace") && gameState == 30) { gameState = 4; this.openMenu(0); }
          if (Boolean.getBoolean("diamond.trace") && gameState == 4 && !traceStarted) {
            traceStarted = true;
            this.method_218();
          }
          if (${autoDialogue} && !${sealScene} && gameState == 1 && traceTicks >= 21 && field_195 == 0 && field_354 == null && playerXPos < 6) {
            keysPressed = SKEY_NUM6;
            noKeysPressed = false;
          } else if (${autoDialogue} && playerXPos >= 6 && field_354 == null) {
            keysPressed = 0;
          }
          if (${walkChest} && gameState == 1 && traceTicks > 129 && field_354 == null && currentWorld == 0 && currentLevel == 13 && traceRecoveryStage == 0) {
            if (${openChest} && traceRouteIndex == 10 && traceTicks >= 297 && playerXPos == 30 && playerYPos == 7 && field_232 == 0) traceRouteIndex++;
            if (${rockLesson} && traceTicks >= 664 && traceRouteIndex == traceRoute.length - 1) traceRouteIndex++;
            while (traceRouteIndex < traceRoute.length && playerXPos == traceRoute[traceRouteIndex][0] &&
                   playerYPos == traceRoute[traceRouteIndex][1] && field_232 == 0) traceRouteIndex++;
            if (traceRouteIndex < traceRoute.length) {
              int targetX = traceRoute[traceRouteIndex][0], targetY = traceRoute[traceRouteIndex][1];
              keysPressed = playerXPos < targetX ? SKEY_NUM6 : (playerXPos > targetX ? SKEY_NUM4 :
                            (playerYPos < targetY ? SKEY_NUM8 : SKEY_NUM2));
              noKeysPressed = false;
            }
          }
          if (${checkpointLesson} && gameState == 1 && currentWorld == 0 && currentLevel == 13) {
            if (traceRecoveryStage == 0 && traceTicks >= 665 && field_354 == null) {
              traceRecoveryStage = 1;
              traceRouteIndex = 0;
              keysPressed = SKEY_STAR;
              noKeysPressed = false;
            } else if (traceRecoveryStage == 1 && field_354 == null && !field_338 && heroReadyForTrace()) {
              if (traceCheckpointSeen) {
                traceRecoveryStage = 2;
                keysPressed = SKEY_STAR;
                noKeysPressed = false;
              } else {
                while (traceRouteIndex < traceCheckpointRoute.length && playerXPos == traceCheckpointRoute[traceRouteIndex][0] && playerYPos == traceCheckpointRoute[traceRouteIndex][1] && field_232 == 0) traceRouteIndex++;
                if (traceRouteIndex < traceCheckpointRoute.length) {
                  int x = traceCheckpointRoute[traceRouteIndex][0], y = traceCheckpointRoute[traceRouteIndex][1];
                  keysPressed = playerXPos < x ? SKEY_NUM6 : playerXPos > x ? SKEY_NUM4 : playerYPos < y ? SKEY_NUM8 : SKEY_NUM2;
                  noKeysPressed = false;
                }
              }
            }
          }
          if (${autoDialogue} && field_354 != null && field_354.field_45 != null &&
              (field_354.field_45[0] == 0 || field_354.field_45[0] == 2 || field_354.field_45[0] == 27) && traceTicks > 0 && traceTicks % 20 == 0) {
            field_354.field_44 = 0L;
            field_354.method_21();
          }
          this.method_67();`);
replaceOnce('private int traceTicks;', 'private boolean heroReadyForTrace() { return field_323[0]._nCrtAnim != 19; }\n  private int traceTicks;');
writeFileSync(gamePath,game);
const exe=(name:string)=>join(jdk,process.platform==='win32'?`${name}.exe`:name);
function run(file:string,args:string[],timeout=120000){
  const result=spawnSync(file,args,{cwd:output,encoding:'utf8',windowsHide:true,timeout,maxBuffer:16*1024*1024});
  if(file===exe('java')){
    writeFileSync(join(output,'emulator.log'),result.stdout??'');
    writeFileSync(join(output,'emulator-error.log'),result.stderr??'');
  }
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
if(rows.length!==tickLimit&&!(sealScene&&result.stdout.includes(`DRDONE,seal,${rows.length}`)))throw new Error(`Expected ${tickLimit} Java ticks, received ${rows.length}; inspect ${join(output,'emulator.log')}`);
const csv='tick,world,level,x,y,offset,direction,diamonds,redDiamonds,lives,gameState\n'+rows.join('\n')+'\n';
writeFileSync(join(output,'trace-s700.csv'),csv);
const demoRows=result.stdout.split(/\r?\n/).filter(line=>line.startsWith('DRDEMO,')).map(line=>line.slice(7));
writeFileSync(join(output,'demo-s700.csv'),'tick,commandIndex,opcode,commandTick,page,portrait,cameraX,cameraY\n'+demoRows.join('\n')+'\n');
const chestRows=result.stdout.split(/\r?\n/).filter(line=>line.startsWith('DRCHEST,')).map(line=>line.slice(8));
writeFileSync(join(output,'chest-s700.csv'),'tick,animation,frame,time,itemSprite,itemFrame,reward,chestTile,chestFrame\n'+chestRows.join('\n')+'\n');
const mapRows=result.stdout.split(/\r?\n/).filter(line=>line.startsWith('DRMAP,')).map(line=>line.slice(6));
writeFileSync(join(output,'map-s700.csv'),'tick,x,y,tile,state,motion,object,parameter,active\n'+mapRows.join('\n')+'\n');
const sceneRows=result.stdout.split(/\r?\n/).filter(line=>line.startsWith('DRSCENE,')).map(line=>line.slice(8));
writeFileSync(join(output,'scene-s700.csv'),'tick,scriptId,cameraX,cameraY,returning,health,checkpointX,checkpointY,portraitX,portraitY,blinkFrame,portraitVisible,portraitFrame,flash\n'+sceneRows.join('\n')+'\n');
console.log(`Captured ${rows.length} Java S700 ticks: ${join(output,'trace-s700.csv')}`);
