import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const [refArg,jdkArg,outArg]=process.argv.slice(2);if(!refArg||!jdkArg||!outArg)throw Error('Usage: trace-mechanisms-s700.ts <reference> <jdk-bin> <output>');
const source=readFileSync(join(resolve(refArg),'src/cGame.java'),'utf8').replaceAll('\r\n','\n'),out=resolve(outArg),jdk=resolve(jdkArg);mkdirSync(out,{recursive:true});
function block(start:number){let end=source.indexOf('{',start)+1,depth=1;for(;depth;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end);}
function method(name:string){const m=new RegExp(`(?:private|public) (?:static )?(?:void|boolean) ${name}\\([^\\n]*\\) \\{`).exec(source);if(!m)throw Error(name);return block(m.index);}
const names=['method_318','method_330','method_317','method_232','method_235','method_298'],bodies=names.map(method);
const bridge=block(source.indexOf('if (this.field_311 != 0 && (frameCounter >> 1 & 1) == 0)'));
const cases:any[]=[];
for(const state of [0,1])for(const above of [-1,11,19])for(const hero of [false,true])cases.push({op:'torch',state,above,hero});
for(let state=0;state<=10;state++)cases.push({op:'rubble',state});
for(let state=0;state<=12;state++)for(const weapon of [0,3])cases.push({op:'blast',state,weapon});
for(const weapon of [0,1,2,3])for(const position of [0,5,9])for(const direction of [-1,0,1])for(const object of [-1,15,16])cases.push({op:'switch',weapon,position,direction,object});
for(const [position,direction] of [[0,1],[4,1],[5,1],[8,1],[9,-1],[6,-1],[5,-1],[1,-1]])for(const tick of [0,1,2,3])cases.push({op:'bridge',position,direction,tick});
const java=`class ASprite{} class cSoundEngine {static int SOUND_SFX_SWITCH=0,SOUND_SFX_MINE=1,SOUND_SFX_BREAK=2;}
class cGame {
 static int[][] field_332,field_333;static byte[][] field_334,field_335,field_336;static byte[] field_192=new byte[3];static ASprite[] field_320=new ASprite[8];static int frameCounter;
 int field_279=5,field_280=5,playerXPos=2,playerYPos=2,field_487,field_311,field_310,crtLevelWidth=12,crtLevelHeight=12,damage,solved,effects;boolean switched;
 void method_61(int a,int b,int c){damage+=a;}void method_327(){solved++;}void method_433(int a){}void method_397(int x,int y){}
 void method_335(int x,int y){effects++;}void method_148(int x,int y){}static void method_345(int x,int y){}static int method_313(ASprite s,int a){return 12;}
 ${bodies.join('\n')}
 void bridge(){${bridge}}
 static void run(int id,String op,int state,int above,boolean hero,int weapon,int position,int direction,int object,int tick){
  field_332=new int[12][12];field_333=new int[12][12];field_334=new byte[12][12];field_335=new byte[12][12];field_336=new byte[12][12];
  for(int x=0;x<12;x++)for(int y=0;y<12;y++){field_332[x][y]=-1;field_334[x][y]=-1;}
  cGame g=new cGame();g.field_487=weapon;g.field_310=position;g.field_311=direction;frameCounter=tick;
  field_332[2][2]=object;field_333[5][5]=state;
  if(op.equals("torch")){field_334[5][5]=36;field_334[5][4]=(byte)above;if(hero){g.playerXPos=5;g.playerYPos=4;}g.method_318();}
  if(op.equals("rubble")){field_334[5][5]=37;g.method_330();}
  if(op.equals("blast")){int[] kinds={8,10,30,37,54,16,19,43,49};for(int n=0;n<9;n++)field_334[4+n%3][4+n/3]=(byte)kinds[n];g.playerXPos=6;g.playerYPos=5;g.method_317();}
  if(op.equals("switch"))g.switched=g.method_232();
  if(op.equals("bridge")){field_332[4][4]=15;field_334[4][4]=19;field_332[5][4]=16;field_334[5][4]=0;field_334[6][4]=34;field_334[4][5]=35;g.bridge();}
  String s=id+","+g.field_310+","+g.field_311+","+g.damage+","+g.solved+","+g.effects+","+(g.switched?1:0);
  for(int y=4;y<=6;y++)for(int x=4;x<=6;x++)s+=","+field_334[x][y]+","+field_333[x][y]+","+(field_332[x][y]&255);
  System.out.println(s);
 }
 public static void main(String[] args){${cases.map((c,i)=>`run(${i},"${c.op}",${c.state??0},${c.above??-1},${c.hero??false},${c.weapon??0},${c.position??0},${c.direction??0},${c.object??-1},${c.tick??0});`).join('\n')}}
}`;
writeFileSync(join(out,'cGame.java'),java);
function run(name:string,args:string[]){const r=spawnSync(join(jdk,name+(process.platform==='win32'?'.exe':'')),args,{cwd:out,encoding:'utf8',windowsHide:true,timeout:30000});if(r.error)throw r.error;if(r.status)throw Error(r.stderr);return r.stdout;}
run('javac',['--release','8','cGame.java']);const rows=run('java',['-cp',out,'cGame']).trim().split(/\r?\n/).map(r=>r.split(',').map(Number));
writeFileSync(join(out,'mechanisms-s700.json'),JSON.stringify({reference:'5e05c42aa1aae3377790600eb6d27497101b79e7',scope:'isolated-source-methods',methods:names,bridgeBlock:'method_236 switch animation block',sourceHash:createHash('sha256').update(source).digest('hex'),methodHash:createHash('sha256').update(bodies.join('\n')+bridge).digest('hex'),stubs:['audio','render invalidation','water flood callback','riddle solved callback','destruction callback','blast duration from gen0.f/3 = 12','requested damage callback'],limitations:['no full scan, gravity or mine drop','no water, slider 48 branch or emulator'],cases:cases.map((input,i)=>({input,expected:rows[i].slice(1)}))},null,2)+'\n');
console.log('Captured',cases.length,'Java cases');
