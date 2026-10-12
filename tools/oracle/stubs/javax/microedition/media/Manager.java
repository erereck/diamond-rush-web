package javax.microedition.media;
import javax.microedition.media.control.VolumeControl;
public class Manager {
  static class P implements Player, VolumeControl {
    int state=UNREALIZED,level=100;boolean mute;
    public void realize(){state=REALIZED;} public void prefetch(){state=PREFETCHED;} public void start(){state=PREFETCHED;} public void stop(){state=PREFETCHED;}
    public void deallocate(){state=REALIZED;} public void close(){state=CLOSED;} public int getState(){return state;} public void setLoopCount(int c){}
    public long setMediaTime(long t){return 0;} public long getMediaTime(){return 0;} public long getDuration(){return 0;}
    public void addPlayerListener(PlayerListener l){} public void removePlayerListener(PlayerListener l){} public String getContentType(){return "audio/midi";}
    public Control getControl(String t){return this;} public Control[] getControls(){return new Control[]{this};}
    public int setLevel(int l){level=l;return l;} public int getLevel(){return level;} public void setMute(boolean m){mute=m;} public boolean isMuted(){return mute;}
  }
  public static Player createPlayer(java.io.InputStream in,String type){return new P();}
  public static Player createPlayer(String l){return new P();}
}
