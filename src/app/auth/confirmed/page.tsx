import Link from "next/link";
export default function ConfirmedPage() {
  return <main className="p-8 max-w-xl"><h1 className="text-xl font-bold">Email đã được xác minh</h1><p className="mt-3">Liên hệ quản trị viên để được cấp quyền, sau đó đăng nhập.</p><Link href="/login" className="text-blue-700 inline-block mt-4">Đi tới đăng nhập</Link></main>;
}
