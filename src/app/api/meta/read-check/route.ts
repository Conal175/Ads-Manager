import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/server';
import { checkMetaReadConnection } from '@/lib/meta-read-connection';

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const denied = await authorizeApi('admin', true);
  if (denied) return denied;
  const token = process.env.META_READ_ACCESS_TOKEN?.trim();
  if (!token) return NextResponse.json({error:'Chưa cấu hình META_READ_ACCESS_TOKEN trên máy chủ.'},{status:503,headers:{'Cache-Control':'no-store'}});
  try {
    const body = await request.json();
    if (typeof body.accountId !== 'string' || !/^[0-9]{1,30}$/.test(body.accountId)) return NextResponse.json({error:'ID tài khoản quảng cáo không hợp lệ.'},{status:400,headers:{'Cache-Control':'no-store'}});
    const version = process.env.META_GRAPH_API_VERSION?.trim() || 'v24.0';
    if (!/^v\d{2}\.0$/.test(version)) return NextResponse.json({error:'Phiên bản Meta Graph API không hợp lệ.'},{status:503,headers:{'Cache-Control':'no-store'}});
    const result = await checkMetaReadConnection(token, body.accountId, version);
    return NextResponse.json({result,version},{headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({error:'Không thể kiểm tra kết nối Meta.'},{status:500,headers:{'Cache-Control':'no-store'}}); }
}
