/** Extracted Java methods, with explicit UI/audio callbacks; not a complete Java game. */
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const [referenceArg,jdkArg,outputArg]=process.argv.slice(2);
if(!referenceArg||!jdkArg||!outputArg)throw new Error('Usage: trace-riddles-s700.ts <reference-s700> <jdk-bin> <output-dir>');
const output=resolve(outputArg),jdk=resolve(jdkArg),source=readFileSync(join(resolve(referenceArg),'src/cGame.java'),'utf8').replaceAll('\r\n','\n');
mkdirSync(output,{recursive:true});
function method(name:string){
 const match=new RegExp(`(?:private|public) (?:static )?(?:void|boolean) ${name}\\([^\\n]*\\) \\{`).exec(source);
 if(!match)throw new Error(`Missing ${name}`);
 const start=match.index,brace=source.indexOf('{',start);let depth=1,end=brace+1;
 while(depth&&end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}
 if(depth)throw new Error('Unclosed method');return source.slice(start,end);
}
const methods=['method_233','method_335','method_327','method_319','method_298','method_300','method_301','method_302','method_303','method_257','method_258'],bodies=methods.map(method);
const cases:{op:string;state?:number;kind?:number;phase?:number;direction?:number;offset?:number;extra?:number;count?:number;mode?:number;health?:number}[]=[];
for(const kind of [19,43])for(const health of [0,32768,65536])for(const direction of [1,2,3,4])for(const stun of [0,120])cases.push({op:'hit',kind,state:health|direction|stun});
for(const phase of [0,1,2,3])for(const direction of [1,2,3,4])for(const offset of [0,6,7])cases.push({op:'trigger',phase,direction,offset,extra:0});
for(const extra of [1,2])for(const phase of [0,3])cases.push({op:'target',phase,extra});
for(const phase of [0,1,2,3])for(const count of [0,1,2])for(const mode of [0,3])cases.push({op:'destroy',phase,count,mode,health:mode?1:0});
cases.push({op:'timeline',phase:3,direction:4,offset:0,extra:0});
const calls=cases.map((c,i)=>`run(${i},"${c.op}",${c.kind??43},${c.state??0},${c.phase??0},${c.direction??4},${c.offset??0},${c.extra??0},${c.count??2},${c.mode??0},${c.health??0});`).join('\n');
const java=`class cSoundEngine {static int SOUND_SFX_WORKING=0,SOUND_SFX_BOULDER=1,SOUND_SFX_DEATH=2,SOUND_SFX_RIDDLE=3;}
class ASprite {void getStringHeight(String text){}}
class cGame {
 static int[][] field_332,field_333;static byte[][] field_334,field_335,field_336;
 static byte[] field_344,field_343,recordData,field_325={0,0,-1,0,1,0,0,0,0,1,0,-1,0};
 static int field_345,keysPressed;static boolean field_467;static String[] menuText;static ASprite[] field_320;
 int field_279=12,field_280=8,playerXPos=12,playerYPos=8,field_232,field_233,field_196,field_194,field_254;
 int field_342,field_341,field_466,field_464,field_465,field_339,field_340,field_201,field_202,field_203,field_204;
 int field_174,field_182,field_463,crtLevelWidth=20,crtLevelHeight=18,damage;long field_241;String field_462;
 void method_433(int id){}void method_147(int x,int y){}void method_297(int x,int y,int dir,int a,int b){}
 void method_61(int amount,int animation,int direction){damage+=amount;}
 ${bodies.join('\n')}
 static cGame setup(int phase,int extra,int count,int mode,int health){
  field_332=new int[20][18];field_333=new int[20][18];field_334=new byte[20][18];field_335=new byte[20][18];field_336=new byte[20][18];
  for(int x=0;x<20;x++)for(int y=0;y<18;y++){field_332[x][y]=-1;field_334[x][y]=-1;}
  field_332[4][8]=phase<<12|7;field_332[4][9]=17;field_332[13][8]=phase<<12|7;field_332[13][9]=17;field_332[12][8]=26;
  if(extra>=1){field_332[14][8]=255<<8|33;field_332[14][9]=17;}
  if(extra>=2){field_334[17][10]=18;field_332[17][10]=17;}
  field_344=new byte[]{(byte)count};field_343=new byte[]{57};field_345=-1;field_467=false;keysPressed=0;
  recordData=new byte[9];recordData[8]=4;menuText=new String[96];for(int i=0;i<96;i++)menuText[i]=""+i;
  field_320=new ASprite[42];field_320[41]=new ASprite();
  cGame g=new cGame();g.field_174=mode;g.field_182=health;return g;
 }
 String summary(){return field_345+","+field_344[0]+","+((field_332[4][8]>>12)&15)+","+((field_332[13][8]>>12)&15)+","+(field_332[12][8]&255)+","+field_342+","+field_466+","+field_464+","+field_465+","+field_201+","+field_202+","+(field_462==null?-1:Integer.parseInt(field_462))+","+field_463+","+(field_467?1:0)+","+(field_332[14][8]>>8);}
 static void run(int id,String op,int kind,int state,int phase,int direction,int offset,int extra,int count,int mode,int health){
  cGame g=setup(phase,extra,count,mode,health);g.field_233=direction;g.field_232=offset;
  if(op.equals("hit")){field_334[6][6]=(byte)kind;field_333[6][6]=state;g.method_233(kind,6,6);System.out.println(id+","+field_334[6][6]+","+field_333[6][6]+","+(field_332[6][6]>=0&&(field_332[6][6]&268435456)!=0?1:0));return;}
  if(op.equals("trigger"))g.method_319();
  if(op.equals("target"))g.method_302(0);
  if(op.equals("destroy")){field_345=0;g.method_327();}
  if(op.equals("timeline")){
   g.method_319();for(int n=0;n<180;n++){if(g.field_463>0&&--g.field_463==0)g.field_462=null;if(g.field_342!=0)g.method_301();System.out.println(id+","+g.summary());}return;
  }
  System.out.println(id+","+g.summary());
 }
 public static void main(String[] args){${calls}}
}`;
writeFileSync(join(output,'cGame.java'),java);
function run(exe:string,args:string[]){const r=spawnSync(join(jdk,`${exe}${process.platform==='win32'?'.exe':''}`),args,{cwd:output,encoding:'utf8',windowsHide:true,timeout:30000});if(r.error)throw r.error;if(r.status!==0)throw new Error(r.stderr);return r.stdout;}
run('javac',['--release','8','cGame.java']);
const rows=run('java',['-cp',output,'cGame']).trim().split(/\r?\n/).map(row=>row.split(',').map(Number));
const data={reference:'5e05c42aa1aae3377790600eb6d27497101b79e7',scope:'isolated-source-methods',methods,
 sourceHash:createHash('sha256').update(source).digest('hex'),methodHash:createHash('sha256').update(bodies.join('\n')).digest('hex'),
 stubs:['audio','render invalidation','door debris','requested damage callback','font string measurement'],
 limitations:['initialization assembled from method_296, not executed','no full scan or rendering','no emulator'],
 cases:cases.map((input,i)=>({input,expected:rows.filter(row=>row[0]===i).map(row=>row.slice(1))}))};
if(data.cases.some(c=>!c.expected.length))throw new Error('Missing Java case');
writeFileSync(join(output,'riddles-s700.json'),JSON.stringify(data,null,2)+'\n');
console.log(`Captured ${cases.length} cases, ${rows.length} Java snapshots`);
