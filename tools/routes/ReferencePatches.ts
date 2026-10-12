/**
 * Harness patches applied to a copy of the pinned S700 decompilation before it is compiled
 * (JVM oracle) or translated (generated TypeScript core). Both targets share every patch that
 * can change gameplay, so the two engines run identical logic.
 */
export type ReferenceTarget='jvm'|'ts';
export interface PatchedSources {files:Map<string,string>;log:string[]}
export function patchReferenceSources(original:Map<string,string>,target:ReferenceTarget):PatchedSources{
  const files=new Map(original),log:string[]=[];
  const edit=(name:string,fn:(text:string)=>string)=>{const text=files.get(name);if(text===undefined)throw new Error(`Missing ${name}`);files.set(name,fn(text));};
  const once=(text:string,before:string,after:string,why:string)=>{
    if(text.split(before).length!==2)throw new Error(`Reference marker changed: ${before}`);
    log.push(why);return text.replace(before,after);
  };
  // The host drives one frame per tick; the MIDlet thread would run a second, timed loop.
  edit('cGame.java',t=>once(t,'this.field_357.start();','/* frames are driven by the host */','disable the MIDlet game thread'));
  // The decompilation (commit 3a89cc1, "FIXME: DEBUG ADDITION") prints gameState in the corner of every frame.
  edit('cGame.java',t=>once(t,'field_320[41].drawString(this.field_314, Integer.toString(gameState), 0, 0, Graphics.TOP|Graphics.LEFT);','/* debug overlay added by the decompilation */','remove the decompilation debug overlay'));
  // Utils seeds java.util.Random with the wall clock (boss timers); a fixed seed keeps replays reproducible.
  edit('Utils.java',t=>once(t,'new Random(System.currentTimeMillis())','new Random(0L)','fixed java.util.Random seed'));
  for(const name of [...files.keys()])edit(name,t=>{
    // Gameplay reads the clock (e.g. the short chest animation within five seconds); use the 20 fps device clock.
    const clocks=t.split('System.currentTimeMillis()').length-1;
    if(clocks)log.push(`${name}: ${clocks} clock read(s) through DeviceClock`);
    t=t.replaceAll('System.currentTimeMillis()','DeviceClock.now()');
    // Thread.sleep inside the logic (the checkpoint's 100 ms pause) takes device time, not host time.
    const sleeps=t.split('Thread.sleep(').length-1;
    if(sleeps)log.push(`${name}: ${sleeps} sleep(s) through DeviceClock`);
    t=t.replaceAll('Thread.sleep(','DeviceClock.sleep(');
    if(target==='jvm'){
      // J2ME resolves "/name" inside the MIDlet JAR for any class and fills read(byte[]) completely.
      const streams=t.split('this.getClass().getResourceAsStream(').length-1;
      if(streams)log.push(`${name}: ${streams} resource stream(s) through OracleIO`);
      t=t.replaceAll('this.getClass().getResourceAsStream(','OracleIO.open(');
    }
    return t;
  });
  if(target==='jvm')edit('cGame.java',t=>once(t,'InputStream fileStream = file.getClass().getResourceAsStream(file);','InputStream fileStream = OracleIO.open(file);','packed-file lookup through the game class loader'));
  return {files,log};
}
