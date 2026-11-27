'use client';
import {useState} from 'react';
import type {MetaReadResult} from '@/lib/meta-read-connection';

export default function MetaReadConnection() {
 const [accountId,setAccountId]=useState('1259503779537106');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [result,setResult]=useState<MetaReadResult|null>(null);
 const [version,setVersion]=useState('');
 async function check() {
  setBusy(true);setError('');setResult(null);
  try {
   const response=await fetch('/api/meta/read-check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accountId}),cache:'no-store'});
   const data=await response.json();
   if(!response.ok) {setError(data.error||'Không thể kiểm tra kết nối.');return;}
   setResult(data.result);setVersion(data.version);
  } catch {setError('Không thể kết nối máy chủ.');} finally {setBusy(false);}
 }
 return <section className="rounded-xl border border-blue-200 bg-white p-5 space-y-4 shadow-xs">
  <h2 className="text-base font-bold">Kết nối Meta · kiểm tra chỉ đọc</h2>
  <p className="text-sm text-slate-600">Chỉ quản trị viên được kiểm tra. Token dùng biến môi trường bảo mật META_READ_ACCESS_TOKEN trên Vercel, không nhập vào web hoặc chat. Kiểm tra chỉ đọc, không lưu dữ liệu hay sửa Meta. Sau khi thêm hoặc thay token cần triển khai lại. Token thử nghiệm có thể hết hạn.</p>
  <div><label htmlFor="meta-account" className="block text-sm font-semibold">ID tài khoản quảng cáo</label><input id="meta-account" inputMode="numeric" pattern="[0-9]*" maxLength={30} value={accountId} onChange={e=>setAccountId(e.target.value)} className="mt-1 w-full max-w-sm rounded-lg border px-3 py-2 text-sm" /></div>
  <button type="button" onClick={check} disabled={busy||!/^\d{1,30}$/.test(accountId)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?'Đang kiểm tra…':'Kiểm tra quyền và tài sản'}</button>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  {result&&<div className="space-y-3 text-sm"><p>Graph API {version}. Mỗi mục được kiểm tra độc lập; đây không phải xác nhận có thể đăng bài hoặc quản lý quảng cáo.</p>
   <div><strong>Quyền token:</strong> {result.permissions.ok ? <><p>Được cấp: {result.permissions.data.granted.join(', ')||'Không có'}</p><p>Chưa thấy: {result.permissions.data.missing.join(', ')||'Không có'}</p></> : <p>{result.permissions.message} {result.permissions.code ? `(mã ${result.permissions.code})`:''}</p>}</div>
   <div><strong>TK quảng cáo:</strong> {result.account.ok ? <p>{result.account.data.name} · {result.account.data.id} · trạng thái {result.account.data.accountStatus??'không rõ'} · {result.account.data.currency??'không rõ tiền tệ'}</p> : <p>{result.account.message} {result.account.code ? `(mã ${result.account.code})`:''}</p>}</div>
   <div><strong>Danh sách Trang:</strong> {result.pages.ok ? <><ul className="list-disc pl-5">{result.pages.data.pages.map(p=><li key={p.id}>{p.name} · {p.id}</li>)}</ul>{!result.pages.data.pages.length&&<p>Không có Trang trong kết quả. Điều này không xác nhận tài khoản không có Trang.</p>}{result.pages.data.hasMore&&<p>Chỉ hiển thị trang đầu tiên; danh sách còn kết quả khác.</p>}</> : <p>{result.pages.message} {result.pages.code ? `(mã ${result.pages.code})`:''}</p>}</div>
  </div>}
 </section>;
}
