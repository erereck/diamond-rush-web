import { BinaryReader } from '../assets/BinaryReader.ts';
export interface LevelDefinition {
  world: number; index: number; width: number; height: number; offset: number;
  tiles: number[]; parameters: number[]; objects: number[];
}
export interface WorldDefinition { version: number; world: number; levels: LevelDefinition[] }
/** cGame.loadLevelData. Three row-major byte planes; preserve all 8 bits in files. */
export function parseWorld(data: Uint8Array, world: number): WorldDefinition {
  const r = new BinaryReader(data, `w${world}.bin`), version = r.u8(), count = r.u8();
  const levels: LevelDefinition[] = [];
  for (let index = 0; index < count; index++) {
    const offset = r.position, width = r.u16(), height = r.u16();
    if (!width || !height || width > 1024 || height > 1024) r.fail(`invalid dimensions ${width}x${height}`);
    const n = width * height;
    const tiles = [...r.bytes(n)], parameters = [...r.bytes(n)], objects = [...r.bytes(n)];
    levels.push({ world, index, width, height, offset, tiles, parameters, objects });
  }
  r.end(); return { version, world, levels };
}
export interface MapNode { x: number; y: number; type: number; level: number; links: { x: number; y: number }[] }
/** cGame.method_426. Map links are coordinate pairs, NOT indices into the node list. */
export function parseWorldMap(data: Uint8Array, name: string): MapNode[] {
  const r = new BinaryReader(data, name), size = r.u16(), count = r.u8();
  if (size !== r.remaining) r.fail(`payload size ${size} does not equal ${r.remaining}`);
  const nodes: MapNode[] = [];
  for (let i = 0; i < count; i++) {
    const x = r.u8(), y = r.u8(), type = r.u8(), level = r.u8(), n = r.u8();
    const links = Array.from({length:n}, () => ({x:r.u8(), y:r.u8()}));
    nodes.push({x,y,type,level,links});
  }
  r.end(); return nodes;
}
