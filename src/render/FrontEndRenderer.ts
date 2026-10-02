import type { AssetManager } from '../assets/AssetManager.ts';
import type { Campaign } from '../core/Campaign.ts';
import { unlockedNode, unlockedWorld } from '../core/Campaign.ts';
import type { MapNode } from '../level/LevelParser.ts';
import { SpriteRenderer } from './SpriteRenderer.ts';
import { ARMOR_PRICES, WORLD_RED_PRICES } from '../core/Store.ts';
import { CanonicalSave } from '../platform/CanonicalSave.ts';
import { mapTitle } from '../core/OriginalText.ts';
import { demoFontWidth, wrapDemoTextPixels } from '../core/IntroSequence.ts';

export type FrontScene='menu'|'map'|'seal'|'store'|'options'|'help'|'about'|'confirm'|'more'|'exit';
export type PauseScene='menu'|'options'|'help'|'confirm';
export const MENU_ITEMS=[0,1,3,2,4,5,6] as const;
export const PAUSE_ITEMS=[25,26,2,4,49,27,6] as const;
const worldColors=['#0e5512','#0d4351','#4f818e'];
const labelColors=['#2f7b46','#3d618a','#38a1bd'];
const borderColors=['#83c42a','#59a0d2','#71f9ff'];
export class FrontEndRenderer {
  constructor(private assets:AssetManager,private sprites:SpriteRenderer){}
  private text(ctx:CanvasRenderingContext2D,s:string,x:number,y:number,align:'left'|'center'|'right'='left',palette=0){this.sprites.text(ctx,this.assets.sprite('ui-1'),this.assets.fontMap,s,x,y,align,palette);}
  private button(ctx:CanvasRenderingContext2D,back=false){this.sprites.frame(ctx,this.assets.sprite('ui-3'),back?0:3,back?223:2,308);}
  /** cGame.method_429: S700 panel border modules from demoui.f/0. */
  private panel(ctx:CanvasRenderingContext2D,x:number,y:number,width:number,height:number,color:string){
    const border=this.assets.sprite('demoui-0');ctx.fillStyle=color;ctx.fillRect(x,y,width,height);
    for(let yy=y;yy<=y+height;yy+=8){this.sprites.module(ctx,border,7,x-3,yy);this.sprites.module(ctx,border,5,x+width,yy);}
    for(let xx=x;xx<=x+width;xx+=8){this.sprites.module(ctx,border,4,xx,y-3);this.sprites.module(ctx,border,6,xx,y+height);}
    this.sprites.module(ctx,border,0,x-3,y-3);this.sprites.module(ctx,border,1,x+width,y-3);
    this.sprites.module(ctx,border,2,x-3,y+height);this.sprites.module(ctx,border,3,x+width,y+height);
  }
  private splash(ctx:CanvasRenderingContext2D){ctx.drawImage(this.assets.splash[1],0,0);ctx.drawImage(this.assets.splash[0],0,0);const copy=this.assets.splash[2];ctx.drawImage(copy,120-(copy.width>>1),319-copy.height);}
  drawMenu(ctx:CanvasRenderingContext2D,selected:number,hasSave:boolean,tick:number){
    this.splash(ctx);
    // Our decoded font draws 14 px below the Java drawString anchor.
    const items=MENU_ITEMS.filter(id=>id!==1||hasSave),top=hasSave?198:213;
    const ui=this.assets.sprite('ui-3');
    for(let row=0;row<items.length;row++){
      const y=top+row*15;
      if(items[row]===selected){
        const width=Math.min(210,demoFontWidth(this.assets.sprite('ui-1'),this.assets.fontMap,this.assets.strings[items[row]]));
        ctx.fillStyle='#ce9b00';ctx.fillRect(0,y,240,16);
        this.sprites.frame(ctx,ui,2,120-width/2-8,y+7);
        this.sprites.frame(ctx,ui,2,120+width/2+8,y+7,1);
      }
      this.text(ctx,this.assets.strings[items[row]],120,y+1,'center',items[row]===3?1:0);
    }
    this.button(ctx);
    this.text(ctx,tick%40<20?'5':'',120,316,'center');
  }
  drawMap(ctx:CanvasRenderingContext2D,c:Campaign,tick:number,cursor?:{x:number;y:number;left:boolean}){
    const world=c.world,nodes=this.assets.maps[world],map=this.assets.sprite('ms-0');
    ctx.fillStyle=worldColors[world];ctx.fillRect(0,0,240,320);
    this.sprites.frame(ctx,this.assets.sprite(`ms-${world+2}`),0,120,0);
    this.text(ctx,this.assets.strings[28+world],8,6);
    ctx.save();ctx.beginPath();ctx.rect(27,56,186,226);ctx.clip();
    this.sprites.frame(ctx,this.assets.sprite('ms-1'),0,120,169);
    let record:CanonicalSave|null=null;
    try{if(c.canonicalRecord)record=new CanonicalSave(Uint8Array.from(c.canonicalRecord));}catch{/* Older web saves can still display the map. */}
    const drawn=new Set<string>();
    for(const node of [...nodes].sort((a,b)=>a.x-b.x||a.y-b.y))for(const link of node.links){
      const target=nodes.find(n=>n.x===link.x&&n.y===link.y);if(!target)continue;
      const key=[node.level,target.level].sort((a,b)=>a-b).join('-');if(drawn.has(key))continue;drawn.add(key);
      const x1=43+node.x*13,y1=79+node.y*13,x2=43+target.x*13,y2=79+target.y*13;
      const fromOpen=unlockedNode(c,world,node,this.assets.maps),toOpen=unlockedNode(c,world,target,this.assets.maps);
      const linkType=node.type===1?1:target.type;
      if(!fromOpen&&linkType===1)continue;
      const frame=fromOpen&&toOpen?(linkType===1?8:2):(linkType===1?4:3);
      let x=x1,y=y1,error=0,step=1;
      const ax=Math.abs(x2-x1),ay=Math.abs(y2-y1),sx=Math.sign(x2-x1),sy=Math.sign(y2-y1);
      while(true){
        if(step%8===0)this.sprites.frame(ctx,map,frame,x,y);
        if(x===x2&&y===y2)break;
        if(ay<=ax){x+=sx;error+=2*ay;if(error>ax){y+=sy;error-=2*ax;}}
        else {y+=sy;error+=2*ax;if(error>ay){x+=sx;error-=2*ay;}}
        step++;
      }
    }
    for(const node of nodes){
      const x=37+node.x*13,y=73+node.y*13,open=unlockedNode(c,world,node,this.assets.maps);
      if(node.type===1&&!open)continue;
      const offset=node.type===1?2:0,frame=node.type===1?9:open?(node.links.length>2?13:0):1;
      const red=record?.worlds[world]?.levels[node.level];
      if(red&&red.status>=red.redTotal&&open)this.sprites.frame(ctx,map,node.type===1?18:17,x+offset,y+offset);
      this.sprites.frame(ctx,map,frame,x+offset,y+offset);
      if(node.level===[8,9,10][world])this.sprites.frame(ctx,this.assets.sprite(`mmv-${3-world}`),0,x-8,y-8);
      if(node.level===c.selected&&!cursor)this.sprites.frame(ctx,map,tick%16<8?6:7,x+6,y+6);
    }
    if(cursor)this.sprites.frame(ctx,map,cursor.left?7:6,cursor.x,cursor.y);
    ctx.restore();
    const selected=nodes.find(n=>n.level===c.selected)!;
    ctx.fillStyle=labelColors[world];ctx.beginPath();ctx.roundRect(2,34,236,22,7);ctx.fill();ctx.strokeStyle=borderColors[world];ctx.stroke();
    const firstSecret=nodes.find(n=>n.type===1)?.level??nodes.length;
    const label=mapTitle(this.assets.strings,selected.level,firstSecret);
    this.text(ctx,label,8,45);
    ctx.fillStyle=labelColors[world];ctx.beginPath();ctx.roundRect(2,282,236,22,7);ctx.fill();ctx.strokeStyle=borderColors[world];ctx.stroke();
    this.sprites.frame(ctx,map,12,11,284);this.sprites.frame(ctx,map,11,80,285);this.sprites.frame(ctx,map,10,155,285);
    const total=record?.export()[0]??c.resources.redDiamonds;
    this.text(ctx,String(c.resources.lives),39,285);this.text(ctx,String(c.resources.diamonds),100,285);this.text(ctx,`${c.resources.redDiamonds}/${Math.max(total,c.resources.redDiamonds)}`,175,285);
    const selectedRed=record?.worlds[world]?.levels[selected.level];
    if(selectedRed){
      const value=`${Math.min(selectedRed.status,selectedRed.redTotal)}/${selectedRed.redTotal}`;
      const width=demoFontWidth(this.assets.sprite('ui-1'),this.assets.fontMap,value)+20;
      const centerX=43+selected.x*13,centerY=79+selected.y*13;
      let left=centerX-(width>>1),top=centerY-48;
      if(top<=63){top=63;left=centerX+20;if(left+width>=200)left=centerX-width-20;}
      left=Math.max(35,left);if(left+width>=200)left=150;
      this.panel(ctx,left,top,width,17,'#0090b2');
      this.text(ctx,value,left+2,top+1);
      this.sprites.frame(ctx,map,10,left+width-16,top+1);
    }
    this.button(ctx);this.button(ctx,true);this.text(ctx,this.assets.strings[96],222,302,'right');
  }
  private sealBackdrop(ctx:CanvasRenderingContext2D,store=false){
    const tile=this.assets.sprite('0-3'),overlay=this.assets.sprite('ms-0');
    for(let y=0;y<320;y+=24)for(let x=0;x<240;x+=24)this.sprites.module(ctx,tile,0,x,y);
    this.sprites.frame(ctx,this.assets.sprite('mmv-0'),0,60,76);
    if(store)for(let y=0;y<320;y+=24)for(let x=0;x<240;x+=24)this.sprites.frame(ctx,overlay,16,x,y);
  }
  drawSeal(ctx:CanvasRenderingContext2D,c:Campaign,selected:number,tick:number){
    this.sealBackdrop(ctx);
    const itemOffsets=[[-24,-23],[24,-23],[0,23]];
    for(let w=0;w<3;w++){
      const [dx,dy]=itemOffsets[w];
      this.sprites.frame(ctx,this.assets.sprite(`mmv-${3-w}`),0,120+dx,136+dy);
      if(!unlockedWorld(c,w,this.assets.maps)){ctx.fillStyle='#0009';ctx.fillRect(120+dx-13,136+dy-12,27,26);}
    }
    this.sprites.frame(ctx,this.assets.sprite('ms-0'),11,144,159);
    const arrows=[[-33,-54],[14,-54],[-8,-8],[22,2]],arrow=arrows[selected];
    this.sprites.frame(ctx,this.assets.sprite('mmv-4'),Math.floor(tick/5)%5,120+arrow[0],136+arrow[1]);
    const name=this.assets.strings[selected===3?31:28+selected];
    const available=selected===3||unlockedWorld(c,selected,this.assets.maps);
    const prefix=available?`${this.assets.strings[82]} ${this.assets.strings[79]}`:
      `${WORLD_RED_PRICES[selected]} ${this.assets.strings[114].toLowerCase()} ${this.assets.strings[79]}`;
    const lines=wrapDemoTextPixels(`${prefix}\n${name}`,220,this.assets.sprite('ui-1'),this.assets.fontMap);
    const top=250-Math.floor(lines.length*8);
    this.panel(ctx,9,top-5,222,lines.length*15+8,'#6c490b');
    lines.forEach((line,i)=>this.text(ctx,line,120,top+i*15,'center'));
    this.button(ctx,true);this.button(ctx);
  }
  drawStore(ctx:CanvasRenderingContext2D,c:Campaign,selected:number,message:number,toast=false){
    this.sealBackdrop(ctx,true);
    ctx.fillStyle='#000';ctx.fillRect(0,0,240,15);
    this.text(ctx,this.assets.strings[72],120,0,'center',1);
    this.panel(ctx,10,35,220,90,'#41340d');this.panel(ctx,10,155,220,70,'#41340d');
    for(let i=0;i<4;i++){
      const y=43+i*20;
      this.sprites.frame(ctx,this.assets.sprite('mmv-5'),i,27,y);
      this.text(ctx,this.assets.strings[85+i],53,y);
    }
    this.sprites.frame(ctx,this.assets.sprite('ms-0'),14,20,45+selected*20);
    const hud=this.assets.sprite('ui-2'),segment=hud.modules[15].width;
    let x=100+hud.modules[11].width;
    this.sprites.module(ctx,hud,11,100,160);
    for(let i=0;i<8;i++){this.sprites.module(ctx,hud,i>=4?13:15,x,160);x+=segment;}
    x-=segment*4;
    for(let i=0;i<=selected;i++){this.sprites.module(ctx,hud,15,x,160);x+=segment;}
    this.sprites.module(ctx,hud,17,100+hud.modules[11].width+segment*8,160);
    const max=c.resources.maxHealth??4;
    const owned=max>=5+selected;
    this.text(ctx,owned?this.assets.strings[81]:`${this.assets.strings[74]} ${ARMOR_PRICES[selected]} ${this.assets.strings[42]}`,120,199,'center');
    this.text(ctx,`${this.assets.strings[110]} ${c.resources.diamonds} ${this.assets.strings[109]}`,120,260,'center');
    this.text(ctx,this.assets.strings[owned?81:message||90],120,280,'center');
    if(toast){this.panel(ctx,17,231,206,31,'#41340d');this.text(ctx,this.assets.strings[91],120,239,'center',1);}
    this.button(ctx,true);this.button(ctx);
  }
  drawPause(ctx:CanvasRenderingContext2D,scene:PauseScene,selected:number,sound:boolean,vibration:boolean,canMap:boolean,confirmExit=false){
    if(scene==='help'){this.drawPage(ctx,'help',sound,vibration,0);return;}
    ctx.fillStyle='#000d';ctx.fillRect(0,0,240,320);
    const entries=scene==='menu'?PAUSE_ITEMS.filter(id=>id!==49||canMap).map(id=>this.assets.strings[id]):
      scene==='options'?[this.assets.strings[sound?32:33],this.assets.strings[vibration?50:51]]:
      [this.assets.strings[101],this.assets.strings[100]];
    const top=Math.floor(160-(entries.length*15+3)/2);
    if(scene==='confirm')this.text(ctx,this.assets.strings[confirmExit?102:113],120,top-20,'center',1);
    entries.forEach((line,i)=>{
      const y=top+i*15;
      if(i===selected){ctx.fillStyle='#ce9b00';ctx.fillRect(0,y,240,16);
        const width=Math.min(210,demoFontWidth(this.assets.sprite('ui-1'),this.assets.fontMap,line));
        this.sprites.frame(ctx,this.assets.sprite('ui-3'),2,120-width/2-8,y+7);
        this.sprites.frame(ctx,this.assets.sprite('ui-3'),2,120+width/2+8,y+7,1);
      }
      this.text(ctx,line,120,y+1,'center');
    });
    this.button(ctx,true);this.button(ctx);
  }
  drawPage(ctx:CanvasRenderingContext2D,scene:Exclude<FrontScene,'menu'|'map'|'seal'|'store'>,sound:boolean,vibration:boolean,selected:number,confirmExit=false){
    if(scene==='help'){
      ctx.fillStyle='#000';ctx.fillRect(0,0,240,320);
      this.text(ctx,this.assets.strings[4],120,10,'center',1);
      const entries=[103,104,105,106,107,108],ys=[39,65,82,125,173,221];
      entries.forEach((entry,i)=>{
        const lines=wrapDemoTextPixels(this.assets.strings[entry],224,this.assets.sprite('ui-1'),this.assets.fontMap);
        lines.forEach((line,j)=>this.text(ctx,line,120,ys[i]+j*15,'center'));
      });
      this.button(ctx,true);return;
    }
    if(scene==='options'||scene==='confirm'){
      this.splash(ctx);
      const entries=scene==='options'?[this.assets.strings[sound?32:33],this.assets.strings[vibration?50:51]]:
        [this.assets.strings[101],this.assets.strings[100]];
      const top=287;
      ctx.fillStyle='#000b';ctx.fillRect(0,top-2,240,33);
      ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(0,top-3);ctx.lineTo(240,top-3);ctx.moveTo(0,319);ctx.lineTo(240,319);ctx.stroke();
      if(scene==='confirm')this.text(ctx,this.assets.strings[confirmExit?102:113],120,top-20,'center',1);
      entries.forEach((line,i)=>{
        const y=top+i*15;
        if(i===selected){ctx.fillStyle='#ce9b00';ctx.fillRect(0,y,240,16);
          const width=demoFontWidth(this.assets.sprite('ui-1'),this.assets.fontMap,line);
          this.sprites.frame(ctx,this.assets.sprite('ui-3'),2,120-width/2-8,y+7);
          this.sprites.frame(ctx,this.assets.sprite('ui-3'),2,120+width/2+8,y+7,1);
        }
        this.text(ctx,line,120,y+1,'center');
      });
      this.button(ctx,true);return;
    }
    this.splash(ctx);ctx.fillStyle='#061008cc';ctx.fillRect(8,191,224,109);
    const title=scene==='about'?this.assets.strings[5]:scene==='more'?this.assets.strings[3]:this.assets.strings[102];
    this.text(ctx,title,120,196,'center',1);
    const lines=scene==='about'?['DIAMOND RUSH 1.2.0 S700','GAMELOFT','WEB PORT IN DEVELOPMENT']:
      scene==='more'?['CATALOG UNAVAILABLE','IN THE WEB PORT','BACK']:
      ['YOU MAY CLOSE THIS TAB','BACK'];
    lines.forEach((line,i)=>{
      this.text(ctx,line,120,220+i*15,'center');
    });
    this.button(ctx,true);
  }
  nodeAt(c:Campaign,x:number,y:number):MapNode|null {
    return this.assets.maps[c.world].find(n=>Math.abs(x-(43+n.x*13))<=9&&Math.abs(y-(79+n.y*13))<=9)??null;
  }
}
