"use client";
import Link from "next/link";
export default function NoAccessPage() {
  return <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50"><div className="max-w-md rounded-xl bg-white border p-6 space-y-4"><h1 className="font-bold text-xl">Chưa có quyền truy cập</h1><p className="text-sm text-slate-600">Tài khoản chỉ xem hoặc chưa được phân quyền hiện không được vào các trang nghiệp vụ. Vui lòng liên hệ quản trị viên.</p><Link href="/login" className="text-blue-700 text-sm">Đăng nhập bằng tài khoản khác</Link><button className="block text-sm text-slate-600" onClick={async () => { const res = await fetch("/api/auth/logout", { method: "POST" }); if (res.ok) window.location.assign("/login"); else window.alert("Không thể đăng xuất."); }}>Đăng xuất</button></div></main>;
}
