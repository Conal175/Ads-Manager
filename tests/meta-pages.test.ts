import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPageReader} from '../src/lib/meta-pages';

test('loads only listed page posts, keeps both tokens server side, ignores paging URLs',async()=>{
 const seen:string[]=[];
 const fake:typeof fetch=async(input,init)=>{
  const url=new URL(String(input));seen.push(url.pathname);
  assert.equal(url.hostname,'graph.facebook.com');assert(!url.search.includes('token='));assert.equal(init?.method,'GET');assert.equal(init?.redirect,'error');
  if(url.pathname.endsWith('/me/accounts')){assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer user-secret');return Response.json({data:[{id:'123',name:'Test',access_token:'page-secret'}],paging:{}});}
  assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer page-secret');
  return Response.json({data:[{id:'123_456',message:'Hi',comments:{data:[{id:'77',message:'Hello'}],paging:{next:'https://example.com/?access_token=page-secret'}}}],paging:{next:'https://example.com/?access_token=page-secret'}});
 };
 const reader=await createPageReader('user-secret','v24.0',fake);
 const pages=await reader.listPages();assert.deepEqual(pages.pages,[{id:'123',name:'Test'}]);
 const posts=await reader.listPosts('123');assert.equal(posts.posts[0].comments[0].message,'Hello');assert(posts.more);assert(posts.posts[0].moreComments);assert(!JSON.stringify({posts,pages}).includes('secret'));
 await assert.rejects(reader.listPosts('999'),/Không tìm thấy/);assert(!seen.includes('/v24.0/999/posts'));
});
test('invalid IDs and upstream failures are safely handled',async()=>{
 const reader=await createPageReader('secret','v24.0',async()=>Response.json({error:{code:190,message:'secret'}},{status:400}));
 await assert.rejects(reader.listPosts('../me'),/không hợp lệ/);
 await assert.rejects(reader.listPages(),(error:unknown)=>error instanceof Error && !error.message.includes('secret'));
});
