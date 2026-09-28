/** Method-level Java oracle, not a whole-game/emulator trace.
 * node tools/trace-pressure-s700.ts <reference-s700> <jdk-bin> <output-dir>
 * Original gate/plate methods are copied verbatim into an isolated harness.
 * Rendering invalidation, sound and damage callbacks are recorded/no-ops;
 * the original damage handler, complete map scan and sprite drawing do not run.
 */
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const [referenceArg,jdkArg,outputArg]=process.argv.slice(2);
if(!referenceArg||!jdkArg||!outputArg)throw new Error('Usage: trace-pressure-s700.ts <reference-s700> <jdk-bin> <output-dir>');
const output=resolve(outputArg),jdk=resolve(jdkArg),source=readFileSync(join(resolve(referenceArg),'src/cGame.java'),'utf8').replaceAll('\r\n','\n');
mkdirSync(output,{recursive:true});
function method(name:string){
  const pattern=new RegExp(`(?:private|public) (?:static )?(?:void|boolean) ${name}\\([^\\n]*\\) \\{`),match=pattern.exec(source);
  if(!match)throw new Error(`Missing source method ${name}`);
  const start=match.index,brace=source.indexOf('{',start);let depth=1,end=brace+1;
  while(depth&&end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}
  if(depth)throw new Error(`Unclosed source method ${name}`);
  return source.slice(start,end);
}
const methods=['method_195','method_256','method_258','method_259','method_297','method_298','method_316','method_340','method_344'];
const bodies=methods.map(method);
const motionStart=source.indexOf('if (var11 == 3 && (field_332[var1][var2] & 255) == 6 && var3 <= 12) {');
const motionEnd=source.indexOf('if (var3 == 0 || var3 == 12)',motionStart);
if(motionStart<0||motionEnd<0)throw new Error('Falling plate source branch changed');
const motionBody=source.slice(motionStart,motionEnd).trim();
type PlateCase={op:'plate';tile:number;motion:number;heroX:number;heroY:number;offset:number;direction:number;phase:number;count:number;gateTile:number;frame:number};
type GateCase={op:'gate';phase:number;count:number;frame:number};
type MotionCase={op:'fall-motion';motion:number;direction:number;frame:number};
type Case=PlateCase|GateCase|MotionCase;
const cases:Case[]=[];
const plate=(changes:Partial<PlateCase>={})=>cases.push({op:'plate',tile:-1,motion:0,heroX:1,heroY:1,offset:0,direction:2,phase:0,count:1,gateTile:-1,frame:1,...changes});
for(const tile of [-1,0,1,8,9,47,48,10,19,43,45,46])for(const motion of [0,11,12,18])plate({tile,motion});
for(const offset of [0,6,11,12,18])plate({heroX:3,heroY:3,offset});
for(const heroX of [2,4])for(const direction of [1,2,3,4])for(const offset of [6,12,18])plate({heroX,heroY:3,offset,direction});
for(const phase of [0,1,2,3])for(const count of [1,2])for(const tile of [-1,0])plate({phase,count,tile});
for(const gateTile of [-1,0,1,8,9,19,32,43,45,46,49])plate({phase:3,gateTile});
plate({phase:3,heroX:6,heroY:3});
for(const phase of [0,1,2,3])for(const frame of [1,2,3,6])cases.push({op:'gate',phase,count:1,frame});
for(const motion of [1,11,12,18])for(const direction of [2,3])for(const frame of [0,1])cases.push({op:'fall-motion',motion,direction,frame});
const calls=cases.map((c,i)=>c.op==='plate'?`runPlate(${i},${c.tile},${c.motion},${c.heroX},${c.heroY},${c.offset},${c.direction},${c.phase},${c.count},${c.gateTile},${c.frame});`:
  c.op==='gate'?`runGate(${i},${c.phase},${c.count},${c.frame});`:`runMotion(${i},${c.motion},${c.direction},${c.frame});`).join('\n');
const java=`class cSoundEngine {static int SOUND_SFX_WORKING=0,SOUND_SFX_BOULDER=1,SOUND_SFX_DEATH=2;}
class cGame {
 static int[][] field_332,field_333;static byte[][] field_334,field_335,field_336;
 static byte[] field_447,field_448,recordData;static int frameCounter;
 int field_279=3,field_280=3,playerXPos,playerYPos,field_232,field_233,field_254,field_291;
 int processedTileX=3,processedTileY=3,field_214,field_215,field_289,field_290,crtLevelWidth=9,crtLevelHeight=6,damage;
 long field_241;
 void method_433(int id){} void method_147(int x,int y){} void method_335(int x,int y){}
 void method_61(int amount,int animation,int direction){damage+=amount;}
 ${bodies.join('\n')}
 static cGame setup(int phase,int count,int frame){
  field_332=new int[9][6];field_333=new int[9][6];field_334=new byte[9][6];field_335=new byte[9][6];field_336=new byte[9][6];
  for(int x=0;x<9;x++)for(int y=0;y<6;y++){field_332[x][y]=-1;field_334[x][y]=-1;}
  field_447=new byte[]{6};field_448=new byte[]{3};recordData=new byte[9];recordData[8]=4;frameCounter=frame;
  field_332[3][3]=6;field_332[6][3]=((count|(phase<<4))<<8)|7;return new cGame();
 }
 static void runPlate(int id,int tile,int motion,int hx,int hy,int offset,int direction,int phase,int count,int gateTile,int frame){
  cGame game=setup(phase,count,frame);field_334[3][3]=(byte)tile;field_335[3][3]=(byte)motion;field_334[6][3]=(byte)gateTile;
  game.playerXPos=hx;game.playerYPos=hy;game.field_232=offset;game.field_233=direction;game.field_291=direction;
  game.method_316();game.method_195();int door=field_332[6][3]>>8;
  System.out.println(id+","+((door&240)>>4)+","+(door&15)+","+field_334[6][3]+","+game.damage+","+(game.field_289-24));
 }
 static void runGate(int id,int phase,int count,int frame){
  cGame game=setup(phase,count,frame);game.field_279=6;game.method_340();int door=field_332[6][3]>>8;
  System.out.println(id+","+((door&240)>>4)+","+(door&15));
 }
 static void runMotion(int id,int motion,int direction,int frame){
  cGame game=setup(0,1,frame);byte var3=(byte)motion;int var11=direction,var1=3,var2=3;
  ${motionBody}
  System.out.println(id+","+var3);
 }
 public static void main(String[] args){${calls}}
}
`;
writeFileSync(join(output,'cGame.java'),java);
function run(exe:string,args:string[]){const result=spawnSync(join(jdk,`${exe}${process.platform==='win32'?'.exe':''}`),args,{cwd:output,encoding:'utf8',windowsHide:true,timeout:30000});
 if(result.error)throw result.error;if(result.status!==0)throw new Error(result.stderr);return result.stdout;}
run('javac',['--release','8','cGame.java']);
const rows=run('java',['-cp',output,'cGame']).trim().split(/\r?\n/).map(row=>row.split(',').map(Number));
if(rows.length!==cases.length)throw new Error('Java case count changed');
const data={reference:'5e05c42aa1aae3377790600eb6d27497101b79e7',scope:'isolated-source-methods',
 methods,sourceHashEncoding:'utf8-lf',sourceHash:createHash('sha256').update(source).digest('hex'),
 methodHash:createHash('sha256').update(bodies.join('\n')+'\n'+motionBody).digest('hex'),
 stubs:['sound','render invalidation','object destruction effect','damage callback (requested amount recorded)'],
 cases:cases.map((input,i)=>{const [id,...values]=rows[i];if(id!==i)throw new Error('Java case order changed');
  const expected=input.op==='plate'?{phase:values[0],count:values[1],gateTile:values[2],damage:values[3],depression:values[4]}:
   input.op==='gate'?{phase:values[0],count:values[1]}:{motion:values[0]};return {input,expected};})};
writeFileSync(join(output,'pressure-s700.json'),JSON.stringify(data,null,2)+'\n');
console.log(`Captured ${cases.length} source-method Java cases in ${join(output,'pressure-s700.json')}`);
