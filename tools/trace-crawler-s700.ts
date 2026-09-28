/** Isolated Java method oracle; no emulator, drawing, water or full game scan. */
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const [referenceArg,jdkArg,outputArg]=process.argv.slice(2);
if(!referenceArg||!jdkArg||!outputArg)throw new Error('Usage: trace-crawler-s700.ts <reference-s700> <jdk-bin> <output-dir>');
const output=resolve(outputArg),jdk=resolve(jdkArg),source=readFileSync(join(resolve(referenceArg),'src/cGame.java'),'utf8').replaceAll('\r\n','\n');
mkdirSync(output,{recursive:true});
function method(name:string){
  const match=new RegExp(`(?:private|public) (?:static )?(?:void|boolean) ${name}\\([^\\n]*\\) \\{`).exec(source);
  if(!match)throw new Error(`Missing ${name}`);
  const start=match.index,brace=source.indexOf('{',start);let depth=1,end=brace+1;
  while(depth&&end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}
  if(depth)throw new Error('Unclosed method');return source.slice(start,end);
}
const methods=['method_331','method_310','method_298','method_345'],bodies=methods.map(method);
type Input={state:number;motion:number;frame:number;blocked:number[][];hero:boolean;gatePhase:number};
const cases:Input[]=[],dx=[0,0,1,0,-1],dy=[0,-1,0,1,0];
const add=(input:Partial<Input>)=>cases.push({state:0,motion:0,frame:1,blocked:[],hero:false,gatePhase:-1,...input});
for(const reverse of [false,true])for(let direction=1;direction<=4;direction++)for(let mask=0;mask<8;mask++)for(const motion of [0,3]){
  const side=[0,reverse?4:2,reverse?1:3,reverse?2:4,reverse?3:1][direction];
  const positions=[[dx[direction],dy[direction]],[dx[side],dy[side]],[dx[side]-dx[direction],dy[side]-dy[direction]]];
  add({state:direction|(reverse?16:0),motion,blocked:positions.filter((_,i)=>mask&(1<<i))});
}
for(const reverse of [0,16])for(let mask=0;mask<8;mask++)add({state:reverse,blocked:[[-1,0],[1,0],[0,1]].filter((_,i)=>mask&(1<<i))});
for(const phase of [1,2,3,4])for(const frame of [0,1,2,3])add({state:phase<<8,frame});
for(let direction=1;direction<=4;direction++)for(const motion of [8,18])add({state:direction,motion});
add({hero:true,state:2,motion:8});add({hero:true,state:256});
for(const gatePhase of [0,1,2,3])add({state:2,gatePhase,blocked:[[-1,1],[0,1]]});
const calls=cases.map((c,i)=>`run(${i},${c.state},${c.motion},${c.frame},${c.hero},${c.gatePhase},new int[][]{${c.blocked.map(([x,y])=>`{${x},${y}}`).join(',')}});`).join('\n');
const java=`class cGame {
 static int[][] field_332,field_333,field_500;static byte[][] field_334,field_335,field_336;static int frameCounter;
 int field_279=3,field_280=3,playerXPos=1,playerYPos=1,damage;
 void method_61(int amount,int animation,int direction){damage+=amount;}
 ${bodies.join('\n')}
 static void run(int id,int state,int motion,int frame,boolean hero,int gatePhase,int[][] blocked){
  field_332=new int[7][7];field_333=new int[7][7];field_334=new byte[7][7];field_335=new byte[7][7];field_336=new byte[7][7];field_500=null;frameCounter=frame;
  for(int x=0;x<7;x++)for(int y=0;y<7;y++){field_332[x][y]=-1;field_334[x][y]=(byte)(x==0||y==0||x==6||y==6?80:-1);}
  for(int[] p:blocked)field_334[3+p[0]][3+p[1]]=80;
  if(gatePhase>=0)field_332[4][3]=gatePhase<<12|7;
  field_334[3][3]=11;field_333[3][3]=state;field_335[3][3]=(byte)motion;
  cGame game=new cGame();if(hero){game.playerXPos=3;game.playerYPos=3;}game.method_331();
  String row=id+","+game.damage;for(int y=2;y<=4;y++)for(int x=2;x<=4;x++)row+=","+field_334[x][y]+","+field_333[x][y]+","+field_335[x][y];System.out.println(row);
 }
 public static void main(String[] args){${calls}}
}`;
writeFileSync(join(output,'cGame.java'),java);
function run(exe:string,args:string[]){const r=spawnSync(join(jdk,`${exe}${process.platform==='win32'?'.exe':''}`),args,{cwd:output,encoding:'utf8',windowsHide:true,timeout:30000});if(r.error)throw r.error;if(r.status!==0)throw new Error(r.stderr);return r.stdout;}
run('javac',['--release','8','cGame.java']);
const rows=run('java',['-cp',output,'cGame']).trim().split(/\r?\n/).map(row=>row.split(',').map(Number));
if(rows.length!==cases.length)throw new Error('Wrong Java case count');
const data={reference:'5e05c42aa1aae3377790600eb6d27497101b79e7',scope:'isolated-source-methods',methods,
 sourceHash:createHash('sha256').update(source).digest('hex'),methodHash:createHash('sha256').update(bodies.join('\n')).digest('hex'),
 stubs:['damage callback (requested amount recorded)'],limitations:['water disabled','single method invocation; not the complete scan','no rendering or emulator'],
 cases:cases.map((input,i)=>{const [id,damage,...cells]=rows[i];if(id!==i)throw new Error('Case order changed');return {input,expected:{damage,cells}};})};
writeFileSync(join(output,'crawler-s700.json'),JSON.stringify(data,null,2)+'\n');
console.log(`Captured ${cases.length} Java cases`);
