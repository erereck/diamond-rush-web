import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { BasicSoundBank, SoundBankLoader } from 'spessasynth_core';
import { parsePack } from '../src/assets/Pack.ts';
import { channelStateAt, parseMidi } from '../src/platform/Midi.ts';
import type { MidiSong } from '../src/platform/Midi.ts';
import { GameSound, SOUNDFONT_PATH } from '../src/platform/GameSound.ts';
import { SOUND_COUNT, SoundArbiter, isLongDurationSound, isMusicSound, soundPriority } from '../src/platform/audio/SoundArbiter.ts';
import type { ArbiterOutput } from '../src/platform/audio/SoundArbiter.ts';
import { isMappedDrumKey, melodicPatch } from '../src/platform/audio/gmPatches.ts';

const res=new URL('../../../work/reference-s700/res/',import.meta.url);
const songs:MidiSong[]=parsePack(readFileSync(new URL('snd.f',res)),'snd.f').map(e=>parseMidi(e.data));

// ---- cSoundEngine rules -----------------------------------------------------------------------

/** Fake single MIDI player: records the calls the arbiter makes. */
class FakePlayer implements ArbiterOutput {
  log:string[]=[];
  sounding:number|null=null;
  start(id:number){this.log.push(`start ${id}`);this.sounding=id;}
  stop(){this.log.push('stop');this.sounding=null;}
  isSounding(id:number){return this.sounding===id;}
}
function setup(){
  const clock={t:0};
  const player=new FakePlayer();
  const arbiter=new SoundArbiter(player,()=>clock.t);
  /** The current sound reaches end of media (playerUpdate "endOfMedia"). */
  const endOfMedia=()=>{player.sounding=null;arbiter.endOfMedia();};
  return {clock,player,arbiter,endOfMedia};
}

test('sound priorities and long-duration flags match cSoundEngine.java',()=>{
  const byPriority={10:[0,5,6,10,14],20:[3,7,8,9,11,12,13],30:[1,2,4,15,16,17,18,19,20]};
  for(const [priority,ids] of Object.entries(byPriority))for(const id of ids)assert.equal(soundPriority(id),Number(priority),`sound ${id}`);
  assert.equal(soundPriority(21),0);assert.equal(soundPriority(-1),0);
  assert.deepEqual([...Array(SOUND_COUNT).keys()].filter(id=>!isLongDurationSound(id)),[0,5,6,7,8,10,11,12,13,14]);
  assert.deepEqual([...Array(SOUND_COUNT).keys()].filter(isMusicSound),[15,16,17,18,19,20]);
});

test('one player: lower priority is ignored, higher priority replaces, end of media frees',()=>{
  const {clock,player,arbiter,endOfMedia}=setup();
  assert.equal(arbiter.request(0),'started');                 // switch, priority 10
  clock.t=10;assert.equal(arbiter.request(11),'started');     // break, 20 > 10: replaces
  assert.deepEqual(player.log,['start 0','stop','start 11']);
  clock.t=500;assert.equal(arbiter.request(5),'ignored');     // hurt, 10 < 20
  assert.equal(arbiter.request(19),'started');                // title music, 30 > 20
  clock.t=5000;assert.equal(arbiter.request(14),'ignored');   // music is never cut by effects
  endOfMedia();                                               // music ends: deallocated, nothing loops
  assert.deepEqual(player.log,['start 0','stop','start 11','stop','start 19','stop']);
  assert.equal(arbiter.current,-1);
  assert.equal(arbiter.request(14),'started');
  assert.equal(player.log.at(-1),'start 14');
});

test('equal priority replaces only after more than 50 ms',()=>{
  const {clock,player,arbiter}=setup();
  arbiter.request(19);
  clock.t=50;assert.equal(arbiter.request(17),'ignored');     // |elapsed| <= 50
  clock.t=51;assert.equal(arbiter.request(17),'started');     // long sound: deallocated, then started
  assert.deepEqual(player.log,['start 19','stop','start 17']);
  clock.t=80;assert.equal(arbiter.request(19),'ignored');
  clock.t=200;assert.equal(arbiter.request(17),'started');    // same music again restarts it
  assert.deepEqual(player.log,['start 19','stop','start 17','stop','start 17']);
});

test('a short effect requested again keeps playing (Player.start is ignored while started)',()=>{
  const {clock,player,arbiter,endOfMedia}=setup();
  arbiter.request(11);
  clock.t=100;assert.equal(arbiter.request(11),'continued');
  assert.deepEqual(player.log,['start 11']);
  clock.t=130;assert.equal(arbiter.request(7),'ignored');     // the re-request restarted the 50 ms window
  endOfMedia();
  clock.t=140;assert.equal(arbiter.request(11),'started');    // after end of media it restarts
  assert.deepEqual(player.log,['start 11','start 11']);
});

test('cut (freeCrtPlayerResource) stops long sounds and only forgets short effects',()=>{
  const {clock,player,arbiter}=setup();
  arbiter.request(17);arbiter.cut();
  assert.deepEqual(player.log,['start 17','stop']);
  assert.equal(arbiter.current,-1);assert.equal(arbiter.currentPriority,0);
  clock.t=10;arbiter.request(0);
  arbiter.cut();                                               // short effect: forgotten, still audible
  assert.equal(player.sounding,0);assert.equal(arbiter.current,-1);
  assert.equal(arbiter.request(0),'continued');
  arbiter.cut();
  assert.equal(arbiter.request(14),'started');                // another sound releases the old player
  assert.deepEqual(player.log,['start 17','stop','start 0','stop','start 14']);
  arbiter.reset();player.sounding=null;
  assert.equal(arbiter.request(5),'started');
  assert.equal(player.log.at(-1),'start 5');
});

test('GameSound is inert until unlocked (no AudioContext in node)',async()=>{
  const sound=new GameSound('/');
  assert.equal(sound.engine,'samples');assert.equal(sound.status,'idle');
  await sound.play(19);sound.cut();sound.stop();
  sound.setEngine('synth');assert.equal(sound.engine,'synth');
  sound.setVolumes({master:2,music:-1,effects:Number.NaN});
  await assert.rejects(sound.preview(21),RangeError);
  assert.equal(SOUNDFONT_PATH,'soundfont/diamond-rush-gm.sf3');
});

// ---- MIDI parsing -------------------------------------------------------------------------------

const vlq=(n:number)=>{const out=[n&127];while((n>>=7))out.unshift((n&127)|128);return out;};
const u32=(n:number)=>[n>>>24,(n>>16)&255,(n>>8)&255,n&255];
const chunk=(tag:string,body:number[])=>[...tag].map(c=>c.charCodeAt(0)).concat(u32(body.length),body);
const events=(...list:[number,...number[]][])=>list.flatMap(([delta,...bytes])=>[...vlq(delta),...bytes]);
function smf(division:number,...tracks:number[][]){
  return new Uint8Array([...chunk('MThd',[0,1,0,tracks.length,division>>8,division&255]),...tracks.flatMap(t=>chunk('MTrk',t))]);
}

test('parser: tempo map, per-note programs, CC7/CC10/CC11, RPN bend range and pitch bend',()=>{
  const tempo=events([0,0xff,0x51,3,0x07,0xa1,0x20],[480,0xff,0x51,3,0x0f,0x42,0x40],[0,0xff,0x2f,0]);
  const music=events(
    [0,0x90,60,100],                  // starts before the program change of the same tick
    [0,0xc0,40],
    [0,0xb0,7,64],[0,10,0],[0,11,127],// running status: pan hard left, expression
    [0,0x90,62,90],
    [240,0x80,60,0],
    [240,0x90,62,0],                  // velocity 0 = note off
    [0,0xb1,101,0],[0,100,0],[0,6,12],// RPN 0 on channel 1: bend range 12 semitones
    [0,0xe1,0x00,0x60],               // 12288 -> +6 semitones
    [480,0x91,64,80],[480,0x81,64,0],
    [0,0xb1,121,0],                   // reset all controllers: bend back to 0, expression to 1
    [0,0xff,0x2f,0]);
  const song=parseMidi(smf(480,tempo,music));
  assert.equal(song.duration,2.5);    // 480 ticks at 0.5 s/qn + 960 ticks at 1 s/qn
  assert.deepEqual(song.notes.map(n=>[n.time,n.channel,n.note,n.program,n.velocity,n.duration]),
    [[0,0,60,0,100,.25],[0,0,62,40,90,.5],[1.5,1,64,0,80,1]]);
  assert.deepEqual(song.controls.map(c=>[c.time,c.channel,c.type,c.value]),[
    [0,0,'program',40],[0,0,'volume',64/127],[0,0,'pan',-1],[0,0,'expression',1],
    [.5,1,'bend',6],[2.5,1,'expression',1],[2.5,1,'bend',0]]);
  assert.deepEqual(channelStateAt(song,0,1),{program:40,volume:64/127,pan:-1,expression:1,bend:0});
  assert.equal(channelStateAt(song,1,1).bend,6);
  assert.equal(channelStateAt(song,5,0).volume,100/127);
});

test('parser on the game files: pitch bends, fades and same-tick program order',()=>{
  for(const id of [16,18]){
    const bends=songs[id].controls.filter(c=>c.type==='bend');
    assert(bends.length>30,`snd-${id} bends`);
    assert(bends.every(b=>Math.abs(b.value)<=2&&Number.isFinite(b.time)));
    assert(bends.some(b=>b.value!==0));
  }
  const fade=songs[13].controls.filter(c=>c.type==='volume'&&c.channel===0).map(c=>c.value);
  assert(fade.length>5&&fade.at(-1)!<fade[0],'snd-13 fades out with CC7');
  // snd-3 plays two notes on channel 0 before its program change at tick 0: they use program 0.
  const first=songs[3].notes.filter(n=>n.channel===0&&n.time===0);
  assert.deepEqual(first.map(n=>[n.note,n.program]),[[31,0],[43,0]]);
  assert(songs[3].notes.filter(n=>n.channel===0&&n.time>0).every(n=>n.program===48));
  for(const song of songs)assert(song.controls.every((c,i,all)=>i===0||all[i-1].time<=c.time));
});

test('built-in synth has a patch for every program and a drum sound for every key the game uses',()=>{
  for(let program=0;program<128;program++){
    const patch=melodicPatch(program);
    assert(patch.partials.length>0||patch.noise,`program ${program}`);
    assert(patch.attack>=0&&patch.decay>0&&patch.release>0&&patch.sustain>=0&&patch.sustain<=1&&patch.gain>0);
  }
  const keys=new Set(songs.flatMap(s=>s.notes.filter(n=>n.channel===9).map(n=>n.note)));
  for(const key of keys)assert(isMappedDrumKey(key),`drum key ${key}`);
});

// ---- Soundfont ------------------------------------------------------------------------------------

const soundfontFile=new URL(`../public/${SOUNDFONT_PATH}`,import.meta.url);

/** Preset headers (phdr) and version (ifil) of a SoundFont 2/3 file. */
function readPresetHeaders(data:Uint8Array){
  const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
  const fourcc=(at:number)=>String.fromCharCode(...data.subarray(at,at+4));
  assert.equal(fourcc(0),'RIFF');assert.equal(fourcc(8),'sfbk');
  let version=0;const presets:{name:string;program:number;bank:number}[]=[];
  for(let at=12;at+8<=data.length;){
    const size=view.getUint32(at+4,true);
    if(fourcc(at)==='LIST')for(let sub=at+12;sub<at+8+size;){
      const subSize=view.getUint32(sub+4,true),body=sub+8;
      if(fourcc(sub)==='ifil')version=view.getUint16(body,true);
      if(fourcc(sub)==='phdr')for(let r=body;r<body+subSize-38;r+=38)  // the last record is EOP
        presets.push({name:new TextDecoder().decode(data.subarray(r,r+20)).replace(/\0.*$/s,''),program:view.getUint16(r+20,true),bank:view.getUint16(r+22,true)});
      sub=body+subSize+(subSize&1);
    }
    at+=8+size+(size&1);
  }
  return {version,presets};
}

test('trimmed soundfont is committed, small, SF3, and licensed',()=>{
  assert(existsSync(soundfontFile),'run npm run build-soundfont');
  const data=readFileSync(soundfontFile);
  assert(data.length<4e6,`soundfont is ${data.length} bytes`);
  assert.equal(readPresetHeaders(data).version,3);
  const license=readFileSync(new URL('../public/soundfont/LICENSE-GeneralUser-GS.txt',import.meta.url),'latin1');
  assert.match(license,/GeneralUser GS/);assert.match(license,/License/);
});

test('soundfont preset headers contain every program used by the 21 files',()=>{
  const {presets}=readPresetHeaders(readFileSync(soundfontFile));
  const melodic=new Set(songs.flatMap(s=>s.notes.filter(n=>n.channel!==9).map(n=>n.program)));
  for(const program of melodic)assert(presets.some(p=>p.bank===0&&p.program===program),`program ${program}`);
  assert(presets.some(p=>p.bank===128&&p.program===0),'standard drum kit');
  assert(presets.length<=melodic.size+1,'only the used presets are kept');
});

test('soundfont has voices for every note (key and velocity) of the 21 files',async()=>{
  await BasicSoundBank.isSF3DecoderReady;
  const data=readFileSync(soundfontFile);
  const bank=SoundBankLoader.fromArrayBuffer(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength) as ArrayBuffer);
  for(const [id,song] of songs.entries())for(const n of song.notes){
    const drums=n.channel===9;
    const preset=bank.getPreset({program:n.program,bankMSB:0,bankLSB:0,isGMGSDrum:drums},'gs');
    if(drums)assert(preset.isGMGSDrum,`snd-${id}: drum kit for program ${n.program}`);
    else assert(!preset.isGMGSDrum&&preset.program===n.program,`snd-${id}: program ${n.program} resolved to ${preset.name}`);
    assert(preset.getVoiceParameters(n.note,n.velocity).length>0,`snd-${id}: ${preset.name} key ${n.note} velocity ${n.velocity}`);
  }
});
