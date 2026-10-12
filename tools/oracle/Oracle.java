import java.io.*;
import java.lang.reflect.*;
import java.util.*;

/**
 * Headless driver for the recompiled S700 decompilation (see tools/oracle-s700.ts).
 * It boots the game on stubbed J2ME APIs, lets the New Game loader open the requested
 * stage with the requested record values, then sends one control per frame as device
 * key events (press/release on changes) and prints the state after every frame.
 *
 * Input file:  first line "world level lives diamonds redDiamonds maxHealth weaponTier diving [mapTicks]"
 *              then lines "ticks direction action reset" (direction 0..4 = none/up/right/down/left).
 * Output rows: tick,gameState,x,y,offset,direction,anim,health,lives,diamonds,red,gold,silver,tilesHash,objectsHash
 */
public class Oracle {
  static cGame g;static PrintStream out;
  static final Map<String,Field> FIELDS=new HashMap<>();
  static Field field(String n){
    return FIELDS.computeIfAbsent(n,k->{
      for(Class<?> c=cGame.class;c!=null;c=c.getSuperclass()){
        try{Field f=c.getDeclaredField(k);f.setAccessible(true);return f;}catch(NoSuchFieldException e){}
      }
      throw new RuntimeException("no field "+k);
    });
  }
  static Object get(String n){try{Field f=field(n);return f.get(Modifier.isStatic(f.getModifiers())?null:g);}catch(Exception e){throw new RuntimeException(e);}}
  static int geti(String n){Object v=get(n);if(v instanceof Boolean)return ((Boolean)v)?1:0;return ((Number)v).intValue();}
  static void set(String n,Object v){
    try{
      Field f=field(n);Object target=Modifier.isStatic(f.getModifiers())?null:g;Class<?> t=f.getType();
      if(v instanceof Number){
        Number x=(Number)v;
        if(t==byte.class)f.setByte(target,x.byteValue());else if(t==short.class)f.setShort(target,x.shortValue());
        else if(t==int.class)f.setInt(target,x.intValue());else if(t==long.class)f.setLong(target,x.longValue());else f.set(target,v);
      }else f.set(target,v);
    }catch(Exception e){throw new RuntimeException(e);}
  }
  static Object call(String n,Object... args){
    try{
      for(Method m:cGame.class.getDeclaredMethods())if(m.getName().equals(n)&&m.getParameterCount()==args.length){m.setAccessible(true);return m.invoke(Modifier.isStatic(m.getModifiers())?null:g,args);}
      throw new RuntimeException("no method "+n);
    }catch(InvocationTargetException e){throw new RuntimeException(e.getCause());}catch(Exception e){throw new RuntimeException(e);}
  }
  static javax.microedition.lcdui.Graphics screen;
  /**
   * One iteration of cGame.run(): logic (method_67), then the paint (method_132), which also moves
   * sprites the logic reads. The device clock does not advance inside a frame, so the measured frame
   * time (field_370) is 0 and the lag branch that skips the paint never runs.
   */
  static long getl(String n){return ((Number)get(n)).longValue();}
  static void frame(){
    set("field_368",DeviceClock.now());
    call("method_67");
    if(geti("gameState")!=2)set("frameCounter",geti("frameCounter")+1);
    set("field_369",DeviceClock.now());
    if(getl("field_370")>65){
      long wait=100-getl("field_370")-getl("field_369");if(wait>0)DeviceClock.time+=wait;
      set("field_229",true);set("field_370",0L);
    }else{
      if(screen==null)try{Method m=javax.microedition.lcdui.game.GameCanvas.class.getDeclaredMethod("getGraphics");m.setAccessible(true);screen=(javax.microedition.lcdui.Graphics)m.invoke(g);}catch(Exception e){throw new RuntimeException(e);}
      call("method_132",screen);
      set("field_229",false);
      if(geti("gameState")!=2)set("field_227",geti("field_227")+1);
      set("field_370",Math.abs(DeviceClock.now()-getl("field_368")));
      long wait=50-(DeviceClock.now()-getl("field_368"));if(wait>0)DeviceClock.time+=wait;
    }
  }
  static final int[] DIR_KEYS={0,50,54,56,52}; // KEY_NUM2 up, KEY_NUM6 right, KEY_NUM8 down, KEY_NUM4 left
  static int heldDir=0;static boolean heldAct=false,heldStar=false;
  static void keys(int dir,boolean act,boolean star){
    if(dir!=heldDir){if(heldDir!=0)g.keyReleased(DIR_KEYS[heldDir]);if(dir!=0)g.keyPressed(DIR_KEYS[dir]);heldDir=dir;}
    if(act!=heldAct){if(act)g.keyPressed(53);else g.keyReleased(53);heldAct=act;}
    if(star!=heldStar){if(star)g.keyPressed(42);else g.keyReleased(42);heldStar=star;}
  }
  static int anim(){
    try{Object[] inst=(Object[])get("field_323");Field fa=inst[0].getClass().getDeclaredField("_nCrtAnim");fa.setAccessible(true);return fa.getInt(inst[0]);}catch(Exception e){return -1;}
  }
  /** FNV-1a over a plane in row-major order, matching tools/routes/JavaOracle.ts. */
  static int hashTiles(){
    byte[][] t=(byte[][])get("field_334");int w=geti("crtLevelWidth"),h=geti("crtLevelHeight"),x0=0x811c9dc5;
    if(t==null)return 0; // between stages the planes are released
    int hash=x0;for(int y=0;y<h;y++)for(int x=0;x<w;x++){hash^=t[x][y]&255;hash*=0x01000193;}
    return hash;
  }
  static int hashObjects(){
    int[][] o=(int[][])get("field_332");int w=geti("crtLevelWidth"),h=geti("crtLevelHeight");
    if(o==null)return 0;
    int hash=0x811c9dc5;for(int y=0;y<h;y++)for(int x=0;x<w;x++){hash^=o[x][y]&255;hash*=0x01000193;}
    return hash;
  }
  static String row(int tick){
    return tick+","+geti("gameState")+","+geti("playerXPos")+","+geti("playerYPos")+","+geti("field_232")+","+(geti("field_233")&7)+","+anim()+","+geti("field_239")+","+geti("playerLifeCount")+","+geti("collectedDiamonds")+","+geti("collectedRedDiamonds")+","+geti("playerGoldKeys")+","+geti("playerSilverKeys")+","+Integer.toUnsignedString(hashTiles(),16)+","+Integer.toUnsignedString(hashObjects(),16);
  }
  /** Planes in row-major order: tiles, objects (&255), object parameter (>>8), field_333 state, field_335 motion, field_336 activity. */
  static String map(){
    byte[][] t=(byte[][])get("field_334");int[][] o=(int[][])get("field_332");int[][] s=(int[][])get("field_333");byte[][] m=(byte[][])get("field_335");byte[][] act=(byte[][])get("field_336");
    int w=geti("crtLevelWidth"),h=geti("crtLevelHeight");
    StringBuilder b=new StringBuilder();
    for(int plane=0;plane<6;plane++){
      if(plane>0)b.append('|');
      for(int y=0;y<h;y++)for(int x=0;x<w;x++){
        if(x+y>0)b.append(' ');
        b.append(plane==0?t[x][y]:plane==1?(o[x][y]&255):plane==2?(o[x][y]>>8):plane==3?s[x][y]:plane==4?m[x][y]:act[x][y]);
      }
    }
    return b.toString();
  }
  public static void main(String[] a) throws Exception {
    out=new PrintStream(new BufferedOutputStream(new FileOutputStream(FileDescriptor.out)),false,"UTF-8");
    System.setOut(new PrintStream(OutputStream.nullOutputStream()));
    try{run(a[0]);}catch(Throwable t){out.println("ERROR,"+t);out.flush();t.printStackTrace();System.err.flush();Runtime.getRuntime().halt(3);}
    out.flush();Runtime.getRuntime().halt(0);
  }
  static void run(String inputPath) throws Exception {
    List<String> lines=new ArrayList<>();
    try(BufferedReader in=new BufferedReader(new FileReader(inputPath))){String l;while((l=in.readLine())!=null)if(!l.trim().isEmpty())lines.add(l.trim());}
    String[] h=lines.get(0).split("\\s+");
    int world=Integer.parseInt(h[0]),level=Integer.parseInt(h[1]),lives=Integer.parseInt(h[2]),diamonds=Integer.parseInt(h[3]),red=Integer.parseInt(h[4]),maxHealth=Integer.parseInt(h[5]),weapon=Integer.parseInt(h[6]),diving=Integer.parseInt(h[7]);
    Set<Integer> mapTicks=new HashSet<>();
    if(h.length>8&&!h[8].equals("-"))for(String s:h[8].split(","))mapTicks.add(Integer.parseInt(s));
    GloftDIRU midlet=new GloftDIRU();
    g=midlet.field_575;midlet.field_576=javax.microedition.lcdui.Display.getDisplay(midlet);
    set("field_228",System.currentTimeMillis());
    call("method_65");call("loadPreferenceData");
    int frames=0;
    while(geti("gameState")!=4){
      int s=geti("gameState");
      if(s==30){set("gameState",4);call("openMenu",0);break;}
      if(s==7)set("field_261",true);
      frame();
      if(++frames>20000)throw new RuntimeException("boot stuck in state "+geti("gameState"));
    }
    // New Game: method_113 rebuilds the record, then the loader opens world 0 level 13.
    // Replace the destination and record values right after method_113 finishes.
    call("method_218");
    boolean patched=false;frames=0;
    while(geti("gameState")!=1){
      frame();
      if(!patched&&geti("gameState")==5&&geti("assetsLoaded")==5&&(Boolean)get("field_329")){
        byte[] r=(byte[])get("recordData");
        set("currentWorld",world);set("currentLevel",level);
        r[3]=(byte)lives;r[4]=(byte)(diamonds&255);r[5]=(byte)(diamonds>>8);r[6]=(byte)(red&255);r[7]=(byte)(red>>8);
        r[8]=(byte)maxHealth;r[9]=(byte)weapon;r[10]=(byte)diving;
        // As Engine.ts: every stage but the tutorial is entered from its world map (method_408/425/424/427).
        if(!(world==0&&level==13)){
          set("field_515",100);call("method_409");call("method_426",new String[]{"/map_angkor.out","/map_scotland.out","/map_tibet.out"}[world]);
          set("field_446",true);call("method_427");
          set("field_179",true);
        }
        patched=true;
      }
      if(++frames>20000)throw new RuntimeException("load stuck in state "+geti("gameState")+" assets "+geti("assetsLoaded"));
    }
    out.println("LOADED,"+geti("currentWorld")+","+geti("currentLevel")+","+geti("crtLevelWidth")+","+geti("crtLevelHeight")+","+frames);
    if(mapTicks.contains(0)&&get("field_334")!=null)out.println("MAP,0,"+map());
    out.println(row(0));
    int tick=0;
    for(int li=1;li<lines.size();li++){
      String[] p=lines.get(li).split("\\s+");
      int n=Integer.parseInt(p[0]),dir=Integer.parseInt(p[1]);boolean act=p[2].equals("1"),star=p.length>3&&p[3].equals("1");
      for(int i=0;i<n;i++){
        keys(dir,act,star);
        int before=geti("gameState");
        frame();tick++;
        out.println(row(tick));
        if(mapTicks.contains(tick)&&get("field_334")!=null)out.println("MAP,"+tick+","+map());
        if(geti("gameState")!=before)out.println("STATE,"+tick+","+before+","+geti("gameState"));
      }
    }
    keys(0,false,false);
    for(int i=1;i<=200;i++){int before=geti("gameState");frame();if(geti("gameState")!=before)out.println("STATE,+"+i+","+before+","+geti("gameState"));}
    out.println("END,"+row(tick));
  }
}
