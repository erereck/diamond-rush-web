/**
 * Java library semantics required by the generated S700 core (src/generated/s700.ts):
 * int/long arithmetic helpers, strings, java.util.Random, resource streams and the
 * 20 fps device clock. Browser- and Node-safe; resources come from setResourceProvider().
 */
export const T={v:0 as any};
type ResourceProvider=(name:string)=>Uint8Array|null;
let provider:ResourceProvider=()=>null;
/** Supplies the original JAR resources ("/w0.bin", "/o.f", ...) to the generated core. */
export function setResourceProvider(next:ResourceProvider){provider=next;}
export const swallowed:unknown[]=[];
/** Java's catch(Exception) also catches NullPointerException and ArrayIndexOutOfBounds. */
export function rethrowIfInternal(e:unknown){if(swallowed.length<20)swallowed.push(e);}
/**
 * Java catch semantics for a handler of `type`: Throwable and Exception (with RuntimeException) catch
 * every error the core raises, except a JavaScript stack overflow, which is a Java Error. A narrower
 * type only catches the exceptions the runtime raises with that name ("IOException ...").
 */
export function rethrowUnless(e:unknown,type:string){
  const overflow=e instanceof RangeError&&/call stack/i.test(e.message);
  const message=e instanceof Error?e.message:String(e);
  if(type==='Throwable'||((type==='Exception'||type==='RuntimeException')&&!overflow)||message.startsWith(type)){rethrowIfInternal(e);return;}
  throw e;
}
export function throwable_printStackTrace(e:unknown){rethrowIfInternal(e);}
export function throwable_getMessage(e:unknown){return e instanceof Error?e.message:null;}
export function throwable_toString(e:unknown){return e instanceof Error?`${e.name}: ${e.message}`:String(e);}
export function idiv(a:number,b:number){if(b===0)throw new Error('ArithmeticException: / by zero');return (a/b)|0;}
export function irem(a:number,b:number){if(b===0)throw new Error('ArithmeticException: / by zero');return (a%b)|0;}
export function f2i(x:number){if(Number.isNaN(x))return 0;if(x>=2147483647)return 2147483647;if(x<=-2147483648)return -2147483648;return Math.trunc(x)|0;}
export function str(v:any):string{
  if(v===null||v===undefined)return 'null';
  if(typeof v==='boolean')return v?'true':'false';
  if(v instanceof JStringBuffer)return v.toString();
  return String(v);
}
export function math_abs(x:any){if(typeof x==='bigint')return x<0n?-x:x;if(x===-2147483648)return x;return Math.abs(x);}
export function math_min(a:any,b:any){return a<b?a:b;}
export function math_max(a:any,b:any){return a>b?a:b;}
export function arraycopy(src:any,sp:number,dst:any,dp:number,len:number){
  if(ArrayBuffer.isView(src)&&ArrayBuffer.isView(dst)&&src.constructor===dst.constructor){(dst as any).set((src as any).subarray(sp,sp+len),dp);return;}
  if(src===dst&&sp<dp){for(let i=len-1;i>=0;i--)dst[dp+i]=src[sp+i];return;}
  for(let i=0;i<len;i++)dst[dp+i]=src[sp+i];
}
export function filled(n:number,v:any){return new Array(n).fill(v);}
export function classOf(_x:any){return {getResourceAsStream:(name:string)=>openResource(name),getName:()=>'class'};}
export function openResource(name:string){
  const bytes=provider(name.startsWith('/')?name:'/'+name);
  return bytes?new ByteArrayInputStream(new Int8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength).slice()):null;
}
/** J2ME resource streams fill read(byte[]) completely and skip exactly. */
export class ByteArrayInputStream {
  data:Int8Array;pos:number;end:number;
  constructor(data:Int8Array,off=0,len?:number){this.data=data;this.pos=off;this.end=len===undefined?data.length:off+len;}
  read(b?:any,off=0,len?:number):number{
    if(b===undefined)return this.pos<this.end?this.data[this.pos++]&255:-1;
    if(len===undefined)len=b.length-off;
    if(this.pos>=this.end)return len===0?0:-1;
    const n=Math.min(len!,this.end-this.pos);
    for(let i=0;i<n;i++)b[off+i]=this.data[this.pos++];
    return n;
  }
  skip(n:any){const k=Math.max(0,Math.min(Number(n),this.end-this.pos));this.pos+=k;return BigInt(k);}
  available(){return this.end-this.pos;}
  close(){} reset(){} mark(){}
}
export class JStringBuffer {
  s:string;
  constructor(s:any=''){this.s=typeof s==='number'?'':str(s);}
  append(v:any){this.s+=str(v);return this;}
  toString(){return this.s;}
  length(){return this.s.length;}
  charAt(i:number){return this.s.charCodeAt(i);}
  setLength(n:number){this.s=this.s.slice(0,n).padEnd(n,'\0');}
  insert(i:number,v:any){this.s=this.s.slice(0,i)+str(v)+this.s.slice(i);return this;}
  deleteCharAt(i:number){this.s=this.s.slice(0,i)+this.s.slice(i+1);return this;}
  delete(a:number,b:number){this.s=this.s.slice(0,a)+this.s.slice(b);return this;}
  setCharAt(i:number,c:number){this.s=this.s.slice(0,i)+String.fromCharCode(c)+this.s.slice(i+1);}
}
export class JHashtable {
  m=new Map<any,any>();
  get(k:any){return this.m.has(k)?this.m.get(k):null;}
  put(k:any,v:any){const o=this.get(k);this.m.set(k,v);return o;}
  containsKey(k:any){return this.m.has(k);}
  remove(k:any){const o=this.get(k);this.m.delete(k);return o;}
  size(){return this.m.size;}
  clear(){this.m.clear();}
}
let decodedTextTranslator:((value:string)=>string)|null=null;
/** Translates strings the game decodes from its resources (new String(bytes, off, len, charset)). */
export function setDecodedTextTranslator(next:((value:string)=>string)|null){decodedTextTranslator=next;}
export function newString(a?:any,off?:number,len?:number,charset?:string){
  if(a===undefined)return '';
  if(typeof a==='string')return a;
  if(a instanceof JStringBuffer)return a.toString();
  if(ArrayBuffer.isView(a)||Array.isArray(a)){
    const arr=a as any,o=off??0,n=len??(arr.length-o),wide=arr instanceof Uint16Array;
    let s='';for(let i=0;i<n;i++)s+=String.fromCharCode(wide?arr[o+i]:arr[o+i]&255);
    return charset!==undefined&&decodedTextTranslator?decodedTextTranslator(s):s;
  }
  return String(a);
}
export function string_charAt(s:string,i:number){return s.charCodeAt(i);}
export function string_length(s:string){return s.length;}
export function string_valueOf(x:any){return str(x);}
export function string_indexOf(s:string,x:any,from?:number){return s.indexOf(typeof x==='number'?String.fromCharCode(x):x,from);}
export function string_substring(s:string,a:number,b?:number){return s.substring(a,b);}
export function string_toLowerCase(s:string){return s.toLowerCase();}
export function string_compareTo(s:string,o:string){
  const n=Math.min(s.length,o.length);for(let i=0;i<n;i++){const d=s.charCodeAt(i)-o.charCodeAt(i);if(d)return d;}return s.length-o.length;
}
export function string_getBytes(s:string){return Int8Array.from([...s].map(c=>(c.charCodeAt(0)<<24)>>24));}
export function string_equals(s:string,o:any){return s===o;}
export function string_endsWith(s:string,o:string){return s.endsWith(o);}
export function string_toCharArray(s:string){return Uint16Array.from([...s].map(c=>c.charCodeAt(0)));}
export function string_trim(s:string){return s.trim();}
export function boxed_intValue(x:any){return x;}
export function boxed_byteValue(x:any){return (x<<24)>>24;}
export function integer_toString(x:any){return String(x);}
export function integer_parseInt(x:string){return parseInt(x,10)|0;}
export class JThread {constructor(_r?:any){} start(){} setPriority(){}}
/** Object.wait/notify/notifyAll: the generated core runs on one thread, so no thread waits on a monitor. */
export function monitor_wait(_o:any){} export function monitor_notify(_o:any){} export function monitor_notifyAll(_o:any){}
export function thread_start(){} export function thread_sleep(){} export function thread_yield(){} export function thread_setPriority(){}
/** java.util.Random (48-bit LCG). */
export class JRandom {
  seed:bigint;
  constructor(seed:any=0n){this.seed=(BigInt(seed)^0x5DEECE66Dn)&((1n<<48n)-1n);}
  next(bits:number){this.seed=(this.seed*0x5DEECE66Dn+0xBn)&((1n<<48n)-1n);return Number(BigInt.asIntN(32,this.seed>>BigInt(48-bits)));}
  nextInt(bound?:number){
    if(bound===undefined)return this.next(32);
    if((bound&-bound)===bound)return Number((BigInt(bound)*BigInt(this.next(31)))>>31n);
    let bits,val;do{bits=this.next(31);val=bits%bound;}while(bits-val+(bound-1)<0);return val;
  }
}
