import {test} from 'node:test';
import assert from 'node:assert/strict';
import {legacyCampaignRanking} from '../src/lib/legacy-campaign-ranking';
import type {ReportRow} from '../src/lib/meta-csv-report';
const row=(v:Partial<ReportRow>={}):ReportRow=>({accountId:'1',campaignId:'1',adsetId:'1',adId:'1',account:'A',campaign:'Tên cũ',adset:'S',ad:'a',age:'18-24',gender:'F',currency:'VND',spend:100,impressions:10,clicks:1,messages:2,purchases:1,registrations:1,messagesBlank:false,purchasesBlank:false,registrationsBlank:false,start:'2026-01-01',end:'2026-01-31',...v});
test('ranks old names separately by metric using sums',()=>{const a=row(),b=row({age:'25',spend:200,messages:1,purchases:2});assert.equal(legacyCampaignRanking([a,b],[a,b],'messages',true)[0].cost,100);assert.equal(legacyCampaignRanking([a,b],[a,b],'purchases',true)[0].cost,100);});
test('blanks, zero, partial, duplicates, missing ID and file mismatch block ranking',()=>{const a=row(), b=row({age:'25'});for(const [rows,ref,safe] of [[[row({messagesBlank:true})],[row({messagesBlank:true})],true],[[row({messages:0})],[row({messages:0})],true],[[a],[a,b],true],[[a,a],[a,a],true],[[row({adId:''})],[row({adId:''})],true],[[a],[a],false]] as [ReportRow[],ReportRow[],boolean][]) assert.equal(legacyCampaignRanking(rows,ref,'messages',safe)[0].cost,null);});
