import type { AssetManager } from '../assets/AssetManager.ts';
import type { Campaign } from '../core/Campaign.ts';
import { unlockedNode, unlockedWorld } from '../core/Campaign.ts';
import type { MapNode } from '../level/LevelParser.ts';
import { SpriteRenderer } from './SpriteRenderer.ts';

export type FrontScene='menu'|'map'|'seal'|'options'|'help'|'about'|'confirm'|'more'|'exit';
export const MENU_ITEMS=[0,1,2,3,4,5,6] as const;
const worldColors=['#0e5512','#0d4351','#4f818e'];
const labelColors=['#2f7b46','#3d618a','#38a1bd'];
const borderColors=['#83c42a','#59a0d2','#71f9ff'];
export class FrontEndRenderer {
  constructor(private assets:AssetManager,private sprites:SpriteRenderer){}
  private text(ctx:CanvasRenderingContext2D,s:string,x:number,y:number,align:'left'|'center'|'right'='left',palette=0){this.sprites.text(ctx,this.assets.sprite('ui-1'),this.assets.fontMap,s,x,y,align,palette);}
  private button(ctx:CanvasRenderingContext2D,back=false){this.sprites.frame(ctx,this.assets.sprite('ui-3'),back?0:3,back?223:2,308);}
  private splash(ctx:CanvasRenderingContext2D){ctx.drawImage(this.assets.splash[1],0,0);ctx.drawImage(this.assets.splash[0],0,0);const copy=this.assets.splash[2];ctx.drawImage(copy,120-(copy.width>>1),319-copy.height);}
  drawMenu(ctx:CanvasRenderingContext2D,selected:number,hasSave:boolean,tick:number){
    this.splash(ctx);
    const items=MENU_ITEMS.filter(id=>id!==1||hasSave),top=hasSave?190:205;
    const ui=this.assets.sprite('ui-3');
    for(let row=0;row<items.length;row++){
      const y=top+row*15;
      if(items[row]===selected){ctx.fillStyle='#ce9b00';ctx.fillRect(0,y-2,240,15);this.sprites.frame(ctx,ui,2,12,y+4);this.sprites.frame(ctx,ui,2,228,y+4,1);}
      this.text(ctx,this.assets.strings[items[row]],120,y,'center',items[row]===selected?1:0);
    }
    this.button(ctx);
    this.text(ctx,tick%40<20?'5':'',120,316,'center');
  }
  drawMap(ctx:CanvasRenderingContext2D,c:Campaign,tick:number){
    const world=c.world,nodes=this.assets.maps[world],map=this.assets.sprite('ms-0');
    ctx.fillStyle=worldColors[world];ctx.fillRect(0,0,240,320);
    this.sprites.frame(ctx,this.assets.sprite(`ms-${world+2}`),0,120,0);
    this.text(ctx,this.assets.strings[28+world],8,6);
    ctx.save();ctx.beginPath();ctx.rect(27,56,186,226);ctx.clip();
    this.sprites.frame(ctx,this.assets.sprite('ms-1'),0,120,169);
    const drawn=new Set<string>();
    for(const node of nodes)for(const link of node.links){
      const target=nodes.find(n=>n.x===link.x&&n.y===link.y);if(!target)continue;
      const key=[node.level,target.level].sort((a,b)=>a-b).join('-');if(drawn.has(key))continue;drawn.add(key);
      const x1=43+node.x*13,y1=79+node.y*13,x2=43+target.x*13,y2=79+target.y*13;
      const distance=Math.hypot(x2-x1,y2-y1),frame=unlockedNode(c,world,node,this.assets.maps)&&unlockedNode(c,world,target,this.assets.maps)?2:8;
      for(let p=8;p<distance-5;p+=7)this.sprites.frame(ctx,map,frame,x1+(x2-x1)*p/distance,y1+(y2-y1)*p/distance);
    }
    for(const node of nodes){
      const x=37+node.x*13,y=73+node.y*13,open=unlockedNode(c,world,node,this.assets.maps);
      const frame=node.type===1?9:open?0:1;
      this.sprites.frame(ctx,map,frame,x,y);
      if(c.completed[world].includes(node.level))this.sprites.frame(ctx,map,node.type===1?18:17,x+(node.type===1?0:1),y);
      if(node.level===c.selected)this.sprites.frame(ctx,map,tick%16<8?6:7,x+6,y+6);
    }
    ctx.restore();
    const selected=nodes.find(n=>n.level===c.selected)!;
    ctx.fillStyle=labelColors[world];ctx.beginPath();ctx.roundRect(2,34,236,22,7);ctx.fill();ctx.strokeStyle=borderColors[world];ctx.stroke();
    const label=selected.type===1?this.assets.strings[20+selected.level-nodes.filter(n=>n.type===0).length]:`STAGE ${selected.level+1}`;
    this.text(ctx,label,120,40,'center');
    ctx.fillStyle=labelColors[world];ctx.beginPath();ctx.roundRect(2,282,236,22,7);ctx.fill();ctx.strokeStyle=borderColors[world];ctx.stroke();
    this.sprites.frame(ctx,map,12,11,284);this.sprites.frame(ctx,map,11,80,285);this.sprites.frame(ctx,map,10,155,285);
    this.text(ctx,String(c.resources.lives),39,285);this.text(ctx,String(c.resources.diamonds),100,285);this.text(ctx,String(c.resources.redDiamonds),175,285);
    this.button(ctx);this.button(ctx,true);this.text(ctx,this.assets.strings[96],222,302,'right');
  }
  drawSeal(ctx:CanvasRenderingContext2D,c:Campaign,selected:number){
    ctx.fillStyle='#102c22';ctx.fillRect(0,0,240,320);
    this.sprites.frame(ctx,this.assets.sprite('ms-1'),0,120,160);
    this.text(ctx,this.assets.strings[96],120,36,'center');
    for(let w=0;w<3;w++){
      const y=96+w*57,open=unlockedWorld(c,w,this.assets.maps);
      if(w===selected){ctx.fillStyle='#ce9b00';ctx.fillRect(25,y-7,190,39);}
      this.sprites.frame(ctx,this.assets.sprite(`mmv-${w+1}`),0,46,y);
      this.text(ctx,this.assets.strings[28+w],88,y+3,undefined,open?0:2);
      if(!open)this.text(ctx,'LOCKED',88,y+18);
    }
    this.button(ctx,true);this.button(ctx);
  }
  drawPage(ctx:CanvasRenderingContext2D,scene:Exclude<FrontScene,'menu'|'map'|'seal'>,sound:boolean,selected:number,confirmExit=false){
    this.splash(ctx);ctx.fillStyle='#061008cc';ctx.fillRect(8,191,224,109);
    const title=scene==='options'?'OPTIONS':scene==='help'?'HELP':scene==='about'?'ABOUT':scene==='more'?'MORE GAMES!':scene==='exit'?'EXIT GAME?':confirmExit?'EXIT GAME?':'NEW GAME';
    this.text(ctx,title,120,196,'center',1);
    const lines=scene==='options'?[sound?'SOUND ON':'SOUND OFF','BACK']:
      scene==='help'?['4, 6 TO MOVE LEFT OR RIGHT.','2, 8 TO CLIMB UP OR DOWN.','PRESS 5 TO USE A WEAPON.','PRESS 5 OVER A CHECKPOINT','TO RESET THE ROOM.']:
      scene==='about'?['DIAMOND RUSH 1.2.0 S700','GAMELOFT','WEB PORT IN DEVELOPMENT']:
      scene==='more'?['CATALOG UNAVAILABLE','IN THE WEB PORT','BACK']:
      scene==='exit'?['YOU MAY CLOSE THIS TAB','BACK']:
      confirmExit?['EXIT GAME?','ARE YOU SURE?','YES       NO']:['STARTING A NEW GAME','WILL DELETE YOUR PROGRESS.','ARE YOU SURE?','YES       NO'];
    lines.forEach((line,i)=>{
      if(scene==='confirm'&&i===lines.length-1){this.text(ctx,'YES',85,220+i*15,'center',selected===0?1:0);this.text(ctx,'NO',155,220+i*15,'center',selected===1?1:0);}
      else this.text(ctx,line,120,220+i*15,'center',scene==='options'&&i===selected?1:0);
    });
    this.button(ctx,true);
  }
  nodeAt(c:Campaign,x:number,y:number):MapNode|null {
    return this.assets.maps[c.world].find(n=>Math.abs(x-(43+n.x*13))<=9&&Math.abs(y-(79+n.y*13))<=9)??null;
  }
}
