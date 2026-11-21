import type { SupabaseClient } from "@supabase/supabase-js";
import { pool } from "@/db";
import type { AppRole } from "./policy";

export async function resolveIdentity(client: SupabaseClient): Promise<{ authenticated: boolean; role: AppRole | null }> {
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || !user.email_confirmed_at) return { authenticated: false, role: null };
  const bootstrap = process.env.APP_ADMIN_EMAIL?.trim().toLowerCase();
  if (bootstrap && user.email?.trim().toLowerCase() === bootstrap) return { authenticated: true, role: "admin" };
  const result = await pool.query<{ role: AppRole }>("select role from public.app_user_roles where user_id = $1", [user.id]);
  const role = result.rows[0]?.role;
  return { authenticated: true, role: role === "admin" || role === "operator" || role === "viewer" ? role : null };
}
