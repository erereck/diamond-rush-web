import type { LevelDefinition } from '../level/LevelParser.ts';
/** Bump whenever simulation semantics change: previous input streams may diverge. */
export const ENGINE_REVISION='angkor-progression-1' as const;
/** FNV-1a identifies level data for replay compatibility; it is not a security hash. */
export function levelFingerprint(level:LevelDefinition){
  let hash=0x811c9dc5;
  for(const value of [level.world,level.index,level.width,level.height,...level.tiles,...level.parameters,...level.objects]){
    hash=Math.imul(hash^(value&255),0x01000193);
    hash=Math.imul(hash^((value>>>8)&255),0x01000193);
  }
  return (hash>>>0).toString(16).padStart(8,'0');
}
