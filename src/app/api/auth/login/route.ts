import { NextRequest, NextResponse } from "next/server";
import { authClient, sameOrigin } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  if (!(await sameOrigin())) return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  try {
    const body = await req.json();
    if (typeof body.email !== "string" || typeof body.password !== "string" || body.email.length > 320 || body.password.length > 1024) return NextResponse.json({ error: "Thông tin đăng nhập không hợp lệ." }, { status: 400 });
    const client = await authClient();
    const { error } = await client.auth.signInWithPassword({ email: body.email.trim(), password: body.password });
    if (error) return NextResponse.json({ error: "Không thể đăng nhập. Hãy kiểm tra thông tin tài khoản." }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Không thể đăng nhập lúc này." }, { status: 503 }); }
}
