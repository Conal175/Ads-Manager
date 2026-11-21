import {
  REQUIRED_META_PERMISSIONS,
  type ConnectionStatusResult,
} from "@/types/domain";

export const META_GRAPH_VERSION = "v21.0";
export const META_GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

/**
 * Xác thực Meta System User Token qua /debug_token & /me/permissions
 * Đảm bảo đủ 4 quyền bắt buộc: ads_read, ads_management, pages_read_engagement, pages_show_list
 */
export async function verifyMetaConnection(
  token: string,
  bmId: string
): Promise<ConnectionStatusResult> {
  const checkedAt = new Date().toISOString();
  const cleanToken = token.trim();

  if (!cleanToken) {
    return {
      ok: false,
      mode: "live",
      checkedAt,
      message: "Chưa nhập Meta System User Token.",
    };
  }

  if (cleanToken.startsWith("EAA_SANDBOX")) {
    return {
      ok: true,
      mode: "sandbox",
      checkedAt,
      message: `Xác thực thành công (Sandbox) cho BM ${
        bmId || "849201938475612"
      } — Đủ 4/4 quyền bắt buộc.`,
      details: {
        endpointCalled: "/debug_token & /me/permissions",
        permissions: [...REQUIRED_META_PERMISSIONS],
        missingPermissions: [],
        isValid: true,
        expiresAt: "Không hết hạn (System User)",
      },
    };
  }

  try {
    const [debugRes, permRes] = await Promise.all([
      fetch(
        `${META_GRAPH_BASE_URL}/debug_token?input_token=${encodeURIComponent(
          cleanToken
        )}&access_token=${encodeURIComponent(cleanToken)}`,
        { signal: AbortSignal.timeout(8000) }
      ),
      fetch(
        `${META_GRAPH_BASE_URL}/me/permissions?access_token=${encodeURIComponent(
          cleanToken
        )}`,
        { signal: AbortSignal.timeout(8000) }
      ),
    ]);

    const debugJson = await debugRes.json();
    const permJson = await permRes.json();

    if (!debugRes.ok || debugJson.error) {
      return {
        ok: false,
        mode: "live",
        checkedAt,
        message: `Meta API từ chối Token: ${
          debugJson.error?.message || "Token không hợp lệ"
        }`,
        details: { errorCode: debugJson.error?.code },
      };
    }

    const granted: string[] = (permJson.data || [])
      .filter((p: { status: string }) => p.status === "granted")
      .map((p: { permission: string }) => p.permission);

    const missing = REQUIRED_META_PERMISSIONS.filter(
      (reqPerm) => !granted.includes(reqPerm)
    );

    return {
      ok: Boolean(debugJson.data?.is_valid) && missing.length === 0,
      mode: "live",
      checkedAt,
      message:
        missing.length === 0
          ? "Kết nối Live Meta Graph API thành công — Đủ 4/4 quyền bắt buộc!"
          : `Token hợp lệ nhưng thiếu quyền: ${missing.join(", ")}`,
      details: {
        endpointCalled: "/debug_token & /me/permissions",
        permissions: granted,
        missingPermissions: missing,
        isValid: debugJson.data?.is_valid,
      },
    };
  } catch (err) {
    return {
      ok: false,
      mode: "live",
      checkedAt,
      message: `Không thể gọi Meta Graph API: ${
        err instanceof Error ? err.message : "Timeout"
      }`,
    };
  }
}

/**
 * Đọc header `x-business-use-case-usage` từ phản hồi Meta API
 * và trả về mức phần trăm cao nhất + trạng thái tự động giãn chu kỳ (> 75%).
 */
export function parseMetaRateLimitHeader(headerValue: string | null): {
  callCountPct: number;
  cpuTimePct: number;
  totalTimePct: number;
  maxPct: number;
  shouldThrottle: boolean;
} {
  if (!headerValue) {
    return {
      callCountPct: 0,
      cpuTimePct: 0,
      totalTimePct: 0,
      maxPct: 0,
      shouldThrottle: false,
    };
  }

  try {
    const parsed = JSON.parse(headerValue) as Record<
      string,
      Array<{
        call_count?: number;
        total_cputime?: number;
        total_time?: number;
      }>
    >;
    let callCountPct = 0;
    let cpuTimePct = 0;
    let totalTimePct = 0;

    for (const entries of Object.values(parsed)) {
      for (const entry of entries) {
        callCountPct = Math.max(callCountPct, Number(entry.call_count ?? 0));
        cpuTimePct = Math.max(cpuTimePct, Number(entry.total_cputime ?? 0));
        totalTimePct = Math.max(totalTimePct, Number(entry.total_time ?? 0));
      }
    }

    const maxPct = Math.max(callCountPct, cpuTimePct, totalTimePct);
    return {
      callCountPct,
      cpuTimePct,
      totalTimePct,
      maxPct,
      shouldThrottle: maxPct >= 75,
    };
  } catch {
    return {
      callCountPct: 0,
      cpuTimePct: 0,
      totalTimePct: 0,
      maxPct: 0,
      shouldThrottle: false,
    };
  }
}
