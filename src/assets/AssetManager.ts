import type { DecodedSprite } from './SpriteDecoder.ts';
import type { WorldDefinition, MapNode } from '../level/LevelParser.ts';
export interface AssetManifest {version:string;sprites:string[];worlds:{world:number;levels:number}[];audio:string[];resources:{name:string;bytes:number;sha256:string}[]}
export class AssetManager {
  sprites=new Map<string,DecodedSprite>();
  splash:HTMLImageElement[]=[];
  worlds:WorldDefinition[]=[]; maps:MapNode[][]=[]; strings:string[]=[]; fontMap=new Uint8Array();
  manifest!:AssetManifest;
  async json<T>(name:string):Promise<T> {
    const response=await fetch(`${import.meta.env.BASE_URL}assets/${name}.json`);
    if (!response.ok) throw new Error(`Resource ${name}: HTTP ${response.status}. Execute npm run extract-assets.`);
    return response.json();
  }
  async load() {
    this.manifest=await this.json<AssetManifest>('manifest');
    await Promise.all(this.manifest.sprites.map(async id=>this.sprites.set(id,await this.json<DecodedSprite>(id))));
    this.worlds=await Promise.all([0,1,2].map(i=>this.json<WorldDefinition>(`world-${i}`)));
    this.maps=await Promise.all([0,1,2].map(i=>this.json<MapNode[]>(`map-${i}`)));
    this.strings=await this.json<string[]>('lang-0');
    const r=await fetch(`${import.meta.env.BASE_URL}assets/font-map.bin`); if(!r.ok)throw new Error('Font map unavailable');
    this.fontMap=new Uint8Array(await r.arrayBuffer());
    this.splash=await Promise.all([0,1,2].map(async i=>{const image=new Image();image.src=`${import.meta.env.BASE_URL}assets/spl-${i}.png`;await image.decode();return image;}));
  }
  sprite(id:string) {const s=this.sprites.get(id);if(!s)throw new Error(`Unknown sprite ${id}`);return s;}
}
