import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setResourceProvider } from '../../src/core/s700/runtime.ts';

/** Serve the original JAR resources copied by `npm run extract-assets` to the generated core. */
export function useExtractedResources(dir=fileURLToPath(new URL('../../public/assets/res/',import.meta.url))){
  const cache=new Map<string,Uint8Array|null>();
  setResourceProvider(name=>{
    if(!cache.has(name)){const path=join(dir,name.replace(/^\//,''));cache.set(name,existsSync(path)?new Uint8Array(readFileSync(path)):null);}
    return cache.get(name)!;
  });
}
