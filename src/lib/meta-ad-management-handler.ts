import {NextRequest,NextResponse} from 'next/server';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {AppRole} from '@/lib/auth/policy';
import {graphAds, MetaAdsError, parseCampaigns, validId} from '@/lib/meta-ad-management';
type Dependencies = {sameOrigin:()=>Promise<boolean>; authClient:()=>Promise<SupabaseClient>; resolveIdentity:(client:SupabaseClient)=>Promise<{authenticated:boolean;role:AppRole|null}>; pool:{query:(sql:string, params?:any[])=>Promise<{rows:any[];rowCount:number|null}>}; graphAds:typeof graphAds};
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function createAdManagementHandler(deps:Dependencies) {
 const {sameOrigin,authClient,resolveIdentity,pool}=deps;
 const graphAds=deps.graphAds;
 return async function POST(req:NextRequest) {
 if (!(await sameOrigin())) return reply({error:'Nguồn yêu cầu không hợp lệ.'},403);
 try {
  const client=await authClient(); const identity=await resolveIdentity(client);
  if(!identity.authenticated) return reply({error:'Vui lòng đăng nhập.'},401);
  if(identity.role!=='admin' && identity.role!=='operator') return reply({error:'Bạn không có quyền sử dụng chức năng này.'},403);
  const {data:{user},error:authError}=await client.auth.getUser(); if(authError||!user) return reply({error:'Vui lòng đăng nhập.'},401);
  const body=await req.json();
  if(body.action==='grants') {
   if(identity.role==='admin') {
    const {rows}=await pool.query(`select g.user_id, g.account_id, g.can_manage, u.email from public.meta_ad_account_grants g join auth.users u on u.id=g.user_id order by u.email, g.account_id limit 500`);
    return reply({grants:rows, admin:true});
   }
   const {rows}=await pool.query('select account_id, can_manage from public.meta_ad_account_grants where user_id=$1 order by account_id',[user.id]);
   return reply({grants:rows,admin:false});
  }
  if(body.action==='grant' || body.action==='revoke') {
   if(identity.role!=='admin') return reply({error:'Chỉ quản trị viên có thể cấp quyền.'},403);
   if(typeof body.userId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.userId) || !validId(body.accountId) || (body.action==='grant' && typeof body.canManage!=='boolean')) return reply({error:'Thông tin cấp quyền không hợp lệ.'},400);
   if(body.action==='grant') { const result=await pool.query(`insert into public.meta_ad_account_grants (user_id,account_id,can_manage) select u.id,$2,$3 from auth.users u join public.app_user_roles r on r.user_id=u.id where u.id=$1 and u.email_confirmed_at is not null and r.role in ('operator','admin') on conflict (user_id,account_id) do update set can_manage=excluded.can_manage`,[body.userId,body.accountId,body.canManage]); if(!result.rowCount)return reply({error:'Người dùng phải xác nhận email và có vai trò operator hoặc admin.'},400); }
   else await pool.query('delete from public.meta_ad_account_grants where user_id=$1 and account_id=$2',[body.userId,body.accountId]);
   return reply({ok:true});
  }
  if(!validId(body.accountId)) return reply({error:'ID tài khoản quảng cáo không hợp lệ.'},400);
  if(identity.role!=='admin') {const {rows}=await pool.query('select can_manage from public.meta_ad_account_grants where user_id=$1 and account_id=$2',[user.id,body.accountId]); if(!rows.length || (body.action==='setStatus' && !rows[0].can_manage)) return reply({error:'Bạn chưa được cấp quyền với tài khoản này.'},403);}
  const token=process.env.META_READ_ACCESS_TOKEN?.trim(),version=process.env.META_GRAPH_API_VERSION?.trim()||'v24.0';
  if(!token || !/^v\d{2}\.0$/.test(version)) return reply({error:'Kết nối Meta chưa được cấu hình hợp lệ trên máy chủ.'},503);
  if(body.action==='load') {
   const [account,campaigns,insights]=await Promise.all([
    graphAds(token,version,`act_${body.accountId}`,{fields:'id,name,account_status,currency'}),
    graphAds(token,version,`act_${body.accountId}/campaigns`,{fields:'id,name,status,effective_status',limit:'100'}),
    graphAds(token,version,`act_${body.accountId}/insights`,{fields:'spend,impressions,clicks',date_preset:'last_30d',limit:'1'})
   ]);
   return reply({account:{id:account.id,name:account.name,status:account.account_status,currency:account.currency},...parseCampaigns(campaigns),insights:Array.isArray(insights.data)?insights.data.slice(0,1):[], canManage:identity.role==='admin'||(await pool.query('select can_manage from public.meta_ad_account_grants where user_id=$1 and account_id=$2',[user.id,body.accountId])).rows[0]?.can_manage===true});
  }
  if(body.action==='setStatus') {
   if(!validId(body.campaignId) || !['ACTIVE','PAUSED'].includes(body.status) || !['ACTIVE','PAUSED'].includes(body.expectedStatus) || body.status===body.expectedStatus) return reply({error:'Trạng thái hoặc chiến dịch không hợp lệ.'},400);
   const current=await graphAds(token,version,body.campaignId,{fields:'id,account_id,status,name'});
   if(current.id!==body.campaignId || String(current.account_id).replace(/^act_/,'')!==body.accountId) return reply({error:'Chiến dịch không thuộc tài khoản được cấp quyền.'},403);
   if(current.status!==body.expectedStatus) return reply({error:'Trạng thái đã thay đổi hoặc không hỗ trợ. Hãy tải lại trước khi thao tác.'},409);
   const result=await graphAds(token,version,body.campaignId,{status:body.status},'POST');
   if(result.success!==true) return reply({error:'Meta không xác nhận thành công. Hãy tải lại trạng thái.'},502);
   return reply({ok:true});
  }
  return reply({error:'Thao tác không hợp lệ.'},400);
 } catch(e) { if(e instanceof MetaAdsError)return reply({error:e.message,code:e.code},502); return reply({error:e instanceof Error && (e.message.startsWith('Không nhận')||e.message.startsWith('Không xác định')||e.message.startsWith('Không thể kết nối')||e.message.startsWith('Danh sách')||e.message.startsWith('Phản hồi'))?e.message:'Không thể xử lý yêu cầu. Kiểm tra cấu hình và quyền hệ thống.'},500); }
}

}
