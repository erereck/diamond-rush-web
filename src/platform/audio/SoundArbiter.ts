// Port of the request logic of cSoundEngine.java (Diamond Rush S700 1.2.0). The phone has ONE
// MIDI player at a time: playSound() either ignores a request or replaces the current sound, and
// nothing ever loops (setLoopCount is never called). This module is DOM-free so tests can drive it
// with a fake clock and a fake output.

/** Number of sounds in snd.f. */
export const SOUND_COUNT=21;
/** Sounds 15-20 are music and jingles; 0-14 are effects. */
export const FIRST_MUSIC_SOUND=15;
/** Window of cSoundEngine.playSound(): an equal-priority request within 50 ms is dropped. */
export const SAME_PRIORITY_WINDOW_MS=50;

export const isMusicSound=(id:number)=>id>=FIRST_MUSIC_SOUND&&id<SOUND_COUNT;

/** cSoundEngine.getSoundPriority(). */
export function soundPriority(id:number):number {
  switch(id){
    case 0:case 5:case 6:case 10:case 14:return 10;
    case 3:case 7:case 8:case 9:case 11:case 12:case 13:return 20;
    case 1:case 2:case 4:case 15:case 16:case 17:case 18:case 19:case 20:return 30;
    default:return 0;
  }
}

/** cSoundEngine.isLongDurationSFX(): only these players are deallocated (stopped) when freed. */
export function isLongDurationSound(id:number):boolean {
  switch(id){
    case 0:case 5:case 6:case 7:case 8:case 10:case 11:case 12:case 13:case 14:return false;
    default:return true;
  }
}

/** What the arbiter drives: the single audible MIDI player. */
export interface ArbiterOutput {
  /** Player.start() from the beginning of the sound. */
  start(id:number):void;
  /** Player.deallocate() of the prefetched player: silences whatever is sounding. */
  stop():void;
  /** True while `id` is still STARTED (has not reached end of media). Player.start() is then a no-op. */
  isSounding(id:number):boolean;
}

export type ArbiterDecision='ignored'|'started'|'continued';

/**
 * The state machine of cSoundEngine: crtSoundId/crtSoundPriority/soundLoopStartTime plus
 * previousSoundId (the one prefetched player). The run() thread is applied synchronously.
 */
export class SoundArbiter {
  private readonly output:ArbiterOutput;
  private readonly now:()=>number;
  /** crtSoundId: the sound the engine considers current, -1 when none. */
  current=-1;
  /** crtSoundPriority. */
  currentPriority=0;
  /** previousSoundId: the prefetched player, -1 when none. */
  previous=-1;
  /** soundLoopStartTime, in clock milliseconds. */
  startedAt=0;
  constructor(output:ArbiterOutput,now:()=>number){this.output=output;this.now=now;}

  /** cSoundEngine.playSound(soundId) followed by the run() iteration it wakes up. */
  request(id:number):ArbiterDecision {
    const priority=soundPriority(id),now=this.now();
    let needFree=false;
    if(this.current!==-1){
      if(this.currentPriority>=priority&&
        (this.currentPriority!==priority||Math.abs(now-this.startedAt)<=SAME_PRIORITY_WINDOW_MS))return 'ignored';
      needFree=true;
    }else this.currentPriority=0;
    if(priority<this.currentPriority)return 'ignored';
    if(needFree)this.free();
    // A different sound releases the previously prefetched player (deallocate stops it).
    if(this.previous!==-1&&id!==this.previous){this.output.stop();this.previous=-1;}
    if(this.previous===-1)this.previous=id;
    // Player.start() is ignored while that player is still STARTED, so a short effect that is
    // re-requested keeps playing instead of restarting; after end of media it restarts.
    let decision:ArbiterDecision='continued';
    if(!this.output.isSounding(id)){this.output.start(id);decision='started';}
    this.current=id;this.currentPriority=priority;this.startedAt=now;
    return decision;
  }

  /** cSoundEngine.freeCrtPlayerResource(), called by the game between scenes. */
  cut(){if(this.current!==-1)this.free();}

  /** playerUpdate("endOfMedia"): the current sound finished by itself. */
  endOfMedia(){if(this.current!==-1)this.free();}

  /** Port-only: forget everything (scene change, pause, page hidden). The caller silences audio. */
  reset(){this.current=-1;this.currentPriority=0;this.previous=-1;this.startedAt=0;}

  /** The needFreeCrtPlayerResource branch of run(). Short effects are forgotten but not stopped. */
  private free(){
    if(isLongDurationSound(this.current)){this.output.stop();this.previous=-1;}
    this.current=-1;this.currentPriority=0;
  }
}
