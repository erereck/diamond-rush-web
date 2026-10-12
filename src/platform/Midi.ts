export interface MidiNote {
  /** Seconds from the start of the song. */
  time:number;
  /** Seconds until the matching note-off (0 when the note-off comes at the same tick). */
  duration:number;
  note:number;
  velocity:number;
  channel:number;
  /** Program (patch) of the channel when the note started; events at the same tick apply in file order. */
  program:number;
}
/**
 * Channel state change, already converted to playback units:
 * - program: 0..127
 * - volume (CC7) and expression (CC11): 0..1 (controller / 127)
 * - pan (CC10): -1 (left) .. 1 (right)
 * - bend: semitones, using the channel's RPN 0 bend range (2 semitones by default)
 */
export interface MidiControl {time:number;channel:number;type:'program'|'volume'|'pan'|'expression'|'bend';value:number}
export interface MidiSong {
  duration:number;
  notes:MidiNote[];
  tracks:number;
  division:number;
  /** Program changes, CC7/CC10/CC11 and pitch bends in time order (stable within a tick). */
  controls:MidiControl[];
}

/** GM defaults (Recommended Practice RP-015 / GM1). */
export const MIDI_DEFAULT_VOLUME=100/127;
export const MIDI_DEFAULT_PAN=0;
export const MIDI_DEFAULT_EXPRESSION=1;
export const MIDI_DEFAULT_BEND_RANGE=2;
export const MIDI_DRUM_CHANNEL=9;

const panValue=(cc:number)=>Math.max(-1,Math.min(1,(cc-64)/63));

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
  const notes:MidiNote[]=[],controls:MidiControl[]=[],active=new Map<number,MidiNote[]>();
  const programs=new Uint8Array(16),bendRange=new Float64Array(16).fill(MIDI_DEFAULT_BEND_RANGE),bend=new Float64Array(16);
  // RPN selection per channel (CC101/CC100); 127/127 is the null RPN.
  const rpnMsb=new Uint8Array(16).fill(127),rpnLsb=new Uint8Array(16).fill(127);
  let tempo=500000,last=0,time=0;
  for(const e of events){
    time+=(e.tick-last)*tempo/division/1e6;last=e.tick;
    if(e.status===255){tempo=e.a;continue;}
    const channel=e.status&15,kind=e.status&240,key=channel<<7|e.a;
    if(kind===192){programs[channel]=e.a;controls.push({time,channel,type:'program',value:e.a});}
    else if(kind===144&&e.b){const note={time,duration:0,note:e.a,velocity:e.b,channel,program:programs[channel]};notes.push(note);const list=active.get(key)??[];list.push(note);active.set(key,list);}
    else if(kind===128||(kind===144&&!e.b)){const note=active.get(key)?.shift();if(note)note.duration=Math.max(0,time-note.time);}
    else if(kind===224){bend[channel]=((e.b<<7|e.a)-8192)/8192*bendRange[channel];controls.push({time,channel,type:'bend',value:bend[channel]});}
    else if(kind===176){
      const cc=e.a,value=e.b;
      if(cc===7)controls.push({time,channel,type:'volume',value:value/127});
      else if(cc===10)controls.push({time,channel,type:'pan',value:panValue(value)});
      else if(cc===11)controls.push({time,channel,type:'expression',value:value/127});
      else if(cc===101)rpnMsb[channel]=value;
      else if(cc===100)rpnLsb[channel]=value;
      else if(cc===6&&rpnMsb[channel]===0&&rpnLsb[channel]===0)bendRange[channel]=value; // RPN 0: bend sensitivity
      else if(cc===121){ // Reset All Controllers (RP-015): expression and bend, not volume or pan.
        controls.push({time,channel,type:'expression',value:1});
        if(bend[channel]){bend[channel]=0;controls.push({time,channel,type:'bend',value:0});}
        rpnMsb[channel]=rpnLsb[channel]=127;
      }
    }
  }
  time+=(maxTick-last)*tempo/division/1e6;
  for(const list of active.values())for(const n of list)n.duration=Math.max(0.05,time-n.time);
  return {duration:time,notes,tracks,division,controls};
}

/** Channel state at a point of the song, for tools and tests. */
export function channelStateAt(song:MidiSong,channel:number,time:number){
  const state={program:0,volume:MIDI_DEFAULT_VOLUME,pan:MIDI_DEFAULT_PAN,expression:MIDI_DEFAULT_EXPRESSION,bend:0};
  for(const c of song.controls){if(c.time>time)break;if(c.channel===channel)state[c.type]=c.value;}
  return state;
}

