import java.io.*;

/** J2ME resource streams fill read(byte[]) and skip(n) completely; desktop streams may return short counts. */
public final class OracleIO {
  public static InputStream open(String name){
    InputStream in=OracleIO.class.getResourceAsStream(name);
    return in==null?null:new Full(new BufferedInputStream(in));
  }
  static final class Full extends FilterInputStream {
    Full(InputStream in){super(in);}
    @Override public int read(byte[] b,int off,int len) throws IOException {
      int total=0;
      while(total<len){int n=in.read(b,off+total,len-total);if(n<0)return total==0?-1:total;total+=n;}
      return total;
    }
    @Override public int read(byte[] b) throws IOException {return read(b,0,b.length);}
    @Override public long skip(long n) throws IOException {
      long total=0;
      while(total<n){long s=in.skip(n-total);if(s<=0){if(in.read()<0)break;s=1;}total+=s;}
      return total;
    }
  }
}
