/** All requests are read-only; Page tokens stay exclusively on the server. */
type GraphData = {data?: unknown; paging?: {cursors?: {after?: unknown}; next?: unknown}; error?: {code?: unknown}};
export class MetaPagesError extends Error { constructor(message: string, public code?: number) { super(message); } }
export type PageSummary = {id:string; name:string};
export type PagePost = {id:string; message:string; createdTime:string|null; comments:{id:string;message:string;createdTime:string|null}[]; moreComments:boolean; commentsAvailable:boolean};
export async function createPageReader(token:string, version:string, fetcher:typeof fetch=fetch) {
 if(!token.trim() || !/^v\d{2}\.0$/.test(version)) throw new MetaPagesError('Chưa cấu hình token hoặc phiên bản API hợp lệ.');
 async function get(path:string, params:Record<string,string>, bearer:string):Promise<GraphData> {
  const url=new URL(`https://graph.facebook.com/${version}/${path}`);
  for(const [key,value] of Object.entries(params)) url.searchParams.set(key,value);
  let response:Response, data:GraphData;
  try { response=await fetcher(url,{method:'GET',headers:{Authorization:`Bearer ${bearer}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)}); data=await response.json(); }
  catch {throw new MetaPagesError('Không thể kết nối Meta hoặc yêu cầu đã hết thời gian.');}
  if(!response.ok || data.error) throw new MetaPagesError('Meta từ chối yêu cầu. Hãy kiểm tra token, quyền Trang và cấu hình ứng dụng.',typeof data.error?.code==='number'?data.error.code:undefined);
  if(!Array.isArray(data.data)) throw new MetaPagesError('Meta trả về dữ liệu không hợp lệ.');
  return data;
 }
 async function collectPages() {
  const pages:{id:string;name:string;token:string}[]=[];
  let after:string|undefined, more=false;
  for(let i=0;i<5;i++) {
   const params:Record<string,string>={fields:'id,name,access_token',limit:'50'};
   if(after) params.after=after;
   const response=await get('me/accounts',params,token);
   for(const raw of response.data as Record<string,unknown>[]) {
    if(typeof raw.id==='string' && /^\d{1,30}$/.test(raw.id) && typeof raw.name==='string' && typeof raw.access_token==='string' && raw.access_token) pages.push({id:raw.id,name:raw.name,token:raw.access_token});
   }
   more=Boolean(response.paging?.next);
   if(!more) break;
   const next=response.paging?.cursors?.after;
   if(typeof next!=='string' || !next || next===after || next.length>1000) throw new MetaPagesError('Không thể đọc đầy đủ danh sách Trang.');
   after=next;
  }
  return {pages,more};
 }
 return {
  async listPages():Promise<{pages:PageSummary[];more:boolean}> {const {pages,more}=await collectPages();return {pages:pages.map(({id,name})=>({id,name})),more};},
  async listPosts(pageId:string):Promise<{posts:PagePost[];more:boolean}> {
   if(!/^\d{1,30}$/.test(pageId)) throw new MetaPagesError('ID Trang không hợp lệ.');
   const {pages}=await collectPages(); const page=pages.find(p=>p.id===pageId);
   if(!page) throw new MetaPagesError('Không tìm thấy Trang trong danh sách được cấp quyền; hãy làm mới danh sách hoặc kiểm tra quyền.');
   const response=await get(`${pageId}/posts`,{fields:'id,message,created_time,comments.limit(10){id,message,created_time}',limit:'20'},page.token);
   const posts:PagePost[]=(response.data as Record<string,unknown>[]).filter(p=>typeof p.id==='string').map(p=>{
    const edge=p.comments as {data?:unknown;paging?:{next?:unknown}}|undefined;
    const comments=Array.isArray(edge?.data)?edge.data.filter((c:Record<string,unknown>)=>typeof c.id==='string').map((c:Record<string,unknown>)=>({id:c.id as string,message:typeof c.message==='string'?c.message:'',createdTime:typeof c.created_time==='string'?c.created_time:null})):[];
    return {id:p.id as string,message:typeof p.message==='string'?p.message:'',createdTime:typeof p.created_time==='string'?p.created_time:null,comments,moreComments:Boolean(edge?.paging?.next),commentsAvailable:Array.isArray(edge?.data)};
   });
   return {posts,more:Boolean(response.paging?.next)};
  }
 };
}
