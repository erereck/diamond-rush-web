import { setResourceProvider } from '../core/s700/runtime.ts';
import { enableRendering, registerDecodedImage } from '../core/s700/j2me.ts';
import type { Surface } from '../core/s700/j2me.ts';

function surface(width:number,height:number):Surface{
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,width);canvas.height=Math.max(1,height);
  const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
  return {canvas,ctx};
}
/** PNG images embedded anywhere in the resources, so Image.createImage(byte[]) can stay synchronous. */
function embeddedPngs(bytes:Uint8Array){
  const found:Uint8Array[]=[];
  for(let i=0;i+8<bytes.length;i++){
    if(bytes[i]!==0x89||bytes[i+1]!==0x50||bytes[i+2]!==0x4e||bytes[i+3]!==0x47)continue;
    for(let j=i+8;j+8<=bytes.length;j++)if(bytes[j+4]===0x49&&bytes[j+5]===0x45&&bytes[j+6]===0x4e&&bytes[j+7]===0x44){
      found.push(bytes.slice(i,j+12));i=j+11;break;
    }
  }
  return found;
}
/**
 * Loads the original JAR resources copied by `npm run extract-assets` (public/assets/res) for the
 * generated core, decodes their PNG images and turns on drawing with Canvas 2D surfaces.
 */
export async function prepareEngine(base:string,names:string[]){
  const files=new Map<string,Uint8Array>();
  await Promise.all(names.map(async name=>{
    const response=await fetch(`${base}assets/res/${name}`);
    if(!response.ok)throw new Error(`Recurso original ${name}: HTTP ${response.status}. Execute npm run extract-assets.`);
    files.set('/'+name,new Uint8Array(await response.arrayBuffer()));
  }));
  setResourceProvider(name=>files.get(name)??null);
  const pngs=[...files.values()].flatMap(embeddedPngs);
  await Promise.all(pngs.map(async png=>{
    try{
      const bitmap=await createImageBitmap(new Blob([png as Uint8Array<ArrayBuffer>],{type:'image/png'}));
      const s=surface(bitmap.width,bitmap.height);s.ctx.drawImage(bitmap,0,0);bitmap.close();registerDecodedImage(png,s);
    }catch{/* Not every signature match is a complete PNG. */}
  }));
  enableRendering(surface);
}
