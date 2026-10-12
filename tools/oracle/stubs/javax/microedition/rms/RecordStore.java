package javax.microedition.rms;
import java.util.*;
public class RecordStore {
  public static final Map<String,RecordStore> STORES=new HashMap<>();
  public final List<byte[]> records=new ArrayList<>();
  public static RecordStore openRecordStore(String n,boolean c) throws RecordStoreException {
    RecordStore r=STORES.get(n);
    if(r==null){if(!c)throw new RecordStoreException(n);r=new RecordStore();STORES.put(n,r);}
    return r;
  }
  public static void deleteRecordStore(String n){STORES.remove(n);}
  public void closeRecordStore(){}
  public int getNumRecords(){return records.size();}
  public byte[] getRecord(int id) throws RecordStoreException {if(id<1||id>records.size())throw new RecordStoreException("id");return records.get(id-1).clone();}
  public int addRecord(byte[] d,int o,int l){records.add(Arrays.copyOfRange(d,o,o+l));return records.size();}
  public void setRecord(int id,byte[] d,int o,int l) throws RecordStoreException {if(id<1||id>records.size())throw new RecordStoreException("id");records.set(id-1,Arrays.copyOfRange(d,o,o+l));}
  public int getRecordSize(int id){return records.get(id-1).length;}
}
