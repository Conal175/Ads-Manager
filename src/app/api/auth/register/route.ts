import { NextRequest, NextResponse } from "next/server";
import { authClient, sameOrigin } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  if (!(await sameOrigin())) return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = body.password;
    if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string" || password.length < 10 || password.length > 1024) {
      return NextResponse.json({ error: "Hãy nhập email hợp lệ và mật khẩu từ 10 ký tự." }, { status: 400 });
    }
    const origin = req.headers.get("origin")!;
    const client = await authClient();
    const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback` } });
    if (error) {
      // Provider error messages may expose account existence; surface only actionable rate limits.
      if (error.status === 429) return NextResponse.json({ error: "Quá nhiều yêu cầu. Vui lòng chờ rồi thử lại." }, { status: 429 });
      return NextResponse.json({ error: "Không thể gửi yêu cầu đăng ký. Vui lòng thử lại sau." }, { status: 400 });
    }
    // Do not implicitly sign the new user in if confirmation was disabled in Supabase.
    if (data.session) await client.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không thể gửi yêu cầu đăng ký lúc này." }, { status: 503 });
  }
}
