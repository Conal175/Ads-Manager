import {test} from 'node:test';import assert from 'node:assert/strict';import {parseCsv,parseMetaReport,summarizeMeta} from '../src/lib/meta-csv-report.ts';
const h=['Tên tài khoản','Tên chiến dịch','Tên nhóm quảng cáo','Tên quảng cáo','Độ tuổi','Giới tính','Đơn vị tiền tệ','Số tiền đã chi tiêu (VND)','Lượt hiển thị','Lượt click (tất cả)','Lượt bắt đầu cuộc trò chuyện qua tin nhắn','Lượt mua','Lượt bắt đầu báo cáo','Lượt kết thúc báo cáo'];
const csv=r=>r.map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\n');
const row=(age,spend,msg)=>['TK','2311_MESS_Gi_113_C01','Broad_35-65_Tỉnh','M001_VID',age,'female','VND',spend,'100','10',msg,'1','2026-11-01','2026-11-25'];
test('quoted CSV, weighted metrics and reconciliation mismatches',()=>{
 assert.deepEqual(parseCsv('"x,y","a""b"\r\n'),[['x,y','a"b']]);
 const summary=['','','','','','','VND','300,00','200','20','4','2','2026-11-01','2026-11-25'];
 const data=parseMetaReport(csv([h,summary,row('18-24','100,00','1'),row('25-34','200,00','2')]));
 assert.deepEqual(data.differences,['messages']);const groups=summarizeMeta(data.rows);assert.equal(groups.length,1);assert.equal(groups[0].spend,300);assert.equal(groups[0].messages,3);assert.equal(groups[0].mediaCode,'M001');
});
test('invalid fields and overlapping report periods do not silently pass',()=>{
 assert.throws(()=>parseMetaReport('bad,header'),/Thiếu cột/);
 const bad=row('18-24','1,234,567','');const parsed=parseMetaReport(csv([h,bad]));assert.equal(parsed.errors.length,1);
 const a=row('a','10','');const b=row('b','10','');b[12]='2026-11-02';assert.throws(()=>parseMetaReport(csv([h,a,b])),/nhiều kỳ/);
});
