import type { MidiControl, MidiNote, MidiSong } from '../Midi.ts';
import { drumPatch, melodicPatch } from './gmPatches.ts';
import type { DrumPatch, Patch } from './gmPatches.ts';

// Built-in 'synth' engine: plays a parsed MIDI song with Web Audio oscillators and filtered
// noise. Notes are scheduled a little ahead of time so long songs do not create thousands of nodes
// up front. Channel volume (CC7), expression (CC11), pan (CC10) and pitch bend are applied.
// No DOM access at module load, so the module can be imported by node tests.

const LOOKAHEAD=1.2;          // seconds of notes scheduled ahead (covers 1 s timer throttling)
const PUMP_MS=200;
const START_DELAY=.025;
const FADE_OUT=.012;          // time constant of the stop fade
const VOICE_GAIN=.24;
const DRUM_GAIN=.27;
const DRUM_CHANNEL=9;

const midiFrequency=(note:number)=>440*2**((note-69)/12);
const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
/** Velocity to amplitude (GM: 40*log10(v/127) dB). */
const velocityGain=(velocity:number)=>(velocity/127)**2;

interface ChannelStrip {input:GainNode;bends:MidiControl[]}
/** Nodes of one note. `last` is the source that stops last; its onended releases the nodes. */
interface Voice {sources:AudioScheduledSourceNode[];nodes:AudioNode[];last:AudioScheduledSourceNode|null}

const noiseBuffers=new WeakMap<BaseAudioContext,AudioBuffer>();
function noiseBuffer(ctx:BaseAudioContext){
  let buffer=noiseBuffers.get(ctx);
  if(!buffer){
    buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
    const data=buffer.getChannelData(0);let seed=0x2545f491;
    for(let i=0;i<data.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=(seed>>>0)/2147483648-1;}
    noiseBuffers.set(ctx,buffer);
  }
  return buffer;
}

class Playback {
  private readonly ctx:BaseAudioContext;
  private readonly song:MidiSong;
  private readonly start:number;
  private readonly out:GainNode;
  private readonly strips=new Map<number,ChannelStrip>();
  private readonly voices=new Set<Voice>();
  private readonly notes:MidiNote[];
  private next=0;
  private timer:ReturnType<typeof setInterval>|null=null;
  private stopped=false;
  constructor(ctx:BaseAudioContext,destination:AudioNode,song:MidiSong,start:number){
    this.ctx=ctx;this.song=song;this.start=start;
    this.notes=[...song.notes].sort((a,b)=>a.time-b.time);
    this.out=ctx.createGain();this.out.connect(destination);
    this.pump();
    if(this.next<this.notes.length)this.timer=setInterval(()=>this.pump(),PUMP_MS);
  }
  stop(){
    if(this.stopped)return;
    this.stopped=true;
    if(this.timer!==null)clearInterval(this.timer);this.timer=null;
    const now=this.ctx.currentTime,end=now+FADE_OUT*6;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(0,now,FADE_OUT);
    for(const voice of this.voices)for(const s of voice.sources){try{s.stop(end);}catch{ /* Already stopped. */ }}
    const out=this.out;
    setTimeout(()=>{try{out.disconnect();}catch{ /* Already disconnected. */ }},(end-now)*1000+80);
  }
  private pump(){
    if(this.stopped)return;
    const horizon=this.ctx.currentTime+LOOKAHEAD;
    while(this.next<this.notes.length&&this.start+this.notes[this.next].time<horizon){
      const note=this.notes[this.next++];
      try{this.schedule(note);}catch{ /* A voice that cannot be built is skipped. */ }
    }
    if(this.next>=this.notes.length&&this.timer!==null){clearInterval(this.timer);this.timer=null;}
  }
  private strip(channel:number):ChannelStrip {
    let strip=this.strips.get(channel);
    if(strip)return strip;
    const ctx=this.ctx,input=ctx.createGain();
    const panner=typeof ctx.createStereoPanner==='function'?ctx.createStereoPanner():null;
    if(panner)input.connect(panner).connect(this.out);else input.connect(this.out);
    // Channel automation from the file: gain = (CC7/127)^2 * (CC11/127)^2 (GM volume curve).
    let volume=100/127,expression=1;
    const level=()=>volume*volume*expression*expression;
    input.gain.setValueAtTime(level(),this.start);
    panner?.pan.setValueAtTime(0,this.start);
    const bends:MidiControl[]=[];
    for(const c of this.song.controls){
      if(c.channel!==channel)continue;
      const t=this.start+c.time;
      if(c.type==='volume'||c.type==='expression'){
        if(c.type==='volume')volume=c.value;else expression=c.value;
        if(c.time<=0)input.gain.setValueAtTime(level(),this.start);else input.gain.setTargetAtTime(level(),t,.008);
      }else if(c.type==='pan'&&panner){
        if(c.time<=0)panner.pan.setValueAtTime(c.value,this.start);else panner.pan.setTargetAtTime(c.value,t,.01);
      }else if(c.type==='bend')bends.push(c);
    }
    strip={input,bends};this.strips.set(channel,strip);
    return strip;
  }
  private schedule(note:MidiNote){
    const strip=this.strip(note.channel);
    const t=this.start+note.time;
    const voice=note.channel===DRUM_CHANNEL
      ?buildDrum(this.ctx,strip.input,drumPatch(note.note),t,note.velocity)
      :buildVoice(this.ctx,strip.input,melodicPatch(note.program),note,t,strip.bends.map(b=>({time:this.start+b.time,cents:b.value*100})));
    this.voices.add(voice);
    if(voice.last)voice.last.onended=()=>{
      this.voices.delete(voice);
      for(const n of voice.nodes){try{n.disconnect();}catch{ /* Already disconnected. */ }}
    };
  }
}

function buildVoice(ctx:BaseAudioContext,destination:AudioNode,patch:Patch,note:MidiNote,t:number,bends:{time:number;cents:number}[]):Voice {
  const f0=midiFrequency(note.note),nyquist=ctx.sampleRate/2-100;
  const held=Math.max(.03,note.duration);
  const noteOff=t+Math.max(held,patch.attack);
  const percussive=patch.sustain===0&&!patch.reverse;
  const end=percussive?Math.min(noteOff+patch.release*7,t+patch.attack+patch.decay*7):noteOff+patch.release*7;
  const sources:AudioScheduledSourceNode[]=[],nodes:AudioNode[]=[];
  const add=<T extends AudioNode>(node:T)=>{nodes.push(node);return node;};
  const play=(src:AudioScheduledSourceNode)=>{if(src instanceof AudioBufferSourceNode)src.start(t,Math.random()*1.5);else src.start(t);src.stop(end);sources.push(src);};
  // Chain: sources -> head ... [filter] -> [tremolo] -> amp (envelope) -> channel strip.
  const amp=add(ctx.createGain());amp.connect(destination);
  const peak=VOICE_GAIN*patch.gain*velocityGain(note.velocity),g=amp.gain;
  g.setValueAtTime(0,t);
  if(patch.reverse){
    g.linearRampToValueAtTime(peak*.04,t+.01);
    g.exponentialRampToValueAtTime(peak,noteOff);
    g.setTargetAtTime(0,noteOff,patch.release);
  }else{
    g.linearRampToValueAtTime(peak,t+patch.attack);
    g.setTargetAtTime(peak*patch.sustain,t+patch.attack,patch.decay);
    if(noteOff<end)g.setTargetAtTime(0,noteOff,patch.release);
  }
  let head:AudioNode=amp;
  if(patch.tremolo){
    const trem=add(ctx.createGain()),lfo=add(ctx.createOscillator()),depth=add(ctx.createGain());
    trem.gain.value=1-patch.tremolo.depth/2;depth.gain.value=patch.tremolo.depth/2;
    lfo.frequency.value=patch.tremolo.rate;lfo.connect(depth).connect(trem.gain);
    trem.connect(head);head=trem;play(lfo);
  }
  if(patch.filter){
    const spec=patch.filter,filter=add(ctx.createBiquadFilter());
    filter.type=spec.type;filter.Q.value=spec.q??.7;
    const cutoff=clamp(spec.freq??f0*(spec.ratio??4),spec.min??30,Math.min(spec.max??nyquist,nyquist));
    if(spec.envFrom!==undefined){
      filter.frequency.setValueAtTime(clamp(cutoff*spec.envFrom,30,nyquist),t);
      filter.frequency.setTargetAtTime(cutoff,t,spec.envTime??.1);
    }else if(spec.sweepTo!==undefined){
      filter.frequency.setValueAtTime(cutoff,t);
      filter.frequency.exponentialRampToValueAtTime(clamp(cutoff*spec.sweepTo,30,nyquist),t+held/2);
      filter.frequency.exponentialRampToValueAtTime(cutoff,noteOff);
    }else filter.frequency.value=cutoff;
    filter.connect(head);head=filter;
  }
  // Pitch modulation (pitch bend + vibrato) feeds every oscillator's detune, in cents.
  const detune:AudioNode[]=[];
  if(bends.length){
    const before=bends.filter(b=>b.time<=t),during=bends.filter(b=>b.time>t&&b.time<end);
    if(before.length||during.length){
      const bend=add(ctx.createConstantSource());
      bend.offset.setValueAtTime(before.at(-1)?.cents??0,t);
      for(const b of during)bend.offset.setValueAtTime(b.cents,b.time);
      play(bend);detune.push(bend);
    }
  }
  if(patch.vibrato){
    const lfo=add(ctx.createOscillator()),depth=add(ctx.createGain());
    lfo.frequency.value=patch.vibrato.rate;
    depth.gain.setValueAtTime(0,t);depth.gain.linearRampToValueAtTime(patch.vibrato.cents,t+patch.vibrato.delay+.15);
    lfo.connect(depth);play(lfo);detune.push(depth);
  }
  for(const partial of patch.partials){
    const f=f0*partial.ratio;
    if(f>=nyquist)continue;
    const osc=add(ctx.createOscillator()),gain=add(ctx.createGain());
    osc.type=partial.wave;
    if(patch.pitch){osc.frequency.setValueAtTime(Math.min(f*patch.pitch.from,nyquist),t);osc.frequency.exponentialRampToValueAtTime(f,t+patch.pitch.time);}
    else osc.frequency.value=f;
    osc.detune.value=partial.detune??0;
    for(const d of detune)d.connect(osc.detune);
    gain.gain.value=partial.gain;
    osc.connect(gain).connect(head);play(osc);
  }
  if(patch.noise){
    const spec=patch.noise,src=add(ctx.createBufferSource()),filter=add(ctx.createBiquadFilter()),gain=add(ctx.createGain());
    src.buffer=noiseBuffer(ctx);src.loop=true;
    filter.type=spec.type;filter.Q.value=spec.q??.7;
    filter.frequency.value=clamp(spec.freq??f0*(spec.ratio??2),30,nyquist);
    gain.gain.setValueAtTime(spec.gain,t);
    if(spec.decay!==undefined)gain.gain.setTargetAtTime(spec.gain*.15,t+.005,spec.decay);
    src.connect(filter).connect(gain).connect(head);play(src);
  }
  return {sources,nodes,last:sources[0]??null};
}

function buildDrum(ctx:BaseAudioContext,destination:AudioNode,patch:DrumPatch,t:number,velocity:number):Voice {
  const sources:AudioScheduledSourceNode[]=[],nodes:AudioNode[]=[],nyquist=ctx.sampleRate/2-100;
  const out=ctx.createGain();out.gain.value=DRUM_GAIN*velocityGain(velocity);nodes.push(out);
  if(patch.pan&&typeof ctx.createStereoPanner==='function'){
    const pan=ctx.createStereoPanner();pan.pan.value=patch.pan;out.connect(pan).connect(destination);nodes.push(pan);
  }else out.connect(destination);
  let last:AudioScheduledSourceNode|null=null,lastStop=-1;
  for(const layer of patch.layers){
    if(layer.kind==='tone'&&layer.freq>=nyquist)continue;
    const start=t+(layer.delay??0),attack=layer.attack??.001,stop=start+attack+layer.decay*7;
    const env=ctx.createGain();nodes.push(env);
    env.gain.setValueAtTime(0,start);env.gain.linearRampToValueAtTime(layer.gain,start+attack);
    env.gain.setTargetAtTime(0,start+attack,layer.decay);
    env.connect(out);
    let src:AudioScheduledSourceNode;
    if(layer.kind==='tone'){
      const osc=ctx.createOscillator();osc.type=layer.wave??'sine';
      osc.frequency.setValueAtTime(layer.freq,start);
      if(layer.endFreq)osc.frequency.exponentialRampToValueAtTime(layer.endFreq,start+(layer.sweep??.05));
      osc.connect(env);osc.start(start);src=osc;
    }else{
      const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter();
      noise.buffer=noiseBuffer(ctx);noise.loop=true;
      filter.type=layer.filter??'bandpass';filter.Q.value=layer.q??.7;
      filter.frequency.value=clamp(layer.freq,30,nyquist);
      noise.connect(filter).connect(env);noise.start(start,Math.random()*1.5);src=noise;nodes.push(filter);
    }
    src.stop(stop);sources.push(src);nodes.push(src);
    if(stop>lastStop){lastStop=stop;last=src;}
  }
  return {sources,nodes,last};
}

/** The built-in synth. One song at a time; play() replaces the current song. */
export class OscillatorEngine {
  private readonly ctx:BaseAudioContext;
  private readonly destination:AudioNode;
  private playback:Playback|null=null;
  constructor(ctx:BaseAudioContext,destination:AudioNode){this.ctx=ctx;this.destination=destination;}
  play(song:MidiSong,when=this.ctx.currentTime+START_DELAY){
    this.stop();
    this.playback=new Playback(this.ctx,this.destination,song,when);
  }
  stop(){this.playback?.stop();this.playback=null;}
}
