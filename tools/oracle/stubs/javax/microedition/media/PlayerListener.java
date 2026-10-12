package javax.microedition.media;
public interface PlayerListener { String END_OF_MEDIA="endOfMedia",STARTED="started",STOPPED="stopped",CLOSED="closed"; void playerUpdate(Player p,String e,Object d); }
