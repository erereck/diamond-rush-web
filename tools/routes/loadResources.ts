import { readFileSync } from 'node:fs';
import type { DecodedSprite } from '../../src/assets/SpriteDecoder.ts';
import { parseDemoScripts } from '../../src/core/DemoScript.ts';
import type { MapNode, WorldDefinition } from '../../src/level/LevelParser.ts';
import type { RouteResources } from './RouteRunner.ts';

export function loadRouteResources():RouteResources&{maps:MapNode[][]}{
  const file=(name:string)=>new URL(`../../public/assets/${name}`,import.meta.url);
  const json=<T>(name:string)=>JSON.parse(readFileSync(file(`${name}.json`),'utf8')) as T;
  return {worlds:[0,1,2].map(w=>json<WorldDefinition>(`world-${w}`)),
    maps:[0,1,2].map(w=>json<MapNode[]>(`map-${w}`)),
    scripts:parseDemoScripts(readFileSync(file('demo-0.bin'))),font:json<DecodedSprite>('ui-1'),
    fontMap:readFileSync(file('font-map.bin'))};
}
