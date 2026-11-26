import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProductEdit } from '../src/lib/product-edit.ts';

test('normalizes code and trims product details', () => {
  assert.deepEqual(parseProductEdit({code:' gi ', name:' Gi ', category:' Hàng ', expectedCode:'SP01'}), {code:'GI',name:'Gi',category:'Hàng',expectedCode:'SP01'});
});
test('rejects empty, malformed or excessive fields', () => {
  const good = {code:'GI', name:'Gi', category:'Hàng', expectedCode:'SP01'};
  for (const patch of [{code:''},{code:'có dấu'},{code:'A_B'},{name:'  '},{category:''},{expectedCode:''},{name:'x'.repeat(201)}]) assert.equal(parseProductEdit({...good,...patch}), null);
  assert.equal(parseProductEdit(null),null);
});
