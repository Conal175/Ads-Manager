import type { SheetCreative } from './media-sheet-preview';
export type BulkRow = {row:number; code:string; status:'ready'|'current'|'skipped'; reason:string; product:string; format:string; link:string; fields:string[]; missingFormulas:string[]};
const norm = (x:unknown) => typeof x === 'string' ? x.trim().toUpperCase() : '';
const empty = (x:unknown) => x == null || x === '';
export function planMediaBulk(values:unknown[][], catalog:SheetCreative[], productOptions:unknown[], formatOptions:unknown[]):BulkRow[] {
 const h=values[0] ?? [];
 if(h[0]!=='Mã Media'||h[3]!=='Tên SP'||h[9]!=='Định dạng'||h[14]!=='Link Media / Post ID') throw new Error('Sheet headers changed');
 const counts=new Map<string,number>();
 for(const r of values.slice(1)){const c=norm(r[0]);if(c)counts.set(c,(counts.get(c)??0)+1);}
 return values.slice(1).map((r,i)=>{
  const code=norm(r[0]); if(!code) return null;
  const base:BulkRow={row:i+2,code,status:'skipped',reason:'',product:'',format:'',link:'',fields:[],missingFormulas:[10,11,12].filter(j=>empty(r[j])).map(j=>['K','L','M'][j-10])};
  if(!/^M\d+$/.test(code)) return {...base,reason:'Mã media không hợp lệ hoặc là công thức'};
  if(counts.get(code)!==1) return {...base,reason:'Mã media trùng trên Sheet'};
  const matches=catalog.filter(c=>norm(c.code)===code);
  if(matches.length!==1) return {...base,reason:'Không có hoặc trùng mã trong kho'};
  const c=matches[0], type=norm(c.mediaType), pc=norm(c.productCode);
  const options=productOptions.filter(v=>typeof v==='string' && norm(v)===pc) as string[];
  const format=type==='VIDEO'?'VID':type==='IMAGE'?'IMG':'';
  if(!pc || options.length!==1 || !format || formatOptions.filter(v=>norm(v)===format).length!==1 || !/^[A-Za-z0-9_-]+$/.test(c.driveFileId) || catalog.filter(x=>x.driveFileId===c.driveFileId).length!==1) return {...base,reason:'Sản phẩm, định dạng hoặc ID Drive không rõ / trùng'};
  const product=options[0], link=`https://drive.google.com/file/d/${c.driveFileId}/view`;
  if((!empty(r[3]) && norm(r[3])!==pc) || (!empty(r[9]) && norm(r[9])!==format) || (!empty(r[14]) && r[14]!==link)) return {...base,product,format,link,reason:'Ô đã có dữ liệu hoặc công thức khác; không ghi đè'};
  const fields=[empty(r[3])?'D':'',empty(r[9])?'J':'',empty(r[14])?'O':''].filter(Boolean);
  return {...base,product,format,link,fields,status:fields.length?'ready':'current',reason:fields.length?'Có ô trống có thể điền':'Đã khớp'};
 }).filter((r):r is BulkRow=>r!==null);
}
export function manualSyncAllowed(now:Date):boolean {return (now.getUTCHours()+7)%24!==3;}
