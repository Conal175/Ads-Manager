import { NextRequest, NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/server";
import { pool } from "@/db";

// Never expose auth.users through the public Data API or return password hashes.
export async function GET(req: NextRequest) {
  const denied = await authorizeApi("admin");
  if (denied) return denied;
  const rawOffset = req.nextUrl.searchParams.get("offset") ?? "0";
  if (!/^\d{1,7}$/.test(rawOffset)) return NextResponse.json({ error: "Trang không hợp lệ." }, { status: 400 });
  try {
    const offset = Number(rawOffset);
    const bootstrap = process.env.APP_ADMIN_EMAIL?.trim().toLowerCase() || "";
    const { rows } = await pool.query(
      `select u.id, u.email, u.email_confirmed_at, u.created_at, r.role,
       ($1 <> '' and lower(trim(coalesce(u.email, ''))) = $1) as bootstrap_admin
       from auth.users u left join public.app_user_roles r on r.user_id = u.id
       order by u.created_at desc, u.id desc limit 101 offset $2`, [bootstrap, offset]
    );
    return NextResponse.json({ users: rows.slice(0, 100), hasMore: rows.length > 100 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Không thể tải người dùng. Kiểm tra quyền đọc Auth của tài khoản database." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
