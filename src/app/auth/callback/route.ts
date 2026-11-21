import { NextRequest, NextResponse } from "next/server";
import { authClient } from "@/lib/auth/server";

// Supabase Auth PKCE confirmation must be opened in the same browser that registered.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    try {
      const client = await authClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) {
        // Email verification does not grant an application role.
        await client.auth.signOut();
        return NextResponse.redirect(new URL("/auth/confirmed", url.origin));
      }
    } catch { /* use the generic error below */ }
  }
  return NextResponse.redirect(new URL("/auth/confirmation-error", url.origin));
}
