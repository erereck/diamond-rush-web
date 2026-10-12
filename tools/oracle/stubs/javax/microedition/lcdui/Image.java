package javax.microedition.lcdui;
public class Image {
  int w,h;
  Image(int w,int h){this.w=w;this.h=h;}
  public static Image createImage(int w,int h){return new Image(w,h);}
  public static Image createImage(byte[] d,int o,int l){
    // PNG IHDR: width/height are big-endian at bytes 16..23.
    if(l>24&&d[o+1]==80&&d[o+2]==78&&d[o+3]==71){
      int w=((d[o+16]&255)<<24)|((d[o+17]&255)<<16)|((d[o+18]&255)<<8)|(d[o+19]&255);
      int h=((d[o+20]&255)<<24)|((d[o+21]&255)<<16)|((d[o+22]&255)<<8)|(d[o+23]&255);
      return new Image(w,h);
    }
    return new Image(1,1);
  }
  public static Image createImage(String name) throws java.io.IOException {
    java.io.InputStream in=Image.class.getResourceAsStream(name);
    if(in==null)throw new java.io.IOException(name);
    byte[] b=in.readAllBytes();return createImage(b,0,b.length);
  }
  public static Image createImage(Image i){return new Image(i.w,i.h);}
  public static Image createImage(Image i,int x,int y,int w,int h,int t){return new Image(w,h);}
  public static Image createRGBImage(int[] d,int w,int h,boolean a){return new Image(w,h);}
  public int getWidth(){return w;} public int getHeight(){return h;}
  public Graphics getGraphics(){return new Graphics(w,h);} public boolean isMutable(){return true;}
  public void getRGB(int[] d,int o,int s,int x,int y,int w,int h){}
}
