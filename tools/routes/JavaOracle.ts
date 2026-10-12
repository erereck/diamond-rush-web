/**
 * Headless S700 reference ("Java oracle"): the pinned decompilation recompiled against the
 * J2ME stubs in tools/oracle, driven one frame per control. Building copies the reference
 * sources to a work directory and applies the harness patches in ReferencePatches.ts.
 * Nothing from the reference is stored in this repository.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ControlRun } from './CoreRoute.ts';
import type { StageStart } from '../../src/core/Simulation.ts';
import { patchReferenceSources } from './ReferencePatches.ts';

const toolRoot=fileURLToPath(new URL('../oracle/',import.meta.url));
export interface OraclePaths {reference:string;jdkBin:string;work:string}
export function defaultOraclePaths():OraclePaths{
  const repo=fileURLToPath(new URL('../../',import.meta.url));
  return {
    reference:resolve(process.env.DIAMOND_REFERENCE??join(repo,'../../work/reference-s700')),
    jdkBin:process.env.DIAMOND_JDK_BIN??'',
    work:resolve(process.env.DIAMOND_ORACLE_WORK??join(repo,'../../work/oracle-s700')),
  };
}
const exe=(paths:OraclePaths,name:string)=>paths.jdkBin?join(paths.jdkBin,process.platform==='win32'?`${name}.exe`:name):name;
function javaFiles(dir:string):string[]{
  return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?javaFiles(join(dir,e.name)):e.name.endsWith('.java')?[join(dir,e.name)]:[]);
}
/** Read the pinned reference sources as text (ISO-8859-1, as javac reads them), with LF line ends so the source hash does not depend on the checkout. */
export function readReferenceSources(reference:string){
  return new Map(readdirSync(join(reference,'src')).filter(n=>n.endsWith('.java')).map(n=>[n,readFileSync(join(reference,'src',n),'latin1').replace(/\r\n/g,'\n')] as [string,string]));
}
/** Bump when the driver's input or output format changes. */
const ORACLE_FORMAT='oracle-2';
/**
 * Hash of everything the compiled oracle is made of: the driver, the J2ME stubs and the reference sources
 * after the JVM patches. A build records it; a changed oracle is rebuilt and invalidates cached JVM results.
 */
export function oracleDigest(paths=defaultOraclePaths()){
  const hash=createHash('sha256').update(ORACLE_FORMAT);
  for(const file of [...['Oracle.java','OracleIO.java','DeviceClock.java'].map(n=>join(toolRoot,n)),...javaFiles(join(toolRoot,'stubs')).sort()])
    hash.update(file.slice(toolRoot.length).replaceAll('\\','/')).update(readFileSync(file,'latin1').replace(/\r\n/g,'\n'));
  const {files}=patchReferenceSources(readReferenceSources(paths.reference),'jvm');
  for(const name of [...files.keys()].sort())hash.update(name).update(files.get(name)!);
  return hash.digest('hex').slice(0,16);
}
/** Copy, patch and compile the decompilation with the stub APIs and the driver. */
export function buildJavaOracle(paths=defaultOraclePaths()){
  const src=join(paths.work,'src'),classes=join(paths.work,'classes');
  for(const dir of [src,classes]){rmSync(dir,{recursive:true,force:true});mkdirSync(dir,{recursive:true});}
  const {files,log}=patchReferenceSources(readReferenceSources(paths.reference),'jvm');
  for(const [name,text] of files)writeFileSync(join(src,name),text,'latin1');
  for(const name of ['Oracle.java','OracleIO.java','DeviceClock.java'])copyFileSync(join(toolRoot,name),join(src,name));
  const result=spawnSync(exe(paths,'javac'),['-nowarn','-encoding','ISO-8859-1','-d',classes,...javaFiles(join(toolRoot,'stubs')),...readdirSync(src).map(n=>join(src,n))],{encoding:'utf8'});
  if(result.error)throw result.error;
  if(result.status)throw new Error(`javac failed:\n${result.stderr}`);
  writeFileSync(join(paths.work,'patches.txt'),log.join('\n')+'\n');
  writeFileSync(join(paths.work,'oracle.digest'),oracleDigest(paths));
  return log;
}
export interface OracleRow {
  tick:number;gameState:number;x:number;y:number;offset:number;direction:number;animation:number;
  health:number;lives:number;diamonds:number;redDiamonds:number;goldKeys:number;silverKeys:number;tilesHash:string;objectsHash:string;
}
export interface OracleMap {tiles:number[];objects:number[];objectParameters:number[];state:number[];motion:number[];active:number[]}
export interface OracleRun {loaded:{world:number;level:number;width:number;height:number};rows:OracleRow[];maps:Map<number,OracleMap>;states:string[];end:OracleRow|null;error:string|null}
export interface OracleRequest {world:number;level:number;initial:StageStart;diving?:boolean;controls:ControlRun[];mapTicks?:number[]}
let runCounter=0;
/** The oracle directory already checked against its sources in this process. */
let checkedDigest='';
export function runJavaOracle(request:OracleRequest,paths=defaultOraclePaths()):OracleRun{
  if(checkedDigest!==paths.work){
    // Rebuild when the compiled oracle is missing or was built from other sources.
    const stamp=join(paths.work,'oracle.digest');
    if(!existsSync(join(paths.work,'classes','Oracle.class'))||!existsSync(stamp)||readFileSync(stamp,'utf8')!==oracleDigest(paths))buildJavaOracle(paths);
    checkedDigest=paths.work;
  }
  const i=request.initial;
  const header=[request.world,request.level,i.lives,i.diamonds,i.redDiamonds,i.maxHealth??4,i.weaponTier??0,request.diving?1:0,request.mapTicks?.length?request.mapTicks.join(','):'-'].join(' ');
  const input=join(paths.work,`input-${process.pid}-${runCounter++}.txt`);
  writeFileSync(input,[header,...request.controls.map(r=>`${r.ticks} ${r.direction} ${r.action?1:0} ${r.reset?1:0}`)].join('\n')+'\n');
  const sep=process.platform==='win32'?';':':';
  const result=spawnSync(exe(paths,'java'),['-cp',[join(paths.work,'classes'),join(paths.reference,'res')].join(sep),'Oracle',input],{encoding:'utf8',maxBuffer:512*1024*1024});
  rmSync(input,{force:true});
  if(result.error)throw result.error;
  const run:OracleRun={loaded:{world:-1,level:-1,width:0,height:0},rows:[],maps:new Map(),states:[],end:null,error:null};
  const parseRow=(fields:string[]):OracleRow=>{
    const n=fields.slice(0,13).map(Number);
    return {tick:n[0],gameState:n[1],x:n[2],y:n[3],offset:n[4],direction:n[5],animation:n[6],health:n[7],lives:n[8],diamonds:n[9],redDiamonds:n[10],goldKeys:n[11],silverKeys:n[12],tilesHash:fields[13],objectsHash:fields[14]};
  };
  for(const line of result.stdout.split(/\r?\n/)){
    if(!line)continue;
    if(/^\d/.test(line))run.rows.push(parseRow(line.split(',')));
    else if(line.startsWith('LOADED,')){const [,w,l,width,height]=line.split(',').map(Number);run.loaded={world:w,level:l,width,height};}
    else if(line.startsWith('MAP,')){
      const [,tick,...rest]=line.split(',');const planes=rest.join(',').split('|').map(p=>p.split(' ').map(Number));
      run.maps.set(Number(tick),{tiles:planes[0],objects:planes[1],objectParameters:planes[2],state:planes[3],motion:planes[4],active:planes[5]});
    }
    else if(line.startsWith('STATE,'))run.states.push(line.slice(6));
    else if(line.startsWith('END,'))run.end=parseRow(line.slice(4).split(','));
    else if(line.startsWith('ERROR,'))run.error=line.slice(6);
  }
  if(result.status&&!run.error)run.error=`java exited ${result.status}: ${result.stderr.slice(0,500)}`;
  return run;
}
/** Same FNV-1a as Oracle.hashTiles/hashObjects: unsigned bytes, row-major. */
export function planeHash(values:ArrayLike<number>){
  let hash=0x811c9dc5;
  for(let i=0;i<values.length;i++){hash^=values[i]&255;hash=Math.imul(hash,0x01000193);}
  return (hash>>>0).toString(16);
}
