package javax.microedition.lcdui;
public class Font {
  public static final int FACE_SYSTEM=0,STYLE_PLAIN=0,STYLE_BOLD=1,SIZE_SMALL=8,SIZE_MEDIUM=0,SIZE_LARGE=16,FACE_MONOSPACE=32,FACE_PROPORTIONAL=64,STYLE_ITALIC=2,STYLE_UNDERLINED=4;
  static Font def=new Font();
  public static Font getDefaultFont(){return def;} public static Font getFont(int a,int b,int c){return def;}
  public int getHeight(){return 12;} public int stringWidth(String s){return s.length()*6;} public int charWidth(char c){return 6;}
  public int substringWidth(String s,int o,int l){return l*6;} public int getBaselinePosition(){return 10;}
}
