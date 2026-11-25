import { NextResponse } from "next/server";
import { authClient } from "@/lib/auth/server";
import { resolveIdentity } from "@/lib/auth/identity";

export async function GET() {
  try {
    const client = await authClient();
    const identity = await resolveIdentity(client);
    if (!identity.authenticated) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Không thể tải hồ sơ." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.slice(0, 100) : "";
    return NextResponse.json({ role: identity.role, profile: { id: user.id, email: user.email ?? null, fullName, emailConfirmed: Boolean(user.email_confirmed_at), createdAt: user.created_at } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Không thể xác thực yêu cầu." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
