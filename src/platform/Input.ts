import type { Direction, InputFrame } from '../core/Simulation.ts';
export class Input {
  held=new Map<string,number>();order=0;
  pendingDirection:Direction=0;pendingAction=false;
  mapping:Record<string,Direction>={ArrowUp:1,KeyW:1,ArrowRight:2,KeyD:2,ArrowDown:3,KeyS:3,ArrowLeft:4,KeyA:4};
  onCommand:(code:string)=>void=()=>{};
  constructor(canvas:HTMLCanvasElement){
    window.addEventListener('keydown',e=>{
      if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement)return;
      if(this.mapping[e.code]||['Space','Enter','Escape','KeyR','Period'].includes(e.code)){
        if(document.activeElement instanceof HTMLButtonElement&&['Enter','Space'].includes(e.code))return;
        e.preventDefault();if(!e.repeat){this.held.set(e.code,++this.order);this.pendingDirection=this.mapping[e.code]??this.pendingDirection;if(['Space','Enter'].includes(e.code))this.pendingAction=true;this.onCommand(e.code);}
      }
    });
    window.addEventListener('keyup',e=>this.held.delete(e.code));window.addEventListener('blur',()=>this.clear());
    canvas.addEventListener('pointerdown',()=>canvas.focus());
    document.querySelectorAll<HTMLButtonElement>('[data-input]').forEach(button=>{
      const key=button.dataset.input!;
      button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);this.held.set(key,++this.order);this.pendingDirection=this.mapping[key]??this.pendingDirection;if(key==='Space')this.pendingAction=true;});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>this.held.delete(key));
    });
  }
  clear(){this.held.clear();this.pendingDirection=0;this.pendingAction=false;}
  read():InputFrame {
    let direction:Direction=this.pendingDirection,latest=-1;this.pendingDirection=0;
    for(const [key,n] of this.held)if(this.mapping[key]&&n>latest){direction=this.mapping[key];latest=n;}
    let action=this.pendingAction||this.held.has('Space')||this.held.has('Enter');this.pendingAction=false;
    const pad=navigator.getGamepads?.()?.find(p=>p?.connected);
    if(pad){
      if(pad.buttons[12]?.pressed||pad.axes[1]<-.5)direction=1;
      else if(pad.buttons[13]?.pressed||pad.axes[1]>.5)direction=3;
      else if(pad.buttons[14]?.pressed||pad.axes[0]<-.5)direction=4;
      else if(pad.buttons[15]?.pressed||pad.axes[0]>.5)direction=2;
      action ||=pad.buttons[0]?.pressed??false;
    }
    return {direction,action};
  }
}
