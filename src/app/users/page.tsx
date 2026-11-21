"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Role = "viewer" | "operator" | "admin";
type User = { id: string; email: string | null; email_confirmed_at: string | null; created_at: string; role: Role | null; bootstrap_admin: boolean };
const labels: Record<Role, string> = { viewer: "Chỉ xem", operator: "Vận hành", admin: "Quản trị" };

function UserRow({ user, onSave, busy }: { user: User; onSave: (user: User, role: Role | "") => void; busy: boolean }) {
  const [role, setRole] = useState<Role | "">(user.role ?? "");
  return <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-100 last:border-0">
    <div className="min-w-0">
      <div className="font-semibold text-slate-900 break-all">{user.email || "Không có email"}</div>
      <div className="text-xs text-slate-500 break-all mt-1">ID: {user.id}</div>
      <div className="text-xs mt-1 text-slate-600">{user.email_confirmed_at ? "Email đã xác minh" : "Email chưa xác minh"} · {user.bootstrap_admin ? "Quản trị ban đầu (cấu hình Vercel)" : user.role ? `Hiện tại: ${labels[user.role]}` : "Chưa được cấp quyền"}</div>
    </div>
    {user.bootstrap_admin ? <span className="text-xs text-slate-500 md:max-w-64">Quyền này được điều khiển bằng APP_ADMIN_EMAIL, không thể thu hồi tại đây.</span> :
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`role-${user.id}`}>Vai trò cho {user.email || user.id}</label>
      <select id={`role-${user.id}`} value={role} onChange={e => setRole(e.target.value as Role | "")} disabled={busy} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
        <option value="">Chưa cấp quyền</option><option value="viewer">Chỉ xem</option><option value="operator">Vận hành</option><option value="admin">Quản trị</option>
      </select>
      <button onClick={() => onSave(user, role)} disabled={busy || role === (user.role ?? "")} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-40">Lưu quyền</button>
    </div>}
  </div>;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/users?offset=${offset}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) { setUsers([]); setError(data.error || "Không thể tải danh sách."); return; }
      setUsers(data.users); setHasMore(data.hasMore);
    } catch { setError("Không thể kết nối. Hãy thử lại."); }
    finally { setLoading(false); }
  }, [offset]);
  useEffect(() => { void load(); }, [load]);
  async function save(user: User, role: Role | "") {
    const title = role ? `cấp quyền ${labels[role]}` : "thu hồi quyền";
    if (!window.confirm(`Bạn muốn ${title} cho ${user.email || user.id}?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(role ? "/api/admin/roles" : `/api/admin/roles?userId=${encodeURIComponent(user.id)}`, role ? {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, role }),
      } : { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Không thể cập nhật quyền."); return; }
      setMessage("Đã cập nhật quyền. Người dùng cần có email đã xác minh để sử dụng.");
      await load();
    } catch { setError("Không thể kết nối. Hãy thử lại."); }
    finally { setBusy(false); }
  }
  return <main className="max-w-6xl mx-auto p-5 md:p-8 space-y-5">
    <div><h1 className="text-2xl font-bold text-slate-900">Quản lý người dùng</h1><p className="text-sm text-slate-600 mt-1">Chỉ quản trị viên có thể xem và cập nhật quyền. Tài khoản mới không tự có quyền truy cập.</p></div>
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">Chỉ xem: xem dữ liệu · Vận hành: thao tác nghiệp vụ · Quản trị: cấu hình, tác vụ và phân quyền.</div>
    {error && <div role="alert" className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 text-sm">{error} <Link href="/login" className="underline">Đăng nhập</Link></div>}
    {message && <div role="status" className="bg-emerald-50 text-emerald-700 rounded-lg p-4 text-sm">{message}</div>}
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {loading ? <p className="p-5 text-sm text-slate-500">Đang tải…</p> : users.length ? users.map(user => <UserRow key={`${user.id}-${user.role ?? "none"}`} user={user} onSave={save} busy={busy} />) : !error && <p className="p-5 text-sm text-slate-500">Chưa có người dùng.</p>}
    </section>
    <div className="flex gap-2"><button disabled={offset === 0 || loading || busy} onClick={() => setOffset(Math.max(0, offset - 100))} className="rounded border px-3 py-2 text-sm disabled:opacity-40">Trang trước</button><button disabled={!hasMore || loading || busy} onClick={() => setOffset(offset + 100)} className="rounded border px-3 py-2 text-sm disabled:opacity-40">Trang sau</button></div>
  </main>;
}
