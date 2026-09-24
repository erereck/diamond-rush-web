import type { WorldDefinition, MapNode } from '../level/LevelParser.ts';

/** The payload of RMS DiamondRush record 1, not an emulator's RMS container. */
export interface SavedLevel {
  offset:number; status:number; redTotal:number; flags:number; openedChests:number;
  chests:{x:number;y:number}[];
}
export interface SavedWorld {
  offset:number; unlocked:number; firstSecret:number; levels:SavedLevel[];
}

/** Source: cGame.method_109–128. Unknown bytes are deliberately preserved. */
export class CanonicalSave {
  private data:Uint8Array;
  readonly worlds:SavedWorld[];
  constructor(bytes:Uint8Array) {
    if(bytes.length<20||bytes.length>1000)throw new Error('RMS: tamanho inválido (20–1000 bytes).');
    this.data=bytes.slice();
    const used=new Uint8Array(bytes.length);
    const claim=(offset:number,length:number)=>{
      if(offset<0||offset+length>bytes.length)throw new Error(`RMS: bloco fora dos limites em ${offset}.`);
      for(let i=offset;i<offset+length;i++){
        if(used[i])throw new Error(`RMS: blocos sobrepostos em ${i}.`);
        used[i]=1;
      }
    };
    claim(0,20);
    this.worlds=Array.from({length:3},(_,world)=>{
      const offset=this.u16(14+world*2);
      claim(offset,3);
      const count=this.data[offset];
      if(count===0||count>31)throw new Error('RMS: quantidade de fases inválida.');
      claim(offset+3,count*2);
      const levels=Array.from({length:count},(_,level)=>{
        const p=this.u16(offset+3+level*2);claim(p,5);
        const n=this.data[p+4];claim(p+5,n*2);
        if(this.data[p+3]>n)throw new Error('RMS: contagem de baús inconsistente.');
        return {offset:p,status:this.data[p],redTotal:this.data[p+1],flags:this.data[p+2],openedChests:this.data[p+3],
          chests:Array.from({length:n},(_,i)=>({x:this.data[p+5+i*2],y:this.data[p+6+i*2]}))};
      });
      return {offset,unlocked:this.data[offset+1],firstSecret:this.data[offset+2],levels};
    });
  }
  private u16(p:number){return this.data[p]|this.data[p+1]<<8;}
  private level(world:number,level:number){
    const result=this.worlds[world]?.levels[level];
    if(!Number.isInteger(world)||!Number.isInteger(level)||!result)throw new Error('RMS: fase inválida.');
    return result;
  }
  /** Byte 3 is a Java signed byte: -1 is meaningful after the final lost life. */
  get lives(){return this.data[3]<<24>>24;}
  get diamonds(){return this.u16(4);}
  get redDiamonds(){return this.u16(6);}
  get maxHealth(){return this.data[8];}
  get worldFlags(){return this.data[2];}
  /** recordData[9]: 0 = none, 1 = hammer, 2 = hook, 8 = ice hammer. */
  get weaponTier(){return this.data[9];}
  setWeaponTier(tier:0|1|2|8){if(![0,1,2,8].includes(tier))throw new Error('RMS: equipamento inválido.');this.data[9]=tier;}
  setResources(lives:number,diamonds:number,redDiamonds:number,tier:0|1|2|8){
    if(!Number.isInteger(lives)||lives<0||lives>99||![diamonds,redDiamonds].every(n=>Number.isInteger(n)&&n>=0&&n<=65535))throw new Error('RMS: recursos inválidos.');
    this.data[3]=lives;this.data[4]=diamonds&255;this.data[5]=diamonds>>8;
    this.data[6]=redDiamonds&255;this.data[7]=redDiamonds>>8;this.setWeaponTier(tier);
  }
  unlockWorld(world:1|2){this.data[2]|=world===1?8:16;}
  export(){return this.data.slice();}
  setLevelStatus(world:number,level:number,status:number){
    if(!Number.isInteger(status)||status<0||status>255)throw new Error('RMS: status inválido.');
    const l=this.level(world,level);this.data[l.offset]=l.status=status;
  }
  /** Offset +2 is a bit field, NOT a red-diamond counter (method_117). */
  addLevelFlags(world:number,level:number,flags:number){
    if(!Number.isInteger(flags)||flags<0||flags>255)throw new Error('RMS: flags inválidas.');
    const l=this.level(world,level);this.data[l.offset+2]=l.flags|=flags;
  }
  unlockThrough(world:number,level:number){
    this.level(world,level);const w=this.worlds[world];
    this.data[w.offset+1]=w.unlocked=Math.max(w.unlocked,level);
  }
  openChest(world:number,level:number,x:number,y:number){
    const l=this.level(world,level);
    // (0,0) is the consumed sentinel. Never match it a second time.
    const i=l.chests.findIndex(c=>(c.x!==0||c.y!==0)&&c.x===x&&c.y===y);
    if(i<0)return false;
    l.chests[i]={x:0,y:0};this.data[l.offset+5+i*2]=0;this.data[l.offset+6+i*2]=0;
    this.data[l.offset+3]=++l.openedChests;return true;
  }
  /** Recreates method_113's layout and defaults from canonical level/map data. */
  static create(worlds:WorldDefinition[],maps:MapNode[][]){
    if(worlds.length!==3||maps.length!==3)throw new Error('RMS: os três mundos são necessários.');
    const bytes=new Uint8Array(1000);let cursor=20;
    const put16=(p:number,v:number)=>{bytes[p]=v;bytes[p+1]=v>>8;};
    const reserve=(n:number)=>{const p=cursor;cursor+=n;if(cursor>1000)throw new Error('RMS: capacidade original excedida.');return p;};
    bytes[3]=5;bytes[8]=4;
    for(let w=0;w<3;w++){
      const levels=worlds[w].levels,count=levels.length;
      if(worlds[w].world!==w||count<1||count>31)throw new Error('RMS: ordem ou quantidade de fases inválida.');
      const base=reserve(3+count*2);put16(14+w*2,base);bytes[base]=count;
      bytes[base+2]=maps[w].reduce((first,node)=>node.type===1?Math.min(first,node.level):first,100);
      for(let l=0;l<count;l++){
        const level=levels[l],chests=level.objects.flatMap((t,i)=>t===14||t===33?[{x:i%level.width,y:Math.floor(i/level.width)}]:[]);
        if(chests.length>127||chests.some(c=>c.x>127||c.y>127))throw new Error('RMS: baú fora da faixa Java byte.');
        const p=reserve(5+chests.length*2);put16(base+3+l*2,p);
        bytes[p+1]=level.tiles.filter(t=>t===2).length;bytes[0]+=bytes[p+1];bytes[p+4]=chests.length;
        chests.forEach((c,i)=>{bytes[p+5+i*2]=c.x;bytes[p+6+i*2]=c.y;});
      }
    }
    // method_110 writes field_382 bytes, not the whole 1000-byte allocation.
    return new CanonicalSave(bytes.slice(0,cursor));
  }
}
