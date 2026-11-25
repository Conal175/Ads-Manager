"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Không thể đăng nhập."); return; }
      setPassword("");
      const access = await fetch("/api/auth/me", { cache: "no-store" });
      if (!access.ok) { setError("Không thể kiểm tra quyền tài khoản. Vui lòng thử lại."); return; }
      const identity = await access.json();
      window.location.assign(identity.role === "admin" ? "/" : identity.role === "operator" ? "/assets" : "/no-access");
    } catch { setError("Không thể kết nối. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen flex items-center justify-center p-5 bg-[#f4f6fd]" style={{backgroundImage: "radial-gradient(circle at 15% 10%, #e0e7ff, transparent 40%), radial-gradient(circle at 90% 90%, #dbeafe, transparent 35%)"}}>
    <div className="w-full max-w-md">
      <div className="mb-7 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-200">AP</div><div><div className="font-bold text-slate-900">AdsPulse OS</div><div className="text-xs text-slate-500">Không gian quản lý quảng cáo</div></div></div>
      <form onSubmit={submit} className="w-full bg-white rounded-3xl border border-white p-7 sm:p-9 shadow-xl shadow-slate-200/70 space-y-5">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Chào mừng trở lại</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Đăng nhập</h1><p className="text-sm text-slate-500 mt-2">Dùng tài khoản đã được quản trị viên cấp quyền.</p></div>
        <label className="block text-sm font-semibold text-slate-700">Email<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></label>
        <label className="block text-sm font-semibold text-slate-700">Mật khẩu<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50">{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
        <p className="text-center text-sm text-slate-500">Chưa có tài khoản? <Link href="/register" className="font-semibold text-indigo-700 hover:underline">Đăng ký</Link></p>
      </form>
    </div>
  </main>;
}
