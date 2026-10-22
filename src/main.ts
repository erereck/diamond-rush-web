import './style.css';
import { AssetManager } from './assets/AssetManager.ts';
import { SpriteRenderer } from './render/SpriteRenderer.ts';
import { LevelRenderer } from './render/LevelRenderer.ts';
import { Display } from './render/Display.ts';
import { Clock } from './core/Clock.ts';
import { S700Engine } from './core/s700/Engine.ts';
import { SOUND_CUT, Simulation } from './core/Simulation.ts';
import { installWideHud, wideHud } from './core/s700/Hud.ts';
import type { HudLayer } from './core/s700/Hud.ts';
import { surroundObjects } from './core/s700/Surround.ts';
import type { SurroundLayer } from './core/s700/Surround.ts';
import type { InputFrame, SimulationSnapshot, StageStart } from './core/Simulation.ts';
import { Input } from './platform/Input.ts';
import { MobileControls } from './platform/MobileControls.ts';
import { GameSound } from './platform/GameSound.ts';
import { SettingsStore } from './platform/Settings.ts';
import type { PortSettings } from './platform/Settings.ts';
import { SESSION_KEY, restoreReplay, sessionReplay, validateReplay } from './platform/Session.ts';
import type { Replay } from './platform/Session.ts';
import { CanonicalSave } from './platform/CanonicalSave.ts';
import { campaignFromRecord, campaignRecord } from './platform/CanonicalCampaign.ts';
import { CAMPAIGN_KEY, adjacentNode, newCampaign, unlockedMapPath, unlockedNode, unlockedWorld, validateCampaign } from './core/Campaign.ts';
import type { Campaign } from './core/Campaign.ts';
import { FrontEndRenderer, MENU_ITEMS, PAUSE_ITEMS } from './render/FrontEndRenderer.ts';
import type { FrontScene, PauseScene } from './render/FrontEndRenderer.ts';
import { SEAL_ARROWS, nextSealItem, purchaseArmor, stepSealGlide } from './core/Store.ts';
import type { SealGlide } from './core/Store.ts';
import { LANGUAGE_KEY, languageStrings, validLocale } from './core/Localization.ts';
import type { GameLocale } from './core/Localization.ts';
import type { MapNode } from './level/LevelParser.ts';
import { SettingsPanel } from './ui/SettingsPanel.ts';
import { ui, uiCopy } from './ui/copy.ts';
import type { UiKey } from './ui/copy.ts';
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const game=$<HTMLCanvasElement>('game'),inspection=$<HTMLCanvasElement>('inspection'),ic=inspection.getContext('2d')!;
ic.imageSmoothingEnabled=false;
const assets=new AssetManager(),sprites=new SpriteRenderer(),renderer=new LevelRenderer(assets,sprites),clock=new Clock(),input=new Input(game);
const display=new Display(game,renderer,$('crt'));
installWideHud();
/** Everything the original game and the port's menus draw goes to the 240×320 screen; the display presents it. */
const ctx=display.screenContext;
const gameSound=new GameSound(import.meta.env.BASE_URL);
const front=new FrontEndRenderer(assets,sprites);
const touchControls=new MobileControls(input);
const store=new SettingsStore();
const panel=new SettingsPanel(store);
let settings:PortSettings=store.value;
/** Who started the running stage: the campaign map, New Game (tutorial) or the lab's stage test. */
type StageKind='campaign'|'tutorial'|'test';
let simulation:Simulation|null=null,stageKind:StageKind='test',paused=false,ready=false,sceneTick=0,view:'levels'|'sprites'|'audio'='levels',inspectionDirty=true,inspectorVisible=false,lastError='';
let scene:FrontScene|'playing'='menu',campaign:Campaign|null=null,menuSelected=0,sealSelected=0,storeSelected=0,storeMessage=0,storeToastTicks=0,pageSelected=0,confirmExit=false,frontCooldown=0,frontActionHeld=false;
let pauseScene:PauseScene='menu',pauseSelected=0,pauseConfirmAction:'restart'|'map'|'menu'|'exit'='restart',pauseCooldown=0,pauseActionHeld=false;
let mapTravel:{from:MapNode;to:MapNode;step:number;steps:number}|null=null;
let mapTravelQueue:MapNode[]=[];
let sealUnlockWorld:1|2|null=null,sealUnlockTick=0;
let sealGlide:SealGlide|null=null;
let mapUnlockNotice:{world?:1|2;armor?:1|2|3|4}|null=null,mapUnlockNoticeTicks=0;
let creditsScroll=0;
let locale:GameLocale=validLocale(localStorage.getItem(LANGUAGE_KEY));
const world=$<HTMLSelectElement>('world'),level=$<HTMLSelectElement>('level'),sprite=$<HTMLSelectElement>('sprite'),palette=$<HTMLSelectElement>('palette');
const selectedLevel=()=>assets.worlds[Number(world.value)].levels[Number(level.value)];
const say=(key:UiKey)=>ui(locale,key);

let toastTimer:ReturnType<typeof setTimeout>|null=null;
/** A short message over the picture (save states, errors). */
function toast(message:string){const t=$('toast');t.textContent=message;t.hidden=false;if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,1800);}
function report(message:string){lastError=message;$('debug-info').textContent=message;toast(message);}
function options(select:HTMLSelectElement,values:{value:string;label:string}[]){select.replaceChildren(...values.map(({value,label})=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;}));}
function updateLevels(){
  const w=Number(world.value);options(level,assets.worlds[w].levels.map(l=>({value:String(l.index),label:l.index===13&&w===0?'13 · Intro':`${String(l.index+1).padStart(2,'0')} · ${l.width} × ${l.height}`})));inspectionDirty=true;updateLevelInfo();
}
function updateLevelInfo(){const l=selectedLevel();$('level-info').textContent=`${l.width} × ${l.height} · ${l.tiles.filter(t=>t===1).length} ◆`;inspectionDirty=true;}
function saveCampaign(){if(campaign)try{campaign.canonicalRecord=[...campaignRecord(campaign,assets.worlds,assets.maps).export()];localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(campaign));}catch{report('Não foi possível salvar a campanha neste navegador.');}}
function leaveStage(){simulation=null;paused=false;gameSound.stop();input.clear();clock.reset();frontCooldown=0;rewindRing=[];}
function openMenu(){scene='menu';leaveStage();void gameSound.play(19);menuSelected=campaign?1:0;}
function openSeal(){
  if(!campaign)return;
  mapUnlockNotice=null;mapUnlockNoticeTicks=0;
  const save=campaignRecord(campaign,assets.worlds,assets.maps);
  sealUnlockWorld=null;sealUnlockTick=0;sealGlide=null;
  for(const w of [1,2] as const)if(unlockedWorld(campaign,w,assets.maps)&&!(save.sealFlags&(w===1?1:2))){save.discoverSealWorld(w);sealSelected=w;sealUnlockWorld=w;}
  campaign.canonicalRecord=[...save.export()];
  scene='seal';leaveStage();saveCampaign();game.focus();
}
function openMap(world=campaign?.world??0){if(!campaign)return;mapUnlockNotice=null;mapUnlockNoticeTicks=0;campaign.world=world;campaign.selected=assets.maps[world].find(n=>n.level===campaign!.selected&&unlockedNode(campaign!,world,n,assets.maps))?.level??0;mapTravel=null;mapTravelQueue=[];scene='map';leaveStage();saveCampaign();game.focus();}
function beginMapTravel(to:MapNode){
  if(!campaign||mapTravel)return;
  const from=assets.maps[campaign.world].find(n=>n.level===campaign!.selected);
  if(!from||from.level===to.level)return;
  const steps=Math.ceil(Math.max(Math.abs(to.x-from.x),Math.abs(to.y-from.y))*13/10)+1;
  mapTravel={from,to,step:0,steps};
}
function mapTravelCursor(){
  if(!mapTravel)return undefined;
  const {from,to,step,steps}=mapTravel,t=Math.min(1,step/Math.max(1,steps-1));
  return {x:Math.round(43+(from.x+(to.x-from.x)*t)*13),y:Math.round(79+(from.y+(to.y-from.y)*t)*13),left:to.x<from.x};
}
/** Runs a stage on the original game logic, which also draws it. */
function play(kind:StageKind,sim:Simulation){
  simulation=sim;stageKind=kind;scene='playing';paused=false;gameSound.stop();clock.reset();input.clear();lastError='';rewindRing=[];
  cheatLives=sim.lives;
  playSounds(sim);
  game.focus();saveSession();
}
/** Stage loads in this play session (cGame.field_167): New Game and Continue reset it; every stage load counts. */
let sessionStageLoads=0;
/** New Game: the tutorial is world 0, stage 13, loaded by the game's own New Game path. */
function startIntro(){const sim=new Simulation(assets.worlds[0].levels[13],{world:0,level:13});sessionStageLoads=sim.stageLoads;play('tutorial',sim);}
function startTest(l=assets.worlds[0].levels[0],resources?:StageStart){play('test',new Simulation(l,{world:l.world,level:l.index,resources}));}
function startCampaignStage(world:number,index:number){
  if(!campaign)return;
  const record=campaignRecord(campaign,assets.worlds,assets.maps).export();
  const sim=new Simulation(assets.worlds[world].levels[index],{world,level:index,record,stageLoads:sessionStageLoads});
  sessionStageLoads=sim.stageLoads;
  play('campaign',sim);
}
function startSelected(){if(!campaign)return;const node=assets.maps[campaign.world].find(n=>n.level===campaign!.selected);if(!node||!unlockedNode(campaign,campaign.world,node,assets.maps))return;startCampaignStage(campaign.world,node.level);}
/** The game wrote the stage outcome (or the game-over penalty) into its record: adopt it. */
function finishStage(){
  const s=simulation;if(!s||s.status!=='complete')return;
  if(stageKind==='test'){openMenu();return;}
  const notice=s.takeMapNotice();
  const save=new CanonicalSave(s.record());
  const next=validateCampaign(campaignFromRecord(save,assets.worlds,assets.maps),assets.maps);
  // After a crystal the original shows its seal (state 27) and the player picks the next world there.
  const world=s.mapWorld;
  next.world=world;next.selected=stageKind==='tutorial'||world!==s.level.world?0:s.level.index;
  campaign=next;saveCampaign();
  // The original loads Angkor 1 right after the tutorial's seal scene.
  if(stageKind==='tutorial'){startCampaignStage(0,0);return;}
  openMap(world);
  // cGame.method_74 joins the queued world and item notices on the map.
  if(notice.world||notice.armor){mapUnlockNotice={...(notice.world?{world:notice.world}:{}),...(notice.armor?{armor:notice.armor}:{})};mapUnlockNoticeTicks=100;}
}
function togglePause(){if(!simulation||simulation.status!=='playing')return;paused=!paused;if(paused){pauseScene='menu';pauseSelected=0;pauseCooldown=0;pauseActionHeld=false;}clock.reset();input.clear();saveSession();}
function saveSession(){if(simulation){try{localStorage.setItem(SESSION_KEY,JSON.stringify(sessionReplay(simulation)));}catch{/* The session stays playable; export it from the lab. */}}}
function downloadBlob(name:string,blob:Blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function download(name:string,data:unknown){downloadBlob(name,new Blob([JSON.stringify(data)],{type:'application/json'}));}
function drawFront(){
  if(scene==='menu')front.drawMenu(ctx,menuSelected,!!campaign,sceneTick);
  else if(scene==='map'&&campaign){front.drawMap(ctx,campaign,sceneTick,mapTravelCursor());if(mapUnlockNotice)front.drawWorldNotice(ctx,mapUnlockNotice);}
  else if(scene==='seal'&&campaign)front.drawSeal(ctx,campaign,sealSelected,sceneTick,sealUnlockWorld,sealUnlockTick,sealGlide);
  else if(scene==='store'&&campaign)front.drawStore(ctx,campaign,storeSelected,storeMessage,storeToastTicks>0);
  else if(scene==='about')front.drawCredits(ctx,creditsScroll);
  else if(scene==='options'||scene==='help'||scene==='confirm'||scene==='more'||scene==='exit')front.drawPage(ctx,scene,settings.sound,settings.vibration,pageSelected,confirmExit);
  if(!lastError)$('debug-info').textContent=`${scene}`;
}
function drawGame(){
  if(scene!=='playing'||!simulation){drawFront();display.present(null);return;}
  const s=simulation;
  s.draw(ctx);
  if(paused)front.drawPause(ctx,pauseScene,pauseSelected,settings.sound,settings.vibration,stageKind==='campaign'&&!!campaign,pauseConfirmAction==='exit');
  const cells=s.liveCells();
  display.present(cells?{cells,camera:s.camera,tick:sceneTick,...s.effects,hud:wideHud.active,objects:surroundObjects.active,paused}:null);
  if(!lastError){const h=s.hero;$('debug-info').textContent=`tick ${s.tick} · state ${s.gameState} · ${h.x},${h.y}\n♥ ${s.health}/${s.maxHealth} · ${s.lives} · ◆ ${s.stageDiamonds} · ${s.stageRedDiamonds} · 🔑 ${s.goldKeys}/${s.silverKeys}`;}
}
function showInspector(){inspectorVisible=true;$('inspector').hidden=false;panel.close();inspectionDirty=true;drawInspector();}
function drawInspector(){
  if(!inspectorVisible||!inspectionDirty||view==='audio')return;inspectionDirty=false;
  if(view==='levels'){
    const l=selectedLevel();inspection.width=l.width*24;inspection.height=l.height*24;ic.imageSmoothingEnabled=false;
    renderer.draw(ic,l,sceneTick,$<HTMLInputElement>('grid').checked);
    $('inspector-title').textContent=`${assets.strings[28+l.world]} · ${l.index===13&&l.world===0?'Intro':l.index+1}`;
    $('inspector-description').textContent='';
  }else{
    const s=assets.sprite(sprite.value),p=Number(palette.value),cell=80,columns=8,rows=Math.ceil(s.frames.length/columns);
    inspection.width=columns*cell;inspection.height=Math.max(cell,rows*cell);ic.imageSmoothingEnabled=false;ic.fillStyle='#111';ic.fillRect(0,0,inspection.width,inspection.height);
    for(let f=0;f<s.frames.length;f++){
      const x=f%columns*cell,y=Math.floor(f/columns)*cell;ic.save();ic.beginPath();ic.rect(x,y,cell,cell);ic.clip();
      ic.fillStyle=(f%columns+Math.floor(f/columns))%2?'#1c1c1c':'#151515';ic.fillRect(x,y,cell,cell);
      const rect=s.frames[f].rect;sprites.frame(ic,s,f,x+Math.floor((cell-rect[2])/2)-rect[0],y+Math.floor((cell-rect[3])/2)-rect[1],0,p);
      ic.fillStyle='#bbb';ic.font='9px monospace';ic.fillText(String(f),x+4,y+12);ic.restore();
    }
    $('inspector-title').textContent=`${s.name} · ${s.frames.length} frames`;
    $('inspector-description').textContent=`${s.modules.length} modules · ${s.animations.length} animations · ${s.palettes.length} palettes. ${s.warnings.join('; ')}`;
  }
}
function updateSprite(){const s=assets.sprite(sprite.value);options(palette,s.palettes.map((_,i)=>({value:String(i),label:String(i)})));$('sprite-info').textContent=`${s.modules.length} modules · ${s.frames.length} frames · ${s.animations.length} animations`;inspectionDirty=true;}
async function importFile(file:File|null){if(!file)return;try{const data=validateReplay(JSON.parse(await file.text()),assets.worlds);const sim=restoreReplay(data,assets.worlds);play('test',sim);if(sim.status==='playing'){paused=true;pauseScene='menu';pauseSelected=0;}panel.close();}catch(e){report(String(e));}}
function backFront(){
  if(scene==='map'&&mapUnlockNotice){mapUnlockNotice=null;mapUnlockNoticeTicks=0;return;}
  if(scene==='map'){sealSelected=campaign?.world??0;openSeal();return;}
  if(scene==='seal'&&sealUnlockWorld!==null)return;
  else if(scene==='store'){scene='seal';sealSelected=3;storeMessage=0;storeToastTicks=0;}
  else if(scene==='seal'||scene==='options'||scene==='help'||scene==='about'||scene==='confirm'||scene==='more'||scene==='exit')scene='menu';
  input.clear();frontActionHeld=false;frontCooldown=0;
}
function moveFront(direction:number){
  if(scene==='seal'&&sealUnlockWorld!==null)return;
  if(scene==='about'){if(direction===1)creditsScroll=Math.max(0,creditsScroll-3);else if(direction===3)creditsScroll+=3;}
  else if(scene==='menu'){
    const items=MENU_ITEMS.filter(id=>id!==1||!!campaign),index=items.indexOf(menuSelected as typeof MENU_ITEMS[number]);
    if(direction===1||direction===3)menuSelected=items[(index+(direction===1?items.length-1:1))%items.length];
  }else if(scene==='map'&&campaign){
    const next=adjacentNode(campaign,direction as 1|2|3|4,assets.maps);if(next)beginMapTravel(next);
  }else if(scene==='seal'&&!sealGlide){
    const next=nextSealItem(sealSelected,direction as 1|2|3|4);
    if(next>=0){const [x,y]=SEAL_ARROWS[sealSelected];sealGlide={x,y,step:0,name:sealSelected};sealSelected=next;}
  }else if(scene==='store'&&(direction===1||direction===3)){storeSelected=(storeSelected+(direction===1?3:1))%4;storeMessage=0;storeToastTicks=0;}
  else if(scene==='options'&&(direction===1||direction===3))pageSelected=1-pageSelected;
  else if(scene==='confirm'&&(direction===1||direction===3))pageSelected=1-pageSelected;
}
/** The original's Options page (sound, vibration) edits the same settings as the port's panel. */
function toggleOriginalOption(row:number){if(row===0)store.update({sound:!settings.sound});else store.update({vibration:!settings.vibration});}
function enterFront(){
  if(scene==='seal'&&(sealUnlockWorld!==null||sealGlide))return;
  if(scene==='menu'){
    if(menuSelected===0){if(campaign){scene='confirm';confirmExit=false;pageSelected=0;}else{campaign=newCampaign();saveCampaign();startIntro();}}
    else if(menuSelected===1&&campaign){sessionStageLoads=0;openSeal();}
    else if(menuSelected===2){scene='options';pageSelected=0;}
    else if(menuSelected===3)scene='more';
    else if(menuSelected===4)scene='help';
    else if(menuSelected===5){scene='about';creditsScroll=0;}
    else if(menuSelected===6){scene='confirm';confirmExit=true;pageSelected=0;}
  }else if(scene==='map'){if(!mapTravel)startSelected();}
  else if(scene==='seal'&&campaign){if(sealSelected===3){scene='store';storeSelected=0;storeMessage=0;storeToastTicks=0;}else if(unlockedWorld(campaign,sealSelected,assets.maps)){
    // method_75 (the seal of state 27): Bavaria grants the hammer, Tibet the hook. The text seal menu
    // (sealMenuSelectionHandler), which would also set eight hearts, is unreachable in the original.
    if(sealSelected===1&&(campaign.resources.weaponTier??0)<1)campaign.resources.weaponTier=1;
    if(sealSelected===2&&(campaign.resources.weaponTier??0)<2)campaign.resources.weaponTier=2;
    openMap(sealSelected);
  }}
  else if(scene==='store'&&campaign){const purchase=purchaseArmor(campaign,storeSelected);campaign=purchase.campaign;storeMessage=purchase.result==='short'?89:purchase.result==='owned'?81:0;storeToastTicks=purchase.result==='bought'?100:0;if(purchase.result==='bought')saveCampaign();}
  else if(scene==='options')toggleOriginalOption(pageSelected);
  else if(scene==='confirm'){
    if(pageSelected===1){if(confirmExit){scene='exit';}else{campaign=newCampaign();saveCampaign();startIntro();}}
    else scene='menu';
  }else backFront();
}
function stepFront(){
  const frame=input.read();
  if(scene==='map'&&mapUnlockNotice){
    if(frame.action||frame.direction||--mapUnlockNoticeTicks<=0){mapUnlockNotice=null;mapUnlockNoticeTicks=0;}
    frontActionHeld=frame.action;return;
  }
  if(scene==='seal'&&sealUnlockWorld!==null){
    if(++sealUnlockTick>=front.sealUnlockDuration()+30){sealUnlockWorld=null;sealUnlockTick=0;}
    frontActionHeld=frame.action;return;
  }
  if(scene==='seal'&&sealGlide){sealGlide=stepSealGlide(sealGlide,sealSelected);frontActionHeld=frame.action;return;}
  if(scene==='map'&&mapTravel){
    mapTravel.step++;
    if(mapTravel.step>=mapTravel.steps){if(campaign){campaign.selected=mapTravel.to.level;saveCampaign();}mapTravel=null;const next=mapTravelQueue.shift();if(next)beginMapTravel(next);}
    frontActionHeld=frame.action;return;
  }
  if(scene==='store'&&storeToastTicks>0)storeToastTicks--;
  if(scene==='about'){
    creditsScroll++;
    if(creditsScroll>assets.credits.split(/\r?\n/).length*17+320)creditsScroll=0;
  }
  if(frontCooldown>0)frontCooldown--;
  if(frame.direction&&frontCooldown===0){moveFront(frame.direction);frontCooldown=4;}
  if(frame.action&&!frontActionHeld){enterFront();frontCooldown=5;}
  frontActionHeld=frame.action;
}

// ── Sound ───────────────────────────────────────────────────────────────────────────────────────
/** The original's sound requests of the last frame: plays, and cuts (cSoundEngine.freeCrtPlayerResource). */
function playSounds(s:Simulation){for(const id of s.sounds){if(id===SOUND_CUT)gameSound.cut();else void gameSound.play(id);}}

// ── Extras: cheats, rewind, save states ─────────────────────────────────────────────────────────
/** Lives at the start of the stage, kept by the infinite-lives cheat. */
let cheatLives=5;
function applyCheats(s:Simulation){
  if(s.status!=='playing')return;
  const g=s.game,record=S700Engine.core.recordData as Int8Array;
  if(settings.infiniteLives&&g.playerLifeCount<cheatLives)g.playerLifeCount=cheatLives;
  if(settings.infiniteHealth&&g.field_239<record[8])g.field_239=record[8];
  if(settings.allEquipment){record[9]=8;record[10]=1;}
}
/** Rewind keeps a snapshot every REWIND_EVERY frames, REWIND_FRAMES of them (30 s at normal speed). */
const REWIND_EVERY=10,REWIND_FRAMES=60;
let rewindRing:SimulationSnapshot[]=[],rewinding=false,rewindDelay=0,turbo=false;
function recordRewind(s:Simulation){
  if(!settings.rewind||s.status!=='playing'||s.tick%REWIND_EVERY)return;
  rewindRing.push(s.snapshot());if(rewindRing.length>REWIND_FRAMES)rewindRing.shift();
}
/** Rewinding goes back one snapshot every other 20 Hz frame: five times faster than play, at any refresh rate. */
function stepRewind(s:Simulation){
  if(--rewindDelay>0)return;rewindDelay=2;
  const snap=rewindRing.length>1?rewindRing.pop()!:rewindRing[0];
  if(snap){s.restore(snap);gameSound.stop();}
}
const STATE_KEY=(w:number,l:number)=>`diamond-rush:state:v1:${w}-${l}`;
interface SavedState {kind:StageKind;replay:Replay}
/** States of this visit restore exactly (with cheats); the stored replay restores them after a reload. */
const memoryStates=new Map<string,{sim:Simulation;snapshot:SimulationSnapshot;kind:StageKind}>();
function saveState(){
  const s=simulation;if(!s||scene!=='playing'){toast(say('stateNeedsStage'));return;}
  const key=STATE_KEY(s.level.world,s.level.index);
  memoryStates.set(key,{sim:s,snapshot:s.snapshot(),kind:stageKind});
  try{localStorage.setItem(key,JSON.stringify({kind:stageKind,replay:sessionReplay(s)} satisfies SavedState));}catch{/* The state of this visit is kept in memory. */}
  toast(say('stateSaved'));
}
function loadState(){
  const s=simulation;if(!s||scene!=='playing'){toast(say('stateNeedsStage'));return;}
  const key=STATE_KEY(s.level.world,s.level.index),memory=memoryStates.get(key);
  if(memory&&memory.sim===s){s.restore(memory.snapshot);paused=false;rewindRing=[];gameSound.stop();toast(say('stateLoaded'));return;}
  try{
    const stored=JSON.parse(localStorage.getItem(key)??'null') as SavedState|null;
    if(!stored){toast(say('stateMissing'));return;}
    const sim=restoreReplay(validateReplay(stored.replay,assets.worlds),assets.worlds);
    play(stored.kind,sim);toast(say('stateLoaded'));
  }catch(e){report(String(e));}
}

/** Development builds can feed recorded controls instead of the keyboard (window.__diamondRush). */
const scriptedInputs:InputFrame[]=[];
/** One press of the right soft key for the original's own screens (results, seal, shop after a crystal). */
let pendingBack=false;
/** One 20 Hz frame of the original game, with its sound requests and vibrations. */
function stepStage(s:Simulation){
  const frame=scriptedInputs.shift()??input.read();
  if(pendingBack){frame.back=true;pendingBack=false;}
  s.step(frame);
  applyCheats(s);
  if(settings.sound)playSounds(s);
  if(s.vibrate&&settings.vibration)navigator.vibrate?.(200);
  recordRewind(s);
  if(s.status==='complete')finishStage();
}
/** One 20 Hz frame: the stage (or its rewind), the pause menu, or the port's own screens. */
function tick(){
  sceneTick++;
  if(scene==='playing'&&simulation){
    if(paused)stepPause();
    else if(rewinding&&settings.rewind)stepRewind(simulation);
    else stepStage(simulation);
  }else if(scene!=='playing')stepFront();
}
/**
 * The original's Restart and Go to Map keep the lives lost in the stage (playerLifeCount stays in memory;
 * only Continue from the main menu reloads the record), so a restart cannot refund them.
 */
function keepStageLives(s:Simulation){if(stageKind==='campaign'&&campaign&&s.lives>=0)campaign.resources.lives=s.lives;}
function restartStage(){
  const s=simulation;if(!s)return;
  if(stageKind==='tutorial')startIntro();
  else if(stageKind==='campaign'){keepStageLives(s);startCampaignStage(s.level.world,s.level.index);}
  else startTest(s.level,s.start.resources);
}
function backPause(){
  if(pauseScene==='menu')togglePause();
  else {pauseScene='menu';pauseSelected=0;input.clear();pauseActionHeld=false;pauseCooldown=0;}
}
function enterPause(){
  if(!simulation)return;
  if(pauseScene==='menu'){
    const selected=PAUSE_ITEMS[pauseSelected];
    if(selected===25){togglePause();return;}
    if(selected===2){pauseScene='options';pauseSelected=0;return;}
    if(selected===4){pauseScene='help';return;}
    if(selected===49&&(stageKind!=='campaign'||!campaign))return;
    pauseConfirmAction=selected===26?'restart':selected===49?'map':selected===27?'menu':'exit';
    pauseScene='confirm';pauseSelected=0;
  }else if(pauseScene==='options')toggleOriginalOption(pauseSelected);
  else if(pauseScene==='confirm'){
    if(pauseSelected===0){pauseScene='menu';pauseSelected=0;return;}
    const action=pauseConfirmAction;
    if(action==='restart')restartStage();
    else if(action==='map'&&campaign){keepStageLives(simulation);openMap(simulation.level.world);}
    else if(action==='exit'){openMenu();scene='exit';}
    else openMenu();
  }else backPause();
}
function stepPause(){
  const frame=input.read();if(pauseCooldown>0)pauseCooldown--;
  if(frame.direction&&pauseCooldown===0&&(frame.direction===1||frame.direction===3)){
    const count=pauseScene==='menu'?PAUSE_ITEMS.length:2;
    if(pauseScene!=='help')pauseSelected=(pauseSelected+(frame.direction===1?count-1:1))%count;
    pauseCooldown=4;
  }
  if(frame.action&&!pauseActionHeld){enterPause();pauseCooldown=5;}
  pauseActionHeld=frame.action;
}
input.onCommand=code=>{if(!ready||panel.open)return;if(scene!=='playing'){if(code==='Escape')backFront();return;}
  if(code==='Escape'){if(paused)backPause();else if(simulation?.status==='finishing')pendingBack=true;else togglePause();return;}
  if(code==='Period'&&simulation&&paused&&simulation.status==='playing'){stepStage(simulation);unpauseIfOver();}};
/** A paused session that a single step carried out of play (results, seal, game over) must keep running: only play can be paused. */
function unpauseIfOver(){if(simulation&&simulation.status!=='playing'&&paused)paused=false;}
document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(button=>button.onclick=()=>{
  if(touchControls.editing)return;
  if(button.dataset.command==='pause'){if(scene==='playing')togglePause();else if(scene!=='menu')backFront();}
  else if(scene==='playing'){if(paused)backPause();else if(simulation?.status==='finishing')pendingBack=true;else togglePause();}
  else backFront();
  game.focus();
});
/** The touch « and » buttons rewind and fast-forward while held, like Backspace and Tab. */
document.querySelectorAll<HTMLButtonElement>('[data-hold]').forEach(button=>{
  const hold=(on:boolean)=>{if(button.dataset.hold==='rewind')rewinding=on&&settings.rewind;else{turbo=on&&settings.turbo;applySpeed();}};
  button.addEventListener('pointerdown',e=>{if(touchControls.editing)return;e.preventDefault();button.setPointerCapture(e.pointerId);hold(true);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'] as const)button.addEventListener(event,()=>hold(false));
});
game.addEventListener('pointerup',event=>{
  if(!ready||touchControls.editing)return;
  if(scene==='map'&&mapUnlockNotice){mapUnlockNotice=null;mapUnlockNoticeTicks=0;return;}
  const {x,y}=display.toScreen(event.clientX,event.clientY);
  if(x<0||y<0||x>=240||y>=320)return;
  // Soft keys as FrontEndRenderer draws them (ui-3 at y 308): the left one selects, the right one goes back.
  // They are checked before any row, since the bottom rows of the confirmation pages reach y 317.
  const softLeft=y>=303&&x<26,softRight=y>=303&&x>=214;
  if(scene==='playing'){
    if(!paused){if(softRight&&simulation?.status==='finishing')pendingBack=true;return;}
    if(softRight){backPause();return;}
    if(softLeft){enterPause();return;}
    if(pauseScene==='help'){backPause();return;}
    const count=pauseScene==='menu'?PAUSE_ITEMS.length:2;
    const top=Math.floor(160-(count*15+3)/2),row=Math.floor((y-top)/15);
    if(row>=0&&row<count){pauseSelected=row;enterPause();}
    return;
  }
  if(softRight){backFront();return;}
  // Two-row pages (options, confirmations) draw no left soft key: their rows reach the bottom edge.
  if(softLeft&&scene!=='options'&&scene!=='confirm'){enterFront();return;}
  if(scene==='menu'){
    const items=MENU_ITEMS.filter(id=>id!==1||!!campaign),top=campaign?198:213,row=Math.floor((y-top)/15);
    if(row>=0&&row<items.length){menuSelected=items[row];enterFront();}
  }else if(scene==='map'&&campaign){
    if(y>303&&x>180){backFront();return;}
    const node=front.nodeAt(campaign,x,y);
    if(node&&!mapTravel&&unlockedNode(campaign,campaign.world,node,assets.maps)){
      if(campaign.selected===node.level)startSelected();
      else {const path=unlockedMapPath(campaign,node,assets.maps);if(path?.length){mapTravelQueue=path.slice(1);beginMapTravel(path[0]);}}
    }
  }else if(scene==='seal'){
    const item=x<119&&y<139?0:x>=119&&y<139?1:y<180&&x<137?2:3;
    if(!sealGlide){sealSelected=item;enterFront();}
  }else if(scene==='store'){
    const item=Math.floor((y-43)/20);if(item>=0&&item<4){if(item===storeSelected)enterFront();else{storeSelected=item;storeMessage=0;storeToastTicks=0;}}
  }else if(scene==='confirm'){
    if(y>=285){pageSelected=y>=302?1:0;enterFront();}
  }else if(scene==='options'){if(y>=285){pageSelected=y>=302?1:0;enterFront();}}else backFront();
});

// ── Port shell: panel, shortcuts, fullscreen ────────────────────────────────────────────────────
async function toggleFullscreen(){
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen({navigationUI:'hide'});}
  catch(e){report(String(e));}finally{game.focus();}
}
$('fullscreen').onclick=()=>void toggleFullscreen();
$('state-save').onclick=()=>{panel.close();saveState();};
$('state-load').onclick=()=>{panel.close();loadState();};
$('title').onclick=()=>{panel.close();openMenu();game.focus();};
panel.onToggle=open=>{clock.reset();input.clear();if(!open)game.focus();};
touchControls.onEditingChange=editing=>{if(editing)panel.close();};
/** Text fields keep their keys; toggles and sliders in the panel do not. */
const typing=(target:EventTarget|null)=>target instanceof HTMLSelectElement||target instanceof HTMLTextAreaElement||
  (target instanceof HTMLInputElement&&!['checkbox','radio','range','button','file'].includes(target.type));
window.addEventListener('keydown',e=>{
  if(panel.open&&e.code==='Escape'){e.preventDefault();panel.close();return;}
  if(typing(e.target))return;
  if(e.code==='KeyO'){e.preventDefault();panel.toggle();return;}
  if(panel.open)return;
  if(e.code==='KeyF'){e.preventDefault();void toggleFullscreen();return;}
  if(e.code==='Tab'&&settings.turbo){e.preventDefault();turbo=true;applySpeed();return;}
  if(e.code==='Backspace'&&settings.rewind){e.preventDefault();rewinding=true;return;}
  if(e.code==='F5'&&settings.saveStates){e.preventDefault();if(!e.repeat)saveState();return;}
  if(e.code==='F7'&&settings.saveStates){e.preventDefault();if(!e.repeat)loadState();return;}
},{capture:true});
window.addEventListener('keyup',e=>{
  if(e.code==='Tab'){turbo=false;applySpeed();}
  if(e.code==='Backspace')rewinding=false;
});
window.addEventListener('blur',()=>{turbo=false;rewinding=false;applySpeed();});
function applySpeed(){clock.speed=settings.speed*(turbo?3:1);}
/** The settings button hides while playing undisturbed and comes back with the pointer. */
let idleTimer:ReturnType<typeof setTimeout>|null=null;
function wake(){document.body.classList.remove('idle');if(idleTimer)clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(scene==='playing'&&!panel.open)document.body.classList.add('idle');},2500);}
for(const event of ['pointermove','pointerdown','keydown'])window.addEventListener(event,wake,{passive:true});

// ── Lab ─────────────────────────────────────────────────────────────────────────────────────────
world.onchange=updateLevels;level.onchange=updateLevelInfo;$('grid').onchange=()=>inspectionDirty=true;
$('inspect').onclick=()=>{view='levels';showInspector();};
$('test-level').onclick=()=>{
  const l=selectedLevel(),weaponTier=Number($<HTMLSelectElement>('test-weapon').value) as 0|1|2|8;
  panel.close();
  // A lab test never adopts the record it writes, so the tutorial runs as a test too.
  if(l.world===0&&l.index===13){play('test',new Simulation(l,{world:0,level:13}));return;}
  startTest(l,{diamonds:0,redDiamonds:0,lives:5,health:4,maxHealth:4,weaponTier});
};
sprite.onchange=()=>{updateSprite();showInspector();};palette.onchange=()=>inspectionDirty=true;
$('close-inspector').onclick=()=>{inspectorVisible=false;$('inspector').hidden=true;game.focus();};
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>button.onclick=()=>{
  view=button.dataset.view as typeof view;for(const b of document.querySelectorAll('[data-view]'))b.classList.toggle('selected',b===button);
  $('level-tools').hidden=view!=='levels';$('sprite-tools').hidden=view!=='sprites';$('audio-tools').hidden=view!=='audio';
  if(view==='sprites')showInspector();else if(view==='levels'){inspectionDirty=true;}else {$('inspector').hidden=true;inspectorVisible=false;}
});
$('step').onclick=()=>{if(!simulation)startTest();if(simulation?.status==='playing'){paused=true;stepStage(simulation);unpauseIfOver();}else if(simulation)stepStage(simulation);};
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
    result.textContent=`PASS · ${modules} modules · ${frames} frames · ${levels} maps · ${warnings} documented warnings`;
  }catch(e){result.textContent=`FAIL · ${String(e)}`;console.error(e);}
};
$('export-replay').onclick=()=>{if(simulation)download('diamond-rush-replay.json',sessionReplay(simulation));else report(say('stateNeedsStage'));};
$('export-save').onclick=()=>{if(simulation)download('diamond-rush-session.json',sessionReplay(simulation));else report(say('stateNeedsStage'));};
for(const [button,id] of [['import-replay','replay-file'],['import-save','save-file']]){
  $(button).onclick=()=>$<HTMLInputElement>(id).click();$<HTMLInputElement>(id).onchange=async e=>{const f=e.target as HTMLInputElement;await importFile(f.files?.[0]??null);f.value='';};
}
$('play-audio').onclick=async()=>{try{gameSound.unlock();const info=await gameSound.preview(Number($<HTMLSelectElement>('track').value));$('audio-info').textContent=`${info.notes} notes · ${info.duration.toFixed(1)} s · ${info.tracks} tracks`;}catch(e){report(String(e));}};
$('stop-audio').onclick=()=>gameSound.stop();
function showRms(save:CanonicalSave){
  $('rms-info').textContent=`${save.export().length} bytes · ${save.lives} lives · max health ${save.maxHealth}\n${save.diamonds} ◆ · ${save.redDiamonds} red · equipment ${save.weaponTier}\n`+
    save.worlds.map((w,i)=>`${assets.strings[28+i]}: ${w.levels.length} stages · unlocked ${w.unlocked} · first secret ${w.firstSecret}`).join('\n');
}
$('rms-template').onclick=()=>{try{const save=CanonicalSave.create(assets.worlds,assets.maps);showRms(save);}catch(e){report(String(e));}};
let importRmsAsCampaign=false;
$('export-rms').onclick=()=>{try{const save=campaign?campaignRecord(campaign,assets.worlds,assets.maps):CanonicalSave.create(assets.worlds,assets.maps);showRms(save);downloadBlob('DiamondRush-record-1.bin',new Blob([save.export() as Uint8Array<ArrayBuffer>],{type:'application/octet-stream'}));}catch(e){report(String(e));}};
$('inspect-rms').onclick=()=>{importRmsAsCampaign=false;$<HTMLInputElement>('rms-file').click();};
$('load-rms').onclick=()=>{importRmsAsCampaign=true;$<HTMLInputElement>('rms-file').click();};
$<HTMLInputElement>('rms-file').onchange=async e=>{
  const element=e.target as HTMLInputElement,file=element.files?.[0];if(!file)return;
  try{if(file.size>1000)throw new Error('RMS record 1: up to 1000 bytes; emulator containers are not accepted.');const save=new CanonicalSave(new Uint8Array(await file.arrayBuffer()));showRms(save);if(importRmsAsCampaign){const imported=campaignFromRecord(save,assets.worlds,assets.maps);campaign=validateCampaign(imported,assets.maps);saveCampaign();panel.close();openMap(campaign.world);}}catch(error){$('rms-info').textContent=String(error);}finally{element.value='';}
};
inspection.onpointermove=e=>{if(view!=='levels')return;const rect=inspection.getBoundingClientRect(),x=Math.floor((e.clientX-rect.left)*inspection.width/rect.width/24),y=Math.floor((e.clientY-rect.top)*inspection.height/rect.height/24),l=selectedLevel(),i=x+y*l.width;$('hover-info').textContent=`(${x}, ${y}) · tile ${l.tiles[i]} · param ${l.parameters[i]} · object ${l.objects[i]}`;};

// ── Settings applied live ───────────────────────────────────────────────────────────────────────
let soundUnlocked=false;
function unlockGameSound(){if(soundUnlocked||!ready||!settings.sound)return;soundUnlocked=true;gameSound.unlock();if(scene==='menu')void gameSound.play(19);}
document.addEventListener('pointerdown',unlockGameSound);
document.addEventListener('keydown',unlockGameSound);
/**
 * The wide HUD and the stage's objects beyond the screen are drawn by the original into the display's
 * layers; a new layer or mode paints the running stage again.
 */
let hudLayer:HudLayer|null|undefined,objectsLayer:SurroundLayer|null|undefined;
function applyLayers(){
  const hud=settings.hud==='wide'?display.hudLayer:null,objects=settings.surround==='stage-objects'?display.objectsLayer:null;
  if(hud===hudLayer&&objects===objectsLayer)return;
  hudLayer=hud;objectsLayer=objects;wideHud.setLayer(hud);surroundObjects.setLayer(objects);
  if(simulation&&scene==='playing')simulation.repaint();
}
display.onLayout=applyLayers;
/** The HUD's contents keep clear of the touch controls and the settings button. */
display.obstacles=()=>[...touchControls.obstacles(),$('menu-button').getBoundingClientRect()];
touchControls.onLayout=()=>display.layout();
store.subscribe(s=>{
  const soundTurnedOn=s.sound&&!settings.sound;
  settings=s;
  display.configure(s);applyLayers();
  gameSound.setEnabled(s.sound);gameSound.setVolumes({master:s.master,music:s.music,effects:s.effects});gameSound.setEngine(s.synth);
  if(soundTurnedOn&&soundUnlocked)gameSound.unlock();
  touchControls.setMode(s.touch);
  $('stats').hidden=!s.showStats;
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-hold]'))button.hidden=!(button.dataset.hold==='rewind'?s.rewind:s.turbo);
  if(!s.rewind)rewinding=false;if(!s.turbo)turbo=false;
  applySpeed();
});
function updateSynthStatus(){
  const status=gameSound.status,key:UiKey=status==='loading'?'synthLoading':status==='ready'?'synthReady':status==='fallback'?'synthFallback':'synthIdle';
  $('synth-status').textContent=settings.synth==='samples'?say(key):'';
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(simulation?.status==='playing'){paused=true;pauseScene='menu';pauseSelected=0;}clock.reset();input.clear();gameSound.stop();saveSession();}});
window.addEventListener('pagehide',saveSession);
const relayout=()=>display.layout();
window.addEventListener('resize',relayout);document.addEventListener('fullscreenchange',relayout);
new ResizeObserver(relayout).observe($('stage'));

// ── Boot ────────────────────────────────────────────────────────────────────────────────────────
let fps=0,frames=0,fpsSince=0;
async function boot(){
  try{
    panel.setLanguage(locale);
    $('loading-text').textContent=say('loading');
    await assets.load();
    const language=$<HTMLSelectElement>('language');language.value=locale;
    const applyLanguage=()=>{
      assets.strings=languageStrings(locale,assets.originalStrings);Simulation.setLocale(locale);panel.setLanguage(locale);
      $('resource-line').textContent=uiCopy[locale].resources(41,assets.manifest.sprites.length);inspectionDirty=true;updateSynthStatus();
    };
    language.onchange=()=>{locale=validLocale(language.value);try{localStorage.setItem(LANGUAGE_KEY,locale);}catch{/* Keep the current selection for this visit. */}applyLanguage();};
    applyLanguage();updateLevels();options(sprite,assets.manifest.sprites.map(id=>({value:id,label:id})));updateSprite();
    const names=['Switch','Riddle','Death','Chest 1','Chest 2','Hurt','Hammer','Mine','Working','Checkpoint','Enemy hurt','Break','Hook','Water','Boulder','Level clear','Worlds','Bavaria','Tibet','Title','Game over'];
    options($<HTMLSelectElement>('track'),assets.manifest.audio.map((_,i)=>({value:String(i),label:`${i} · ${names[i]}`})));
    $('loading').hidden=true;ready=true;display.layout();
    try{const stored=localStorage.getItem(CAMPAIGN_KEY);if(stored)campaign=validateCampaign(JSON.parse(stored),assets.maps);}catch{localStorage.removeItem(CAMPAIGN_KEY);}
    menuSelected=campaign?1:0;
    game.focus();wake();
    function frame(time:number){
      try{
        if(!panel.open&&!inspectorVisible&&!touchControls.editing)clock.advance(time,tick);
        drawGame();drawInspector();
        frames++;if(time-fpsSince>=1000){fps=Math.round(frames*1000/(time-fpsSince));frames=0;fpsSince=time;updateSynthStatus();}
        if(settings.showStats)$('stats').textContent=`${fps} fps · ${clock.speed.toLocaleString(locale)}×${rewinding?' ◀◀':''}\n${simulation?`tick ${simulation.tick} · state ${simulation.gameState}`:scene}`;
      }
      catch(e){paused=true;report(String(e));console.error(e);return;}
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }catch(e){$('loading-text').textContent=String(e);console.error(e);}
}
if(import.meta.env.DEV)(window as any).__diamondRush={
  get scene(){return scene;},get paused(){return paused;},get simulation(){return simulation;},get campaign(){return campaign;},get display(){return display;},
  feed(runs:{ticks:number;direction:InputFrame['direction'];action:boolean;reset?:boolean}[]){for(const r of runs)for(let i=0;i<r.ticks;i++)scriptedInputs.push({direction:r.direction,action:r.action,...(r.reset?{reset:true}:{})});},
  pending(){return scriptedInputs.length;},
  /** Runs n 20 Hz frames immediately, like the animation loop would. */
  run(n:number){for(let i=0;i<n;i++)tick();drawGame();},
};
void boot();
