/**
 * Virtual device clock. The host advances it like cGame.run() does on a handset that keeps 20 frames
 * per second, and Thread.sleep inside the game logic (the checkpoint pause) advances it too.
 */
public final class DeviceClock {
  public static long time;
  public static long now(){return time;}
  public static void sleep(long ms) throws InterruptedException {if(ms<0)throw new IllegalArgumentException("negative sleep");time+=ms;}
}
