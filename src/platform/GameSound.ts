import { MidiPreview, parseMidi } from './Midi.ts';
import type { MidiSong } from './Midi.ts';

// cSoundEngine.java, S700 1.2.0: each sound request is an index into snd.f. Music and jingles
// outrank effects so a concurrent effect does not cut them.
const high=new Set([1,2,4,15,16,17,18,19,20]);
const medium=new Set([3,7,8,9,11,12,13]);
const priority=(id:number)=>high.has(id)?30:medium.has(id)?20:10;
/** Original MIDI data with a web oscillator preview; timbres are not J2ME instruments. */
export class GameSound {
  private readonly player=new MidiPreview();
  private readonly cache=new Map<number,Promise<MidiSong>>();
  private generation=0;
  private current=-1;
  private started=0;
  private clearTimer:ReturnType<typeof setTimeout>|null=null;
  enabled=true;
  constructor(private readonly base:string){}
  unlock(){
    this.player.context??=new AudioContext();
    void this.player.context.resume().catch(()=>{});
  }
  stop(){
    this.generation++;
    if(this.clearTimer!==null)clearTimeout(this.clearTimer);
    this.clearTimer=null;this.current=-1;this.player.stop();
  }
  setEnabled(value:boolean){this.enabled=value;if(!value)this.stop();}
  async play(id:number){
    if(!this.enabled||id<0||id>20)return;
    const nextPriority=priority(id),currentPriority=this.current<0?0:priority(this.current);
    if(this.current>=0&&currentPriority>=nextPriority&&
      (currentPriority>nextPriority||performance.now()-this.started<=50))return;
    const generation=++this.generation;
    let pending=this.cache.get(id);
    if(!pending){pending=fetch(`${this.base}assets/snd-${id}.mid`).then(response=>{
      if(!response.ok)throw new Error(`MIDI ${id}: HTTP ${response.status}`);
      return response.arrayBuffer();
    }).then(bytes=>parseMidi(new Uint8Array(bytes)));this.cache.set(id,pending);}
    try{
      const song=await pending;
      if(generation!==this.generation||!this.enabled)return;
      await this.player.play(song);
      if(generation!==this.generation){this.player.stop();return;}
      this.current=id;this.started=performance.now();
      if(this.clearTimer!==null)clearTimeout(this.clearTimer);
      this.clearTimer=setTimeout(()=>{if(generation===this.generation){this.current=-1;this.clearTimer=null;}},Math.max(100,song.duration*1000));
    }catch{this.cache.delete(id);if(generation===this.generation)this.current=-1;}
  }
}
