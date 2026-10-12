package javax.microedition.lcdui;
public class Display {
  static Display d=new Display();
  public static Display getDisplay(javax.microedition.midlet.MIDlet m){return d;}
  public void setCurrent(Displayable x){} public boolean vibrate(int n){return true;} public boolean flashBacklight(int n){return true;} public Displayable getCurrent(){return null;}
}
