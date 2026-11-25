// Run only against the dedicated local server with fake Supabase/database settings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:3116';
const paths = ['/api/actions','/api/assets','/api/briefings','/api/creatives','/api/dashboard','/api/launcher','/api/meta-posts','/api/presets','/api/products','/api/reports','/api/settings','/api/system','/api/admin/roles','/api/admin/users','/api/auth/me'];
const mutations = [['PATCH','/api/auth/profile'],['POST','/api/actions'],['PATCH','/api/actions'],['POST','/api/assets'],['PATCH','/api/assets'],['POST','/api/briefings'],['POST','/api/creatives'],['PATCH','/api/creatives'],['POST','/api/launcher'],['POST','/api/meta-posts'],['POST','/api/presets'],['DELETE','/api/presets'],['POST','/api/products'],['POST','/api/products/1/kpi-version'],['PATCH','/api/products/1/kpi-version'],['POST','/api/reports'],['PUT','/api/settings'],['POST','/api/settings/test-connection'],['POST','/api/system'],['PUT','/api/admin/roles'],['DELETE','/api/admin/roles']];
async function req(path, opts={}) { return fetch(base+path,{...opts,redirect:'manual'}); }
test('every protected read rejects missing and forged credentials', async () => {
 for (const path of paths) for (const headers of [{}, {'authorization':'Bearer fake','cookie':'sb-fake-auth-token=invalid','x-middleware-subrequest':'middleware:middleware:middleware:middleware:middleware'}]) {
   const r=await req(path,{headers}); assert.equal(r.status,401, path);
 }
});
test('every mutation rejects missing session and untrusted origin', async () => {
 for (const [method,path] of mutations) {
  for (const [origin,status] of [[base,401],['http://attacker.invalid',403],[null,403]]) {
   const headers={'content-type':'application/json'}; if(origin) headers.origin=origin;
   const r=await req(path,{method,headers,body:'{}'}); assert.equal(r.status,status, `${method} ${path} origin ${origin}`);
  }
 }
});
test('business pages cannot be opened without a verified session, including bypass header', async () => {
 for (const path of ['/','/assets','/products','/creatives','/launcher','/actions','/reports','/system','/users']) {
  const r=await req(path,{headers:{'x-middleware-subrequest':'middleware:middleware:middleware:middleware:middleware'}}); assert.equal(r.status,307,path); assert.equal(new URL(r.headers.get('location'),base).pathname,'/login');
 }
});
test('auth endpoints reject untrusted origins and malformed input', async () => {
 for (const path of ['/api/auth/login','/api/auth/register','/api/auth/logout']) {
  const r=await req(path,{method:'POST',headers:{origin:'http://attacker.invalid','content-type':'application/json'},body:'{}'}); assert.equal(r.status,403,path);
 }
 for (const path of ['/api/auth/login','/api/auth/register']) {
  const r=await req(path,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:'{}'}); assert.equal(r.status,400,path);
 }
});
