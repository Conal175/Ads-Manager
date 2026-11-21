"use client";
import { useState, type FormEvent } from "react";

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
      setPassword(""); window.location.assign("/");
    } catch { setError("Không thể kết nối. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
    <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div><h1 className="text-xl font-bold">Đăng nhập AdsPulse OS</h1><p className="text-sm text-slate-500 mt-1">Dùng tài khoản đã được quản trị viên cấp quyền.</p></div>
      <label className="block text-sm font-medium">Email<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="block text-sm font-medium">Mật khẩu<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-blue-600 text-white p-2 disabled:opacity-50">{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
    </form>
  </main>;
}
