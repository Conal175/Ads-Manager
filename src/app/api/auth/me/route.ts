import { NextResponse } from "next/server";
import { authClient } from "@/lib/auth/server";
import { resolveIdentity } from "@/lib/auth/identity";

export async function GET() {
  try {
    const identity = await resolveIdentity(await authClient());
    if (!identity.authenticated) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ role: identity.role }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Không thể xác thực yêu cầu." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
