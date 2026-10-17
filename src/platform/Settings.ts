/**
 * Port options, in the spirit of PC ports such as Ship of Harkinian: everything defaults to the
 * original experience, and the extras that change the game (speed, rewind, save states, cheats) are
 * opt-in and marked as such in the settings panel.
 */
export const SETTINGS_KEY='diamond-rush:settings:v1';

/** How the 240×320 screen fills the window. */
export type Scaling='integer'|'fit'|'stretch';
/** How the scaled picture is filtered. */
export type Filter='sharp'|'smooth'|'crt';
/**
 * What is shown around the original screen when the window is wider or taller than 3:4:
 * black bars, the world's background continuing forever, the stage's scenery beyond the original
 * camera, or the scenery with its objects (diamonds, stones, chests, enemies at rest).
 */
export type Surround='black'|'backdrop'|'stage'|'stage-objects';
/** The original HUD across the window (bars edge to edge, contents at the sides) or in the original screen. */
export type HudLayout='wide'|'original';
export type TouchMode='auto'|'always'|'never';
export type SynthEngine='samples'|'synth';

export interface PortSettings {
  version:1;
  // Video
  scaling:Scaling;filter:Filter;surround:Surround;hud:HudLayout;showStats:boolean;
  // Audio
  sound:boolean;synth:SynthEngine;master:number;music:number;effects:number;vibration:boolean;
  // Game extras
  speed:number;turbo:boolean;rewind:boolean;saveStates:boolean;infiniteLives:boolean;infiniteHealth:boolean;allEquipment:boolean;
  // Controls
  touch:TouchMode;
}

export const SPEEDS=[0.5,0.75,1,1.25,1.5,2] as const;
export function defaultSettings():PortSettings{
  return {version:1,scaling:'fit',filter:'sharp',surround:'stage-objects',hud:'wide',showStats:false,
    sound:true,synth:'samples',master:0.8,music:1,effects:1,vibration:true,
    speed:1,turbo:true,rewind:true,saveStates:true,infiniteLives:false,infiniteHealth:false,allEquipment:false,
    touch:'auto'};
}
const pick=<T extends string>(value:unknown,allowed:readonly T[],fallback:T):T=>allowed.includes(value as T)?value as T:fallback;
const unit=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
const flag=(value:unknown,fallback:boolean)=>typeof value==='boolean'?value:fallback;
export function validateSettings(value:unknown):PortSettings{
  const d=defaultSettings();
  if(!value||typeof value!=='object'||(value as PortSettings).version!==1)return d;
  const v=value as Partial<PortSettings>;
  return {version:1,
    scaling:pick(v.scaling,['integer','fit','stretch'],d.scaling),filter:pick(v.filter,['sharp','smooth','crt'],d.filter),
    surround:pick(v.surround,['black','backdrop','stage','stage-objects'],d.surround),hud:pick(v.hud,['wide','original'],d.hud),showStats:flag(v.showStats,d.showStats),
    sound:flag(v.sound,d.sound),synth:pick(v.synth,['samples','synth'],d.synth),
    master:unit(v.master,d.master),music:unit(v.music,d.music),effects:unit(v.effects,d.effects),vibration:flag(v.vibration,d.vibration),
    speed:SPEEDS.includes(v.speed as typeof SPEEDS[number])?v.speed!:d.speed,turbo:flag(v.turbo,d.turbo),rewind:flag(v.rewind,d.rewind),
    saveStates:flag(v.saveStates,d.saveStates),infiniteLives:flag(v.infiniteLives,d.infiniteLives),
    infiniteHealth:flag(v.infiniteHealth,d.infiniteHealth),allEquipment:flag(v.allEquipment,d.allEquipment),
    touch:pick(v.touch,['auto','always','never'],d.touch)};
}
/** True when an option that changes the game itself is on (the session is no longer the original game). */
export function cheating(s:PortSettings){return s.infiniteLives||s.infiniteHealth||s.allEquipment;}

export class SettingsStore {
  value:PortSettings;
  private listeners:((s:PortSettings)=>void)[]=[];
  constructor(){
    let saved:unknown=null;try{saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)??'null');}catch{saved=null;}
    this.value=validateSettings(saved);
  }
  update(patch:Partial<PortSettings>){
    this.value=validateSettings({...this.value,...patch});
    try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(this.value));}catch{/* The options still apply for this visit. */}
    for(const listener of this.listeners)listener(this.value);
  }
  reset(){this.update(defaultSettings());}
  subscribe(listener:(s:PortSettings)=>void){this.listeners.push(listener);listener(this.value);}
}
