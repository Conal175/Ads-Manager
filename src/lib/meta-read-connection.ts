/** Read-only, bounded Meta connection check. Never returns or logs credentials. */
export const META_REQUESTED_PERMISSIONS = ['ads_read', 'ads_management', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts'] as const;
type Result<T> = {ok: true; data: T} | {ok: false; message: string; code?: number};
type Account = {id: string; name: string; accountStatus: number | null; currency: string | null};
type PageList = {pages: {id: string; name: string}[]; hasMore: boolean};
export type MetaReadResult = {permissions: Result<{granted: string[]; missing: string[]}>; account: Result<Account>; pages: Result<PageList>};
type Fetcher = typeof fetch;

export async function checkMetaReadConnection(token: string, accountId: string, version: string, fetcher: Fetcher = fetch): Promise<MetaReadResult> {
  if (!token.trim() || !/^[0-9]{1,30}$/.test(accountId) || !/^v\d{2}\.0$/.test(version)) throw new Error('Invalid configuration');
  const get = async (path: string, params: Record<string,string>): Promise<Result<Record<string, unknown>>> => {
    try {
      const url = new URL(`https://graph.facebook.com/${version}/${path}`);
      for (const [key,value] of Object.entries(params)) url.searchParams.set(key,value);
      const response = await fetcher(url, {method:'GET', headers:{Authorization:`Bearer ${token.trim()}`}, cache:'no-store', redirect:'error', signal:AbortSignal.timeout(10000)});
      const data = await response.json() as Record<string, unknown>;
      if (!response.ok || data.error) {
        const error = data.error as {code?: unknown} | undefined;
        return {ok:false, message:'Meta từ chối hoặc không thể xử lý yêu cầu. Kiểm tra token, quyền và quyền tài sản.', ...(typeof error?.code === 'number' ? {code:error.code} : {})};
      }
      return {ok:true,data};
    } catch { return {ok:false,message:'Không thể kết nối Meta hoặc yêu cầu đã hết thời gian.'}; }
  };
  const [permissions, account, pages] = await Promise.all([
    get('me/permissions', {}),
    get(`act_${accountId}`, {fields:'id,name,account_status,currency'}),
    get('me/accounts', {fields:'id,name',limit:'50'}),
  ]);
  const mappedPermissions: MetaReadResult['permissions'] = !permissions.ok ? permissions : !Array.isArray(permissions.data.data) ? {ok:false,message:'Meta trả về danh sách quyền không hợp lệ.'} : (() => {
    const granted = permissions.data.data.filter((p: {permission?: unknown; status?: unknown}) => p.status === 'granted' && typeof p.permission === 'string').map((p: {permission:string})=>p.permission);
    return {ok:true,data:{granted,missing:META_REQUESTED_PERMISSIONS.filter(p=>!granted.includes(p))}};
  })();
  const mappedAccount: MetaReadResult['account'] = !account.ok ? account : typeof account.data.id !== 'string' || typeof account.data.name !== 'string' ? {ok:false,message:'Meta trả về thông tin tài khoản không hợp lệ.'} : {ok:true,data:{id:account.data.id,name:account.data.name,accountStatus:typeof account.data.account_status==='number'?account.data.account_status:null,currency:typeof account.data.currency==='string'?account.data.currency:null}};
  const mappedPages: MetaReadResult['pages'] = !pages.ok ? pages : !Array.isArray(pages.data.data) ? {ok:false,message:'Meta trả về danh sách Trang không hợp lệ.'} : {ok:true,data:{pages:pages.data.data.filter((p:{id?:unknown;name?:unknown})=>typeof p.id==='string' && typeof p.name==='string').map((p:{id:string;name:string})=>({id:p.id,name:p.name})),hasMore: Boolean((pages.data.paging as {next?:unknown}|undefined)?.next)}};
  return {permissions:mappedPermissions,account:mappedAccount,pages:mappedPages};
}
