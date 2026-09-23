import './style.css';
import { AssetManager } from './assets/AssetManager.ts';
import { SpriteRenderer } from './render/SpriteRenderer.ts';
import { LevelRenderer } from './render/LevelRenderer.ts';
import { Clock } from './core/Clock.ts';
import { Simulation } from './core/Simulation.ts';
import type { StageStart } from './core/Simulation.ts';
import { nextMainLevel } from './level/Progression.ts';
import { Input } from './platform/Input.ts';
import { MobileControls } from './platform/MobileControls.ts';
import { MidiPreview, parseMidi } from './platform/Midi.ts';
import { SESSION_KEY, validateReplay, restoreReplay } from './platform/Session.ts';
import { CanonicalSave } from './platform/CanonicalSave.ts';
import { CAMPAIGN_KEY, adjacentNode, finishLevel, newCampaign, unlockedNode, unlockedWorld, validateCampaign } from './core/Campaign.ts';
import type { Campaign } from './core/Campaign.ts';
import { FrontEndRenderer, MENU_ITEMS } from './render/FrontEndRenderer.ts';
import type { FrontScene } from './render/FrontEndRenderer.ts';
import { introLines, stageCollectibleTotals, stageTitle, worldTitle } from './core/OriginalText.ts';
import { LevelResults } from './core/LevelResults.ts';
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const game=$<HTMLCanvasElement>('game'), ctx=game.getContext('2d')!, inspection=$<HTMLCanvasElement>('inspection'), ic=inspection.getContext('2d')!;
ctx.imageSmoothingEnabled=false;ic.imageSmoothingEnabled=false;
const assets=new AssetManager(), sprites=new SpriteRenderer(), renderer=new LevelRenderer(assets,sprites),clock=new Clock(),input=new Input(game),audio=new MidiPreview();
const front=new FrontEndRenderer(assets,sprites);
const touchControls=new MobileControls(input);
const results=new LevelResults();
let simulation:Simulation|null=null,paused=false,ready=false,sceneTick=0,view:'levels'|'sprites'|'audio'='levels',inspectionDirty=true,inspectorVisible=false,lastError='';
let scene:FrontScene|'playing'|'intro'='menu',campaign:Campaign|null=null,menuSelected=0,sealSelected=0,pageSelected=0,soundEnabled=true,campaignStage=false,confirmExit=false,frontCooldown=0,frontActionHeld=false;
let introPage=-1,introTick=0,introSimulation:Simulation|null=null,introWalkPixels=0,stageIntroTicks=0;
const world=$<HTMLSelectElement>('world'),level=$<HTMLSelectElement>('level'),sprite=$<HTMLSelectElement>('sprite'),palette=$<HTMLSelectElement>('palette');
const selectedLevel=()=>assets.worlds[Number(world.value)].levels[Number(level.value)];
const text=(s:string,x:number,y:number,align:'left'|'center'|'right'='left',pal=0)=>sprites.text(ctx,assets.sprite('ui-1'),assets.fontMap,s,x,y,align,pal);
function report(message:string){lastError=message;$('debug-info').textContent=message;$('tools').setAttribute('open','');}
function options(select:HTMLSelectElement,values:{value:string;label:string}[]){select.replaceChildren(...values.map(({value,label})=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;}));}
function updateLevels(){
  const w=Number(world.value);options(level,assets.worlds[w].levels.map(l=>({value:String(l.index),label:l.index===13&&w===0?'13 · Introdução':`${String(l.index).padStart(2,'0')} · ${l.width} × ${l.height}`})));inspectionDirty=true;updateLevelInfo();
}
function updateLevelInfo(){const l=selectedLevel();$('level-info').textContent=`${l.width} × ${l.height} células · ${l.tiles.filter(t=>t===1).length} diamantes · ${[...new Set(l.tiles.filter(t=>t<80))].length} tipos de objeto. Dados originais; simulação parcial.`;inspectionDirty=true;}
function saveCampaign(){if(campaign)try{localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(campaign));}catch{report('Não foi possível salvar a campanha neste navegador.');}}
function openMenu(){scene='menu';simulation=null;campaignStage=false;paused=false;audio.stop();input.clear();clock.reset();frontCooldown=0;menuSelected=campaign?1:0;}
function startIntro(){scene='intro';introPage=-1;introTick=0;introSimulation=new Simulation(assets.worlds[0].levels[13]);introWalkPixels=introSimulation.player.x*24;input.clear();frontActionHeld=false;frontCooldown=0;game.focus();}
function openMap(world=campaign?.world??0){if(!campaign)return;campaign.world=world;campaign.selected=assets.maps[world].find(n=>n.level===campaign!.selected&&unlockedNode(campaign!,world,n,assets.maps))?.level??0;scene='map';simulation=null;campaignStage=false;paused=false;input.clear();clock.reset();frontCooldown=0;saveCampaign();game.focus();}
function start(l=assets.worlds[0].levels[0],initial?:StageStart,fromCampaign=false){simulation=new Simulation(l,initial);scene='playing';campaignStage=fromCampaign;paused=false;stageIntroTicks=60;results.reset();clock.reset();input.clear();lastError='';$('pause').textContent='Ⅱ';$('play').innerHTML='Abrir menu do jogo <span>→</span>';$('next-level').hidden=true;game.focus();saveSession();}
function startSelected(){if(!campaign)return;const node=assets.maps[campaign.world].find(n=>n.level===campaign!.selected);if(!node||!unlockedNode(campaign,campaign.world,node,assets.maps))return;start(assets.worlds[campaign.world].levels[node.level],campaign.resources,true);}
function completionBonus(s:Simulation){
  const totals=stageCollectibleTotals(s.level);
  return Number(s.diamonds-s.initial.diamonds>=totals.diamonds)+Number(s.redDiamonds-s.initial.redDiamonds>=totals.redDiamonds)+Number(s.hits===0)+Number(s.retries===0);
}
function completeCampaignStage(){const s=simulation;if(!s||!campaign||s.status!=='complete')return;const firstClear=!campaign.completed[s.level.world].includes(s.level.index);campaign=finishLevel(campaign,s.level.world,s.level.index,{diamonds:s.diamonds,redDiamonds:s.redDiamonds,lives:Math.min(99,s.lives+(firstClear?completionBonus(s):0)),health:s.health});saveCampaign();openMap(s.level.world);}
function advanceLevel(){
  const current=simulation;
  if(!current||current.status!=='complete')return;
  if(!results.press())return;
  if(campaignStage){completeCampaignStage();return;}
  const next=nextMainLevel(current.level,assets.worlds,assets.maps);
  if(!next){openMenu();return;}
  start(next,{diamonds:current.diamonds,redDiamonds:current.redDiamonds,lives:Math.min(99,current.lives+completionBonus(current)),health:current.health});
}
function continueGameOver(){
  const s=simulation;if(!s||s.status!=='dead')return;
  const resources={diamonds:Math.max(0,s.diamonds-500),redDiamonds:s.redDiamonds,lives:5,health:4};
  if(campaignStage&&campaign){campaign.resources=resources;saveCampaign();openMap(s.level.world);}
  else start(s.level,resources);
}
function togglePause(){if(!simulation||simulation.status!=='playing')return;paused=!paused;clock.reset();input.clear();$('pause').textContent=paused?'▷':'Ⅱ';saveSession();}
function saveSession(){if(simulation){try{localStorage.setItem(SESSION_KEY,JSON.stringify(simulation.replay()));}catch{report('Não foi possível salvar a sessão neste navegador. Exporte uma cópia.');}}}
function downloadBlob(name:string,blob:Blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function download(name:string,data:unknown){downloadBlob(name,new Blob([JSON.stringify(data)],{type:'application/json'}));}
function drawIntro(){
  const level=assets.worlds[0].levels[13];ctx.fillStyle='#000';ctx.fillRect(0,0,240,320);
  const sim=introSimulation!,walk=Math.min(introTick*6,introWalkPixels),cell=Math.ceil(walk/24);
  sim.player.x=cell;sim.player.y=4;sim.player.dx=1;sim.player.dy=0;sim.player.offset=cell*24-walk;sim.player.direction=2;
  sim.playerAnimation=introPage<0?5:1;sim.animationTick=introTick;
  ctx.save();ctx.beginPath();ctx.rect(0,42,240,236);ctx.clip();ctx.translate(-Math.max(0,Math.min(36,walk-108)),42);
  renderer.draw(ctx,level,introTick,sim);ctx.restore();
  if(introPage>=0){
    sprites.animation(ctx,assets.sprite('demo-sprite-2'),0,introTick,17,50);
    sprites.frame(ctx,assets.sprite('demo-sprite-0'),[2,1,3][introPage],17,50);
    ctx.fillStyle='#2e2818';ctx.fillRect(7,90,226,38);ctx.strokeStyle='#c4a05b';ctx.strokeRect(7.5,90.5,225,37);
    const lines=introPage===0?['The Great Temple','Of Angkor Wat...']:[introLines[introPage]];
    lines.forEach((line,i)=>text(line,10,94+i*15));
  }
  text(assets.strings[53],5,315);if(introPage>=0)text(`${introPage+1}/3`,231,315,'right');
  $('game-status').textContent='Introdução original de Angkor Wat · toque para continuar';
  $<HTMLButtonElement>('pause').disabled=true;$<HTMLButtonElement>('restart').disabled=true;$('next-level').hidden=true;
}
function drawResult(s:Simulation){
  const phase=results.phase,ticks=results.ticks;
  const totals=stageCollectibleTotals(s.level),collectedDiamonds=Math.max(0,s.diamonds-s.initial.diamonds),collectedRed=Math.max(0,s.redDiamonds-s.initial.redDiamonds);
  ctx.fillStyle='#261707';ctx.fillRect(0,0,240,320);
  const titleSlide=phase===0?Math.min(0,-100+ticks*10):0;
  text(stageTitle(assets.strings,s.level),120+titleSlide,10,'center');text(assets.strings[41],120+(phase===0?Math.min(0,-340+ticks*10):0),25,'center');
  const awardAvailable=!campaignStage||!campaign?.completed[s.level.world].includes(s.level.index);
  const rows:[string,string,(x:number)=>void,boolean][]=[
    [assets.strings[109],`${phase===1?Math.min(collectedDiamonds,ticks>>1):collectedDiamonds}/${totals.diamonds}`,x=>sprites.frame(ctx,assets.sprite('cm-2'),0,x,69),collectedDiamonds>=totals.diamonds],
    [assets.strings[114],`${collectedRed}/${totals.redDiamonds}`,x=>sprites.frame(ctx,assets.sprite('cm-2'),0,x,127,0,1),collectedRed>=totals.redDiamonds],
    [assets.strings[43],String(s.hits),x=>sprites.animation(ctx,assets.sprite('o-0'),10,0,x,189),s.hits===0],
    [assets.strings[44],String(s.retries),x=>sprites.animation(ctx,assets.sprite('o-0'),12,0,x,243),s.retries===0]
  ];
  rows.forEach(([label,value,icon,perfect],i)=>{if(phase<=i)return;const y=69+i*58,slide=phase===i+1?Math.min(0,-100+ticks*10):0;icon(7+slide);text(label,120,y,'center');text(value,120,y+12,'center');if(awardAvailable&&perfect&&phase>i+1){sprites.module(ctx,assets.sprite('ui-4'),0,180,y+11);sprites.module(ctx,assets.sprite('cm-4'),0,200,y-6);}});
  text(assets.strings[phase===5?98:53],5,318);
  $('game-status').textContent=`${stageTitle(assets.strings,s.level)} · conclusão ${phase}/5`;
  $<HTMLButtonElement>('pause').disabled=true;$<HTMLButtonElement>('restart').disabled=true;
  $('next-level').hidden=false;$('next-level').textContent=phase===5?(campaignStage?'Mapa →':'Próxima →'):'Pular animação →';
}
function drawFront(){
  if(scene==='intro'){drawIntro();return;}
  if(scene==='menu')front.drawMenu(ctx,menuSelected,!!campaign,sceneTick);
  else if(scene==='map'&&campaign)front.drawMap(ctx,campaign,sceneTick);
  else if(scene==='seal'&&campaign)front.drawSeal(ctx,campaign,sealSelected);
  else if(scene==='options'||scene==='help'||scene==='about'||scene==='confirm'||scene==='more'||scene==='exit')front.drawPage(ctx,scene,soundEnabled,pageSelected,confirmExit);
  $('game-status').textContent=scene==='map'&&campaign?`${assets.strings[28+campaign.world]} · STAGE ${campaign.selected+1}`:scene==='seal'?'Seleção de mundos':'Menu original S700';
  if(!lastError)$('debug-info').textContent=`Tela ${scene} · use setas e ação para navegar`;
  $<HTMLButtonElement>('pause').disabled=true;$<HTMLButtonElement>('restart').disabled=true;
  $('next-level').hidden=true;
}
function hudNumber(hud:ReturnType<AssetManager['sprite']>,value:number,right:number,top:number){
  if(value===0){sprites.module(ctx,hud,0,right-hud.modules[0].width,top);return;}
  for(let n=value;n>0;n=Math.floor(n/10)){
    const digit=n%10;right-=hud.modules[digit].width;sprites.module(ctx,hud,digit,right,top);
  }
}
function drawGame(){
  if(scene!=='playing'||!simulation){drawFront();return;}
  if(simulation.status==='complete'){drawResult(simulation);return;}
  if(simulation.status==='dead'){
    ctx.fillStyle='#000';ctx.fillRect(0,0,240,320);
    text('GAME OVER',120,50,'center',1);
    text(`YOU LOST ${Math.min(500,simulation.diamonds)} DIAMONDS`,120,160,'center');
    text('CONTINUE',8,301);
    $('game-status').textContent='GAME OVER · confirme para continuar';
    $<HTMLButtonElement>('pause').disabled=true;$<HTMLButtonElement>('restart').disabled=false;
    $('restart').setAttribute('aria-label','Continuar após game over');$('next-level').hidden=true;
    return;
  }
  const s=simulation;ctx.fillStyle='#091509';ctx.fillRect(0,0,240,320);
  ctx.save();ctx.beginPath();ctx.rect(0,40,240,240);ctx.clip();ctx.translate(-s.camera.x,40-s.camera.y);renderer.draw(ctx,s.level,s.tick,s);ctx.restore();
  const hud=assets.sprite('ui-2');sprites.frame(ctx,hud,0,120,320);sprites.frame(ctx,hud,1,120,320);
  sprites.frame(ctx,hud,20,120,0);
  const low=s.health<=1,cap=low?12:11,empty=low?14:13,filled=low?16:15;
  let healthX=87;sprites.module(ctx,hud,cap,healthX,291);healthX+=hud.modules[cap].width;
  for(let i=0;i<4;i++){sprites.module(ctx,hud,i<s.health?filled:empty,healthX,291);healthX+=hud.modules[15].width;}
  sprites.module(ctx,hud,low?18:17,healthX,291);
  hudNumber(hud,s.diamonds,190,308);hudNumber(hud,s.redDiamonds,227,308);
  hudNumber(hud,s.lives,91,18);hudNumber(hud,s.goldKeys,167,18);hudNumber(hud,s.silverKeys,207,18);
  if(stageIntroTicks>0){
    const progress=60-stageIntroTicks,slide=progress<15?Math.round((15-progress)*16):stageIntroTicks<15?Math.round((15-stageIntroTicks)*16):0;
    ctx.fillStyle='#2e2818e8';ctx.fillRect(8+slide,4,224,58);ctx.strokeStyle='#b09058';ctx.strokeRect(8.5+slide,4.5,223,57);
    text(worldTitle(assets.strings,s.level.world),120+slide,11,'center');text(stageTitle(assets.strings,s.level),120+slide,37,'center');
  }
  if(paused){
    ctx.fillStyle='#000b';ctx.fillRect(0,96,240,115);
    text('PAUSADO',120,124,'center',1);text('ESC PARA CONTINUAR',120,151,'center');
  }
  $('game-status').textContent=`${assets.strings[28+s.level.world]} / ${String(s.level.index+1).padStart(2,'0')} · ${paused?'pausado':'20 Hz'}`;
  $('pause').textContent=paused?'▷':'Ⅱ';
  $('pause').setAttribute('aria-label',paused?'Continuar':'Pausar');
  $('restart').setAttribute('aria-label','Reiniciar no checkpoint');
  $<HTMLButtonElement>('pause').disabled=false;$<HTMLButtonElement>('restart').disabled=false;
  $('next-level').hidden=s.status!=='complete'||(!campaignStage&&!nextMainLevel(s.level,assets.worlds,assets.maps));
  $('next-level').textContent=campaignStage?'Mapa →':'Próxima →';
  if(!lastError)$('debug-info').textContent=`tick ${s.tick} · posição ${s.player.x}, ${s.player.y}\ncâmera ${s.camera.x}, ${s.camera.y} · vida ${s.health}/4 · ${s.lives} vidas\n${s.respawnTravel?'retorno ao checkpoint':s.status} · morte ${s.deathTicks} · ${s.diamonds} diamantes · ${s.redDiamonds} vermelhos · chaves ${s.goldKeys}/${s.silverKeys}`;
}
function showInspector(){inspectorVisible=true;$('inspector').hidden=false;inspectionDirty=true;drawInspector();$('inspector').scrollIntoView({behavior:'smooth',block:'start'});}
function drawInspector(){
  if(!inspectorVisible||!inspectionDirty||view==='audio')return;inspectionDirty=false;
  if(view==='levels'){
    const l=selectedLevel();inspection.width=l.width*24;inspection.height=l.height*24;ic.imageSmoothingEnabled=false;
    renderer.draw(ic,l,sceneTick,undefined,$<HTMLInputElement>('grid').checked);
    $('inspector-title').textContent=`${assets.strings[28+l.world]} · Fase ${l.index}`;
    $('inspector-description').textContent='Mapa decodificado dos três planos originais. Visualização de dados; carregar uma fase não significa que sua lógica já foi portada.';
  }else{
    const s=assets.sprite(sprite.value),p=Number(palette.value),cell=80,columns=8,rows=Math.ceil(s.frames.length/columns);
    inspection.width=columns*cell;inspection.height=Math.max(cell,rows*cell);ic.imageSmoothingEnabled=false;ic.fillStyle='#17251b';ic.fillRect(0,0,inspection.width,inspection.height);
    for(let f=0;f<s.frames.length;f++){
      const x=f%columns*cell,y=Math.floor(f/columns)*cell;ic.save();ic.beginPath();ic.rect(x,y,cell,cell);ic.clip();
      ic.fillStyle=(f%columns+Math.floor(f/columns))%2?'#25372a':'#1d2b22';ic.fillRect(x,y,cell,cell);
      const rect=s.frames[f].rect;sprites.frame(ic,s,f,x+Math.floor((cell-rect[2])/2)-rect[0],y+Math.floor((cell-rect[3])/2)-rect[1],0,p);
      ic.fillStyle='#d0d9bd';ic.font='9px monospace';ic.fillText(String(f),x+4,y+12);ic.restore();
    }
    $('inspector-title').textContent=`${s.name} · ${s.frames.length} frames`;
    $('inspector-description').textContent=`${s.modules.length} módulos · ${s.animations.length} animações · ${s.palettes.length} paletas. ${s.warnings.join('; ')}`;
  }
}
function updateSprite(){const s=assets.sprite(sprite.value);options(palette,s.palettes.map((_,i)=>({value:String(i),label:`Paleta ${i}`})));$('sprite-info').textContent=`${s.modules.length} módulos · ${s.frames.length} frames · ${s.animations.length} animações`;inspectionDirty=true;}
async function importFile(file:File|null){if(!file)return;try{const data=validateReplay(JSON.parse(await file.text()),assets.worlds);simulation=restoreReplay(data,assets.worlds);scene='playing';campaignStage=false;paused=true;clock.reset();lastError='';saveSession();}catch(e){report(String(e));}}
function backFront(){
  if(scene==='intro'){openMap();return;}
  if(scene==='map'){scene='seal';sealSelected=campaign?.world??0;}
  else if(scene==='seal'||scene==='options'||scene==='help'||scene==='about'||scene==='confirm'||scene==='more'||scene==='exit')scene='menu';
  input.clear();frontActionHeld=false;frontCooldown=0;
}
function moveFront(direction:number){
  if(scene==='menu'){
    const items=MENU_ITEMS.filter(id=>id!==1||!!campaign),index=items.indexOf(menuSelected as typeof MENU_ITEMS[number]);
    if(direction===1||direction===3)menuSelected=items[(index+(direction===1?items.length-1:1))%items.length];
  }else if(scene==='map'&&campaign){
    const next=adjacentNode(campaign,direction as 1|2|3|4,assets.maps);if(next){campaign.selected=next.level;saveCampaign();}
  }else if(scene==='seal'&&(direction===1||direction===3))sealSelected=(sealSelected+(direction===1?2:1))%3;
  else if(scene==='options'&&(direction===1||direction===3))pageSelected=1-pageSelected;
  else if(scene==='confirm'&&(direction===2||direction===4))pageSelected=1-pageSelected;
}
function enterFront(){
  if(scene==='intro'){
    if(introPage<0){introTick=Math.ceil(introWalkPixels/6);introPage=0;return;}
    if(++introPage>=introLines.length)openMap();return;
  }
  if(scene==='menu'){
    if(menuSelected===0){if(campaign){scene='confirm';confirmExit=false;pageSelected=1;}else{campaign=newCampaign();saveCampaign();startIntro();}}
    else if(menuSelected===1&&campaign)openMap();
    else if(menuSelected===2){scene='options';pageSelected=0;}
    else if(menuSelected===3)scene='more';
    else if(menuSelected===4)scene='help';
    else if(menuSelected===5)scene='about';
    else if(menuSelected===6){scene='confirm';confirmExit=true;pageSelected=1;}
  }else if(scene==='map')startSelected();
  else if(scene==='seal'&&campaign&&unlockedWorld(campaign,sealSelected,assets.maps))openMap(sealSelected);
  else if(scene==='options'){if(pageSelected===0){soundEnabled=!soundEnabled;if(!soundEnabled)audio.stop();}else backFront();}
  else if(scene==='confirm'){
    if(pageSelected===0){if(confirmExit){scene='exit';}else{campaign=newCampaign();saveCampaign();startIntro();}}
    else scene='menu';
  }else backFront();
}
function stepFront(){
  if(scene==='intro'){
    introTick++;
    if(introPage<0&&introTick*6>=introWalkPixels)introPage=0;
  }
  const frame=input.read();
  if(frontCooldown>0)frontCooldown--;
  if(frame.direction&&frontCooldown===0){moveFront(frame.direction);frontCooldown=4;}
  if(frame.action&&!frontActionHeld){enterFront();frontCooldown=5;}
  frontActionHeld=frame.action;
}
input.onCommand=code=>{if(!ready)return;if(scene!=='playing'){if(code==='Escape')backFront();return;}
  if(code==='Escape')togglePause();else if(code==='KeyR'&&simulation?.status==='dead')continueGameOver();
  else if(code==='KeyR'&&simulation?.status==='playing'){paused=false;clock.reset();}
  else if(code==='Enter'&&simulation?.status==='complete')advanceLevel();
  else if(code==='Enter'&&simulation?.status==='dead')continueGameOver();
  else if(code==='Period'&&simulation){paused=true;simulation.step({direction:0,action:false});}};
document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(button=>button.onclick=()=>{
  if(touchControls.editing)return;
  if(button.dataset.command==='pause'){if(scene==='playing')togglePause();else if(scene!=='menu')backFront();}
  else if(scene==='playing'){if(paused){if(campaignStage&&campaign)openMap(simulation?.level.world);else openMenu();}else togglePause();}
  else backFront();
});
game.addEventListener('pointerup',event=>{
  if(!ready||scene==='playing')return;
  if(scene==='intro'){enterFront();return;}
  const rect=game.getBoundingClientRect(),x=(event.clientX-rect.left)*240/rect.width,y=(event.clientY-rect.top)*320/rect.height;
  if(y>303&&x<26){backFront();return;}
  if(scene==='menu'){
    const items=MENU_ITEMS.filter(id=>id!==1||!!campaign),top=campaign?190:205,row=Math.floor((y-top+2)/15);
    if(row>=0&&row<items.length){menuSelected=items[row];enterFront();}
  }else if(scene==='map'&&campaign){
    if(y>303&&x>180){backFront();return;}
    const node=front.nodeAt(campaign,x,y);
    if(node&&unlockedNode(campaign,campaign.world,node,assets.maps)){if(campaign.selected===node.level)startSelected();else{campaign.selected=node.level;saveCampaign();}}
  }else if(scene==='seal'){
    const w=Math.round((y-96)/57);if(w>=0&&w<3){sealSelected=w;enterFront();}
  }else if(scene==='confirm'){
    if(y>240){pageSelected=x<120?0:1;enterFront();}
  }else if(scene==='options'){pageSelected=y>235?1:0;enterFront();}else backFront();
});
$('play').onclick=()=>openMenu();$('restart').onclick=()=>{if(simulation?.status==='dead')continueGameOver();else if(simulation?.status==='playing'){paused=false;input.queueReset();clock.reset();}};$('next-level').onclick=advanceLevel;$('pause').onclick=togglePause;
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game').closest('.player-panel')!.requestFullscreen();}catch(e){report(`Tela cheia não disponível: ${String(e)}`);}};
world.onchange=updateLevels;level.onchange=updateLevelInfo;$('grid').onchange=()=>inspectionDirty=true;
$('inspect').onclick=()=>{view='levels';showInspector();};$('test-level').onclick=()=>start(selectedLevel());
sprite.onchange=()=>{updateSprite();showInspector();};palette.onchange=()=>inspectionDirty=true;
$('close-inspector').onclick=()=>{inspectorVisible=false;$('inspector').hidden=true;};
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>button.onclick=()=>{
  view=button.dataset.view as typeof view;for(const b of document.querySelectorAll('[data-view]'))b.classList.toggle('selected',b===button);
  $('level-tools').hidden=view!=='levels';$('sprite-tools').hidden=view!=='sprites';$('audio-tools').hidden=view!=='audio';
  if(view==='sprites')showInspector();else if(view==='levels'){inspectionDirty=true;}else {$('inspector').hidden=true;inspectorVisible=false;}
});
$('step').onclick=()=>{if(!simulation)start();paused=true;simulation!.step(input.read());};
$('title').onclick=openMenu;
$('render-audit').onclick=()=>{
  const result=$('audit-result');try{
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d')!;
    let modules=0,frames=0,levels=0,warnings=0;
    for(const s of assets.sprites.values())for(let p=0;p<s.palettes.length;p++){
      for(let m=0;m<s.modules.length;m++){sprites.module(c,s,m,0,0,0,p);modules++;}
      for(let f=0;f<s.frames.length;f++){sprites.frame(c,s,f,120,120,0,p);frames++;}
    }
    for(const s of assets.sprites.values())warnings+=s.warnings.length;
    for(const w of assets.worlds)for(const l of w.levels){renderer.draw(c,l,0);levels++;}
    result.textContent=`PASS · ${modules} módulos/paletas · ${frames} frames/paletas · ${levels} mapas renderizados.\n${warnings} referências de animação inválidas documentadas na fonte.\nEsta checagem não certifica a lógica das fases.`;
  }catch(e){result.textContent=`FAIL · ${String(e)}`;console.error(e);}
};
$('export-replay').onclick=()=>{if(simulation)download('diamond-rush-replay.json',simulation.replay());else report('Inicie uma sessão antes de exportar o replay.');};
$('export-save').onclick=()=>{if(simulation)download('diamond-rush-session.json',simulation.replay());else report('Inicie uma sessão antes de exportar.');};
for(const [button,id] of [['import-replay','replay-file'],['import-save','save-file']]){
  $(button).onclick=()=>$<HTMLInputElement>(id).click();$<HTMLInputElement>(id).onchange=async e=>{const f=e.target as HTMLInputElement;await importFile(f.files?.[0]??null);f.value='';};
}
$('play-audio').onclick=async()=>{try{if(!soundEnabled)return;const id=$<HTMLSelectElement>('track').value,r=await fetch(`${import.meta.env.BASE_URL}assets/${id}.mid`);if(!r.ok)throw new Error('Faixa ausente');const song=parseMidi(new Uint8Array(await r.arrayBuffer()));await audio.play(song);$('audio-info').textContent=`${song.notes.length} notas · ${song.duration.toFixed(1)} segundos · ${song.tracks} trilhas`;}catch(e){report(String(e));}};
$('stop-audio').onclick=()=>audio.stop();
function showRms(save:CanonicalSave){
  $('rms-info').textContent=`${save.export().length} bytes · ${save.lives} vidas · vida máxima ${save.maxHealth}\n${save.diamonds} diamantes · ${save.redDiamonds} vermelhos\n`+
    save.worlds.map((w,i)=>`${assets.strings[28+i]}: ${w.levels.length} fases · liberada ${w.unlocked} · primeira secreta ${w.firstSecret}`).join('\n');
}
$('rms-template').onclick=()=>{try{const save=CanonicalSave.create(assets.worlds,assets.maps);showRms(save);}catch(e){report(String(e));}};
$('export-rms').onclick=()=>{try{const save=CanonicalSave.create(assets.worlds,assets.maps);showRms(save);downloadBlob('DiamondRush-record-1.bin',new Blob([save.export() as Uint8Array<ArrayBuffer>],{type:'application/octet-stream'}));}catch(e){report(String(e));}};
$('inspect-rms').onclick=()=>$<HTMLInputElement>('rms-file').click();
$<HTMLInputElement>('rms-file').onchange=async e=>{
  const element=e.target as HTMLInputElement,file=element.files?.[0];if(!file)return;
  try{if(file.size>1000)throw new Error('Forneça o payload do record 1, com até 1000 bytes; contêiner RMS não é aceito.');showRms(new CanonicalSave(new Uint8Array(await file.arrayBuffer())));}catch(error){$('rms-info').textContent=String(error);}finally{element.value='';}
};
inspection.onpointermove=e=>{if(view!=='levels')return;const rect=inspection.getBoundingClientRect(),x=Math.floor((e.clientX-rect.left)*inspection.width/rect.width/24),y=Math.floor((e.clientY-rect.top)*inspection.height/rect.height/24),l=selectedLevel(),i=x+y*l.width;$('hover-info').textContent=`(${x}, ${y}) · tile ${l.tiles[i]} · parâmetro ${l.parameters[i]} · objeto ${l.objects[i]}`;};
document.addEventListener('visibilitychange',()=>{if(document.hidden){paused=true;clock.reset();input.clear();audio.stop();saveSession();}});
window.addEventListener('pagehide',saveSession);
function updateFullscreenScale(){game.style.setProperty('--fullscreen-scale',String(Math.max(1,Math.floor(Math.min(window.innerWidth/240,window.innerHeight/320)))));}
window.addEventListener('resize',updateFullscreenScale);document.addEventListener('fullscreenchange',updateFullscreenScale);updateFullscreenScale();
async function boot(){
  try{
    await assets.load();updateLevels();options(sprite,assets.manifest.sprites.map(id=>({value:id,label:id})));updateSprite();
    const names=['Switch','Riddle','Death','Chest 1','Chest 2','Hurt','Hammer','Mine','Working','Checkpoint','Enemy hurt','Break','Hook','Water','Boulder','Level clear','Worlds','Bavaria','Tibet','Title','Game over'];
    options($<HTMLSelectElement>('track'),assets.manifest.audio.map((id,i)=>({value:id,label:`${i} · ${names[i]}`})));
    $('resource-line').textContent=`41 FASES · ${assets.manifest.sprites.length} SPRITES · 21 MIDIS ORIGINAIS`;$('loading').hidden=true;$<HTMLButtonElement>('play').disabled=false;ready=true;
    $('play').innerHTML='Abrir menu do jogo <span>→</span>';
    try{const stored=localStorage.getItem(CAMPAIGN_KEY);if(stored)campaign=validateCampaign(JSON.parse(stored),assets.maps);}catch{localStorage.removeItem(CAMPAIGN_KEY);}
    menuSelected=campaign?1:0;
    function frame(time:number){
      try{clock.advance(time,()=>{sceneTick++;if(scene==='playing'&&simulation&&!paused){
        if(simulation.status==='complete')results.step(Math.max(0,simulation.diamonds-simulation.initial.diamonds));
        else simulation.step(input.read());
        if(stageIntroTicks>0)stageIntroTicks--;
      }else if(scene!=='playing')stepFront();});drawGame();drawInspector();}
      catch(e){paused=true;report(`Falha de execução: ${String(e)}`);console.error(e);return;}
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }catch(e){$('loading').textContent=String(e);console.error(e);}
}
void boot();
