import type { AssetManager } from '../assets/AssetManager.ts';
import type { Simulation } from '../core/Simulation.ts';
import { demoFontWidth, wrapDemoTextPixels } from '../core/IntroSequence.ts';
import type { SpriteRenderer } from './SpriteRenderer.ts';

/** method_151/renderDialog: original font, 230px wrap, bottom anchor and 4px spacing. */
export function drawRiddleHint(ctx:CanvasRenderingContext2D,s:Simulation,assets:AssetManager,sprites:SpriteRenderer){
  if(s.riddles.hint<0)return;
  const font=assets.sprite('ui-1'),lines=wrapDemoTextPixels(assets.strings[s.riddles.hint],230,font,assets.fontMap);
  // ASprite.modules[1] is the height byte of module zero, not decoded module one.
  const lineHeight=font.modules[0].height,width=Math.max(...lines.map(line=>demoFontWidth(font,assets.fontMap,line))),height=lineHeight*lines.length+4*(lines.length-1);
  ctx.fillStyle='#0c2f39';ctx.beginPath();ctx.roundRect(120-(width>>1)-5,263-height-5,width+10,height+10,10);ctx.fill();
  ctx.strokeStyle='#ce9b00';ctx.stroke();
  lines.forEach((line,i)=>sprites.text(ctx,font,assets.fontMap,line,120,263-height+i*(lineHeight+4),'center'));
}
