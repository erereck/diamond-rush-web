// Builds public/soundfont/diamond-rush-gm.sf3: GeneralUser GS (S. Christian Collins) trimmed to the
// presets, keys and velocities used by the 21 game MIDI files (public/assets/snd-*.mid, from
// `npm run extract-assets`) and compressed to SF3 (Ogg Vorbis, WebAssembly encoder: no native
// tools). The download is pinned to a commit, checked by SHA-256 and cached outside the repository,
// so the output is reproducible. The result is committed; CI never downloads the soundfont.
//
//   npm run build-soundfont            (cache: ../../work/soundfont-cache, or $SOUNDFONT_CACHE)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BasicMIDI, SoundBankLoader } from 'spessasynth_core';
import type { BasicPreset, BasicSoundBank } from 'spessasynth_core';
import { createOggEncoder } from 'wasm-media-encoders';

/** GeneralUser GS v2.0.3, https://github.com/mrbumpy409/GeneralUser-GS (commit of 2026-02-23). */
const GENERALUSER_COMMIT='684543d5e5efaef08d02be50dcda8d552478fa60';
const RAW=`https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/${GENERALUSER_COMMIT}/`;
const SOURCES={
  bank:{path:'GeneralUser-GS.sf2',sha256:'9575028c7a1f589f5770fccc8cff2734566af40cd26ed836944e9a5152688cfe'},
  license:{path:'documentation/LICENSE.txt',sha256:'7b32efefdf95ce38a043799f0659853ddc00fbaa14d8c50f0aca16b9b8b405be'},
};
/** Ogg Vorbis VBR quality (-1..10). 5 keeps loops and attacks clean at ~2 MB. */
const VORBIS_QUALITY=5;
const SOUND_COUNT=21;

const root=fileURLToPath(new URL('..',import.meta.url));
const cacheDir=resolve(root,process.env.SOUNDFONT_CACHE??'../../work/soundfont-cache');
const outDir=join(root,'public/soundfont');
const output=join(outDir,'diamond-rush-gm.sf3');
const licenseOut=join(outDir,'LICENSE-GeneralUser-GS.txt');

const sha256=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
const toArrayBuffer=(data:Uint8Array)=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength) as ArrayBuffer;

async function cached(source:{path:string;sha256:string}):Promise<Uint8Array>{
  const file=join(cacheDir,`${GENERALUSER_COMMIT.slice(0,12)}-${source.path.replaceAll('/','_')}`);
  if(existsSync(file)){
    const data=readFileSync(file);
    if(sha256(data)===source.sha256)return data;
    console.warn(`Cached ${file} has the wrong checksum; downloading again.`);
  }
  const url=RAW+source.path;
  console.log(`Downloading ${url}`);
  const response=await fetch(url);
  if(!response.ok)throw new Error(`${url}: HTTP ${response.status}`);
  const data=new Uint8Array(await response.arrayBuffer());
  const hash=sha256(data);
  if(hash!==source.sha256)throw new Error(`${url}: SHA-256 ${hash}, expected ${source.sha256}`);
  mkdirSync(cacheDir,{recursive:true});
  writeFileSync(`${file}.part`,data);renameSync(`${file}.part`,file);
  return data;
}

function readGameMidis():BasicMIDI[]{
  const midis:BasicMIDI[]=[];
  for(let id=0;id<SOUND_COUNT;id++){
    const file=join(root,`public/assets/snd-${id}.mid`);
    if(!existsSync(file))throw new Error(`${file} is missing: run \`npm run extract-assets\` first.`);
    midis.push(BasicMIDI.fromArrayBuffer(toArrayBuffer(readFileSync(file)),`snd-${id}.mid`));
  }
  return midis;
}

/** Union of the preset -> key -> velocities used by every file, resolved like the synthesizer does. */
function usedPresets(bank:BasicSoundBank,midis:BasicMIDI[]){
  const merged=new Map<BasicPreset,Map<number,Set<number>>>();
  for(const midi of midis)for(const [preset,keys] of midi.getUsedProgramsAndKeys(bank)){
    let presetKeys=merged.get(preset);
    if(!presetKeys)merged.set(preset,presetKeys=new Map());
    for(const [key,velocities] of keys){
      let set=presetKeys.get(key);
      if(!set)presetKeys.set(key,set=new Set());
      for(const v of velocities)set.add(v);
    }
  }
  return merged;
}

async function vorbisEncoder(){
  const encoder=await createOggEncoder();
  let serial=0x44520000; // Fixed stream serial numbers keep the output byte-for-byte reproducible.
  return async(audio:Float32Array,sampleRate:number):Promise<Uint8Array>=>{
    encoder.configure({channels:1,sampleRate,vbrQuality:VORBIS_QUALITY,oggSerialNo:serial++});
    const head=encoder.encode([audio]).slice(),tail=encoder.finalize().slice();
    const out=new Uint8Array(head.length+tail.length);
    out.set(head);out.set(tail,head.length);
    return out;
  };
}

const describe=(p:BasicPreset)=>`${p.isGMGSDrum?'drums':`bank ${p.bankMSB}`} program ${p.program} ${p.name}`;

async function main(){
  const [bankData,license]=await Promise.all([cached(SOURCES.bank),cached(SOURCES.license)]);
  const midis=readGameMidis();
  const bank=SoundBankLoader.fromArrayBuffer(toArrayBuffer(bankData));
  const original={presets:bank.presets.length,samples:bank.samples.length};
  const used=usedPresets(bank,midis);
  bank.trim(used);
  const pcmBytes=bank.samples.reduce((sum,s)=>sum+s.getAudioData().length*2,0);
  console.log(`Kept ${bank.presets.length}/${original.presets} presets and ${bank.samples.length}/${original.samples} samples (${(pcmBytes/1e6).toFixed(2)} MB of PCM):`);
  for(const [preset,keys] of [...used].sort(([a],[b])=>Number(a.isGMGSDrum)-Number(b.isGMGSDrum)||a.program-b.program))
    console.log(`  ${describe(preset)}: keys ${[...keys.keys()].sort((a,b)=>a-b).join(',')}`);

  await bank.setSampleFormat({format:'compressed',compressionFunction:await vorbisEncoder()});
  const info=bank.soundBankInfo;
  info.name='Diamond Rush GM (GeneralUser GS 2.0.3 subset)';
  info.comment=`Subset of GeneralUser GS v2.0.3 by S. Christian Collins (https://www.schristiancollins.com/generaluser), `+
    `trimmed to the presets and keys used by the 21 Diamond Rush MIDI files and compressed with Ogg Vorbis (quality ${VORBIS_QUALITY}). `+
    `Source: https://github.com/mrbumpy409/GeneralUser-GS/tree/${GENERALUSER_COMMIT}\n\n${info.comment??''}`;
  const sf3=new Uint8Array(bank.writeSF2({software:'diamond-rush-web tools/build-soundfont.ts (spessasynth_core)'}));

  // Sanity check: the written bank must resolve every used preset to the same bank/program.
  const check=SoundBankLoader.fromArrayBuffer(toArrayBuffer(sf3));
  for(const preset of used.keys()){
    if(!check.presets.some(p=>p.program===preset.program&&p.bankMSB===preset.bankMSB&&p.isGMGSDrum===preset.isGMGSDrum))
      throw new Error(`Written soundfont lost ${describe(preset)}`);
  }

  mkdirSync(outDir,{recursive:true});
  writeFileSync(output,sf3);
  writeFileSync(licenseOut,license);
  console.log(`Wrote ${output}: ${sf3.length} bytes (${(sf3.length/1e6).toFixed(2)} MB), sha256 ${sha256(sf3)}`);
  console.log(`Wrote ${licenseOut}`);
}

await main();
