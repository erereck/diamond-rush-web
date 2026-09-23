import { Input } from './Input.ts';

export const TOUCH_SETTINGS_KEY='diamond-rush:touch-controls:v1';
type Group='pad'|'action'|'utility';
interface Position {x:number;y:number}
export interface TouchSettings {
  version:1;mode:'pad'|'stick';scale:number;opacity:number;deadzone:number;haptics:boolean;
  positions:Record<Group,Position>;
}
const positions=(hand:'right'|'left'):Record<Group,Position>=>hand==='right'
  ?{pad:{x:0,y:.49},action:{x:1,y:.75},utility:{x:1,y:0}}
  :{pad:{x:1,y:.49},action:{x:0,y:.75},utility:{x:0,y:0}};
export const defaultTouchSettings=():TouchSettings=>({version:1,mode:'pad',scale:1,opacity:.9,deadzone:.25,haptics:true,positions:positions('right')});
const within=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function validateTouchSettings(value:unknown):TouchSettings {
  const defaults=defaultTouchSettings();
  if(!value||typeof value!=='object')return defaults;
  const v=value as Partial<TouchSettings>;
  if(v.version!==1)return defaults;
  const settings:TouchSettings={...defaults,mode:v.mode==='stick'?'stick':'pad',
    scale:typeof v.scale==='number'&&Number.isFinite(v.scale)?within(v.scale,.75,1.25):1,
    opacity:typeof v.opacity==='number'&&Number.isFinite(v.opacity)?within(v.opacity,.45,1):.9,
    deadzone:typeof v.deadzone==='number'&&Number.isFinite(v.deadzone)?within(v.deadzone,.15,.5):.25,
    haptics:typeof v.haptics==='boolean'?v.haptics:true};
  for(const name of ['pad','action','utility'] as const){
    const p=v.positions?.[name];
    settings.positions[name]={x:typeof p?.x==='number'&&Number.isFinite(p.x)?within(p.x,0,1):defaults.positions[name].x,
      y:typeof p?.y==='number'&&Number.isFinite(p.y)?within(p.y,0,1):defaults.positions[name].y};
  }
  return settings;
}

export class MobileControls {
  settings:TouchSettings;editing=false;
  private input:Input;
  private deck=document.getElementById('touch-deck')!;
  private editor=document.getElementById('touch-settings')!;
  private toggle=document.getElementById('touch-config') as HTMLButtonElement;
  private groups=Object.fromEntries((['pad','action','utility'] as Group[]).map(name=>[name,this.deck.querySelector<HTMLElement>(`[data-control-group="${name}"]`)!])) as Record<Group,HTMLElement>;
  constructor(input:Input){
    this.input=input;
    let saved:unknown;try{saved=JSON.parse(localStorage.getItem(TOUCH_SETTINGS_KEY)??'null');}catch{saved=null;}
    this.settings=validateTouchSettings(saved);
    this.toggle.onclick=()=>{this.editing=!this.editing;this.deck.classList.toggle('is-editing',this.editing);this.editor.hidden=!this.editing;this.toggle.setAttribute('aria-expanded',String(this.editing));this.toggle.textContent=this.editing?'✓ Concluído':'⚙ Ajustar';this.layout();};
    for(const [name,group] of Object.entries(this.groups) as [Group,HTMLElement][]){
      let startX=0,startY=0;
      group.addEventListener('pointerdown',e=>{
        if(!this.editing)return;
        e.preventDefault();e.stopPropagation();group.setPointerCapture(e.pointerId);
        const r=group.getBoundingClientRect();startX=e.clientX-r.left;startY=e.clientY-r.top;
      },true);
      group.addEventListener('pointermove',e=>{
        if(!this.editing||!group.hasPointerCapture(e.pointerId))return;
        const r=this.deck.getBoundingClientRect(),scale=this.settings.scale,maxX=Math.max(0,r.width-group.offsetWidth*scale),maxY=Math.max(0,r.height-group.offsetHeight*scale);
        this.settings.positions[name]={x:maxX?within((e.clientX-r.left-startX)/maxX,0,1):0,
          y:maxY?within((e.clientY-r.top-startY)/maxY,0,1):0};
        this.layout();
      });
      group.addEventListener('pointerup',()=>this.save());
    }
    document.querySelectorAll<HTMLButtonElement>('[data-touch-preset]').forEach(button=>button.onclick=()=>{
      const preset=button.dataset.touchPreset;
      this.settings.positions=positions(preset==='left'?'left':'right');this.settings.scale=preset==='compact'?.8:1;
      this.apply();this.save();
    });
    const bindRange=(id:string,key:'scale'|'opacity'|'deadzone',factor:number)=>{
      const element=document.getElementById(id) as HTMLInputElement;
      element.oninput=()=>{this.settings[key]=Number(element.value)/factor;this.apply();this.save();};
    };
    bindRange('touch-size','scale',100);bindRange('touch-opacity','opacity',100);bindRange('touch-deadzone','deadzone',100);
    (document.getElementById('touch-mode') as HTMLSelectElement).onchange=e=>{this.settings.mode=(e.target as HTMLSelectElement).value==='stick'?'stick':'pad';this.apply();this.save();};
    (document.getElementById('touch-haptics') as HTMLInputElement).onchange=e=>{this.settings.haptics=(e.target as HTMLInputElement).checked;this.apply();this.save();};
    document.getElementById('touch-reset')!.onclick=()=>{this.settings=defaultTouchSettings();this.apply();this.save();};
    new ResizeObserver(()=>this.layout()).observe(this.deck);
    this.apply();
  }
  private save(){try{localStorage.setItem(TOUCH_SETTINGS_KEY,JSON.stringify(this.settings));}catch{/* Controls remain usable without persistent storage. */}}
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
  private layout(){
    const width=this.deck.clientWidth,height=this.deck.clientHeight;if(!width||!height)return;
    for(const [name,group] of Object.entries(this.groups) as [Group,HTMLElement][]){
      const scale=this.settings.scale,p=this.settings.positions[name];
      group.style.left=`${Math.round(p.x*Math.max(0,width-group.offsetWidth*scale))}px`;
      group.style.top=`${Math.round(p.y*Math.max(0,height-group.offsetHeight*scale))}px`;
      group.style.transform=`scale(${scale})`;group.style.opacity=String(this.settings.opacity);
    }
  }
}
