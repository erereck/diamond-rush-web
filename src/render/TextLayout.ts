import type { DecodedSprite } from '../assets/SpriteDecoder.ts';
/** Width of a string in the original bitmap font (ui.f/1 with the mc character map). */
export function demoFontWidth(font:DecodedSprite,map:Uint8Array,value:string){
  const spacing=font.frameModules[0].x;
  return [...value].reduce((total,char)=>{
    if(char===' ')return total+font.modules[0].width+spacing;
    const n=map[char.charCodeAt(0)]??map[63];
    if(n>=font.frames[0].count){const r=font.frames[n-font.frames[0].count].rect;return total+r[2]-(r[0]&255)+spacing;}
    const fm=font.frameModules[n];return total+font.modules[fm.module].width-fm.x+spacing;
  },-spacing);
}
export function wrapDemoTextPixels(value:string,maxWidth:number,font:DecodedSprite,map:Uint8Array){
  const lines:string[]=[];
  for(const paragraph of value.trim().split('\n')){
    let line='';
    for(const word of paragraph.trim().split(/\s+/)){
      const candidate=line?`${line} ${word}`:word;
      if(line&&demoFontWidth(font,map,candidate)>maxWidth){lines.push(line);line=word;}
      else line=candidate;
    }
    if(line)lines.push(line);
  }
  return lines;
}
