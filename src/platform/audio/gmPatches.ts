// Timbre tables for the built-in oscillator synth ('synth' engine). These are approximations of
// General MIDI instruments built from oscillators and filtered noise; they are not samples of the
// S700 wavetable. Melodic patches are chosen by GM program (family defaults plus overrides for the
// programs the 21 game sounds use); channel 9 uses a GM drum kit synthesised per key.

export type Wave='sine'|'square'|'sawtooth'|'triangle';

export interface PatchPartial {wave:Wave;ratio:number;gain:number;detune?:number}
export interface Patch {
  partials:PatchPartial[];
  /** Filtered noise layer (breath, bow, attack chiff). `ratio` multiplies the note frequency. */
  noise?:{gain:number;type:BiquadFilterType;ratio?:number;freq?:number;q?:number;decay?:number};
  /** Envelope: attack is linear (s); decay and release are exponential time constants (s). */
  attack:number;decay:number;sustain:number;release:number;
  /** Voice filter. Cutoff = note frequency * ratio (or `freq` Hz), clamped to [min,max]. */
  filter?:{type:BiquadFilterType;ratio?:number;freq?:number;q?:number;min?:number;max?:number;
    /** Filter envelope: cutoff starts at cutoff*envFrom and moves to cutoff with time constant envTime. */
    envFrom?:number;envTime?:number;
    /** Slow sweep across the note: cutoff*sweepTo reached at the middle of the note, then back. */
    sweepTo?:number};
  /** Pitch envelope: starts at frequency*from and glides exponentially to the note in `time` s. */
  pitch?:{from:number;time:number};
  vibrato?:{rate:number;cents:number;delay:number};
  tremolo?:{rate:number;depth:number};
  /** Amplitude grows over the whole note instead of decaying (reverse cymbal). */
  reverse?:boolean;
  gain:number;
}

const p=(wave:Wave,ratio=1,gain=1,detune=0):PatchPartial=>({wave,ratio,gain,detune});

// Families (program >> 3).
const piano:Patch={partials:[p('triangle',1,.7),p('sine',2,.25),p('sine',3,.08)],attack:.003,decay:.9,sustain:0,release:.18,
  filter:{type:'lowpass',ratio:7,min:900,max:9000,envFrom:2,envTime:.25},gain:1};
const mallet:Patch={partials:[p('sine',1,.8),p('sine',4,.18)],attack:.002,decay:.5,sustain:0,release:.35,gain:1};
const organ:Patch={partials:[p('sine',1,.55),p('sine',2,.3),p('sine',3,.18),p('sine',4,.08)],attack:.008,decay:.1,sustain:1,release:.05,gain:.7};
const reedOrgan:Patch={partials:[p('sawtooth',1,.5,-4),p('sawtooth',1,.4,5),p('square',2,.12)],attack:.03,decay:.2,sustain:.85,release:.08,
  filter:{type:'lowpass',ratio:5,min:700,max:3200,q:.8},vibrato:{rate:6,cents:6,delay:.1},gain:.55};
const guitar:Patch={partials:[p('sawtooth',1,.6),p('triangle',1,.4)],attack:.002,decay:.55,sustain:0,release:.12,
  filter:{type:'lowpass',ratio:3,min:500,max:6000,envFrom:4,envTime:.12},gain:.85};
const bass:Patch={partials:[p('triangle',1,.75),p('sawtooth',1,.25)],attack:.004,decay:.8,sustain:.25,release:.08,
  filter:{type:'lowpass',ratio:6,min:300,max:1600,envFrom:2.5,envTime:.08},gain:1.1};
const bowed:Patch={partials:[p('sawtooth',1,.55,-6),p('sawtooth',1,.45,6)],attack:.07,decay:.4,sustain:.85,release:.22,
  filter:{type:'lowpass',ratio:4.5,min:700,max:5200,q:.5},vibrato:{rate:5.5,cents:10,delay:.18},
  noise:{gain:.035,type:'bandpass',ratio:3,q:1.2},gain:.55};
const pluckedStrings:Patch={partials:[p('triangle',1,.75),p('sine',2,.2),p('sawtooth',1,.12)],attack:.002,decay:.35,sustain:0,release:.15,
  filter:{type:'lowpass',ratio:5,min:800,max:7000},gain:.95};
const choir:Patch={partials:[p('triangle',1,.6,-5),p('triangle',1,.5,5),p('sine',2,.15)],attack:.14,decay:.5,sustain:.85,release:.3,
  filter:{type:'bandpass',freq:900,q:.6},vibrato:{rate:5,cents:14,delay:.2},gain:.75};
const brass:Patch={partials:[p('sawtooth',1,.8),p('sawtooth',1,.25,7)],attack:.025,decay:.35,sustain:.8,release:.1,
  filter:{type:'lowpass',ratio:4,min:500,max:5000,q:1,envFrom:.35,envTime:.05},vibrato:{rate:5.5,cents:8,delay:.3},gain:.55};
const reed:Patch={partials:[p('square',1,.55),p('sawtooth',1,.3)],attack:.025,decay:.3,sustain:.85,release:.08,
  filter:{type:'lowpass',ratio:4,min:600,max:4000,q:1.5},vibrato:{rate:5,cents:7,delay:.25},gain:.45};
const pipe:Patch={partials:[p('sine',1,.85),p('triangle',2,.08),p('sine',3,.05)],attack:.05,decay:.3,sustain:.85,release:.08,
  noise:{gain:.06,type:'bandpass',ratio:2,q:1.5,decay:.12},vibrato:{rate:5,cents:9,delay:.2},gain:.8};
const lead:Patch={partials:[p('sawtooth',1,.55,-5),p('sawtooth',1,.45,5)],attack:.006,decay:.3,sustain:.75,release:.08,
  filter:{type:'lowpass',ratio:6,min:900,max:7000,q:1.5},gain:.45};
const pad:Patch={partials:[p('sawtooth',1,.45,-8),p('sawtooth',1,.4,8),p('triangle',.5,.25)],attack:.35,decay:.8,sustain:.85,release:.6,
  filter:{type:'lowpass',ratio:3,min:500,max:2400,q:.6},gain:.5};
const fx:Patch={partials:[p('sine',1,.7),p('triangle',2,.25),p('sine',3.01,.1)],attack:.01,decay:.9,sustain:0,release:.6,gain:.8};
const ethnic:Patch={partials:[p('sawtooth',1,.5),p('triangle',1,.45),p('square',2,.08)],attack:.002,decay:.6,sustain:0,release:.15,
  filter:{type:'lowpass',ratio:6,min:900,max:8000,envFrom:3,envTime:.08},gain:.85};
const membrane:Patch={partials:[p('sine',1,.9),p('triangle',1.5,.12)],attack:.002,decay:.25,sustain:0,release:.12,
  pitch:{from:1.6,time:.05},noise:{gain:.25,type:'lowpass',freq:900,decay:.04},gain:1.4};
const sfx:Patch={partials:[],attack:.02,decay:.4,sustain:.7,release:.2,noise:{gain:1,type:'bandpass',freq:2500,q:.8},gain:.6};

const families:Patch[]=[piano,mallet,organ,guitar,bass,bowed,bowed,brass,reed,pipe,lead,pad,fx,ethnic,membrane,sfx];
const with_=(base:Patch,over:Partial<Patch>):Patch=>({...base,...over});

/** Programs used by the game files get hand-tuned patches. */
const overrides:Record<number,Patch>={
  // Chromatic percussion
  8:with_(mallet,{partials:[p('sine',1,.75),p('sine',4,.2),p('sine',8,.05)],decay:.45}),                     // celesta
  9:with_(mallet,{partials:[p('sine',1,.65),p('sine',2.76,.28),p('sine',5.4,.12)],decay:.6,release:.5,gain:.9}), // glockenspiel
  10:with_(mallet,{partials:[p('sine',1,.7),p('sine',3,.2),p('sine',6.2,.06)],decay:.6}),                     // music box
  11:with_(mallet,{partials:[p('sine',1,.8),p('sine',4,.15)],decay:1.1,release:.5,tremolo:{rate:4.5,depth:.25}}),  // vibraphone
  12:with_(mallet,{partials:[p('sine',1,.85),p('sine',4,.12),p('sine',10,.03)],decay:.22,release:.12}),        // marimba
  13:with_(mallet,{partials:[p('sine',1,.7),p('sine',3,.25)],decay:.16,release:.1}),                            // xylophone
  14:with_(mallet,{partials:[p('sine',1,.55),p('sine',2.01,.25),p('sine',3,.15),p('sine',4.2,.12),p('sine',5.4,.08)],decay:1.4,release:.9,gain:.85}), // tubular bells
  // Organs, accordions
  17:with_(organ,{partials:[p('sine',1,.55),p('sine',2,.3),p('square',3,.08)],decay:.25,sustain:.7}),           // percussive organ
  21:reedOrgan,22:with_(reedOrgan,{vibrato:{rate:5.5,cents:10,delay:.15}}),23:reedOrgan,                        // accordion, harmonica, bandoneon
  // Basses
  32:with_(bass,{partials:[p('triangle',1,.8),p('sine',2,.2)],sustain:.15,decay:.6}),                          // acoustic bass
  33:bass,                                                                                                      // finger bass
  34:with_(bass,{partials:[p('sawtooth',1,.5),p('triangle',1,.5)],filter:{type:'lowpass',ratio:8,min:500,max:2400,envFrom:2,envTime:.05}}), // pick bass
  // Strings
  44:with_(bowed,{tremolo:{rate:8,depth:.55},attack:.05}),                                                      // tremolo strings
  45:with_(pluckedStrings,{decay:.22,release:.08}),                                                             // pizzicato
  46:with_(pluckedStrings,{partials:[p('triangle',1,.75),p('sine',2,.22),p('sine',3,.06)],decay:.9,release:.5}), // harp
  47:with_(membrane,{partials:[p('sine',1,.85),p('sine',1.5,.15),p('sine',2,.08)],decay:.7,release:.4,
    pitch:{from:1.04,time:.08},noise:{gain:.12,type:'lowpass',freq:400,decay:.05},gain:1.2}),                     // timpani
  48:with_(bowed,{attack:.035,gain:.5}),                                                                        // strings ensemble (fast)
  49:with_(bowed,{attack:.14,gain:.5}),                                                                         // slow strings
  52:choir,                                                                                                     // choir aahs
  53:with_(choir,{partials:[p('sine',1,.75),p('triangle',1,.25,4)],filter:{type:'lowpass',freq:1200,q:.5}}),    // voice oohs
  55:with_(brass,{decay:.25,sustain:0,noise:{gain:.3,type:'bandpass',freq:1500,q:.5,decay:.08}}),              // orchestra hit
  // Brass
  56:brass,                                                                                                     // trumpet
  57:with_(brass,{filter:{type:'lowpass',ratio:3,min:350,max:3200,q:1,envFrom:.4,envTime:.06},gain:.6}),        // trombone
  58:with_(brass,{partials:[p('sawtooth',1,.6),p('triangle',1,.4)],filter:{type:'lowpass',ratio:3,min:250,max:1400,q:.8},gain:.75}), // tuba
  59:with_(brass,{partials:[p('square',1,.7),p('sawtooth',1,.3)],filter:{type:'bandpass',ratio:3,q:2}}),        // muted trumpet
  60:with_(brass,{partials:[p('sawtooth',1,.6),p('triangle',1,.4)],attack:.05,filter:{type:'lowpass',ratio:2.5,min:350,max:2000,q:.7},gain:.6}), // french horns
  // Reeds and pipes
  68:with_(reed,{partials:[p('square',1,.4),p('sawtooth',1,.6)],filter:{type:'bandpass',ratio:3,q:1.6,min:700,max:3000},gain:.6}), // oboe
  69:with_(reed,{partials:[p('square',1,.4),p('sawtooth',1,.6)],filter:{type:'bandpass',ratio:2.5,q:1.4,min:500,max:2400},gain:.6}), // english horn
  71:with_(reed,{partials:[p('square',1,.85),p('triangle',1,.15)],filter:{type:'lowpass',ratio:3.5,min:500,max:3500,q:.8}}),     // clarinet
  72:with_(pipe,{noise:{gain:.08,type:'bandpass',ratio:2,q:2,decay:.08}}),                                      // piccolo
  73:pipe,                                                                                                      // flute
  77:with_(pipe,{partials:[p('sine',1,.85),p('triangle',1,.15)],attack:.09,noise:{gain:.16,type:'bandpass',ratio:1.5,q:1.2},
    vibrato:{rate:4.5,cents:16,delay:.3}}),                                                                     // shakuhachi
  // Synth
  80:with_(lead,{partials:[p('square',1,.7),p('square',1,.3,6)]}),                                              // square lead
  81:lead,                                                                                                      // saw lead
  87:with_(lead,{partials:[p('sawtooth',1,.55),p('square',.5,.45)],filter:{type:'lowpass',ratio:5,min:600,max:5000,q:2}}), // bass + lead
  89:pad,                                                                                                       // warm pad
  91:with_(pad,{partials:[p('triangle',1,.5,-6),p('triangle',1,.45,6),p('sine',2,.15)],filter:{type:'bandpass',freq:1000,q:.5},
    vibrato:{rate:5,cents:10,delay:.25}}),                                                                      // space voice / choir pad
  102:with_(fx,{partials:[p('sine',1,.6),p('triangle',2,.25),p('sine',4.02,.1)],decay:.7,tremolo:{rate:7,depth:.35}}), // echo drops
  // Ethnic
  104:with_(ethnic,{partials:[p('sawtooth',1,.55),p('sawtooth',2,.15,3),p('square',1,.2)],decay:.9,
    filter:{type:'lowpass',ratio:8,min:1500,max:9000,q:3,envFrom:1.5,envTime:.2},pitch:{from:1.01,time:.06}}),  // sitar
  105:with_(ethnic,{partials:[p('square',1,.5),p('sawtooth',1,.4)],decay:.3}),                                // banjo
  106:with_(ethnic,{partials:[p('sawtooth',1,.6),p('square',1,.25)],decay:.32,
    filter:{type:'lowpass',ratio:7,min:1200,max:8000,q:2,envFrom:2,envTime:.05}}),                              // shamisen
  107:with_(ethnic,{partials:[p('triangle',1,.65),p('sawtooth',1,.25),p('sine',3,.08)],decay:.65}),            // koto
  108:with_(mallet,{partials:[p('sine',1,.8),p('sine',5.2,.12)],decay:.4}),                                     // kalimba
  // Percussive programs
  112:with_(mallet,{partials:[p('sine',1,.5),p('sine',2.4,.3),p('sine',5.1,.2)],decay:.5}),                    // tinkle bell
  114:with_(mallet,{partials:[p('sine',1,.6),p('sine',2,.25),p('sine',3,.15)],decay:.45}),                     // steel drums
  115:with_(mallet,{partials:[p('sine',1,.8),p('square',1,.1)],decay:.05,release:.04}),                         // woodblock
  116:with_(membrane,{partials:[p('sine',1,.9),p('sine',1.6,.12)],decay:.38,pitch:{from:1.8,time:.06},
    noise:{gain:.35,type:'lowpass',freq:500,decay:.06},gain:1.7}),                                              // taiko
  117:with_(membrane,{decay:.3,pitch:{from:1.4,time:.12}}),                                                     // melodic tom
  118:with_(membrane,{partials:[p('sine',1,.9),p('triangle',1,.1)],decay:.3,pitch:{from:3,time:.25},noise:undefined}), // synth drum
  119:{partials:[],attack:.002,decay:1,sustain:1,release:.08,reverse:true,
    noise:{gain:1,type:'highpass',freq:4500,q:.5},gain:.55},                                                    // reverse cymbal
  // Sound effects
  120:{partials:[p('sawtooth',3,.15)],attack:.004,decay:.05,sustain:0,release:.04,
    noise:{gain:.9,type:'bandpass',freq:3200,q:1.2,decay:.04},filter:{type:'bandpass',freq:2800,q:1},gain:.8}, // guitar fret noise
  121:with_(sfx,{noise:{gain:1,type:'bandpass',freq:1200,q:.6}}),                                               // breath noise
  122:{partials:[],attack:.35,decay:1,sustain:1,release:.6,noise:{gain:1,type:'lowpass',freq:500,q:.7},
    filter:{type:'lowpass',freq:900,q:.4,sweepTo:3.5},gain:1},                                                  // seashore
  123:with_(mallet,{partials:[p('sine',1,.8),p('sine',2,.2)],vibrato:{rate:14,cents:200,delay:0},decay:.3}),    // bird tweet
  127:{partials:[],attack:.001,decay:.18,sustain:0,release:.1,noise:{gain:1,type:'lowpass',freq:2500,q:.4},gain:1}, // gunshot
};

export function melodicPatch(program:number):Patch {
  return overrides[program]??families[(program>>3)&15];
}

// ---- GM drum kit (channel 9) ---------------------------------------------------------------

export interface DrumLayer {
  kind:'tone'|'noise';
  /** Tone: start frequency in Hz; noise: filter frequency in Hz. */
  freq:number;
  wave?:Wave;
  /** Tone: frequency reached after `sweep` seconds (exponential glide). */
  endFreq?:number;sweep?:number;
  /** Noise filter. */
  filter?:BiquadFilterType;q?:number;
  attack?:number;
  /** Exponential decay time constant (s). */
  decay:number;
  gain:number;
  /** Start offset (s), for flams and claps. */
  delay?:number;
}
export interface DrumPatch {layers:DrumLayer[];pan?:number}

const tone=(freq:number,decay:number,gain:number,more:Partial<DrumLayer>={}):DrumLayer=>({kind:'tone',wave:'sine',freq,decay,gain,...more});
const noise=(freq:number,filter:BiquadFilterType,decay:number,gain:number,more:Partial<DrumLayer>={}):DrumLayer=>({kind:'noise',freq,filter,decay,gain,...more});

const kick:DrumPatch={layers:[tone(150,.16,1.3,{endFreq:48,sweep:.09}),noise(2500,'lowpass',.008,.35)]};
const snare:DrumPatch={layers:[tone(190,.06,.55,{wave:'triangle',endFreq:160,sweep:.05}),noise(3200,'bandpass',.07,.95,{q:.7}),noise(7000,'highpass',.05,.3)]};
const tom=(freq:number,pan:number):DrumPatch=>({pan,layers:[tone(freq*1.5,.16,1.1,{endFreq:freq,sweep:.08}),noise(1200,'lowpass',.02,.2)]});
const hat=(decay:number,gain=.5):DrumPatch=>({pan:.3,layers:[noise(8000,'highpass',decay,gain,{q:.7}),noise(10500,'bandpass',decay*.7,gain*.5,{q:1.5})]});
const cymbal=(freq:number,decay:number,gain:number,pan=-.25):DrumPatch=>({pan,layers:[noise(freq,'highpass',decay,gain,{q:.5}),noise(freq*1.3,'bandpass',decay*.6,gain*.4,{q:1}),
  tone(freq*.11,decay*.3,gain*.05,{wave:'square'}),tone(freq*.157,decay*.3,gain*.04,{wave:'square'})]});
const hand=(freq:number,decay:number,pan:number,gain=.8):DrumPatch=>({pan,layers:[tone(freq*1.12,decay,gain,{endFreq:freq,sweep:.02}),noise(freq*4,'bandpass',.012,.25,{q:1})]});
const wood=(freq:number,pan:number):DrumPatch=>({pan,layers:[tone(freq,.035,.7,{wave:'triangle'}),noise(freq*1.5,'bandpass',.015,.35,{q:4})]});
const shake=(freq:number,decay:number,gain:number,attack=.004):DrumPatch=>({pan:.4,layers:[noise(freq,'highpass',decay,gain,{attack,q:.7})]});

const drums:Record<number,DrumPatch>={
  35:kick,36:kick,
  37:{layers:[tone(800,.025,.4,{wave:'triangle'}),noise(1800,'bandpass',.02,.6,{q:2})]},       // side stick
  38:snare,40:{layers:[...snare.layers.map(l=>({...l,gain:l.gain*1.1}))]},                      // snares
  39:{layers:[0,.011,.022].map(delay=>noise(1300,'bandpass',.008,.7,{q:1,delay})).concat(noise(1300,'bandpass',.12,.45,{q:1,delay:.03}))}, // clap
  41:tom(82,-.5),43:tom(98,-.35),45:tom(110,-.2),47:tom(131,0),48:tom(147,.2),50:tom(175,.35), // toms
  42:hat(.035),44:hat(.06,.4),46:hat(.32),                                                     // hi-hats
  49:cymbal(4500,.55,.55),57:cymbal(5000,.55,.55,.3),                                          // crashes
  51:cymbal(6500,.4,.3,.35),59:cymbal(6000,.4,.3,.35),                                         // rides
  52:cymbal(3200,.45,.5,-.35),                                                                 // china
  53:{pan:.35,layers:[tone(760,.25,.3,{wave:'square'}),tone(1150,.2,.2,{wave:'square'}),noise(7000,'highpass',.15,.15)]}, // ride bell
  55:cymbal(6000,.25,.45,-.2),                                                                 // splash
  54:{pan:-.3,layers:[noise(9000,'highpass',.09,.5,{q:.8}),noise(6500,'bandpass',.05,.3,{q:3})]}, // tambourine
  56:{pan:.3,layers:[tone(545,.09,.35,{wave:'square'}),tone(815,.09,.3,{wave:'square'})]},     // cowbell
  58:{layers:[noise(3000,'bandpass',.4,.4,{q:6})]},                                            // vibraslap
  60:hand(400,.08,.35),61:hand(300,.1,.25),                                                    // bongos
  62:hand(330,.04,-.3),63:hand(330,.16,-.3),64:hand(220,.2,-.25),                              // congas
  65:hand(260,.18,.2,.6),66:hand(190,.2,.2,.6),                                                // timbales
  67:{layers:[tone(840,.12,.4),tone(1260,.08,.2)]},68:{layers:[tone(630,.12,.4),tone(945,.08,.2)]}, // agogo
  69:shake(6500,.05,.45),70:shake(9000,.035,.45,.008),                                         // cabasa, maracas
  71:{layers:[tone(2400,.08,.25,{endFreq:2000,sweep:.08})]},72:{layers:[tone(2200,.25,.25,{endFreq:1700,sweep:.25})]}, // whistles
  73:{layers:[0,.02,.04].map(delay=>noise(2600,'bandpass',.012,.5,{q:3,delay}))},              // short guiro
  74:{layers:[0,.025,.05,.075,.1,.125].map(delay=>noise(2600,'bandpass',.014,.45,{q:3,delay}))}, // long guiro
  75:{pan:.3,layers:[tone(2500,.04,.45)]},                                                     // claves
  76:wood(1000,.3),77:wood(780,.3),                                                            // wood blocks
  78:hand(700,.05,-.2,.5),79:hand(500,.12,-.2,.5),                                             // cuicas
  80:{pan:.4,layers:[tone(4200,.06,.22),tone(6100,.04,.12),tone(8800,.03,.06)]},               // mute triangle
  81:{pan:.4,layers:[tone(4200,.5,.2),tone(6100,.35,.11),tone(8800,.25,.06)]},                 // open triangle
  82:shake(7000,.06,.4,.02),                                                                   // shaker
  83:{pan:.3,layers:[noise(9000,'highpass',.25,.25),tone(5200,.2,.06),tone(6900,.15,.05)]},    // jingle bell
  84:{layers:[tone(3000,.6,.12),tone(4300,.5,.08)]},                                           // bell tree
  85:{layers:[tone(2900,.03,.4,{wave:'triangle'}),noise(4000,'bandpass',.015,.3,{q:3})]},      // castanets
  86:hand(80,.12,0,1),87:hand(70,.45,0,1.1),                                                   // surdos
};
const fallbackDrum:DrumPatch={layers:[noise(3000,'bandpass',.04,.4,{q:1})]};

export function drumPatch(key:number):DrumPatch {return drums[key]??fallbackDrum;}
/** True when `key` has its own drum sound (not the generic fallback tick). */
export function isMappedDrumKey(key:number):boolean {return key in drums;}
