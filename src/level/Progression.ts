import type { LevelDefinition, MapNode, WorldDefinition } from './LevelParser.ts';

/** Follows the normal route encoded in map_*.out; secret branches remain selectable in the inspector. */
export function nextMainLevel(current:LevelDefinition,worlds:WorldDefinition[],maps:MapNode[][]):LevelDefinition|null {
  const nodes=maps[current.world];
  const here=nodes?.find(node=>node.level===current.index&&node.type===0);
  if(!here)return null;
  const neighbor=here.links.map(link=>nodes.find(node=>node.x===link.x&&node.y===link.y))
    .filter((node):node is MapNode=>!!node&&node.type===0&&node.level>current.index)
    .sort((a,b)=>a.level-b.level)[0];
  if(neighbor)return worlds[current.world]?.levels[neighbor.level]??null;
  const nextWorld=current.world+1;
  const first=maps[nextWorld]?.filter(node=>node.type===0).sort((a,b)=>a.level-b.level)[0];
  return first?worlds[nextWorld]?.levels[first.level]??null:null;
}
