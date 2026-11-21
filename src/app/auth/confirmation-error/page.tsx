import Link from "next/link";
export default function ConfirmationErrorPage() {
  return <main className="p-8 max-w-xl"><h1 className="text-xl font-bold">Không thể xác minh email</h1><p className="mt-3">Liên kết có thể đã hết hạn hoặc đã được mở ở trình duyệt khác. Hãy liên hệ quản trị viên để được hỗ trợ.</p><Link href="/login" className="text-blue-700 inline-block mt-4">Đi tới đăng nhập</Link></main>;
}
