import {test} from 'node:test';import assert from 'node:assert/strict';
import {objectiveFromName,classifyCampaigns,rankObjectiveCampaigns} from '../src/lib/campaign-objectives.ts';
import {parseMetaRows} from '../src/lib/meta-csv-report.ts';
const h=['Tên tài khoản','Tên chiến dịch','Tên nhóm quảng cáo','Tên quảng cáo','Độ tuổi','Giới tính','Đơn vị tiền tệ','Số tiền đã chi tiêu (VND)','Lượt hiển thị','Lượt click (tất cả)','Lượt bắt đầu cuộc trò chuyện qua tin nhắn','Lượt mua','Lượt bắt đầu báo cáo','Lượt kết thúc báo cáo','Lượt đăng ký hoàn tất'];
const row=(campaign,spent,msg,pur,reg)=>['TK',campaign,'group','ad','18-24','female','VND',spent,'100','10',msg,pur,'2026-11-01','2026-11-25',reg];
test('recognizes objective tokens, never guesses from substrings or conflicting markers',()=>{
 assert.equal(objectiveFromName('23_MESS_GI'),'MESS');assert.equal(objectiveFromName('23_conversion-GI'),'CONVERSION');assert.equal(objectiveFromName('MESSAGE'), 'unknown');assert.equal(objectiveFromName('MESS_PURCHASES'),'conflict');assert.equal(objectiveFromName('TRAFFIC'),'TRAFFIC');
});
test('ranks within objectives by aggregated cost per correct result and reports blanks',()=>{
 const data=parseMetaRows([h,row('A_CONVERSION','100','0','0','1'),row('A_CONVERSION','300','0','0','3'),row('B_CONVERSION','300','0','0','1'),row('C_MESS','50','5','0',''),row('D_PURCHASES','100','0','2','0'),row('E_CONVERSION','10','0','0',''),row('F_TRAFFIC','12','0','0','0'),row('old name','20','0','0','0')]);
 assert.equal(data.errors.length,0);const cs=classifyCampaigns(data.rows);
 const conv=rankObjectiveCampaigns(cs,'CONVERSION');assert.deepEqual(conv.map(c=>c.results),[4,1]);assert.equal(conv[0].spend/conv[0].results,100);
 assert.equal(rankObjectiveCampaigns(cs,'MESS')[0].results,5);assert.equal(rankObjectiveCampaigns(cs,'PURCHASES')[0].results,2);
 assert.equal(cs.find(x=>x.label.includes('E_CONVERSION')).status,'zero');assert.equal(cs.find(x=>x.label.includes('F_TRAFFIC')).status,'unsupported');assert.equal(cs.find(x=>x.label.includes('old name')).status,'unknown');
 const missing=parseMetaRows([h.slice(0,-1),row('A_CONVERSION','100','0','0','1').slice(0,-1)]);assert.equal(classifyCampaigns(missing.rows)[0].status,'missing');
 const bad=parseMetaRows([h,row('A_CONVERSION','100','0','0','x')]);assert.equal(bad.errors.length,1);
});
