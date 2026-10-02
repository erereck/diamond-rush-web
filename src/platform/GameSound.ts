import { MidiPreview, parseMidi } from './Midi.ts';
import type { MidiSong } from './Midi.ts';

// cSoundEngine.java, S700 1.2.0. Each sound is one entry of snd.f.
const eventSounds:Record<string,number>={
  'hurt':5,'death':2,'boulder':14,'break':11,'rubble-break':11,
  'mine-blast':7,'enemy-hit':10,'enemy-death':10,'checkpoint':9,
  'hook':12,'hammer-block':6,'chest':3,'chest-reward':4,
  'gate-open':0,'gold-gate':0,'silver-gate':0,'complete':15,
};
const high=new Set([1,2,4,15,16,17,18,19,20]);
const medium=new Set([3,7,8,9,11,12,13]);
const priority=(id:number)=>high.has(id)?30:medium.has(id)?20:10;
export function soundForEvents(events:readonly string[]):number|null {
  let id:number|null=null;
  for(const event of events){
    const next=eventSounds[event];
    if(next!==undefined&&(id===null||priority(next)>=priority(id)))id=next;
  }
  return id;
}

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
