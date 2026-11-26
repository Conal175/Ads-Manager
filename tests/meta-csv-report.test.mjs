import {test} from 'node:test';import assert from 'node:assert/strict';import {parseCsv,parseMetaReport,parseMetaRows,normalizeExcelRows,summarizeMeta} from '../src/lib/meta-csv-report.ts';
const h=['Tên tài khoản','Tên chiến dịch','Tên nhóm quảng cáo','Tên quảng cáo','Độ tuổi','Giới tính','Đơn vị tiền tệ','Số tiền đã chi tiêu (VND)','Lượt hiển thị','Lượt click (tất cả)','Lượt bắt đầu cuộc trò chuyện qua tin nhắn','Lượt mua','Lượt bắt đầu báo cáo','Lượt kết thúc báo cáo'];
const csv=r=>r.map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\n');
const row=(age,spend,msg)=>['TK','2311_MESS_Gi_113_C01','Broad_35-65_Tỉnh','M001_VID',age,'female','VND',spend,'100','10',msg,'1','2026-11-01','2026-11-25'];
test('quoted CSV, weighted metrics and reconciliation mismatches',()=>{
 assert.deepEqual(parseCsv('"x,y","a""b"\r\n'),[['x,y','a"b']]);
 const summary=['','','','','','','VND','300,00','200','20','4','2','2026-11-01','2026-11-25'];
 const data=parseMetaReport(csv([h,summary,row('18-24','100,00','1'),row('25-34','200,00','2')]));
 assert.deepEqual(data.differences,['messages']);const groups=summarizeMeta(data.rows);assert.equal(groups.length,1);assert.equal(groups[0].spend,300);assert.equal(groups[0].messages,3);assert.equal(groups[0].legacyCode,'M001');
});
test('invalid fields and overlapping report periods do not silently pass',()=>{
 assert.throws(()=>parseMetaReport('bad,header'),/Thiếu cột/);
 const bad=row('18-24','1,234,567','');const parsed=parseMetaReport(csv([h,bad]));assert.equal(parsed.errors.length,1);
 const a=row('a','10','');const b=row('b','10','');b[12]='2026-11-02';assert.throws(()=>parseMetaReport(csv([h,a,b])),/nhiều kỳ/);
});

test('Excel cells: dates, numeric values and empty outcomes are normalized without changing totals',()=>{
 const r=row('18-24',100,'');r[12]=new Date('2026-11-01T00:00:00Z');r[13]=new Date('2026-11-25T00:00:00Z');
 const result=parseMetaRows(normalizeExcelRows([h,r]));assert.equal(result.rows.length,1);assert.equal(result.rows[0].spend,100);assert.equal(result.rows[0].start,'2026-11-01');assert.equal(result.blankOutcomes,1);
});
test('product-qualified media names, legacy names and distinct Meta IDs',()=>{
 const hdr=[...h,'ID tài khoản','ID chiến dịch','ID nhóm quảng cáo','ID quảng cáo'];
 const a=row('a','10','1');a[3]='GI_M001_VID';const b=[...a];b[0]='TK';b[4]='b';
 const input=[hdr,[...a,'1','2','3','100000000000001'],[...b,'1','2','3','100000000000002']];
 const groups=summarizeMeta(parseMetaRows(input).rows);assert.equal(groups.length,2);assert.equal(groups[0].mediaCode,'GI_M001');assert.equal(groups[0].adId,'100000000000001');
 const change=[...a];change[3]='GI_M002_VID';const conflict=summarizeMeta(parseMetaRows([hdr,[...a,'1','2','3','5'],[...change,'1','2','3','5']]).rows);assert.equal(conflict.length,1);assert.equal(conflict[0].mediaCode,null);assert.equal(conflict[0].nameConflict,true);
 const invalid=parseMetaRows([hdr,[...a,'1','2','3','1.00E+15']]);assert.equal(invalid.errors.length,1);
 assert.throws(()=>normalizeExcelRows([hdr,[...a,'1','2','3',1234567890123456]]),/văn bản/);
});
test('Mã quảng cáo is accepted as ad ID and numeric Excel IDs are rejected',()=>{
 const hdr=[...h,'Mã quảng cáo']; const r=row('18-24','10','1');
 assert.equal(parseMetaRows([hdr,[...r,'120254017818060577']]).rows[0].adId,'120254017818060577');
 assert.throws(()=>normalizeExcelRows([hdr,[...r,120254017818060577]]),/văn bản/);
});
