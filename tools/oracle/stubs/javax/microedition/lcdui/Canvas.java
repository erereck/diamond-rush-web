package javax.microedition.lcdui;
public abstract class Canvas extends Displayable {
  public static final int UP=1,DOWN=6,LEFT=2,RIGHT=5,FIRE=8,GAME_A=9,GAME_B=10,GAME_C=11,GAME_D=12;
  public static final int KEY_NUM0=48,KEY_NUM1=49,KEY_NUM2=50,KEY_NUM3=51,KEY_NUM4=52,KEY_NUM5=53,KEY_NUM6=54,KEY_NUM7=55,KEY_NUM8=56,KEY_NUM9=57,KEY_STAR=42,KEY_POUND=35;
  protected Canvas(){}
  public int getGameAction(int k){return 0;} public int getKeyCode(int a){return 0;} public String getKeyName(int k){return "";}
  public void setFullScreenMode(boolean b){} public final void repaint(){} public final void repaint(int a,int b,int c,int d){} public final void serviceRepaints(){}
  public boolean hasPointerEvents(){return false;} public boolean hasRepeatEvents(){return false;} public boolean isDoubleBuffered(){return true;}
  protected void keyPressed(int k){} protected void keyReleased(int k){} protected void keyRepeated(int k){}
  protected void paint(Graphics g){} protected void showNotify(){} protected void hideNotify(){} protected void sizeChanged(int w,int h){}
}
