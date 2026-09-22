import './style.css';
import { AssetManager } from './assets/AssetManager.ts';
import { SpriteRenderer } from './render/SpriteRenderer.ts';
import { LevelRenderer } from './render/LevelRenderer.ts';
import { Clock } from './core/Clock.ts';
import { Simulation } from './core/Simulation.ts';
import { Input } from './platform/Input.ts';
import { MidiPreview, parseMidi } from './platform/Midi.ts';
import { SESSION_KEY, validateReplay, restoreReplay } from './platform/Session.ts';
import { CanonicalSave } from './platform/CanonicalSave.ts';
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const game=$<HTMLCanvasElement>('game'), ctx=game.getContext('2d')!, inspection=$<HTMLCanvasElement>('inspection'), ic=inspection.getContext('2d')!;
ctx.imageSmoothingEnabled=false;ic.imageSmoothingEnabled=false;
const assets=new AssetManager(), sprites=new SpriteRenderer(), renderer=new LevelRenderer(assets,sprites),clock=new Clock(),input=new Input(game),audio=new MidiPreview();
let simulation:Simulation|null=null,paused=false,ready=false,sceneTick=0,view:'levels'|'sprites'|'audio'='levels',inspectionDirty=true,inspectorVisible=false,lastError='';
const world=$<HTMLSelectElement>('world'),level=$<HTMLSelectElement>('level'),sprite=$<HTMLSelectElement>('sprite'),palette=$<HTMLSelectElement>('palette');
const selectedLevel=()=>assets.worlds[Number(world.value)].levels[Number(level.value)];
const text=(s:string,x:number,y:number,align:'left'|'center'|'right'='left',pal=0)=>sprites.text(ctx,assets.sprite('ui-1'),assets.fontMap,s,x,y,align,pal);
function report(message:string){lastError=message;$('debug-info').textContent=message;$('tools').setAttribute('open','');}
function options(select:HTMLSelectElement,values:{value:string;label:string}[]){select.replaceChildren(...values.map(({value,label})=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;}));}
function updateLevels(){
  const w=Number(world.value);options(level,assets.worlds[w].levels.map(l=>({value:String(l.index),label:l.index===13&&w===0?'13 · Introdução':`${String(l.index).padStart(2,'0')} · ${l.width} × ${l.height}`})));inspectionDirty=true;updateLevelInfo();
}
function updateLevelInfo(){const l=selectedLevel();$('level-info').textContent=`${l.width} × ${l.height} células · ${l.tiles.filter(t=>t===1).length} diamantes · ${[...new Set(l.tiles.filter(t=>t<80))].length} tipos de objeto. Dados originais; simulação parcial.`;inspectionDirty=true;}
function start(l=assets.worlds[0].levels[0]){simulation=new Simulation(l);paused=false;clock.reset();input.clear();lastError='';$('pause').textContent='Ⅱ';$('play').innerHTML='Reiniciar teste de Angkor <span>↻</span>';game.focus();}
function togglePause(){if(!simulation)return;paused=!paused;clock.reset();input.clear();$('pause').textContent=paused?'▷':'Ⅱ';saveSession();}
function saveSession(){if(simulation){try{localStorage.setItem(SESSION_KEY,JSON.stringify(simulation.replay()));}catch{report('Não foi possível salvar a sessão neste navegador. Exporte uma cópia.');}}}
function downloadBlob(name:string,blob:Blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function download(name:string,data:unknown){downloadBlob(name,new Blob([JSON.stringify(data)],{type:'application/json'}));}
function drawTitle(){
  ctx.fillStyle='#061008';ctx.fillRect(0,0,240,320);
  // cGame.drawSplash draws the gradient, then the transparent title rays/logo.
  ctx.drawImage(assets.splash[1],0,0);ctx.drawImage(assets.splash[0],0,0);
  const copy=assets.splash[2];ctx.drawImage(copy,120-(copy.width>>1),319-copy.height);
  text('WEB PORT',120,228,'center',0);text('BUILD EXPERIMENTAL',120,247,'center',0);
  if((sceneTick>>4)%2===0)text('ENTER PARA INICIAR',120,276,'center',0);
  $('game-status').textContent='Recursos originais carregados';
  if(!lastError)$('debug-info').textContent='Tela de abertura · nenhuma simulação em execução';
  $<HTMLButtonElement>('pause').disabled=true;$<HTMLButtonElement>('restart').disabled=true;
}
function drawGame(){
  if(!simulation){drawTitle();return;}
  const s=simulation;ctx.fillStyle='#091509';ctx.fillRect(0,0,240,320);
  ctx.save();ctx.beginPath();ctx.rect(0,40,240,240);ctx.clip();ctx.translate(-s.camera.x,40-s.camera.y);renderer.draw(ctx,s.level,s.tick,s);ctx.restore();
  const hud=assets.sprite('ui-2');sprites.frame(ctx,hud,0,120,320);sprites.frame(ctx,hud,1,120,320);
  text(assets.strings[28+s.level.world],120,12,'center',1);
  text(`FASE ${s.level.index+1}`,120,27,'center');
  // Original HUD artwork with a temporary text counter, separately tracked from UI parity.
  text(`${s.diamonds}`,210,301,'right');text(`${s.redDiamonds}`,28,301);text(`${s.health}/4`,119,291,'center');
  if(paused||s.status!=='playing'){
    ctx.fillStyle='#000b';ctx.fillRect(0,96,240,115);
    text(s.status==='dead'?'GAME OVER':s.status==='complete'?'FASE CONCLUIDA':'PAUSADO',120,124,'center',1);
    text(s.status==='playing'?'ESC PARA CONTINUAR':'R PARA REINICIAR',120,151,'center');
    if(s.status==='complete')text('PROGRESSAO EM DESENVOLVIMENTO',120,177,'center');
  }
  $('game-status').textContent=`${assets.strings[28+s.level.world]} / ${String(s.level.index+1).padStart(2,'0')} · ${paused?'pausado':'20 Hz'}`;
  $('pause').textContent=paused?'▷':'Ⅱ';
  $('pause').setAttribute('aria-label',paused?'Continuar':'Pausar');
  $<HTMLButtonElement>('pause').disabled=false;$<HTMLButtonElement>('restart').disabled=false;
  if(!lastError)$('debug-info').textContent=`tick ${s.tick} · posição ${s.player.x}, ${s.player.y}\ncâmera ${s.camera.x}, ${s.camera.y} · vida ${s.health}/4\n${s.status} · ${s.diamonds} diamantes · ${s.redDiamonds} vermelhos`;
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
async function importFile(file:File|null){if(!file)return;try{const data=validateReplay(JSON.parse(await file.text()),assets.worlds);simulation=restoreReplay(data,assets.worlds);paused=true;clock.reset();lastError='';saveSession();}catch(e){report(String(e));}}
input.onCommand=code=>{if(!ready)return;if(code==='Escape')togglePause();else if(code==='KeyR'&&simulation)start(simulation.level);else if(code==='Enter'&&!simulation)start();else if(code==='Period'&&simulation){paused=true;simulation.step({direction:0,action:false});}};
$('play').onclick=()=>start();$('restart').onclick=()=>{if(simulation)start(simulation.level);};$('pause').onclick=togglePause;
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await game.parentElement!.requestFullscreen();}catch(e){report(`Tela cheia não disponível: ${String(e)}`);}};
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
$('title').onclick=()=>{saveSession();simulation=null;audio.stop();input.clear();clock.reset();};
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
$('play-audio').onclick=async()=>{try{const id=$<HTMLSelectElement>('track').value,r=await fetch(`${import.meta.env.BASE_URL}assets/${id}.mid`);if(!r.ok)throw new Error('Faixa ausente');const song=parseMidi(new Uint8Array(await r.arrayBuffer()));await audio.play(song);$('audio-info').textContent=`${song.notes.length} notas · ${song.duration.toFixed(1)} segundos · ${song.tracks} trilhas`;}catch(e){report(String(e));}};
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
    $('resource-line').textContent='41 FASES · 95 SPRITES · 21 MIDIS ORIGINAIS';$('loading').hidden=true;$<HTMLButtonElement>('play').disabled=false;ready=true;
    try{const stored=localStorage.getItem(SESSION_KEY);if(stored){simulation=restoreReplay(validateReplay(JSON.parse(stored),assets.worlds),assets.worlds);paused=true;}}catch{report('Sessão anterior incompatível. Você pode iniciar um novo teste.');}
    function frame(time:number){
      try{clock.advance(time,()=>{sceneTick++;if(simulation&&!paused)simulation.step(input.read());});drawGame();drawInspector();}
      catch(e){paused=true;report(`Falha de execução: ${String(e)}`);console.error(e);return;}
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }catch(e){$('loading').textContent=String(e);console.error(e);}
}
void boot();
