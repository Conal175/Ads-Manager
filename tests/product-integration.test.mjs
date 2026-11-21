// Isolated integration test ONLY: local PostgreSQL and a fake Supabase Auth server.
// It writes and creates a temporary trigger in the local test database.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
const base = 'http://127.0.0.1:3117';
const pool = new pg.Pool({ connectionString: 'postgresql://user@127.0.0.1:55432/ads_manager_integration_test' });
const session = { access_token: 'fake-test-access-token', refresh_token: 'fake-refresh', expires_at: Math.floor(Date.now()/1000)+3600, token_type: 'bearer', user: { id: '18ef842a-05b7-4dc6-bb87-742408c33511' } };
const headers = { cookie: 'sb-127-auth-token=base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'), origin: base, 'content-type': 'application/json' };
const input = {code:'TEST_CONCURRENCY',name:'Test Product',effectiveFrom:'2026-01-01',avgSellingPrice:100000,cogs:30000,shippingPackingFee:10000,otherCost:0,expectedReturnRatePct:0,targetNetMarginPct:10,targetCloseRatePct:20,dailyBudgetTarget:0};
const request = async (path, method='GET', body) => { const res = await fetch(base + path, {method,headers,body: body === undefined ? undefined : JSON.stringify(body)}); return {status:res.status,body:await res.json()}; };
after(() => pool.end());

test('product and KPI survive reads, errors roll back, parallel version writes serialize', async () => {
  const marker = await pool.query("select id, current_database() as db from public.integration_test_marker");
  assert.deepEqual(marker.rows, [{ id: 'local-only-test-database', db: 'ads_manager_integration_test' }]);
  assert.equal((await request('/api/auth/me')).body.role,'admin');
  const created=await request('/api/products','POST',input);
  assert.equal(created.status,200,JSON.stringify(created));
  const id=created.body.product.id;
  assert.equal(created.body.product.dailyBudgetTarget,0);
  assert.equal(created.body.kpiVersion.versionNumber,1);
  assert.equal(created.body.kpiVersion.targetCpo,50000);
  assert.equal(created.body.kpiVersion.ceilingMessageCost,10000);
  assert.equal((await request('/api/products','POST',input)).status,500);
  const invalid = await request('/api/products','POST',{...input,code:'TEST_BAD',targetCloseRatePct:101});
  assert.equal(invalid.status,400);
  assert.equal((await pool.query("select count(*)::int n from products where code='TEST_BAD'")).rows[0].n,0);

  // Inject a failure at the second insert; the route's transaction must roll back product creation.
  await pool.query("create function public.local_test_reject_kpi() returns trigger language plpgsql as $$ begin if new.note = 'TEST_FORCE_FAILURE' then raise exception 'test injected failure'; end if; return new; end $$; create trigger local_test_kpi_failure before insert on public.product_kpi_versions for each row execute function public.local_test_reject_kpi()");
  try {
    const failed=await request('/api/products','POST',{...input,code:'TEST_ROLLBACK',note:'TEST_FORCE_FAILURE'});
    assert.equal(failed.status,500);
    assert.equal((await pool.query("select count(*)::int n from products where code='TEST_ROLLBACK'")).rows[0].n,0);
  } finally { await pool.query('drop trigger local_test_kpi_failure on public.product_kpi_versions; drop function public.local_test_reject_kpi()'); }

  const results = await Promise.all(Array.from({length:20}, (_,i)=>request(`/api/products/${id}/kpi-version`,'POST',{...input,note:`concurrent-${i}`})));
  for (const r of results) assert.equal(r.status,200,JSON.stringify(r));
  const numbers=results.map(r=>r.body.kpiVersion.versionNumber).sort((a,b)=>a-b);
  assert.deepEqual(numbers,Array.from({length:20},(_,i)=>i+2));
  const actual=await pool.query('select version_number from product_kpi_versions where product_id=$1 order by version_number',[id]);
  assert.deepEqual(actual.rows.map(r=>r.version_number),Array.from({length:21},(_,i)=>i+1));
  const list = await request('/api/products');
  const found = list.body.products.find(p=>p.id===id);
  assert.equal(found.kpiVersions.length,21);
  assert.equal(found.currentKpi.versionNumber,21);
  assert.equal((await request('/api/products/999999/kpi-version','POST',input)).status,404);
});
