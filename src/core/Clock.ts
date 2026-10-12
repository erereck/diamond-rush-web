/** cGame.run targets 50ms. Presentation is independent from this clock. */
export class Clock {
  static readonly stepMs=50;
  remainder=0; last:number|null=null;
  /** Game speed (1 = the phone's 20 frames per second); fast forward multiplies it. */
  speed=1;
  reset(){this.remainder=0;this.last=null;}
  advance(now:number,step:()=>void) {
    if(this.last===null){this.last=now;return;}
    this.remainder+=Math.max(0,Math.min(now-this.last,250))*this.speed;this.last=now;
    while(this.remainder>=Clock.stepMs){step();this.remainder-=Clock.stepMs;}
  }
}
