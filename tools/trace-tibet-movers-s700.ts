import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const [referenceArg,jdkArg,outputArg]=process.argv.slice(2);
if(!referenceArg||!jdkArg||!outputArg)throw Error('Usage: trace-tibet-movers-s700.ts <reference> <jdk-bin> <output>');
const source=readFileSync(join(resolve(referenceArg),'src/cGame.java'),'utf8').replaceAll('\r\n','\n');
const output=resolve(outputArg),jdk=resolve(jdkArg);mkdirSync(output,{recursive:true});
function block(start:number){let end=source.indexOf('{',start)+1,depth=1;for(;depth;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end);}
function method(name:string){const match=new RegExp(`private (?:static )?(?:void|boolean) ${name}\\([^\\n]*\\) \\{`).exec(source);if(!match)throw Error(name);return block(match.index);}
const names=['method_308','method_311','method_305','method_306'],bodies=names.map(method);
type Case={op:'patch'|'slider';state:number;motion:number;above:number;aboveTile:number;below:number;hero:number};
const cases:Case[]=[];
for(const state of [0,3])for(const above of [-1,35,14])for(const aboveTile of [-1,30,80])for(const below of [-1,0,80])for(const hero of [0,1,2])
  cases.push({op:'patch',state,motion:0,above,aboveTile,below,hero});
for(const state of [0,3,16,19])for(const motion of [0,6,12])for(const below of [-1,0,80])for(const hero of [0,3])
  cases.push({op:'slider',state,motion,above:-1,aboveTile:48,below,hero});

const java=`class cGame {
 static int[][] field_332,field_333;static byte[][] field_334,field_335,field_336;static byte[] field_192;
 static int[][] field_500=null;
 int field_279=5,field_280=5,playerXPos=2,playerYPos=2,field_233=0,field_240=0,damage;
 boolean method_298(int x,int y){return playerXPos==x&&playerYPos==y;}
 void method_61(int amount,int kind,int side){damage+=amount;}
 void method_256(int id){}static void method_345(int x,int y){}
 ${bodies.join('\n')}
 static void run(int id,String op,int state,int motion,int above,int aboveTile,int below,int hero){
  field_332=new int[12][12];field_333=new int[12][12];field_334=new byte[12][12];field_335=new byte[12][12];field_336=new byte[12][12];field_192=new byte[3];
  for(int x=0;x<12;x++)for(int y=0;y<12;y++){field_332[x][y]=-1;field_334[x][y]=-1;}
  cGame g=new cGame();if(hero==1){g.playerXPos=4;g.playerYPos=5;}if(hero==2){g.playerXPos=6;g.playerYPos=5;}
  if(hero==3){g.playerXPos=5;g.playerYPos=6;}
  field_334[5][4]=(byte)aboveTile;field_334[5][5]=(byte)(op.equals("patch")?47:48);field_334[5][6]=(byte)below;
  field_332[5][4]=above;field_333[5][5]=state;field_335[5][5]=(byte)motion;
  if(op.equals("slider"))field_333[5][4]=8;
  if(op.equals("patch"))g.method_311();else g.method_306((byte)48);
  String s=""+id+","+g.damage;
  for(int y=4;y<=6;y++)s+=","+field_334[5][y]+","+(field_334[5][y]<0?0:field_333[5][y])+","+(field_334[5][y]<0?0:field_335[5][y])+","+(field_332[5][y]&255);
  System.out.println(s);
 }
 public static void main(String[] args){${cases.map((c,i)=>`run(${i},"${c.op}",${c.state},${c.motion},${c.above},${c.aboveTile},${c.below},${c.hero});`).join('\n')}}
}`;
writeFileSync(join(output,'cGame.java'),java);
function run(binary:string,args:string[]){const result=spawnSync(join(jdk,binary+(process.platform==='win32'?'.exe':'')),args,{cwd:output,encoding:'utf8',windowsHide:true,timeout:30000});if(result.error)throw result.error;if(result.status)throw Error(result.stderr);return result.stdout;}
run('javac',['--release','8','cGame.java']);
const rows=run('java',['-cp',output,'cGame']).trim().split(/\r?\n/).map(row=>row.split(',').map(Number));
writeFileSync(join(output,'tibet-movers-s700.json'),JSON.stringify({reference:'5e05c42aa1aae3377790600eb6d27497101b79e7',scope:'isolated-source-methods',methods:names,sourceHash:createHash('sha256').update(source).digest('hex'),methodHash:createHash('sha256').update(bodies.join('\n')).digest('hex'),stubs:['water disabled','player overlap at tile center','audio/render invalidation omitted','linked slider span excluded from compared fields'],cases:cases.map((input,i)=>({input,expected:rows[i].slice(1)}))},null,2)+'\n');
console.log('Captured',cases.length,'Tibet weight and slider Java cases');
