import { Input } from './Input.ts';
import type { TouchMode } from './Settings.ts';

/** Version 2: the controls float over the whole window, so positions are fractions of the window. */
export const TOUCH_SETTINGS_KEY='diamond-rush:touch-controls:v2';
type Group='pad'|'action'|'utility';
interface Position {x:number;y:number}
export interface TouchSettings {
  version:2;mode:'pad'|'stick';scale:number;opacity:number;deadzone:number;haptics:boolean;
  positions:Record<Group,Position>;
}
const positions=(hand:'right'|'left'):Record<Group,Position>=>hand==='right'
  ?{pad:{x:0,y:1},action:{x:1,y:1},utility:{x:0,y:0}}
  :{pad:{x:1,y:1},action:{x:0,y:1},utility:{x:0,y:0}};
export const defaultTouchSettings=():TouchSettings=>({version:2,mode:'pad',scale:1,opacity:.6,deadzone:.25,haptics:true,positions:positions('right')});
const within=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function validateTouchSettings(value:unknown):TouchSettings {
  const defaults=defaultTouchSettings();
  if(!value||typeof value!=='object')return defaults;
  const v=value as Partial<TouchSettings>;
  if(v.version!==2)return defaults;
  const settings:TouchSettings={...defaults,mode:v.mode==='stick'?'stick':'pad',
    scale:typeof v.scale==='number'&&Number.isFinite(v.scale)?within(v.scale,.75,1.5):1,
    opacity:typeof v.opacity==='number'&&Number.isFinite(v.opacity)?within(v.opacity,.2,1):.6,
    deadzone:typeof v.deadzone==='number'&&Number.isFinite(v.deadzone)?within(v.deadzone,.15,.5):.25,
    haptics:typeof v.haptics==='boolean'?v.haptics:true};
  for(const name of ['pad','action','utility'] as const){
    const p=v.positions?.[name];
    settings.positions[name]={x:typeof p?.x==='number'&&Number.isFinite(p.x)?within(p.x,0,1):defaults.positions[name].x,
      y:typeof p?.y==='number'&&Number.isFinite(p.y)?within(p.y,0,1):defaults.positions[name].y};
  }
  return settings;
}
/** Space kept between the controls and the window edges. */
const EDGE=14;

/** On-screen controls over the picture, repositionable by dragging while editing. */
export class MobileControls {
  settings:TouchSettings;editing=false;
  onEditingChange:(editing:boolean)=>void=()=>{};
  private input:Input;
  private deck=document.getElementById('touch-deck')!;
  private done=document.getElementById('touch-done') as HTMLButtonElement;
  private groups=Object.fromEntries((['pad','action','utility'] as Group[]).map(name=>[name,this.deck.querySelector<HTMLElement>(`[data-control-group="${name}"]`)!])) as Record<Group,HTMLElement>;
  private mode:TouchMode='auto';
  constructor(input:Input){
    this.input=input;
    let saved:unknown;try{saved=JSON.parse(localStorage.getItem(TOUCH_SETTINGS_KEY)??'null');}catch{saved=null;}
    this.settings=validateTouchSettings(saved);
    (document.getElementById('touch-config') as HTMLButtonElement).onclick=()=>this.setEditing(true);
    this.done.onclick=()=>this.setEditing(false);
    for(const [name,group] of Object.entries(this.groups) as [Group,HTMLElement][]){
      let startX=0,startY=0;
      group.addEventListener('pointerdown',e=>{
        if(!this.editing)return;
        e.preventDefault();e.stopPropagation();group.setPointerCapture(e.pointerId);
        const r=group.getBoundingClientRect();startX=e.clientX-r.left;startY=e.clientY-r.top;
      },true);
      group.addEventListener('pointermove',e=>{
        if(!this.editing||!group.hasPointerCapture(e.pointerId))return;
        const area=this.area(),scale=this.settings.scale,maxX=Math.max(0,area.width-group.offsetWidth*scale),maxY=Math.max(0,area.height-group.offsetHeight*scale);
        this.settings.positions[name]={x:maxX?within((e.clientX-area.left-startX)/maxX,0,1):0,y:maxY?within((e.clientY-area.top-startY)/maxY,0,1):0};
        this.layout();
      });
      group.addEventListener('pointerup',()=>this.save());
    }
    document.querySelectorAll<HTMLButtonElement>('[data-touch-preset]').forEach(button=>button.onclick=()=>{
      const preset=button.dataset.touchPreset;
      this.settings.positions=positions(preset==='left'?'left':'right');this.settings.scale=preset==='compact'?.8:1;
      this.apply();this.save();
    });
    const bindRange=(id:string,key:'scale'|'opacity'|'deadzone')=>{
      const element=document.getElementById(id) as HTMLInputElement;
      element.oninput=()=>{this.settings[key]=Number(element.value)/100;this.apply();this.save();};
    };
    bindRange('touch-size','scale');bindRange('touch-opacity','opacity');bindRange('touch-deadzone','deadzone');
    (document.getElementById('touch-mode') as HTMLSelectElement).onchange=e=>{this.settings.mode=(e.target as HTMLSelectElement).value==='stick'?'stick':'pad';this.apply();this.save();};
    (document.getElementById('touch-haptics') as HTMLInputElement).onchange=e=>{this.settings.haptics=(e.target as HTMLInputElement).checked;this.apply();this.save();};
    document.getElementById('touch-reset')!.onclick=()=>{this.settings=defaultTouchSettings();this.apply();this.save();};
    new ResizeObserver(()=>this.layout()).observe(this.deck);
    matchMedia('(pointer: coarse)').addEventListener('change',()=>this.updateVisibility());
    this.apply();
  }
  /** Automatic shows the controls on touch screens. */
  setMode(mode:TouchMode){this.mode=mode;this.updateVisibility();}
  get visible(){return !this.deck.hidden;}
  private updateVisibility(){
    this.deck.hidden=!(this.editing||this.mode==='always'||(this.mode==='auto'&&matchMedia('(pointer: coarse)').matches));
    this.layout();
  }
  setEditing(editing:boolean){
    this.editing=editing;this.deck.classList.toggle('is-editing',editing);this.done.hidden=!editing;
    this.updateVisibility();this.onEditingChange(editing);
  }
  private save(){try{localStorage.setItem(TOUCH_SETTINGS_KEY,JSON.stringify(this.settings));}catch{/* Controls remain usable without persistent storage. */}}
  setHaptics(enabled:boolean){this.settings.haptics=enabled;this.apply();this.save();}
  private apply(){
    this.input.stickDeadzone=this.settings.deadzone;this.input.haptics=this.settings.haptics;
    const pad=this.groups.pad.querySelector<HTMLElement>('.dpad')!,stick=this.groups.pad.querySelector<HTMLElement>('[data-stick]')!;
    pad.hidden=this.settings.mode==='stick';stick.hidden=this.settings.mode!=='stick';
    (document.getElementById('touch-mode') as HTMLSelectElement).value=this.settings.mode;
    for(const [id,value] of [['touch-size',this.settings.scale*100],['touch-opacity',this.settings.opacity*100],['touch-deadzone',this.settings.deadzone*100]] as const){
      (document.getElementById(id) as HTMLInputElement).value=String(Math.round(value));
      document.getElementById(`${id}-value`)!.textContent=`${Math.round(value)}%`;
    }
    (document.getElementById('touch-haptics') as HTMLInputElement).checked=this.settings.haptics;
    this.layout();
  }
  /** The window area the controls may use (inside the safe area, away from the edges). */
  private area(){
    const r=this.deck.getBoundingClientRect(),style=getComputedStyle(this.deck);
    const left=parseFloat(style.paddingLeft)+EDGE,right=parseFloat(style.paddingRight)+EDGE,top=parseFloat(style.paddingTop)+EDGE,bottom=parseFloat(style.paddingBottom)+EDGE;
    return {left:r.left+left,top:r.top+top,width:r.width-left-right,height:r.height-top-bottom,offsetLeft:left,offsetTop:top};
  }
  private layout(){
    if(this.deck.hidden)return;
    const area=this.area();if(area.width<=0||area.height<=0)return;
    for(const [name,group] of Object.entries(this.groups) as [Group,HTMLElement][]){
      const scale=this.settings.scale,p=this.settings.positions[name];
      group.style.left=`${Math.round(area.offsetLeft+p.x*Math.max(0,area.width-group.offsetWidth*scale))}px`;
      group.style.top=`${Math.round(area.offsetTop+p.y*Math.max(0,area.height-group.offsetHeight*scale))}px`;
      group.style.transform=`scale(${scale})`;group.style.opacity=String(this.settings.opacity);
    }
  }
}
