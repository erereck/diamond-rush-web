import { readFileSync } from 'node:fs';
import type { MapNode, WorldDefinition } from '../../src/level/LevelParser.ts';

/** Stage and map definitions written by `npm run extract-assets` (public/assets). */
export function loadRouteResources():{worlds:WorldDefinition[];maps:MapNode[][]}{
  const json=<T>(name:string)=>JSON.parse(readFileSync(new URL(`../../public/assets/${name}.json`,import.meta.url),'utf8')) as T;
  return {worlds:[0,1,2].map(w=>json<WorldDefinition>(`world-${w}`)),maps:[0,1,2].map(w=>json<MapNode[]>(`map-${w}`))};
}
