import { NextRequest, NextResponse } from "next/server";
import { authClient, sameOrigin } from "@/lib/auth/server";
import { resolveIdentity } from "@/lib/auth/identity";
import { validProfileName } from "@/lib/auth/profile";

export async function PATCH(request: NextRequest) {
  if (!(await sameOrigin())) return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  try {
    const client = await authClient();
    const identity = await resolveIdentity(client);
    if (!identity.authenticated) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
    if (identity.role !== "admin" && identity.role !== "operator") return NextResponse.json({ error: "Bạn không có quyền truy cập." }, { status: 403 });
    const body = await request.json();
    const fullName = validProfileName(body?.fullName);
    if (!fullName) return NextResponse.json({ error: "Họ tên phải có từ 1 đến 100 ký tự hợp lệ." }, { status: 400 });
    const { error } = await client.auth.updateUser({ data: { full_name: fullName } });
    if (error) return NextResponse.json({ error: "Không thể lưu hồ sơ. Vui lòng thử lại." }, { status: 503 });
    return NextResponse.json({ fullName }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Không thể lưu hồ sơ. Vui lòng thử lại." }, { status: 503 }); }
}
