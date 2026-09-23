import type { Direction, InputFrame } from '../core/Simulation.ts';
export class Input {
  held=new Map<string,number>();order=0;
  pendingDirection:Direction=0;pendingAction=false;pendingReset=false;
  touchDirections=new Map<number,{direction:Direction;order:number}>();touchActions=new Set<number>();
  stickDeadzone=.25;haptics=true;
  mapping:Record<string,Direction>={ArrowUp:1,KeyW:1,ArrowRight:2,KeyD:2,ArrowDown:3,KeyS:3,ArrowLeft:4,KeyA:4};
  onCommand:(code:string)=>void=()=>{};
  constructor(canvas:HTMLCanvasElement){
    window.addEventListener('keydown',e=>{
      if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement)return;
      if(this.mapping[e.code]||['Space','Enter','Escape','KeyR','Period'].includes(e.code)){
        if(document.activeElement instanceof HTMLButtonElement&&['Enter','Space'].includes(e.code))return;
        e.preventDefault();if(!e.repeat){this.held.set(e.code,++this.order);this.pendingDirection=this.mapping[e.code]??this.pendingDirection;if(['Space','Enter'].includes(e.code))this.pendingAction=true;if(e.code==='KeyR')this.pendingReset=true;this.onCommand(e.code);}
      }
    });
    window.addEventListener('keyup',e=>this.held.delete(e.code));window.addEventListener('blur',()=>this.clear());
    canvas.addEventListener('pointerdown',()=>canvas.focus());
    document.querySelectorAll<HTMLButtonElement>('[data-input]').forEach(button=>{
      const key=button.dataset.input!;
      button.addEventListener('pointerdown',e=>{
        e.preventDefault();button.setPointerCapture(e.pointerId);this.vibrate();
        const direction=this.mapping[key];
        if(direction){this.touchDirections.set(e.pointerId,{direction,order:++this.order});this.pendingDirection=direction;}
        if(key==='Space'||key==='Enter'){this.touchActions.add(e.pointerId);this.pendingAction=true;}
        if(key==='KeyR')this.pendingReset=true;
        if(key==='Enter'||key==='KeyR')this.onCommand(key);
      });
      button.addEventListener('pointermove',e=>{
        if(!this.touchDirections.has(e.pointerId))return;
        const pad=button.closest<HTMLElement>('.dpad');if(!pad)return;
        const r=pad.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
        const direction=(Math.abs(dx)>Math.abs(dy)?dx<0?4:2:dy<0?1:3) as Direction;
        const previous=this.touchDirections.get(e.pointerId)!;
        if(direction!==previous.direction){this.touchDirections.set(e.pointerId,{direction,order:++this.order});this.pendingDirection=direction;}
      });
      const release=(e:PointerEvent)=>{this.touchDirections.delete(e.pointerId);this.touchActions.delete(e.pointerId);};
      for(const event of ['pointerup','pointercancel','lostpointercapture'] as const)button.addEventListener(event,release);
    });
    const stick=document.querySelector<HTMLElement>('[data-stick]');
    if(stick){
      const update=(e:PointerEvent)=>{
        const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),radius=Math.min(r.width,r.height)/2;
        const distance=Math.hypot(dx,dy),direction=(distance<radius*this.stickDeadzone?0:Math.abs(dx)>Math.abs(dy)?dx<0?4:2:dy<0?1:3) as Direction;
        if(direction)this.pendingDirection=direction;
        this.touchDirections.set(e.pointerId,{direction,order:++this.order});
        stick.style.setProperty('--stick-x',`${Math.round(Math.max(-28,Math.min(28,dx)))}px`);
        stick.style.setProperty('--stick-y',`${Math.round(Math.max(-28,Math.min(28,dy)))}px`);
      };
      stick.addEventListener('pointerdown',e=>{e.preventDefault();stick.setPointerCapture(e.pointerId);this.vibrate();update(e);});
      stick.addEventListener('pointermove',e=>{if(this.touchDirections.has(e.pointerId))update(e);});
      const release=(e:PointerEvent)=>{this.touchDirections.delete(e.pointerId);stick.style.setProperty('--stick-x','0px');stick.style.setProperty('--stick-y','0px');};
      for(const event of ['pointerup','pointercancel','lostpointercapture'] as const)stick.addEventListener(event,release);
    }
  }
  private vibrate(){if(this.haptics)navigator.vibrate?.(8);}
  clear(){this.held.clear();this.touchDirections.clear();this.touchActions.clear();this.pendingDirection=0;this.pendingAction=false;this.pendingReset=false;}
  queueReset(){this.pendingReset=true;}
  read():InputFrame {
    let direction:Direction=this.pendingDirection,latest=-1;this.pendingDirection=0;
    for(const [key,n] of this.held)if(this.mapping[key]&&n>latest){direction=this.mapping[key];latest=n;}
    for(const touch of this.touchDirections.values())if(touch.direction&&touch.order>latest){direction=touch.direction;latest=touch.order;}
    let action=this.pendingAction||this.held.has('Space')||this.held.has('Enter')||this.touchActions.size>0;this.pendingAction=false;
    const pad=navigator.getGamepads?.()?.find(p=>p?.connected);
    if(pad){
      if(pad.buttons[12]?.pressed||pad.axes[1]<-.5)direction=1;
      else if(pad.buttons[13]?.pressed||pad.axes[1]>.5)direction=3;
      else if(pad.buttons[14]?.pressed||pad.axes[0]<-.5)direction=4;
      else if(pad.buttons[15]?.pressed||pad.axes[0]>.5)direction=2;
      action ||=pad.buttons[0]?.pressed??false;
    }
    const reset=this.pendingReset;this.pendingReset=false;
    return {direction,action,reset};
  }
}
