"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setError("Mật khẩu xác nhận không khớp."); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Không thể đăng ký."); return; }
      setPassword(""); setConfirm(""); setSuccess(true);
    } catch { setError("Không thể kết nối. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
    <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div><h1 className="text-xl font-bold">Đăng ký AdsPulse OS</h1><p className="text-sm text-slate-500 mt-1">Tài khoản mới cần xác minh email và được quản trị viên cấp quyền trước khi sử dụng.</p></div>
      {success ? <p role="status" className="text-sm text-slate-700">Nếu yêu cầu hợp lệ, hãy kiểm tra email và mở liên kết xác minh trên cùng trình duyệt này. Sau đó liên hệ quản trị viên để được cấp quyền.</p> :
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium">Email<input type="email" required maxLength={320} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
        <label className="block text-sm font-medium">Mật khẩu (ít nhất 10 ký tự)<input type="password" required minLength={10} maxLength={1024} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
        <label className="block text-sm font-medium">Nhập lại mật khẩu<input type="password" required minLength={10} maxLength={1024} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-blue-600 text-white p-2 disabled:opacity-50">{busy ? "Đang gửi…" : "Đăng ký"}</button>
      </form>}
      <Link href="/login" className="text-sm text-blue-700">Đã có tài khoản? Đăng nhập</Link>
    </div>
  </main>;
}
