import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { resolveIdentity } from "./identity";
import { canUseRole, type AppRole } from "./policy";

export async function sameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === host && (parsed.protocol === "https:" || (process.env.NODE_ENV !== "production" && parsed.protocol === "http:"));
  } catch { return false; }
}

export async function authClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase Auth is not configured");
  const store = await cookies();
  return createServerClient(url, key, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        for (const { name, value, options } of items) store.set(name, value, options);
      },
    },
  });
}

/** Must be called by every data API handler before executing any business logic. */
export async function authorizeApi(required: AppRole, mutation = false): Promise<NextResponse | null> {
  if (mutation && !(await sameOrigin())) return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  try {
    const client = await authClient();
    const identity = await resolveIdentity(client);
    if (!identity.authenticated) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
    if (!canUseRole(identity.role, required)) return NextResponse.json({ error: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
    return null;
  } catch {
    // Do not leak provider errors, database details or configuration.
    return NextResponse.json({ error: "Không thể xác thực yêu cầu." }, { status: 503 });
  }
}
