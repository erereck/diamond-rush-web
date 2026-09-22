/** cGame.method_285, including integer rounding and asymmetric dead zones. */
export class Camera {
  x=0;y=0;
  update(playerX:number,playerY:number,width:number,height:number) {
    const maxX=Math.max(0,width*24-240),maxY=Math.max(0,height*24-240);
    if(playerX<this.x+96)this.x=(this.x-96+playerX)>>1;
    else if(playerX>this.x+120)this.x=(this.x-120+playerX)>>1;
    const py=playerY+40;
    if(py<this.y+96)this.y=(this.y-96+py)>>1;
    if(py>this.y+160)this.y=(this.y-160+py)>>1;
    this.x=Math.max(0,Math.min(maxX,this.x));this.y=Math.max(0,Math.min(maxY,this.y));
  }
}
