import { parseMidi } from './Midi.ts';
import type { MidiSong } from './Midi.ts';
import { OscillatorEngine } from './audio/OscillatorEngine.ts';
import { SOUND_COUNT, SoundArbiter, isMusicSound } from './audio/SoundArbiter.ts';
import type { SampleEngine } from './audio/SampleEngine.ts';

export type SynthEngine='samples'|'synth';
/** State of the soundfont: idle (not requested yet), loading, ready, fallback (failed; synth in use). */
export type SoundStatus='idle'|'loading'|'ready'|'fallback';
export interface SoundVolumes {master:number;music:number;effects:number}
export interface SoundInfo {notes:number;duration:number;tracks:number}

/** Trimmed GeneralUser GS bank, relative to the site base (see tools/build-soundfont.ts). */
export const SOUNDFONT_PATH='soundfont/diamond-rush-gm.sf3';
/** An effect that waited longer than this for the soundfont is dropped instead of playing late. */
const STALE_EFFECT_MS=250;

interface Track {bytes:ArrayBuffer;song:MidiSong}

/**
 * The game's sound engine. Requests follow cSoundEngine.java (one player, priorities, the 50 ms
 * rule, no loops; see audio/SoundArbiter.ts). The MIDI files are played either with the trimmed
 * GeneralUser GS soundfont through spessasynth ('samples', default) or with the built-in
 * oscillator synth ('synth'), which is also the automatic fallback.
 */
export class GameSound {
  private readonly base:string;
  private readonly arbiter:SoundArbiter;
  private readonly tracks=new Map<number,Promise<Track>>();
  private ctx:AudioContext|null=null;
  private master:GainNode|null=null;
  /** Volume of the current sound's category (music or effects). */
  private bus:GainNode|null=null;
  private synth:OscillatorEngine|null=null;
  private samples:SampleEngine|null=null;
  private loading:Promise<SampleEngine|null>|null=null;
  /** The sound the single player is playing (or about to play); null when silent. */
  private current:{token:number;id:number}|null=null;
  private started:Promise<void>=Promise.resolve();
  private token=0;
  private endTimer:ReturnType<typeof setTimeout>|null=null;
  private enabled=true;
  private volumes:SoundVolumes={master:1,music:1,effects:1};
  private engineKind:SynthEngine='samples';
  private soundfontStatus:SoundStatus='idle';
  /** Optional: called whenever `status` changes. */
  onstatuschange:((status:SoundStatus)=>void)|null=null;

  constructor(base:string){
    this.base=base;
    this.arbiter=new SoundArbiter({
      start:id=>{this.started=this.begin(id,false);},
      stop:()=>this.silence(),
      isSounding:id=>this.current?.id===id,
    },()=>performance.now());
  }

  get engine():SynthEngine {return this.engineKind;}
  get status():SoundStatus {return this.soundfontStatus;}

  /** Call from a user gesture. Creates/resumes the AudioContext and starts loading the soundfont. */
  unlock(){
    if(!this.ctx){
      if(typeof AudioContext==='undefined')return;
      let ctx:AudioContext;
      try{ctx=new AudioContext({latencyHint:'interactive'});}catch{return;}
      this.ctx=ctx;
      // master -> soft limiter -> speakers; bus (category volume) -> master.
      const limiter=ctx.createDynamicsCompressor();
      limiter.threshold.value=-6;limiter.knee.value=6;limiter.ratio.value=12;limiter.attack.value=.003;limiter.release.value=.15;
      this.master=ctx.createGain();this.master.gain.value=this.volumes.master;
      this.bus=ctx.createGain();
      this.bus.connect(this.master).connect(limiter).connect(ctx.destination);
      this.synth=new OscillatorEngine(ctx,this.bus);
      for(let id=0;id<SOUND_COUNT;id++)this.track(id).catch(()=>{});
    }
    this.ctx.resume().catch(()=>{});
    if(this.engineKind==='samples'&&this.soundfontStatus==='idle')void this.loadSamples();
  }

  /** A sound request from the game: cSoundEngine.playSound(). Resolves once the sound starts (or is ignored). */
  play(id:number):Promise<void>{
    if(!this.enabled||!this.ctx||!Number.isInteger(id)||id<0||id>=SOUND_COUNT)return Promise.resolve();
    if(this.ctx.state!=='running')this.ctx.resume().catch(()=>{});
    return this.arbiter.request(id)==='started'?this.started:Promise.resolve();
  }

  /** cSoundEngine.freeCrtPlayerResource(): forget the current sound (long sounds and music are stopped). */
  cut(){this.arbiter.cut();}

  /** Port UI: stop everything (scene change, pause, page hidden). */
  stop(){this.arbiter.reset();this.silence();}

  setEnabled(on:boolean){this.enabled=on;if(!on)this.stop();}

  /** Volumes from 0 to 1. Music = sounds 15-20, effects = 0-14. */
  setVolumes(v:SoundVolumes){
    const level=(x:number)=>Number.isFinite(x)?Math.min(1,Math.max(0,x)):1;
    this.volumes={master:level(v.master),music:level(v.music),effects:level(v.effects)};
    if(this.ctx&&this.master)this.master.gain.setTargetAtTime(this.volumes.master,this.ctx.currentTime,.015);
    if(this.current)this.applyBus(this.current.id);
  }

  /**
   * 'samples' = soundfont via spessasynth (default), 'synth' = built-in oscillator synth.
   * A change stops the current sound. Safe to call repeatedly with the same value.
   */
  setEngine(engine:SynthEngine){
    if((engine!=='samples'&&engine!=='synth')||engine===this.engineKind)return;
    this.stop();this.engineKind=engine;
    // Switching (back) to the soundfont after a failure retries the download once.
    if(engine==='samples'&&this.ctx&&this.soundfontStatus!=='loading'&&this.soundfontStatus!=='ready')void this.loadSamples();
  }

  /** Lab: plays a sound directly, ignoring priorities. Waits for the soundfont when it is loading. */
  async preview(id:number):Promise<SoundInfo>{
    if(!Number.isInteger(id)||id<0||id>=SOUND_COUNT)throw new RangeError(`Unknown sound ${id}`);
    if(this.enabled)this.unlock();
    const track=await this.track(id);
    const info={notes:track.song.notes.length,duration:track.song.duration,tracks:track.song.tracks};
    if(!this.enabled||!this.ctx)return info;
    this.stop();
    await this.begin(id,true);
    return info;
  }

  private setStatus(status:SoundStatus){
    if(status===this.soundfontStatus)return;
    this.soundfontStatus=status;
    try{this.onstatuschange?.(status);}catch{ /* A UI callback must not break the audio. */ }
  }

  private loadSamples():Promise<SampleEngine|null>{
    if(this.samples)return Promise.resolve(this.samples);
    if(this.loading)return this.loading;
    const ctx=this.ctx,bus=this.bus;
    if(!ctx||!bus)return Promise.resolve(null);
    this.setStatus('loading');
    this.loading=(async()=>{
      try{
        const songs=await Promise.all(Array.from({length:SOUND_COUNT},(_,id)=>this.track(id).then(t=>t.bytes))).catch(()=>[]);
        const { SampleEngine }=await import('./audio/SampleEngine.ts');
        this.samples=await SampleEngine.load(ctx,bus,`${this.base}${SOUNDFONT_PATH}`,songs);
        this.setStatus('ready');
        return this.samples;
      }catch(error){
        console.warn('Soundfont unavailable; using the built-in synth.',error);
        this.setStatus('fallback');
        return null;
      }finally{this.loading=null;}
    })();
    return this.loading;
  }

  private track(id:number):Promise<Track>{
    let pending=this.tracks.get(id);
    if(!pending){
      pending=fetch(`${this.base}assets/snd-${id}.mid`).then(response=>{
        if(!response.ok)throw new Error(`MIDI ${id}: HTTP ${response.status}`);
        return response.arrayBuffer();
      }).then(bytes=>({bytes,song:parseMidi(new Uint8Array(bytes))}));
      pending.catch(()=>this.tracks.delete(id));
      this.tracks.set(id,pending);
    }
    return pending;
  }

  /** Player.start(): plays `id` from its beginning on the selected engine. */
  private async begin(id:number,preview:boolean):Promise<void>{
    const token=++this.token,requestedAt=performance.now();
    this.clearEndTimer();
    this.current={token,id};
    try{
      const track=await this.track(id);
      if(token!==this.token)return;
      let samples=this.engineKind==='samples'?this.samples:null;
      if(!samples&&this.engineKind==='samples'&&this.soundfontStatus==='loading'){
        samples=await this.loadSamples();
        if(token!==this.token)return;
        // A late effect would be out of sync with the game; music and previews start late instead.
        if(!preview&&!isMusicSound(id)&&performance.now()-requestedAt>STALE_EFFECT_MS){this.finish(token);return;}
      }
      this.applyBus(id);
      if(samples){this.synth?.stop();samples.play(track.bytes);}
      else{this.samples?.stop();this.synth?.play(track.song);}
      // End of media: the phone's playerUpdate("endOfMedia") frees the player.
      this.endTimer=setTimeout(()=>this.finish(token),track.song.duration*1000+30);
    }catch{
      if(token===this.token)this.finish(token);
    }
  }

  private finish(token:number){
    if(token!==this.token)return;
    this.endTimer=null;this.current=null;
    this.arbiter.endOfMedia();
  }

  /** Player.deallocate(): silences the player and abandons a pending start. */
  private silence(){
    this.token++;
    this.current=null;
    this.clearEndTimer();
    this.synth?.stop();
    this.samples?.stop();
  }

  private clearEndTimer(){if(this.endTimer!==null){clearTimeout(this.endTimer);this.endTimer=null;}}

  private applyBus(id:number){
    if(!this.ctx||!this.bus)return;
    const level=isMusicSound(id)?this.volumes.music:this.volumes.effects;
    this.bus.gain.setTargetAtTime(level,this.ctx.currentTime,.01);
  }
}
