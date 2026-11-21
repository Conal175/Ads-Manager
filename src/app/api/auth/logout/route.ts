import { NextResponse } from "next/server";
import { authClient, sameOrigin } from "@/lib/auth/server";

export async function POST() {
  if (!(await sameOrigin())) return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  try {
    const client = await authClient();
    const { error } = await client.auth.signOut();
    if (error) return NextResponse.json({ error: "Không thể đăng xuất." }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Không thể đăng xuất." }, { status: 503 }); }
}
