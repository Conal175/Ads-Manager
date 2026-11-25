export type CatalogMedia = { code:string; productCode:string; productName:string; type:string; fileName:string };
export type CandidateResult = { status:'candidate'|'ambiguous'|'missing'|'legacy'|'conflict'; candidates:CatalogMedia[] };

/** CSV is the Ads Manager export, not an arbitrary spreadsheet. Never creates an association. */
export function parseMediaCatalog(rows:string[][]):CatalogMedia[] { const header=rows[0]?.map(v=>v.trim()) ?? [];
  const columns=['Mã media','Mã sản phẩm','Tên sản phẩm','Loại','Tên file'].map(v=>header.indexOf(v));
  if(columns.some(i=>i<0)) throw new Error('Danh mục media thiếu cột bắt buộc.');
  return rows.slice(1).filter(r=>r.some(v=>v.trim())).map(r=>({code:(r[columns[0]]??'').trim(),productCode:(r[columns[1]]??'').trim(),productName:(r[columns[2]]??'').trim(),type:(r[columns[3]]??'').trim(),fileName:(r[columns[4]]??'').trim()}));
}

/** Exact product + media + format only. Name candidates are not verified Meta bindings. */
export function reconcileMedia(ad:string, nameConflict:boolean, catalog:CatalogMedia[]):CandidateResult {
  if(nameConflict) return {status:'conflict',candidates:[]};
  const m=/^([A-Z0-9]+)_(M\d+)_(VID|IMG)$/i.exec(ad.trim());
  if(!m) return {status:/^M\d+_(?:VID|IMG|VIDEO|IMAGE)(?:_|$)/i.test(ad.trim())?'legacy':'missing',candidates:[]};
  const product=m[1].toUpperCase(), code=m[2].toUpperCase(), format=m[3].toUpperCase();
  const candidates=catalog.filter(item=>{
    const p=item.productCode.toUpperCase(), c=item.code.toUpperCase();
    const type=item.type.toLowerCase();
    return p===product && (c===code || c===`${product}_${code}`) && ((format==='VID' && ['video','vid'].includes(type)) || (format==='IMG' && ['image','img'].includes(type)));
  });
  return {status:candidates.length===1?'candidate':candidates.length?'ambiguous':'missing',candidates};
}
