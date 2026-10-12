// 'samples' engine: General MIDI playback with spessasynth_lib (AudioWorklet) and the trimmed
// GeneralUser GS sound bank in public/soundfont/. GameSound loads this module with a dynamic
// import, so the synthesizer (and spessasynth_core) only download when the soundfont is used.
// `?url` makes Vite serve the worklet processor in dev and emit it (with the base path) in builds.
import processorUrl from 'spessasynth_lib/dist/spessasynth_processor.min.js?url';
import { Sequencer, WorkletSynthesizer } from 'spessasynth_lib';

const FADE=.006;          // time constant of the cut fade, seconds
const CUT_MS=30;          // the old voices are killed once the fade has reached about -40 dB
const RAMP_IN=.012;

/**
 * One MIDI player, like the phone: play() replaces the current song. A cut fades the output for a
 * few milliseconds and then kills every voice, so release tails never overlap the next sound.
 */
export class SampleEngine {
  private readonly ctx:AudioContext;
  private readonly synth:WorkletSynthesizer;
  private readonly sequencer:Sequencer;
  private readonly out:GainNode;
  private active=false;
  /** performance.now() until which the cut fade is in progress. */
  private cutUntil=0;
  private pending:ReturnType<typeof setTimeout>|null=null;

  private constructor(ctx:AudioContext,synth:WorkletSynthesizer,sequencer:Sequencer,out:GainNode){
    this.ctx=ctx;this.synth=synth;this.sequencer=sequencer;this.out=out;
    sequencer.eventHandler.addEvent('songEnded','engine',()=>{this.active=false;});
  }

  /**
   * Registers the worklet, loads the sound bank and preloads the voices of `songs` (decoding
   * the compressed samples while nothing is playing). Throws when any step fails.
   */
  static async load(ctx:AudioContext,destination:AudioNode,soundfontUrl:string,songs:ArrayBuffer[]=[]):Promise<SampleEngine> {
    if(!ctx.audioWorklet)throw new Error('AudioWorklet unavailable (requires a secure context)');
    const bank=fetch(soundfontUrl).then(response=>{
      if(!response.ok)throw new Error(`Soundfont: HTTP ${response.status}`);
      return response.arrayBuffer();
    });
    bank.catch(()=>{}); // Handled when awaited below; avoids an "unhandled rejection" meanwhile.
    await ctx.audioWorklet.addModule(processorUrl);
    const synth=new WorkletSynthesizer(ctx);
    const out=ctx.createGain();
    synth.connect(out);out.connect(destination);
    try{
      await synth.isReady;
      await synth.soundBankManager.addSoundBank(await bank,'main');
      // Phone-like mix: a little room, no heavy hall; keep the voice count modest for mobiles.
      synth.setSystemParameter('reverbGain',.45);
      synth.setSystemParameter('chorusGain',.6);
      synth.setSystemParameter('voiceCap',96);
      const sequencer=new Sequencer(synth,{skipToFirstNoteOn:false});
      sequencer.loopCount=0;
      if(songs.length){
        // Loading the song list preloads every voice the songs use; the sequencer stays paused.
        sequencer.loadNewSongList(songs.map((binary,i)=>({binary:binary.slice(0),fileName:`snd-${i}.mid`})));
        await new Promise<void>(resolve=>{
          const done=()=>{sequencer.eventHandler.removeEvent('songChange','preload');resolve();};
          sequencer.eventHandler.addEvent('songChange','preload',done);
          setTimeout(done,4000);
        });
      }
      return new SampleEngine(ctx,synth,sequencer,out);
    }catch(error){
      try{synth.destroy();out.disconnect();}catch{ /* Already gone. */ }
      throw error;
    }
  }

  /** Starts a Standard MIDI File from its beginning, replacing whatever is playing. */
  play(midi:ArrayBuffer){
    if(this.pending!==null){clearTimeout(this.pending);this.pending=null;}
    // Fade first when something can still be heard (a song, or the release tails of one).
    if(this.active||this.synth.voiceCount>0)this.cut();
    const wait=this.cutUntil-performance.now();
    const begin=()=>{
      this.pending=null;
      this.synth.stopAll(true);
      const now=this.ctx.currentTime,g=this.out.gain;
      g.cancelScheduledValues(now);g.setValueAtTime(0,now);g.linearRampToValueAtTime(1,now+RAMP_IN);
      this.sequencer.loadNewSongList([{binary:midi.slice(0)}]);
      this.sequencer.play();
      this.active=true;
    };
    if(wait>0)this.pending=setTimeout(begin,wait);else begin();
  }

  /** Stops the current song (short fade, then all voices are killed). */
  stop(){
    if(this.pending!==null){clearTimeout(this.pending);this.pending=null;}
    if(this.active||this.synth.voiceCount>0)this.cut();
  }

  private cut(){
    this.active=false;
    this.sequencer.pause();
    const now=this.ctx.currentTime,g=this.out.gain;
    g.cancelScheduledValues(now);g.setTargetAtTime(0,now,FADE);
    this.cutUntil=performance.now()+CUT_MS;
    setTimeout(()=>{if(!this.active&&this.pending===null)this.synth.stopAll(true);},CUT_MS);
  }

  dispose(){this.stop();try{this.synth.destroy();this.out.disconnect();}catch{ /* Already gone. */ }}
}
