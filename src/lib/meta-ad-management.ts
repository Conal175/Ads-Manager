/** Bounded Graph API operations; credentials never go to the browser. */
type Fetcher = typeof fetch;
export class MetaAdsError extends Error {
 code?: number;
 constructor(code?: number) { super('Meta từ chối hoặc không thể xử lý yêu cầu. Kiểm tra token và quyền tài khoản quảng cáo.'); this.code=code; }
}
export function validId(id: unknown): id is string { return typeof id === 'string' && /^\d{1,30}$/.test(id); }
export async function graphAds(token: string, version: string, path: string, params: Record<string,string>, method: 'GET'|'POST' = 'GET', fetcher: Fetcher = fetch): Promise<Record<string, unknown>> {
 if (!token.trim() || !/^v\d{2}\.0$/.test(version) || !/^(act_\d+|\d+)(\/(campaigns|insights))?$/.test(path)) throw new Error('Invalid configuration');
 const url = new URL(`https://graph.facebook.com/${version}/${path}`);
 const body = new URLSearchParams(params);
 if (method === 'GET') for (const [k,v] of body) url.searchParams.set(k,v);
 let response: Response;
 try { response = await fetcher(url, {method, headers: {Authorization:`Bearer ${token.trim()}`, ...(method === 'POST' ? {'Content-Type':'application/x-www-form-urlencoded'} : {})}, ...(method === 'POST' ? {body:body.toString()} : {}), cache:'no-store', redirect:'error', signal:AbortSignal.timeout(10000)}); }
 catch { throw new Error(method === 'POST' ? 'Không nhận được kết quả từ Meta. Thay đổi có thể đã được áp dụng; hãy tải lại trước khi thử lại.' : 'Không thể kết nối Meta hoặc yêu cầu đã hết thời gian.'); }
 let data: Record<string,unknown>;
 try { data = await response.json(); } catch { throw new Error(method === 'POST' ? 'Không xác định được kết quả. Hãy tải lại trạng thái trước khi thử lại.' : 'Phản hồi Meta không hợp lệ.'); }
 if (method === 'POST' && response.status >= 500) throw new Error('Không xác định được kết quả. Hãy tải lại trạng thái trước khi thử lại.');
 if (!response.ok || data.error) { const e = data.error as {code?:unknown}|undefined; throw new MetaAdsError(typeof e?.code === 'number' ? e.code : undefined); }
 return data;
}
export function parseCampaigns(data: Record<string,unknown>) {
 if (!Array.isArray(data.data)) throw new Error('Danh sách chiến dịch không hợp lệ.');
 return {campaigns:data.data.filter((c:Record<string,unknown>)=>validId(c.id) && typeof c.name==='string').map((c:Record<string,unknown>)=>({id:c.id,name:c.name,status:typeof c.status==='string'?c.status:null,effectiveStatus:typeof c.effective_status==='string'?c.effective_status:null})), more: Boolean((data.paging as {next?:unknown}|undefined)?.next)};
}
