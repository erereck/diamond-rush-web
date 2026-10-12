package javax.microedition.lcdui;
public class Graphics {
  public static final int HCENTER=1,VCENTER=2,LEFT=4,RIGHT=8,TOP=16,BOTTOM=32,BASELINE=64,SOLID=0,DOTTED=1;
  // Clip and translation follow MIDP (and src/core/s700/j2me.ts): the clip is stored in surface coordinates.
  int cx,cy,cw,ch,tx,ty,color;
  public Graphics(){this(240,320);}
  public Graphics(int w,int h){cw=w;ch=h;}
  public void setColor(int c){color=c;} public void setColor(int r,int g,int b){color=(r<<16)|(g<<8)|b;} public int getColor(){return color;}
  public void fillRect(int x,int y,int w,int h){} public void drawRect(int x,int y,int w,int h){}
  public void drawLine(int a,int b,int c,int d){} public void drawRoundRect(int a,int b,int c,int d,int e,int f){} public void fillRoundRect(int a,int b,int c,int d,int e,int f){}
  public void fillArc(int a,int b,int c,int d,int e,int f){} public void drawArc(int a,int b,int c,int d,int e,int f){} public void fillTriangle(int a,int b,int c,int d,int e,int f){}
  public void drawImage(Image i,int x,int y,int a){} public void drawRegion(Image i,int a,int b,int c,int d,int e,int f,int g,int h){}
  public void drawRGB(int[] d,int o,int s,int x,int y,int w,int h,boolean a){}
  public void drawString(String s,int x,int y,int a){} public void drawSubstring(String s,int o,int l,int x,int y,int a){} public void drawChar(char c,int x,int y,int a){} public void drawChars(char[] c,int o,int l,int x,int y,int a){}
  public void setClip(int x,int y,int w,int h){cx=x+tx;cy=y+ty;cw=w;ch=h;}
  public void clipRect(int x,int y,int w,int h){
    int x0=Math.max(cx,x+tx),y0=Math.max(cy,y+ty),x1=Math.min(cx+cw,x+tx+w),y1=Math.min(cy+ch,y+ty+h);
    cx=x0;cy=y0;cw=Math.max(0,x1-x0);ch=Math.max(0,y1-y0);
  }
  public int getClipX(){return cx-tx;} public int getClipY(){return cy-ty;} public int getClipWidth(){return cw;} public int getClipHeight(){return ch;}
  public void translate(int x,int y){tx+=x;ty+=y;} public int getTranslateX(){return tx;} public int getTranslateY(){return ty;}
  public void setFont(Font f){} public Font getFont(){return Font.getDefaultFont();} public void setStrokeStyle(int s){}
}
