import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validProfileName } from '../src/lib/auth/profile.ts';
test('profile name is bounded and cannot contain control characters', () => {
 assert.equal(validProfileName('  Nguyễn Văn An  '), 'Nguyễn Văn An');
 for (const value of ['', '   ', 'x'.repeat(101), 'bad\nname', null, 7, {}]) assert.equal(validProfileName(value), null);
});
