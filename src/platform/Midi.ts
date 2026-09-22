export interface MidiNote {time:number;duration:number;note:number;velocity:number;channel:number;program:number}
export interface MidiSong {duration:number;notes:MidiNote[];tracks:number;division:number}
/** Standard MIDI File reader. Keeps tempo changes global across parallel tracks. */
export function parseMidi(data:Uint8Array):MidiSong {
  const v=new DataView(data.buffer,data.byteOffset,data.byteLength);let p=0;
  const need=(n:number)=>{if(p+n>data.length)throw new Error(`MIDI truncated at ${p}`);};
  const u8=()=>{need(1);return data[p++];};const u16=()=>{need(2);const n=v.getUint16(p);p+=2;return n;};const u32=()=>{need(4);const n=v.getUint32(p);p+=4;return n;};
  const tag=()=>String.fromCharCode(u8(),u8(),u8(),u8());
  const vlq=()=>{let n=0;for(let i=0;i<4;i++){const b=u8();n=(n<<7)|(b&127);if(!(b&128))return n;}throw new Error('MIDI invalid VLQ');};
  if(tag()!=='MThd')throw new Error('Missing MIDI header');const header=u32(),start=p;const format=u16(),tracks=u16(),division=u16();
  if(format>1||division&0x8000||!division||header<6)throw new Error('Unsupported MIDI format');p=start+header;
  const events:{tick:number;order:number;status:number;a:number;b:number}[]=[];
  let maxTick=0;
  for(let track=0;track<tracks;track++){
    if(tag()!=='MTrk')throw new Error('Missing MIDI track');const length=u32();need(length);const end=p+length;let tick=0,running=0;
    while(p<end){
      tick+=vlq();let status=u8();if(status<128){p--;status=running;if(!status)throw new Error('MIDI missing running status');}
      if(status===255){const type=u8(),n=vlq();need(n);if(type===81&&n===3)events.push({tick,order:events.length,status:255,a:(data[p]<<16)|(data[p+1]<<8)|data[p+2],b:0});p+=n;}
      else if(status===240||status===247){const n=vlq();need(n);p+=n;running=0;}
      else {running=status;const kind=status&240,a=u8(),b=kind===192||kind===208?0:u8();events.push({tick,order:events.length,status,a,b});}
      if(p>end)throw new Error('MIDI event exceeds track boundary');
    }
    maxTick=Math.max(maxTick,tick);
  }
  events.sort((a,b)=>a.tick-b.tick||a.order-b.order);
  const notes:MidiNote[]=[],active=new Map<string,MidiNote[]>(),programs=new Uint8Array(16);let tempo=500000,last=0,time=0;
  for(const e of events){
    time+=(e.tick-last)*tempo/division/1e6;last=e.tick;
    if(e.status===255){tempo=e.a;continue;}
    const channel=e.status&15,kind=e.status&240,key=`${channel}/${e.a}`;
    if(kind===192)programs[channel]=e.a;
    else if(kind===144&&e.b){const note={time,duration:0,note:e.a,velocity:e.b,channel,program:programs[channel]};notes.push(note);const list=active.get(key)??[];list.push(note);active.set(key,list);}
    else if(kind===128||(kind===144&&!e.b)){const note=active.get(key)?.shift();if(note)note.duration=Math.max(0,time-note.time);}
  }
  time+=(maxTick-last)*tempo/division/1e6;
  for(const list of active.values())for(const n of list)n.duration=Math.max(0.05,time-n.time);
  return {duration:time,notes,tracks,division};
}
/** Reference-note preview. Synth timbres are explicitly not S700 instrument emulation. */
export class MidiPreview {
  context:AudioContext|null=null; nodes:OscillatorNode[]=[];enabled=false;
  async play(song:MidiSong){
    this.stop();this.context??=new AudioContext();await this.context.resume();
    const ctx=this.context,start=ctx.currentTime+.04;
    for(const n of song.notes){
      if(!n.duration)continue;
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type=n.program>=80&&n.program<88?'square':n.channel===9?'triangle':'sine';
      osc.frequency.value=440*2**((n.note-69)/12);
      const t=start+n.time,end=t+Math.max(.02,n.duration),volume=n.velocity/127*.065;
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.005);gain.gain.setValueAtTime(volume*.7,Math.max(t+.006,end-.02));gain.gain.linearRampToValueAtTime(0,end+.04);
      osc.connect(gain).connect(ctx.destination);osc.start(t);osc.stop(end+.05);this.nodes.push(osc);
      osc.onended=()=>{osc.disconnect();gain.disconnect();};
    }
  }
  stop(){for(const n of this.nodes){try{n.stop();}catch{ /* Already ended. */ }}this.nodes=[];}
}
