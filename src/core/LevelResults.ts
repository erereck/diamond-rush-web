/** cGame.method_250: the level-clear rows reveal themselves at 20 Hz. */
export class LevelResults {
  phase=0;
  ticks=0;
  reset(){this.phase=0;this.ticks=0;}
  step(collectedDiamonds:number){
    if(this.phase===5)return;
    this.ticks++;
    const limit=this.phase===1?Math.max(40,collectedDiamonds*2):this.phase<=2?40:10;
    if(this.ticks>limit){this.phase++;this.ticks=0;}
  }
  /** One press skips the reveal; a later press leaves the completed screen. */
  press():boolean {
    if(this.phase===5)return true;
    this.phase=5;this.ticks=0;return false;
  }
}
