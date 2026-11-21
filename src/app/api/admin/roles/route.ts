import { NextRequest, NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/server";
import { pool } from "@/db";

export async function GET() {
  const denied = await authorizeApi("admin");
  if (denied) return denied;
  try {
    const { rows } = await pool.query("select user_id, role, created_at, updated_at from public.app_user_roles order by created_at");
    return NextResponse.json({ roles: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Không thể tải phân quyền." }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  const denied = await authorizeApi("admin", true);
  if (denied) return denied;
  try {
    const body = await req.json();
    if (typeof body.userId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.userId) || !["admin", "operator", "viewer"].includes(body.role)) return NextResponse.json({ error: "Người dùng hoặc vai trò không hợp lệ." }, { status: 400 });
    const { rows } = await pool.query("insert into public.app_user_roles (user_id, role) values ($1, $2) on conflict (user_id) do update set role = excluded.role, updated_at = now() returning user_id, role", [body.userId, body.role]);
    return NextResponse.json({ assignment: rows[0] });
  } catch { return NextResponse.json({ error: "Không thể cấp quyền. Hãy kiểm tra tài khoản Supabase Auth." }, { status: 400 }); }
}

export async function DELETE(req: NextRequest) {
  const denied = await authorizeApi("admin", true);
  if (denied) return denied;
  try {
    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return NextResponse.json({ error: "ID người dùng không hợp lệ." }, { status: 400 });
    await pool.query("delete from public.app_user_roles where user_id = $1", [userId]);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Không thể thu hồi quyền." }, { status: 500 }); }
}
