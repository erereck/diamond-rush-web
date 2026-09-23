import { BinaryReader } from '../assets/BinaryReader.ts';

export interface DemoCommand { opcode:number; args:number[]; text?:string; children?:DemoCommand[] }
export interface DemoScript { id:number; resources:number[]; commands:DemoCommand[] }

/** Decodes the commands interpreted by DemoInterpreter.method_31 in the S700 build. */
export function parseDemoScripts(data:Uint8Array):Map<number,DemoScript>{
  const reader=new BinaryReader(data,'demo.f/0'),count=reader.u16(),scripts=new Map<number,DemoScript>();
  for(let i=0;i<count;i++){
    const id=reader.u16(),commandCount=reader.u16(),size=reader.u32();
    const script=new BinaryReader(reader.bytes(size),`demo.f script ${id}`);
    const resourceCount=script.u16(),resources=Array.from({length:resourceCount},()=>script.u16());
    const commands=Array.from({length:commandCount},()=>readCommand(script));
    script.end();
    if(scripts.has(id))reader.fail(`duplicate script ${id}`);
    scripts.set(id,{id,resources,commands});
  }
  reader.end();return scripts;
}

function readCommand(r:BinaryReader):DemoCommand{
  const opcode=r.u8(),args:number[]=[];
  if(opcode===0){const count=r.u8();return {opcode,args,children:Array.from({length:count},()=>readCommand(r))};}
  if(opcode===1){args.push(r.i16(),r.i16(),r.u16());}
  else if(opcode===2){args.push(r.u8(),r.i16());const size=r.u16();return {opcode,args,text:String.fromCharCode(...r.bytes(size))};}
  else if(opcode===4){for(let i=0;i<7;i++)args.push(r.i16());}
  else if(opcode===5){args.push(r.i16(),r.i16(),r.u8());}
  else if(opcode===6)args.push(r.u32());
  else if(opcode===9)args.push(r.i16(),r.i16(),r.i16());
  else if(opcode===10)args.push(r.u8());
  else if(opcode===11||opcode===12)args.push(r.i16(),r.i16());
  else if(opcode===13)args.push(r.i16(),r.i16(),r.i16());
  else if(opcode===16||opcode===17)args.push(r.i16(),r.u8());
  else if(opcode===18)args.push(r.u8(),r.u8(),r.u8(),r.u8());
  else if(opcode===25)args.push(r.i16(),r.i16(),r.u8(),r.u8());
  else if(opcode===26)args.push(r.i16(),r.i16(),r.i32());
  else if(opcode===27){const size=r.u16();return {opcode,args,text:String.fromCharCode(...r.bytes(size))};}
  else if(![7,8,14,15].includes(opcode))r.fail(`unknown demo command ${opcode}`);
  return {opcode,args};
}
