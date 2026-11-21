import { pool } from "@/db";

export const dynamic = "force-dynamic";

// Return only predefined categories; PostgreSQL error messages can contain secrets.
function classifyDatabaseError(error: unknown): string {
  if (!(error instanceof Error)) return "DATABASE_ERROR";
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  if (code === "28P01" || code === "28000" || /password authentication failed|sasl.*password|tenant or user not found/i.test(error.message)) return "DATABASE_AUTHENTICATION";
  if (["ENOTFOUND", "EAI_AGAIN"].includes(code)) return "DATABASE_DNS";
  if (["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENETUNREACH", "EHOSTUNREACH"].includes(code) || /timeout|connection terminated/i.test(error.message)) return "DATABASE_NETWORK";
  if (["SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_HAS_EXPIRED"].includes(code) || /certificate|ssl|tls/i.test(error.message)) return "DATABASE_TLS";
  if (code === "ERR_INVALID_URL") return "DATABASE_URL_INVALID";
  return "DATABASE_ERROR";
}

export async function GET() {
  try {
    await pool.query("select 1");
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, code: classifyDatabaseError(error) }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
