export type SheetCreative = { code:string; productCode:string; mediaType:string; driveFileId:string };
export type SheetPreviewRow = { row:number; key:string; status:'ready'|'duplicate_sheet'|'duplicate_catalog'|'unmatched'|'occupied'|'invalid'|'already_current'; proposedLink:string };

/** Preview only. Never considers a Sheet row authoritative enough to create a database link. */
export function previewMediaSheet(values:unknown[][], catalog:SheetCreative[]):SheetPreviewRow[] {
  const header=values[0]??[];
  if(header[0]!=='Mã Media'||header[3]!=='Tên SP'||header[9]!=='Định dạng'||header[14]!=='Link Media / Post ID') throw new Error('Cấu trúc Sheet đã thay đổi.');
  const norm=(v:unknown)=>typeof v==='string'?v.trim().toUpperCase():'';
  const parsed=values.slice(1).map((r,index)=>{
    const product=norm(r[3]), media=norm(r[0]), format=norm(r[9]);
    return {row:index+2,product,media,format,key:`${product}_${media}_${format}`,current:r[14]};
  }).filter(r=>r.media || r.product || r.format);
  const counts=new Map<string,number>();
  for(const row of parsed) counts.set(row.key,(counts.get(row.key)??0)+1);
  return parsed.map(r=>{
    let status:SheetPreviewRow['status']='invalid', proposedLink='';
    if(/^[A-Z0-9]+$/.test(r.product)&&/^M\d+$/.test(r.media)&&/^(VID|IMG)$/.test(r.format)) {
      const matches=catalog.filter(c=>{
        const p=norm(c.productCode), code=norm(c.code), type=norm(c.mediaType);
        return p===r.product && (code===r.media||code===`${r.product}_${r.media}`) && (r.format==='VID'?['VIDEO','VID'].includes(type):['IMAGE','IMG'].includes(type));
      });
      if((counts.get(r.key)??0)>1) status='duplicate_sheet';
      else if(matches.length>1) status='duplicate_catalog';
      else if(!matches.length) status='unmatched';
      else if(!/^[a-zA-Z0-9_-]+$/.test(matches[0].driveFileId)) status='invalid';
      else if(catalog.filter(c=>c.driveFileId===matches[0].driveFileId).length>1) status='duplicate_catalog';
      else {
        proposedLink=`https://drive.google.com/file/d/${matches[0].driveFileId}/view`;
        const current=typeof r.current==='string'?r.current.trim():String(r.current??'');
        status=current===proposedLink?'already_current':current?'occupied':'ready';
      }
    }
    return {row:r.row,key:r.key,status,proposedLink};
  });
}
