import {NextRequest,NextResponse} from 'next/server';
import {authorizeApi} from '@/lib/auth/server';
import {createPageReader,MetaPagesError} from '@/lib/meta-pages';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest) {
 const denied=await authorizeApi('admin',true);if(denied)return denied;
 const response=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 const token=process.env.META_READ_ACCESS_TOKEN?.trim();if(!token)return response({error:'Chưa cấu hình token Meta trên máy chủ.'},503);
 try {
  const body=await request.json();
  const reader=await createPageReader(token,process.env.META_GRAPH_API_VERSION?.trim()||'v24.0');
  if(body.action==='pages')return response(await reader.listPages());
  if(body.action==='posts'&&typeof body.pageId==='string'&&/^\d{1,30}$/.test(body.pageId)) return response(await reader.listPosts(body.pageId));
  return response({error:'Yêu cầu không hợp lệ.'},400);
 } catch(error) {
  if(error instanceof MetaPagesError)return response({error:error.message,...(error.code!==undefined?{code:error.code}:{})},502);
  return response({error:'Không thể tải dữ liệu Trang.'},500);
 }
}
