package javax.microedition.midlet;
public abstract class MIDlet {
  protected MIDlet(){}
  protected abstract void startApp() throws MIDletStateChangeException;
  protected abstract void pauseApp();
  protected abstract void destroyApp(boolean b) throws MIDletStateChangeException;
  public final void notifyDestroyed(){} public final void notifyPaused(){} public final void resumeRequest(){}
  public final String getAppProperty(String k){ if("MIDlet-Version".equals(k))return "1.2.0"; return null; }
  public final boolean platformRequest(String u){return false;}
}
