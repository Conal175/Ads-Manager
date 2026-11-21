import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/auth/identity";
import { canViewPage } from "@/lib/auth/policy";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" || path === "/register" || path === "/no-access" || path.startsWith("/auth/")) return NextResponse.next();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return new NextResponse("Không thể xác thực yêu cầu.", { status: 503 });
  const response = NextResponse.next({ request });
  const client = createServerClient(url, key, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => { for (const { name, value, options } of items) { request.cookies.set(name, value); response.cookies.set(name, value, options); } },
    },
  });
  try {
    const identity = await resolveIdentity(client);
    if (identity.authenticated && canViewPage(identity.role, path)) return response;
    const destination = !identity.authenticated ? "/login" : identity.role === "operator" ? "/assets" : "/no-access";
    const redirect = NextResponse.redirect(new URL(destination, request.url));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  } catch { return new NextResponse("Không thể xác thực yêu cầu.", { status: 503 }); }
}
export const config = { matcher: ["/((?!api(?:/|$)|_next/static|_next/image|favicon.ico).*)"] };
