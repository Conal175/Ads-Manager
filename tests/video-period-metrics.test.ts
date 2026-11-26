import {test} from 'node:test';
import assert from 'node:assert/strict';
import {periodMetrics,validConflictChoices} from '../src/lib/video-period-metrics';
import type {ReportRow} from '../src/lib/meta-csv-report';
const row={spend:100,messages:2,purchases:1,registrations:1,messagesBlank:false,purchasesBlank:false,registrationsBlank:false} as ReportRow;
test('compares period totals without turning blanks into zero',()=>{assert.deepEqual(periodMetrics([row,{...row,spend:50,messagesBlank:true,registrations:null}]),{spend:150,messages:null,purchases:2,registrations:null});});
test('requires an explicit valid decision for every conflicting ad',()=>{assert.equal(validConflictChoices(['1','2'],{'1':'keep'}),false);assert.equal(validConflictChoices(['1'],{'1':'replace'}),true);assert.equal(validConflictChoices(['1'],{'1':'other'}),false);assert.equal(validConflictChoices([],{}),true);});
