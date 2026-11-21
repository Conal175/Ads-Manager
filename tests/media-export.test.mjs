import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaCsv } from '../src/lib/media-export.ts';
test('CSV escapes values and neutralizes spreadsheet formulas', () => {
 const csv = mediaCsv([{creativeCode:'=CMD()',productCode:'SP01',productName:'Áo, đẹp',fileName:'"video"\nfile',driveFileId:'abc_123',driveFolderPath:'  +unsafe',mediaType:'video',fileSizeMb:5,durationSec:2,hookAngle:'@example',lifecycleStatus:'cho_test'}]);
 assert.ok(csv.startsWith('\ufeff"Mã media"'));
 assert.ok(csv.includes('"\'=CMD()"')); assert.ok(csv.includes('"Áo, đẹp"'));
 assert.ok(csv.includes('""video""\nfile')); assert.ok(csv.includes('"\'  +unsafe"'));
 assert.ok(csv.includes('"\'@example"')); assert.ok(csv.includes('https://drive.google.com/file/d/abc_123/view'));
});
test('invalid Drive ID is not rendered as a link', () => {
 const csv=mediaCsv([{creativeCode:'C',productCode:'P',productName:'P',fileName:'F',driveFileId:'x/y',driveFolderPath:'',mediaType:'image',fileSizeMb:0,durationSec:0,hookAngle:'',lifecycleStatus:'cho_test'}]);
 assert.ok(!csv.includes('https://drive.google.com/'));
});
